/**
 * Bitmap (raster) receipt renderer.
 *
 * Why this exists: most 58mm/80mm thermal printers — including the XP-58C —
 * ship with a Latin/Chinese font ROM and silently ignore `ESC t` requests for
 * Arabic code pages (CP864 / WPC1256). Those printers *can* print Arabic as
 * graphics though: the glyphs are rasterised by Windows (or by us) into a
 * 1-bit image and streamed with `GS v 0`.
 *
 * So for Arabic (and any language the printer's ROM cannot encode) we lay the
 * receipt out as HTML, rasterise it offscreen with Chromium — which shapes and
 * orders Arabic correctly — and pack the pixels into `GS v 0` raster commands.
 *
 * An offscreen window's surface is fixed at creation time and Chromium clamps
 * that height to the display work area, so a receipt taller than the screen is
 * captured in scroll slices and stitched back together by the print job.
 *
 * The layout deliberately mirrors `ThermalPrinterService.buildReceipt` so the
 * text and bitmap receipts look like the same document.
 */

import { app, BrowserWindow, screen } from 'electron'
import type { NativeImage } from 'electron'
import { getReceiptLabels } from './labels'
import { saleAdjustmentRows, saleGratuityRow } from './adjustments'
import type { PrinterSettings, ReceiptData } from '../ThermalPrinterService'

/** Printable dots per paper width at 203 dpi. */
export const PAPER_DOTS: Record<PrinterSettings['paperWidth'], number> = {
  '58mm': 384,
  '80mm': 576,
}

/** Physical width of the thermal head, in dots. */
export function receiptWidthDots(settings: PrinterSettings): number {
  return PAPER_DOTS[settings.paperWidth] ?? PAPER_DOTS['58mm']
}

/** Anything taller than this is a runaway document, not a receipt. */
const MAX_DOC_DOTS = 3000

/** Overall look of the graphics receipt. */
export type ReceiptTemplate = 'classic' | 'compact' | 'modern'

/** Separator drawn between receipt blocks. */
export type ReceiptDivider = 'dashed' | 'solid' | 'double' | 'none'

export const RECEIPT_TEMPLATES: ReceiptTemplate[] = ['classic', 'compact', 'modern']
export const RECEIPT_DIVIDERS: ReceiptDivider[] = ['dashed', 'solid', 'double', 'none']

/** Style knobs of the graphics receipt, all optional in the settings. */
export interface ReceiptLayout {
  template: ReceiptTemplate
  divider: ReceiptDivider
  /** Font size multiplier, 0.8 - 1.2. */
  fontScale: number
  /** Logo width as a percentage of the paper width, 20 - 100. */
  logoSize: number
  /** Threshold the logo to black and white, which is all a thermal head prints. */
  logoMono: boolean
  /** Print address, phone and email under the store name. */
  showStoreDetails: boolean
}

export const DEFAULT_RECEIPT_LAYOUT: ReceiptLayout = {
  template: 'classic',
  divider: 'dashed',
  fontScale: 1,
  logoSize: 70,
  logoMono: false,
  showStoreDetails: true,
}

function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min
}

/** Layout of one receipt, with every value forced into a printable range. */
export function resolveReceiptLayout(settings: PrinterSettings): ReceiptLayout {
  const template = RECEIPT_TEMPLATES.includes(settings.receiptTemplate as ReceiptTemplate)
    ? settings.receiptTemplate as ReceiptTemplate
    : DEFAULT_RECEIPT_LAYOUT.template
  const divider = RECEIPT_DIVIDERS.includes(settings.receiptDivider as ReceiptDivider)
    ? settings.receiptDivider as ReceiptDivider
    : DEFAULT_RECEIPT_LAYOUT.divider

  return {
    template,
    divider,
    fontScale: clamp(settings.receiptFontScale ?? DEFAULT_RECEIPT_LAYOUT.fontScale, 0.8, 1.2),
    logoSize: clamp(settings.receiptLogoSize ?? DEFAULT_RECEIPT_LAYOUT.logoSize, 20, 100),
    logoMono: settings.receiptLogoMono === true,
    showStoreDetails: settings.receiptShowStoreDetails !== false,
  }
}

