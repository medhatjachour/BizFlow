import { ipcMain, dialog, app, BrowserWindow, shell } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Clinic:PDF')

function esc(s: string | null | undefined): string {
  if (!s) return '–'
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtDate(date: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!date) return '–'
  try {
    return new Date(date).toLocaleDateString('en', opts ?? { year: 'numeric', month: 'long', day: 'numeric' })
  } catch { return '–' }
}

function buildHtml(data: { patient: any; sessions: any[]; stats: any; checkResults: any[]; exportDate: string }): string {
  const { patient, sessions, stats, checkResults, exportDate } = data

  const formatVitals = (raw: string | null | undefined): string => {
    if (!raw) return ''
    try {
      const v = JSON.parse(raw)
      return Object.entries(v)
        .filter(([, val]) => val)
        .map(([k, val]) => `${k.toUpperCase()}: ${esc(String(val))}`)
        .join(' &nbsp;·&nbsp; ')
    } catch { return '' }
  }

  const sessionsHtml = sessions.map((s, i) => {
    const vitalsStr = formatVitals(s.vitals)
    const rxRows = (s.prescriptions ?? []).map((rx: any) => `
      <tr>
        <td>${esc(rx.medicineName)}</td>
        <td>${esc(rx.dosage)}</td>
        <td>${esc(rx.frequency)}</td>
        <td>${esc(rx.duration)}</td>
      </tr>`).join('')

    return `
    <div class="session">
      <div class="session-header">
        <span class="snum">#${i + 1}</span>
        <span class="sdate">${fmtDate(s.visitDate)}</span>
        <span class="badge vt-${esc(s.visitType)}">${esc(s.visitType).replace('_', ' ')}</span>
        ${s.doctorName ? `<span class="doctor">Dr. ${esc(s.doctorName)}</span>` : ''}
        <span class="pay-badge pay-${esc(s.paymentStatus)}">${esc(s.paymentStatus)}</span>
      </div>
      <div class="session-body">
        <p class="row"><strong>Chief Complaint:</strong> ${esc(s.chiefComplaint)}</p>
        ${s.diagnosis ? `<p class="row"><strong>Diagnosis:</strong> ${esc(s.diagnosis)}</p>` : ''}
        ${s.notes ? `<p class="row"><strong>Notes:</strong> ${esc(s.notes)}</p>` : ''}
        ${vitalsStr ? `<p class="row"><strong>Vitals:</strong> ${vitalsStr}</p>` : ''}
        ${s.followUpDate ? `<p class="row"><strong>Follow-up:</strong> ${fmtDate(s.followUpDate)}</p>` : ''}
        ${s.amountCharged ? `<p class="row"><strong>Charged:</strong> ${Number(s.amountCharged).toFixed(2)} &nbsp;|&nbsp; <strong>Paid:</strong> ${Number(s.amountPaid ?? 0).toFixed(2)}</p>` : ''}
        ${rxRows ? `
          <div class="prescriptions">
            <p class="rx-title">Prescriptions</p>
            <table><thead><tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr></thead>
            <tbody>${rxRows}</tbody></table>
          </div>` : ''}
      </div>
    </div>`
  }).join('')

  const checkResultsHtml = checkResults.length > 0 ? `
    <div class="section">
      <h2>Check Results (${checkResults.length})</h2>
      <table><thead><tr><th>Title</th><th>Date</th><th>File</th><th>Notes</th></tr></thead>
      <tbody>${checkResults.map((r) => `<tr>
        <td>${esc(r.title)}</td>
        <td>${fmtDate(r.resultDate, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
        <td>${esc(r.fileName)}</td>
        <td>${esc(r.description)}</td>
      </tr>`).join('')}</tbody></table>
    </div>` : ''

  const age = patient.dateOfBirth
    ? `${Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))} years`
    : '–'

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#1e293b;line-height:1.5}
.header{background:linear-gradient(135deg,#0d9488,#059669);color:white;padding:22px 30px}
.header h1{font-size:21px;font-weight:700;margin-bottom:3px}
.header .sub{font-size:11px;opacity:.85}
.patient-info{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;padding:16px 30px;background:#f8fafc;border-bottom:1px solid #e2e8f0}
.info-item label{font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;font-weight:700}
.info-item p{font-size:12px;font-weight:500;color:#1e293b;margin-top:2px}
.allergy p{color:#dc2626!important;font-weight:700!important}
.stats-row{display:flex;gap:10px;padding:12px 30px;background:white;border-bottom:1px solid #e2e8f0}
.stat{flex:1;text-align:center;padding:8px;border-radius:8px;background:#f1f5f9}
.stat .val{font-size:18px;font-weight:700;color:#0d9488}
.stat .lbl{font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.05em}
.section{padding:16px 30px}
.section h2{font-size:13px;font-weight:700;color:#334155;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #0d9488}
.session{margin-bottom:12px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;page-break-inside:avoid}
.session-header{display:flex;align-items:center;gap:8px;padding:7px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;flex-wrap:wrap}
.snum{font-size:10px;font-weight:700;color:#94a3b8;min-width:18px}
.sdate{font-weight:600;font-size:12px;color:#1e293b}
.badge{font-size:9px;padding:2px 7px;border-radius:99px;font-weight:600;text-transform:capitalize}
.vt-first_visit{background:#ede9fe;color:#7c3aed}
.vt-follow_up{background:#e0f2fe;color:#0369a1}
.vt-routine{background:#ccfbf1;color:#0f766e}
.vt-emergency{background:#fee2e2;color:#dc2626}
.doctor{font-size:10px;color:#64748b}
.pay-badge{font-size:9px;padding:2px 7px;border-radius:99px;font-weight:600;margin-left:auto}
.pay-paid{background:#dcfce7;color:#15803d}
.pay-partial{background:#fef9c3;color:#a16207}
.pay-unpaid{background:#fee2e2;color:#dc2626}
.pay-waived{background:#f1f5f9;color:#64748b}
.session-body{padding:9px 12px}
.row{margin-bottom:4px;font-size:11px;color:#334155}
.row strong{color:#1e293b}
.prescriptions{margin-top:8px}
.rx-title{font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.04em;margin-bottom:5px}
table{width:100%;border-collapse:collapse;margin-top:6px;font-size:11px}
th{background:#f1f5f9;text-align:left;padding:5px 9px;font-weight:700;color:#475569;border:1px solid #e2e8f0}
td{padding:4px 9px;border:1px solid #e2e8f0;color:#334155}
tr:nth-child(even) td{background:#f8fafc}
.footer{padding:10px 30px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;display:flex;justify-content:space-between}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.session{page-break-inside:avoid}}
</style>
</head><body>
<div class="header">
  <h1>Medical Record — ${esc(patient.name)}</h1>
  <p class="sub">Generated ${esc(exportDate)} &nbsp;·&nbsp; BizFlow Clinic Management</p>
</div>
<div class="patient-info">
  <div class="info-item"><label>Phone</label><p>${esc(patient.phone)}</p></div>
  <div class="info-item"><label>Date of Birth</label><p>${fmtDate(patient.dateOfBirth)}</p></div>
  <div class="info-item"><label>Age</label><p>${age}</p></div>
  <div class="info-item"><label>Gender</label><p>${esc(patient.gender)}</p></div>
  <div class="info-item"><label>Blood Type</label><p>${esc(patient.bloodType)}</p></div>
  <div class="info-item"><label>National ID</label><p>${esc(patient.nationalId)}</p></div>
  <div class="info-item"><label>Email</label><p>${esc(patient.email)}</p></div>
  <div class="info-item" style="grid-column:1/-1"><label>Address</label><p>${esc(patient.address)}</p></div>
  ${patient.allergies ? `<div class="info-item allergy" style="grid-column:1/-1"><label>⚠ Allergies / Alerts</label><p>${esc(patient.allergies)}</p></div>` : ''}
  ${patient.medicalNotes ? `<div class="info-item" style="grid-column:1/-1"><label>Medical Notes</label><p>${esc(patient.medicalNotes)}</p></div>` : ''}
</div>
<div class="stats-row">
  <div class="stat"><div class="val">${stats?.totalSessions ?? sessions.length}</div><div class="lbl">Total Visits</div></div>
  <div class="stat"><div class="val">${stats?.totalCharged != null ? Number(stats.totalCharged).toFixed(0) : '–'}</div><div class="lbl">Total Charged</div></div>
  <div class="stat"><div class="val">${stats?.totalPaid != null ? Number(stats.totalPaid).toFixed(0) : '–'}</div><div class="lbl">Total Paid</div></div>
  <div class="stat" style="${(stats?.outstanding ?? 0) > 0 ? 'color:#dc2626' : ''}"><div class="val" style="${(stats?.outstanding ?? 0) > 0 ? 'color:#dc2626' : ''}">${stats?.outstanding != null ? Number(stats.outstanding).toFixed(0) : '0'}</div><div class="lbl">Outstanding</div></div>
  <div class="stat"><div class="val">${checkResults.length}</div><div class="lbl">Check Results</div></div>
</div>
${sessions.length > 0 ? `<div class="section"><h2>Session History (${sessions.length} visits)</h2>${sessionsHtml}</div>` : ''}
${checkResultsHtml}
<div class="footer">
  <span>Patient ID: ${esc(patient.id)}</span>
  <span>BizFlow Clinic &nbsp;·&nbsp; ${esc(exportDate)}</span>
</div>
</body></html>`
}

export function registerClinicPdfHandlers() {
  ipcMain.handle('clinic:patients:exportPdf', async (_e, data: {
    patient: any; sessions: any[]; stats: any; checkResults: any[]
  }) => {
    try {
      const exportDate = new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })
      const html = buildHtml({ ...data, exportDate })

      const safeName = (data.patient.name as string)
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 50)

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export Patient Medical Record',
        defaultPath: path.join(app.getPath('documents'), `${safeName}_medical_record.pdf`),
        filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
      })

      if (canceled || !filePath) return null

      const win = new BrowserWindow({
        width: 900, height: 1200, show: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true, javascript: false }
      })

      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

      const pdfBuffer = await win.webContents.printToPDF({
        landscape: false,
        pageSize: 'A4',
        printBackground: true,
        marginsType: 0
      } as any)

      win.destroy()

      fs.writeFileSync(filePath, pdfBuffer)
      shell.openPath(filePath)

      return { filePath, success: true }
    } catch (err) {
      log.error('exportPdf error:', err)
      throw err
    }
  })
}
