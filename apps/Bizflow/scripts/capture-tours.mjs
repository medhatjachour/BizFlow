/**
 * capture-tours.mjs
 *
 * Headless capture of per-plugin feature tours from the running web build
 * (http://localhost:5180, login setup/setup123). For each plugin it visits the
 * route, clicks through every tab/feature, overlays a caption banner, and saves
 * one screenshot per feature to `.tour-frames/<plugin>/`.
 *
 * Then run `node scripts/encode-tours.mjs <plugin…>` to build the GIFs.
 *
 * Usage:
 *   node scripts/capture-tours.mjs            # all plugins
 *   node scripts/capture-tours.mjs vet        # one plugin
 */
import { chromium } from 'playwright'
import { mkdirSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const framesBase = join(root, '.tour-frames')
const URL = 'http://localhost:5180'
const W = 1440, H = 900

const PLUGINS = {
  commerce:   { title: 'Commerce',   emoji: '🛒', accent: '79,70,229',  routes: [['/products', 'Products', 'Products'], ['/sales', 'Sales / POS', 'Sales'], ['/inventory', 'Inventory', 'Inventory'], ['/finance', 'Finance & Analytics', 'Finance'], ['/reports', 'Reports & Analytics', 'Reports']] },
  bakery:     { route: '/bakery',     title: 'Bakery',     emoji: '🥐', accent: '217,119,6',  tabs: ['Overview', 'Recipes', 'Production', 'Sales', 'Pantry', 'Waste', 'Schedule', 'P&L', 'Expenses'] },
  restaurant: { route: '/restaurant', title: 'Restaurant', emoji: '🍽️', accent: '220,38,38',  tabs: ['Overview', 'Floor Plan', 'Reservations', 'Menu', 'Orders'] },
  warehouse:  { route: '/warehouse',  title: 'Warehouse',  emoji: '📦', accent: '13,148,136', tabs: ['Overview', 'Operations', 'Locations', 'Inventory', 'Transfers'] },
  clinic:     { route: '/clinic',     title: 'Clinic',     emoji: '🏥', accent: '13,148,136', tabs: ['Patients', 'Sessions', 'Appointments', 'Follow-ups', 'Statistics', 'Expenses', 'Materials'] },
  vet:        { route: '/vet',        title: 'Vet Clinic', emoji: '🐾', accent: '124,58,237', tabs: ['Owners', 'Vets', 'Sessions', 'Appointments', 'Follow-ups', 'Medicine Store', 'Sales', 'Statistics', 'Expenses'] },
  gym:        { route: '/gym',        title: 'Gym',        emoji: '🏋️', accent: '234,88,12',  tabs: ['Attendance', 'Trainees', 'Coaches', 'Subscriptions', 'Walk-ins', 'Plans', 'Lockers', 'Programs'] },
  pharmacy:   { route: '/pharmacy',   title: 'Pharmacy',   emoji: '💊', accent: '5,150,105',  tabs: ['Dashboard', 'Sell', 'Products', 'Inventory', 'Sales', 'Customers', 'Suppliers', 'Purchase Orders', 'Reports'] },
}

const targets = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(PLUGINS)

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
const page = await ctx.newPage()

// ── Login ──────────────────────────────────────────────────────────────────
await page.goto(`${URL}/#/login`, { waitUntil: 'domcontentloaded' })
await page.getByRole('button', { name: /^Sign In$/i }).waitFor({ timeout: 30000 })
try {
  await page.getByRole('textbox', { name: 'Username' }).fill('setup')
  await page.getByRole('textbox', { name: 'Password' }).fill('setup123')
} catch { /* fall back to setup button */ }
await page.getByRole('button', { name: /^Sign In$/i }).click().catch(() => {})
await page.waitForURL(/#\/(dashboard|vet|products)/, { timeout: 20000 }).catch(() => {})
await page.waitForTimeout(1500)

// ── Helpers ──────────────────────────────────────────────────────────────────
async function caption(text, accent) {
  await page.evaluate(({ tx, ac }) => {
    let e = document.getElementById('__cap')
    if (!e) { e = document.createElement('div'); e.id = '__cap'; document.body.appendChild(e) }
    e.textContent = tx
    e.style.cssText = `position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2147483647;background:rgba(${ac},.97);color:#fff;font:600 19px/1.3 'Segoe UI',Arial,sans-serif;padding:13px 26px;border-radius:16px;box-shadow:0 14px 38px rgba(0,0,0,.45)`
  }, { tx: text, ac: accent })
}
async function clearCaption() { await page.evaluate(() => { const e = document.getElementById('__cap'); if (e) e.remove() }) }
async function waitLoaded() {
  for (let k = 0; k < 26; k++) {
    const st = await page.evaluate(() => {
      const m = document.querySelector('main')
      const txt = m?.innerText || ''
      const spin = document.querySelectorAll('main .animate-spin, main svg.animate-spin, main [class*="animate-spin"]').length
      return { hasLoading: /Loading/i.test(txt), len: txt.length, spin }
    })
    if (!st.hasLoading && st.spin === 0 && st.len > 120) { await page.waitForTimeout(400); return }
    await page.waitForTimeout(450)
  }
}
async function scrollTop() { await page.evaluate(() => { window.scrollTo(0, 0); const m = document.querySelector('main'); if (m) m.scrollTop = 0 }) }
async function gotoHash(h) { await page.evaluate((x) => { window.location.hash = '#' + x }, h) }
async function waitForHeading(needle, timeout = 9000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const h = await page.evaluate(() => document.querySelector('main h1, main h2')?.textContent || '')
    if (h.toLowerCase().includes(needle.toLowerCase())) return true
    await page.waitForTimeout(300)
  }
  return false
}

for (const id of targets) {
  const pl = PLUGINS[id]
  if (!pl) { console.log(`skip ${id}: unknown`); continue }
  const dir = join(framesBase, id)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })

  let i = 0
  const shot = async (label, name) => {
    await scrollTop(); await page.waitForTimeout(150)
    await caption(`${pl.emoji}  ${pl.title} — ${label}`, pl.accent); await page.waitForTimeout(250)
    await page.screenshot({ path: join(dir, `${String(i++).padStart(2, '0')}_${name}.png`) })
  }

  // reset to a clean mount
  await gotoHash('/dashboard'); await page.waitForTimeout(500)

  if (pl.routes) {
    for (const [r, label, expect] of pl.routes) {
      await gotoHash(r)
      if (expect) await waitForHeading(expect)
      await waitLoaded(); await page.waitForTimeout(400)
      await shot(label, label.replace(/[^a-z0-9]/gi, '_'))
    }
  } else {
    await gotoHash(pl.route); await page.waitForTimeout(1000); await waitLoaded()
    for (const tab of pl.tabs) {
      try { await page.getByRole('button', { name: tab, exact: true }).first().click({ timeout: 4000 }) } catch { /* tab missing */ }
      await page.waitForTimeout(800); await waitLoaded()
      await shot(tab, tab.replace(/[^a-z0-9]/gi, '_'))
    }
  }
  await clearCaption()
  console.log(`✓ captured ${id} (${i} frames)`)
}

await browser.close()