interface RenderSession {
  win: BrowserWindow
  paints: number
  frame: NativeImage | null
  warmed: boolean
}

const sessions = new Map<number, RenderSession>()
let queue: Promise<unknown> = Promise.resolve()

const readPaints = (session: RenderSession): number => session.paints
const readFrame = (session: RenderSession): NativeImage | null => session.frame

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function splitLines(value?: string): string[] {
  if (!value) return []
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

/**
 * Accepts a data URL, a bare base64 payload or a raw PNG/JPEG buffer encoded as
 * base64 and returns something usable in an `img src`.
 */
export function normalizeLogoDataUrl(value?: string): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^data:image\//i.test(trimmed)) return trimmed
  if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed)) {
    return `data:image/png;base64,${trimmed.replace(/\s+/g, '')}`
  }
  return null
}

interface ItemRow {
  name: string
  quantity: number
  price: number
  total: number
  discountType?: string
  discountValue?: number
  finalPrice?: number
}

interface DiscountLine {
  label: string
  amount: string
  after?: string
}

/** Mirrors the discount maths used by the ESC/POS composer. */
function itemDiscountLines(item: ItemRow, labels: { discount: string; fixedDiscount: string; afterDiscount: string }): DiscountLine[] {
  const hasDiscount =
    !!item.discountType &&
    item.discountType !== 'NONE' &&
    item.discountValue !== undefined &&
    item.discountValue > 0

  if (!hasDiscount || item.discountValue === undefined) return []

  const originalPrice = item.discountType === 'PERCENTAGE'
    ? item.price / (1 - item.discountValue / 100)
    : item.price + item.discountValue / item.quantity

  const itemDiscount = item.discountType === 'PERCENTAGE'
    ? originalPrice * item.quantity - item.price * item.quantity
    : item.discountValue

  const label = item.discountType === 'PERCENTAGE'
    ? `${labels.discount} ${item.discountValue}%`
    : labels.fixedDiscount

  return [{
    label,
    amount: `-${itemDiscount.toFixed(2)} EGP`,
    after: `${(item.price * item.quantity).toFixed(2)} EGP`,
  }]
}

/**
 * Build the full HTML document for a receipt at the printer's dot width.
 * 1 CSS pixel == 1 printer dot, so the text keeps the physical size of the
 * printer's own font instead of being scaled by the raster.
 */
