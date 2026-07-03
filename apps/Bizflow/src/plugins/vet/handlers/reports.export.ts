/**
 * Vet report export — generic PDF + Excel from a single structured payload.
 *
 *   vet:reports:exportPdf(payload)   → Chromium printToPDF (Arabic/RTL safe)
 *   vet:reports:exportExcel(payload) → SheetJS .xlsx (Arabic safe, RTL view for ar)
 *
 * The renderer builds the same ReportPayload for either format, so the two stay
 * in sync. Numbers stay numeric (money columns) so Excel can sum them; the PDF
 * builder formats money columns itself.
 */
import { ipcMain, dialog, app, BrowserWindow, shell } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import * as XLSX from 'xlsx'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Vet:Reports')

export type ReportColumn = { key: string; label: string; isMoney?: boolean; align?: 'left' | 'right' | 'center' }
export type ReportSection = {
  heading: string
  columns: ReportColumn[]
  rows: Array<Record<string, any>>
  totals?: Record<string, any>
}
export type ReportPayload = {
  title: string
  subtitle?: string
  lang?: 'en' | 'ar'
  currency?: string
  meta?: Array<{ label: string; value: string }>
  kpis?: Array<{ label: string; value: string }>
  sections: ReportSection[]
  fileBase?: string
}

const esc = (s: any): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const money = (v: any, cur = ''): string => {
  const n = Number(v)
  if (!Number.isFinite(n)) return esc(v)
  return `${cur}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const cellText = (col: ReportColumn, val: any, cur: string): string =>
  col.isMoney ? money(val, cur) : esc(val)

function buildHtml(p: ReportPayload): string {
  const rtl = p.lang === 'ar'
  const dir = rtl ? 'rtl' : 'ltr'
  const cur = p.currency ?? ''
  const generatedAt = new Date().toLocaleString(rtl ? 'ar' : 'en', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  const kpisHtml = (p.kpis ?? []).length
    ? `<div class="kpis">${p.kpis!.map(k => `
        <div class="kpi"><div class="kv">${esc(k.value)}</div><div class="kl">${esc(k.label)}</div></div>`).join('')}</div>`
    : ''

  const metaHtml = (p.meta ?? []).length
    ? `<div class="meta">${p.meta!.map(m => `<span><b>${esc(m.label)}:</b> ${esc(m.value)}</span>`).join('')}</div>`
    : ''

  const sectionsHtml = p.sections.map(sec => {
    const head = sec.columns.map(c =>
      `<th class="${c.isMoney || c.align === 'right' ? 'r' : c.align === 'center' ? 'c' : ''}">${esc(c.label)}</th>`).join('')
    const body = sec.rows.length
      ? sec.rows.map(row => `<tr>${sec.columns.map(c =>
          `<td class="${c.isMoney || c.align === 'right' ? 'r' : c.align === 'center' ? 'c' : ''}">${cellText(c, row[c.key], cur)}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${sec.columns.length}" class="empty">—</td></tr>`
    const totals = sec.totals
      ? `<tr class="totals">${sec.columns.map((c, i) =>
          `<td class="${c.isMoney || c.align === 'right' ? 'r' : c.align === 'center' ? 'c' : ''}">${
            i === 0 && sec.totals!![c.key] === undefined ? (rtl ? 'الإجمالي' : 'Total')
            : sec.totals![c.key] !== undefined ? cellText(c, sec.totals![c.key], cur) : ''}</td>`).join('')}</tr>`
      : ''
    return `
      <div class="section">
        <h2>${esc(sec.heading)}</h2>
        <table><thead><tr>${head}</tr></thead><tbody>${body}${totals}</tbody></table>
      </div>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="${rtl ? 'ar' : 'en'}" dir="${dir}"><head><meta charset="utf-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI','Tahoma','Arial','Helvetica Neue',sans-serif;font-size:12px;color:#1e293b;line-height:1.5;direction:${dir}}
.header{background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;padding:22px 28px}
.header h1{font-size:21px;font-weight:700;margin-bottom:3px}
.header .sub{font-size:11px;opacity:.85}
.meta{display:flex;flex-wrap:wrap;gap:6px 18px;padding:10px 28px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:11px;color:#475569}
.kpis{display:flex;flex-wrap:wrap;gap:10px;padding:14px 28px;background:#fff;border-bottom:1px solid #e2e8f0}
.kpi{flex:1 1 130px;text-align:center;padding:10px;border-radius:10px;background:#f5f3ff;border:1px solid #ede9fe}
.kpi .kv{font-size:17px;font-weight:800;color:#6d28d9}
.kpi .kl{font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin-top:2px}
.section{padding:14px 28px}
.section h2{font-size:13px;font-weight:700;color:#334155;margin-bottom:8px;padding-bottom:5px;border-bottom:2px solid #7c3aed}
table{width:100%;border-collapse:collapse;font-size:11px}
th,td{padding:6px 8px;text-align:${rtl ? 'right' : 'left'};border-bottom:1px solid #eef2f7}
th{background:#f1f5f9;color:#475569;font-weight:700;text-transform:uppercase;font-size:9px;letter-spacing:.03em}
td.r,th.r{text-align:${rtl ? 'left' : 'right'};font-variant-numeric:tabular-nums}
td.c,th.c{text-align:center}
td.empty{text-align:center;color:#94a3b8;padding:14px}
tr.totals td{font-weight:800;background:#faf5ff;border-top:2px solid #ddd6fe;color:#4c1d95}
.footer{padding:12px 28px;color:#94a3b8;font-size:10px;display:flex;justify-content:space-between;border-top:1px solid #e2e8f0;margin-top:8px}
@page{margin:14mm}
</style></head>
<body>
<div class="header"><h1>${esc(p.title)}</h1>${p.subtitle ? `<div class="sub">${esc(p.subtitle)}</div>` : ''}</div>
${metaHtml}
${kpisHtml}
${sectionsHtml}
<div class="footer"><span>BizFlow${p.lang === 'ar' ? ' — العيادة البيطرية' : ' — Vet Clinic'}</span><span>${esc(generatedAt)}</span></div>
</body></html>`
}

const safeBase = (s: string): string =>
  (s || 'report').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_').slice(0, 60)

export function registerVetReportExportHandlers() {
  ipcMain.handle('vet:reports:exportPdf', async (_e, payload: ReportPayload) => {
    try {
      const html = buildHtml(payload)
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export Report (PDF)',
        defaultPath: path.join(app.getPath('documents'), `${safeBase(payload.fileBase || payload.title)}.pdf`),
        filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
      })
      if (canceled || !filePath) return null

      const win = new BrowserWindow({
        width: 1000, height: 1300, show: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true, javascript: false }
      })
      const tmp = path.join(os.tmpdir(), `bizflow_vet_report_${Date.now()}.html`)
      fs.writeFileSync(tmp, html, 'utf-8')
      await win.loadFile(tmp)
      const pdf = await win.webContents.printToPDF({
        landscape: false, pageSize: 'A4', printBackground: true, marginsType: 0
      } as any)
      win.destroy()
      try { fs.unlinkSync(tmp) } catch { /* ignore */ }

      fs.writeFileSync(filePath, pdf)
      shell.openPath(filePath)
      return { success: true, filePath }
    } catch (err) {
      log.error('exportPdf', err)
      throw err
    }
  })

  ipcMain.handle('vet:reports:exportExcel', async (_e, payload: ReportPayload) => {
    try {
      const wb = XLSX.utils.book_new()
      if (payload.lang === 'ar') wb.Workbook = { Views: [{ RTL: true }] }

      // Summary sheet (title + meta + KPIs)
      const summaryAoa: any[][] = [[payload.title]]
      if (payload.subtitle) summaryAoa.push([payload.subtitle])
      summaryAoa.push([])
      for (const m of payload.meta ?? []) summaryAoa.push([m.label, m.value])
      if ((payload.kpis ?? []).length) {
        summaryAoa.push([])
        for (const k of payload.kpis!) summaryAoa.push([k.label, k.value])
      }
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryAoa), payload.lang === 'ar' ? 'ملخص' : 'Summary')

      const used = new Set<string>(['Summary', 'ملخص'])
      payload.sections.forEach((sec, idx) => {
        const header = sec.columns.map(c => c.label)
        const aoa: any[][] = [header]
        for (const row of sec.rows) {
          aoa.push(sec.columns.map(c => {
            const v = row[c.key]
            return c.isMoney ? (Number.isFinite(Number(v)) ? Number(v) : v) : v
          }))
        }
        if (sec.totals) {
          aoa.push(sec.columns.map((c, i) => {
            if (sec.totals![c.key] !== undefined) {
              const v = sec.totals![c.key]
              return c.isMoney ? (Number.isFinite(Number(v)) ? Number(v) : v) : v
            }
            return i === 0 ? (payload.lang === 'ar' ? 'الإجمالي' : 'Total') : ''
          }))
        }
        // Unique, Excel-safe sheet name (≤31 chars).
        let name = (sec.heading || `Sheet ${idx + 1}`).replace(/[\\/?*[\]:]/g, '').slice(0, 28) || `Sheet ${idx + 1}`
        let n = name; let k = 2
        while (used.has(n)) { n = `${name.slice(0, 25)} ${k++}` }
        used.add(n)
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), n)
      })

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export Report (Excel)',
        defaultPath: path.join(app.getPath('documents'), `${safeBase(payload.fileBase || payload.title)}.xlsx`),
        filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
      })
      if (canceled || !filePath) return null

      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      fs.writeFileSync(filePath, buf)
      shell.openPath(filePath)
      return { success: true, filePath }
    } catch (err) {
      log.error('exportExcel', err)
      throw err
    }
  })
}