export function buildReceiptHtml(data: ReceiptData, settings: PrinterSettings): string {
  const isAr = settings.receiptLanguage === 'ar'
  const lbl = getReceiptLabels(settings.receiptLanguage || 'en')
  const locale = isAr ? 'ar-EG' : 'en-US'
  const width = receiptWidthDots(settings)
  const dir = isAr ? 'rtl' : 'ltr'
  const layout = resolveReceiptLayout(settings)
  const baseFont = 21 * layout.fontScale

  const money = (value: number): string => `${value.toFixed(2)} EGP`

  /** label …… value row (value keeps LTR order for numbers). */
  const kv = (label: string, value: string, numeric = false): string =>
    `<div class="row"><span class="k">${escapeHtml(label)}</span>` +
    `<span class="v${numeric ? ' num' : ''}">${escapeHtml(value)}</span></div>`

  const lines: string[] = []

  /** Block separator; `none` keeps the vertical rhythm without ink. */
  const divider = (): void => {
    if (layout.divider === 'none') lines.push('<div class="gap-sm"></div>')
    else lines.push(`<div class="hr ${layout.divider}"></div>`)
  }

  const logo = settings.printLogo === false ? null : normalizeLogoDataUrl(settings.receiptLogo)
  if (logo) {
    const mono = layout.logoMono ? ' mono' : ''
    lines.push(
      `<img class="logo${mono}" style="width:${layout.logoSize}%" src="${escapeHtml(logo)}" alt="">`)
  }

  splitLines(settings.receiptHeader).forEach((line) =>
    lines.push(`<div class="center">${escapeHtml(line)}</div>`))

  // ── Store header ──────────────────────────────────────────────
  lines.push(`<div class="store">${escapeHtml(data.storeName)}</div>`)
  if (layout.showStoreDetails) {
    if (data.storeAddress) lines.push(`<div class="center">${escapeHtml(data.storeAddress)}</div>`)
    if (data.storePhone) lines.push(`<div class="center">${escapeHtml(`${lbl.tel}: ${data.storePhone}`)}</div>`)
    if (data.storeEmail) lines.push(`<div class="center">${escapeHtml(data.storeEmail)}</div>`)
  }

  // ── Tax info ──────────────────────────────────────────────────
  divider()
  if (data.taxNumber) lines.push(kv(lbl.taxNo, data.taxNumber))
  if (data.commercialRegister) lines.push(kv(lbl.commReg, data.commercialRegister))
  divider()

  // ── Transaction meta ──────────────────────────────────────────
  lines.push(kv(lbl.receiptNum, data.receiptNumber))
  lines.push(kv(lbl.date, new Date(data.date).toLocaleString(locale, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })))
  if (data.username) lines.push(kv(lbl.cashier, data.username))
  if (data.customerName) lines.push(kv(lbl.customer, data.customerName))
  if (data.customerPhone) lines.push(kv(lbl.phone, data.customerPhone))
  if (data.deliveryAddress) lines.push(kv(lbl.deliveryAddress, data.deliveryAddress))
  if (data.orderType) lines.push(kv(lbl.orderType, data.orderType.replace('_', ' ')))
  if (data.tableName) lines.push(kv(lbl.table, data.tableName))
  if (data.guestCount) lines.push(kv(lbl.guests, String(data.guestCount)))
  if (data.shiftName) lines.push(kv(lbl.shift, data.shiftName))
  if (data.openedAt) lines.push(kv(lbl.openedAt, new Date(data.openedAt).toLocaleString(locale)))
  if (data.closedAt) lines.push(kv(lbl.closedAt, new Date(data.closedAt).toLocaleString(locale)))
  if (data.notes) lines.push(kv(lbl.notes, data.notes))

  // ── Items ─────────────────────────────────────────────────────
  divider()
  lines.push(
    '<div class="irow ihead">' +
    `<span class="c-name">${escapeHtml(lbl.item)}</span>` +
    `<span class="c-qty">${escapeHtml(lbl.qty)}</span>` +
    `<span class="c-price">${escapeHtml(lbl.price)}</span>` +
    `<span class="c-total">${escapeHtml(lbl.totalCol)}</span>` +
    '</div>')
  divider()

  data.items.forEach((item) => {
    lines.push(
      '<div class="irow">' +
      `<span class="c-name">${escapeHtml(item.name)}</span>` +
      `<span class="c-qty num">${escapeHtml(String(item.quantity))}</span>` +
      `<span class="c-price num">${escapeHtml(item.price.toFixed(2))}</span>` +
      `<span class="c-total num">${escapeHtml((item.price * item.quantity).toFixed(2))}</span>` +
      '</div>')

    itemDiscountLines(item, lbl).forEach((discount) => {
      lines.push(kv(discount.label, discount.amount, true))
      if (discount.after) lines.push(kv(lbl.afterDiscount, discount.after, true))
    })
  })

  divider()

  // ── Totals ────────────────────────────────────────────────────
  lines.push(kv(lbl.subtotal, money(data.subtotal), true))
  saleAdjustmentRows(data, lbl).forEach((row) => {
    lines.push(kv(row.label, row.amount, true))
  })
  // Nothing to declare when no tax was charged; a 0.00 VAT row is just noise.
  if (Number(data.tax) !== 0) {
    const vatLabel = isAr ? `ض.ق.م (${data.taxRate}%)` : `${lbl.vat} (${data.taxRate}%)`
    lines.push(kv(vatLabel, money(data.tax), true))
  }
  divider()
  lines.push(
    `<div class="row total"><span class="k">${escapeHtml(lbl.total)}</span>` +
    `<span class="v num">${escapeHtml(money(data.total))}</span></div>`)
  // A tip is charged on top of the check total, so it prints after it.
  const gratuityRow = saleGratuityRow(data, lbl)
  if (gratuityRow) lines.push(kv(gratuityRow.label, gratuityRow.amount, true))
  divider()

  // ── Payment ───────────────────────────────────────────────────
  lines.push(`<div class="center">${escapeHtml(`${lbl.payment}: ${data.paymentMethod}`)}</div>`)

  // ── Installments ──────────────────────────────────────────────
  if (data.installments && data.installments.length > 0) {
    divider()
    lines.push(`<div class="center bold">${escapeHtml(lbl.installmentPlan)}</div>`)
    divider()

    if (data.depositAmount) lines.push(kv(lbl.depositPaid, money(data.depositAmount), true))

    data.installments.forEach((inst, idx) => {
      const status = inst.status === 'paid'
        ? ` ${lbl.statusPaid}`
        : inst.status === 'overdue' ? ` ${lbl.statusOverdue}` : ''
      const dateStr = new Date(inst.dueDate).toLocaleDateString(locale, {
        year: '2-digit', month: '2-digit', day: '2-digit',
      })
      lines.push(kv(`#${idx + 1} ${dateStr}`, `${inst.amount.toFixed(2)} EGP${status}`, true))
    })

    const remaining = data.installments
      .filter((inst) => inst.status !== 'paid')
      .reduce((sum, inst) => sum + inst.amount, 0)

    divider()
    lines.push(
      `<div class="row bold"><span class="k">${escapeHtml(lbl.remaining)}</span>` +
      `<span class="v num">${escapeHtml(money(remaining))}</span></div>`)
  }

  // ── Footer ────────────────────────────────────────────────────
  lines.push('<div class="gap"></div>')
  lines.push(`<div class="center">${escapeHtml(lbl.thankYou)}</div>`)
  lines.push(`<div class="center">${escapeHtml(lbl.appreciate)}</div>`)
  splitLines(settings.receiptFooter).forEach((line) =>
    lines.push(`<div class="center">${escapeHtml(line)}</div>`))

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${isAr ? 'ar' : 'en'}">
<head>
<meta charset="utf-8">
<title>receipt</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  /* The document is scrolled to take slices, so the bar must not steal dots. */
  ::-webkit-scrollbar { width: 0; height: 0; display: none; }
  body {
    width: ${width}px;
    font-family: Tahoma, "Segoe UI", Arial, sans-serif;
    font-size: ${baseFont.toFixed(1)}px;
    line-height: 1.28;
    color: #000;
  }
  .doc { width: ${width}px; padding: 2px 6px 10px; }
  .center { text-align: center; }
  .bold, .store, .row.total, .ihead, .row.bold { font-weight: 700; }
  .store { font-size: 1.29em; line-height: 1.2; text-align: center; }
  .logo { display: block; margin: 0 auto 6px; max-width: ${width - 24}px; max-height: 150px; }
  .logo.mono { filter: grayscale(1) contrast(320%) brightness(1.05); }
  .hr { border-top: 1px dashed #000; margin: 5px 0; }
  .hr.solid { border-top-style: solid; }
  .hr.double { border-top-style: double; border-top-width: 3px; }
  .hr.none { border-top: 0; }
  .gap { height: 8px; }
  .gap-sm { height: 3px; }
  .row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  .row .k { flex: 0 1 auto; }
  .v { flex: 0 1 auto; max-width: 64%; text-align: end; word-break: break-word; }
  .num { direction: ltr; unicode-bidi: isolate; }
  .irow { display: flex; align-items: baseline; gap: 6px; }
  .ihead { border: 0; }
  .c-name { flex: 1 1 auto; word-break: break-word; }
  .c-qty { flex: none; width: 2.2em; text-align: center; }
  .c-price, .c-total { flex: none; text-align: end; }
  .c-price { width: 3.4em; }
  .c-total { width: 4.1em; }

  /* Templates only change proportions and rules, never the information. */
  .doc.t-compact { padding: 1px 6px 8px; }
  .doc.t-compact .hr { margin: 3px 0; }
  .doc.t-compact .store { font-size: 1.14em; }
  .doc.t-compact .logo { max-height: 96px; margin-bottom: 4px; }
  .doc.t-modern .store { font-size: 1.43em; letter-spacing: .2px; }
  .doc.t-modern .hr { margin: 6px 0; }
  .doc.t-modern .ihead { border-bottom: 2px solid #000; padding-bottom: 3px; }
  .doc.t-modern .row.total { border: 2px solid #000; border-radius: 5px; padding: 3px 6px; }
</style>
</head>
<body><div class="doc t-${layout.template}">
${lines.join('\n')}
</div></body>
</html>`
}

/** Wait until the offscreen window reports a paint newer than `from`. */
function waitForPaints(session: RenderSession, from: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const started = Date.now()
    const tick = (): void => {
      if (readPaints(session) > from || Date.now() - started > timeoutMs) resolve()
      else setTimeout(tick, 20)
    }
    tick()
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * The tallest offscreen surface Chromium will give us. Window creation is
 * clamped to the display work area and an offscreen surface is never resized
 * after creation, so this is also the slice height for long receipts.
 */
function maxSurfaceHeight(): number {
  const workArea = screen.getPrimaryDisplay().workAreaSize.height || 800
  return Math.max(120, Math.min(workArea, MAX_DOC_DOTS))
}

/**
 * Reuse one offscreen window per paper width.
 *
 * Creating and destroying offscreen windows repeatedly kills the renderer
 * (`ERR_FAILED (-2)` on the second `loadURL`, then a GPU-process crash), so the
 * window is created once and only re-loaded. Two sessions can exist (58mm and
 * 80mm); they are released when the app has no real window left, because a
 * hidden window would otherwise stop `window-all-closed` from firing and the
 * app would never quit.
 */
function ensureSession(width: number): RenderSession {
  const existing = sessions.get(width)
  if (existing && !existing.win.isDestroyed()) return existing

  const win = new BrowserWindow({
    show: false,
    width,
    height: maxSurfaceHeight(),
    useContentSize: true,
    frame: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      offscreen: true,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      devTools: false,
      spellcheck: false,
    },
  })

  const session: RenderSession = { win, paints: 0, frame: null, warmed: false }
  win.webContents.on('paint', (_event, _dirty, painted) => {
    session.frame = painted
    session.paints += 1
  })
  win.on('closed', () => {
    if (sessions.get(width) === session) sessions.delete(width)
  })

  sessions.set(width, session)
  watchForLastWindow()
  return session
}

function destroySessions(): void {
  for (const session of sessions.values()) {
    if (!session.win.isDestroyed()) session.win.destroy()
  }
  sessions.clear()
}

const trackedWindows = new WeakSet<BrowserWindow>()
let watchingWindows = false

function isRenderWindow(win: BrowserWindow): boolean {
  for (const session of sessions.values()) {
    if (session.win === win) return true
  }
  return false
}

function watchForLastWindow(): void {
  if (!watchingWindows) {
    watchingWindows = true
    app.on('before-quit', destroySessions)
  }
  if (app.listenerCount('browser-window-created') === 0) {
    app.on('browser-window-created', (_event, win) => trackWindow(win))
  }
  BrowserWindow.getAllWindows().forEach(trackWindow)
}

function trackWindow(win: BrowserWindow): void {
  if (trackedWindows.has(win) || isRenderWindow(win)) return
  trackedWindows.add(win)
  win.once('closed', () => {
    const remaining = BrowserWindow.getAllWindows().filter((other) => !isRenderWindow(other))
    if (remaining.length === 0) destroySessions()
  })
}

export interface ReceiptSlice {
  /** Rendered dots, exactly `width` wide, normalised to printer resolution. */
  image: NativeImage
  /** Where the slice starts in the receipt, in dots. */
  offset: number
  /** How many dots of the receipt this slice covers. */
  height: number
}

interface DocumentMetrics {
  /** Height of the receipt itself, in dots. */
  content: number
  /** How far the document can actually be scrolled, in dots. */
  scrollRange: number
  /** Device pixels per CSS pixel (= dots, since 1 CSS px is 1 dot). */
  scale: number
}

/** Measure the receipt, the scroll range, and the real device scale. */
async function measureDocument(session: RenderSession, fallback: number): Promise<DocumentMetrics> {
  const metrics = await session.win.webContents
    .executeJavaScript(
      "(() => { const doc = document.querySelector('.doc') || document.body; const root = document.documentElement; " +
        'return { content: doc.getBoundingClientRect().height, dpr: window.devicePixelRatio, ' +
        'range: Math.max(0, root.scrollHeight - window.innerHeight) }; })()'
    )
    .catch(() => null)
  const content = Math.max(1, Math.min(Math.ceil(Number(metrics?.content) || fallback), MAX_DOC_DOTS))
  const scrollRange = Math.max(0, Math.min(Math.ceil(Number(metrics?.range) || 0), content))
  const scale = Number(metrics?.dpr) > 0 ? Number(metrics?.dpr) : 1
  return { content, scrollRange, scale }
}

/**
 * The very first layout in a fresh renderer lands a few dots off the ones that
 * follow, so the session renders one throwaway page before the real receipt.
 */
async function warmUp(session: RenderSession): Promise<void> {
  if (session.warmed) return
  session.warmed = true
  const at = readPaints(session)
  await session.win.webContents.loadURL(
    `data:text/html;charset=UTF-8,${encodeURIComponent('<body style="margin:0">&#160;</body>')}`
  )
  await waitForPaints(session, at, 3000)
  await sleep(20)
}

/** Scroll the document, then wait for the repaint the scroll triggers. */
async function scrollTo(session: RenderSession, y: number, from: number): Promise<number> {
  const paints = readPaints(session)
  const scrolled = Number(
    await session.win.webContents.executeJavaScript(
      `(() => { window.scrollTo(0, ${y}); return window.scrollY; })()`
    )
  )
  const target = Number.isFinite(scrolled) ? scrolled : y
  if (target !== from) await waitForPaints(session, paints, 1500)
  await sleep(20)
  return target
}

/**
 * Cut `height` dots at `offset` out of a frame and scale them down to `width`.
 *
 * `scale` is the real device-pixel ratio, not `frameWidth / width`: the window
 * ends up a device pixel wider than requested, and using that ratio would drift
 * by about a dot per slice.
 */
function cutFrame(
  frame: NativeImage,
  width: number,
  offset: number,
  scrolled: number,
  height: number,
  scale: number
): NativeImage {
  const size = frame.getSize()
  const columns = Math.max(width, Math.min(size.width, Math.round(width * scale)))
  const y = Math.max(0, Math.min(size.height - 1, Math.round((offset - scrolled) * scale)))
  const rows = Math.max(1, Math.min(Math.round(height * scale), size.height - y))
  const cut = frame.crop({ x: 0, y, width: columns, height: rows })
  return cut.getSize().width === width ? cut : cut.resize({ width, quality: 'best' })
}

async function captureSlices(
  html: string,
  width: number,
  options: RenderOptions
): Promise<ReceiptSlice[]> {
  const session = ensureSession(width)
  await warmUp(session)

  const loadAt = readPaints(session)
  await session.win.webContents.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`)
  await waitForPaints(session, loadAt, 5000)
  await sleep(20)

  // A fresh renderer keeps its scroll position across loads, so establish the
  // origin instead of assuming the document starts at the top.
  let scrolled = await scrollTo(session, 0, -1)

  const { content, scrollRange, scale } = await measureDocument(session, width)
  const first = readFrame(session)
  if (!first || first.isEmpty()) throw new Error('Could not rasterise the receipt image')

  const surface = Math.floor(first.getSize().height / scale)
  const surfaceDots = Math.max(60, Math.min(surface, Math.floor(options.maxSliceDots ?? surface)))
  const sliceCount = Math.max(1, Math.ceil(content / surfaceDots))
  const slices: ReceiptSlice[] = []

  for (let index = 0; index < sliceCount; index++) {
    const offset = index * surfaceDots
    const height = Math.min(surfaceDots, content - offset)
    // Near the end the scroll clamps, so the wanted rows sit lower inside the
    // frame instead of at its top — the crop follows the real scroll offset.
    const target = Math.min(offset, scrollRange)
    if (target !== scrolled) scrolled = await scrollTo(session, target, scrolled)
    const frame = readFrame(session) ?? first
    slices.push({
      image: cutFrame(frame, width, offset, scrolled, height, scale),
      offset,
      height,
    })
  }

  return slices
}

export interface RenderOptions {
  /**
   * Cap on the slice height, in dots. Defaults to the tallest offscreen surface
   * the display allows; a smaller value is useful for tests and for machines
   * whose surface is tiny.
   */
  maxSliceDots?: number
}

/**
 * Rasterise a receipt into printer-dot slices of `width` dots wide.
 *
 * Chromium does the Arabic shaping, so the glyphs are always correct, and the
 * caller streams every slice into one print job.
 */
export function renderReceiptSlices(
  html: string,
  width: number,
  options: RenderOptions = {}
): Promise<ReceiptSlice[]> {
  const render = (): Promise<ReceiptSlice[]> => slicesWithRetry(html, width, options)
  const job = queue.then(render, render)
  queue = job.then(
    () => undefined,
    () => undefined
  )
  return job
}

async function slicesWithRetry(
  html: string,
  width: number,
  options: RenderOptions
): Promise<ReceiptSlice[]> {
  try {
    return await captureSlices(html, width, options)
  } catch (error) {
    // A leftover renderer can poison the session; rebuild it once before giving up.
    destroySessions()
    try {
      return await captureSlices(html, width, options)
    } catch {
      throw error
    }
  }
}

/**
 * Pack a rendered slice into an ESC/POS `GS v 0` raster command (1 bit per dot,
 * 1 = ink). Doing this ourselves keeps every slice of a tall receipt in a single
 * job without a PNG round-trip.
 *
 * `rows` may exceed the image height, in which case the extra rows print as
 * white — that keeps the printed geometry exactly equal to the slice geometry
 * even when the capture could not reach the very last row.
 */
export function sliceToRaster(image: NativeImage, width: number, rows?: number): Buffer {
  const size = image.getSize()
  const height = Math.max(size.height, Math.max(0, Math.ceil(rows ?? 0)))
  const bytesPerRow = Math.ceil(width / 8)
  const bitmap = image.toBitmap()
  const stride = size.width * 4
  const out = Buffer.alloc(8 + bytesPerRow * height)

  out[0] = 0x1d
  out[1] = 0x76
  out[2] = 0x30
  out[3] = 0x00
  out[4] = bytesPerRow & 0xff
  out[5] = (bytesPerRow >> 8) & 0xff
  out[6] = height & 0xff
  out[7] = (height >> 8) & 0xff

  let index = 8
  for (let y = 0; y < height; y++) {
    const row = y < size.height ? y * stride : -1
    for (let byte = 0; byte < bytesPerRow; byte++) {
      let bits = 0
      for (let bit = 0; bit < 8; bit++) {
        const x = byte * 8 + bit
        if (row < 0 || x >= width || x >= size.width) continue
        const pixel = row + x * 4
        if (bitmap[pixel + 3] < 127) continue
        // Chromium hands over BGRA; the weights only have to be close enough to
        // separate ink from paper, and colour logos stay dark either way.
        const luma =
          0.2126 * bitmap[pixel] + 0.7152 * bitmap[pixel + 1] + 0.0722 * bitmap[pixel + 2]
        if (luma < 128) bits |= 1 << (7 - bit)
      }
      out[index++] = bits
    }
  }

  return out
}
