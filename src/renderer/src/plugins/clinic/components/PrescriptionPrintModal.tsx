import { useState, useRef } from 'react'
import { X, Printer, Edit3, Check, Pill } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface RxMedicine {
  id?: string
  medicineName: string
  dosage?: string | null
  frequency?: string | null
  duration?: string | null
  quantity?: number | null
  instructions?: string | null
}

interface RxLabOrder {
  testName: string
  notes?: string
}

interface RxSession {
  id: string
  visitDate: string
  doctorName?: string | null
  chiefComplaint: string
  diagnosis?: string | null
  notes?: string | null
  labOrders?: RxLabOrder[]
  prescriptions: RxMedicine[]
}

interface RxPatient {
  name: string
  phone?: string | null
  dateOfBirth?: string | null
  bloodType?: string | null
  gender?: string | null
}

interface Props {
  session: RxSession
  patient: RxPatient
  onClose: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const HEADER_KEY = 'clinicRxHeader'

interface RxHeader {
  clinicName: string
  address: string
  phone: string
  workingHours: string
  extra: string
}

function loadHeader(): RxHeader {
  try {
    return JSON.parse(localStorage.getItem(HEADER_KEY) ?? '{}')
  } catch { return {} as RxHeader }
}

function saveHeader(h: RxHeader) {
  localStorage.setItem(HEADER_KEY, JSON.stringify(h))
}

function calcAge(dob?: string | null): string {
  if (!dob) return ''
  const diff = Date.now() - new Date(dob).getTime()
  const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
  return `${age} yrs`
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return iso }
}

// ─── Build printable HTML ─────────────────────────────────────────────────────
function buildPrintHtml(
  session: RxSession,
  patient: RxPatient,
  header: RxHeader
): string {
  const medicines = session.prescriptions.filter(rx => rx.medicineName.trim())
  const labs = session.labOrders?.filter(l => l.testName.trim()) ?? []
  const age = calcAge(patient.dateOfBirth)

  const esc = (s: string | null | undefined) =>
    String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const rxItems = medicines.map((rx, i) => `
    <div class="rx-item">
      <div class="rx-num">${i + 1}</div>
      <div class="rx-body">
        <div class="rx-name">${esc(rx.medicineName)}${rx.dosage ? ` <span class="rx-dosage">${esc(rx.dosage)}</span>` : ''}</div>
        <div class="rx-detail">
          ${rx.frequency ? `<span>🕐 ${esc(rx.frequency)}</span>` : ''}
          ${rx.duration ? `<span>📅 ${esc(rx.duration)}</span>` : ''}
          ${rx.quantity ? `<span>📦 Qty: ${rx.quantity}</span>` : ''}
        </div>
        ${rx.instructions ? `<div class="rx-instr">${esc(rx.instructions)}</div>` : ''}
      </div>
    </div>`).join('')

  const labItems = labs.map((l, i) => `
    <div class="lab-item">
      <div class="lab-num">${i + 1}</div>
      <div class="lab-body">
        <div class="lab-name">${esc(l.testName)}</div>
        ${l.notes ? `<div class="lab-notes">${esc(l.notes)}</div>` : ''}
      </div>
    </div>`).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Prescription – ${esc(patient.name)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #111; background: #fff; padding: 32px 40px; }

  /* Header */
  .clinic-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; border-bottom: 2.5px solid #0d9488; margin-bottom: 16px; }
  .clinic-name { font-size: 22px; font-weight: 800; color: #0d9488; letter-spacing: -0.3px; }
  .clinic-sub { font-size: 11px; color: #666; margin-top: 3px; line-height: 1.6; }
  .rx-label { font-size: 48px; font-weight: 900; color: #0d9488; line-height: 1; opacity: 0.18; margin-top: -6px; }
  .meta-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding: 10px 14px; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; }
  .meta-bar .label { font-size: 10px; text-transform: uppercase; color: #5eead4; font-weight: 700; letter-spacing: 0.8px; }
  .meta-bar .value { font-size: 13px; font-weight: 600; color: #111; }
  .meta-cell { flex: 1; }

  /* Patient */
  .patient-box { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 16px; padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 8px; }
  .patient-field .label { font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 0.6px; margin-bottom: 2px; }
  .patient-field .value { font-size: 13px; font-weight: 600; color: #1e293b; }

  /* Rx section */
  .rx-section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 10px; }
  .rx-item { display: flex; gap: 12px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed #e2e8f0; }
  .rx-item:last-child { border-bottom: none; }
  .rx-num { width: 24px; height: 24px; background: #0d9488; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; flex-shrink: 0; margin-top: 1px; }
  .rx-name { font-size: 15px; font-weight: 700; color: #0f172a; }
  .rx-dosage { font-size: 12px; font-weight: 600; color: #0d9488; background: #f0fdfa; padding: 1px 6px; border-radius: 4px; margin-left: 4px; }
  .rx-detail { display: flex; gap: 12px; margin-top: 3px; font-size: 12px; color: #475569; }
  .rx-instr { margin-top: 4px; font-size: 11px; color: #64748b; font-style: italic; }

  /* Lab orders */
  .lab-section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #6366f1; margin: 14px 0 8px; }
  .lab-item { display: flex; gap: 10px; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dashed #e2e8f0; }
  .lab-item:last-child { border-bottom: none; }
  .lab-num { width: 22px; height: 22px; background: #6366f1; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; flex-shrink: 0; margin-top: 1px; }
  .lab-name { font-size: 13px; font-weight: 600; color: #1e293b; }
  .lab-notes { font-size: 11px; color: #64748b; font-style: italic; margin-top: 2px; }

  /* Clinical notes */
  .clinical-box { margin-top: 16px; padding: 12px 14px; border-left: 3px solid #0d9488; background: #f8fafc; border-radius: 0 8px 8px 0; }
  .clinical-box .cl-label { font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 0.6px; margin-bottom: 4px; }
  .clinical-box .cl-value { font-size: 13px; color: #1e293b; line-height: 1.5; }

  /* Footer / signature */
  .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
  .sig-block { text-align: center; }
  .sig-line { width: 180px; border-bottom: 1.5px solid #0d9488; margin-bottom: 6px; height: 32px; }
  .sig-label { font-size: 11px; color: #64748b; }
  .sig-name { font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 2px; }
  .footer-note { font-size: 10px; color: #94a3b8; max-width: 200px; text-align: right; line-height: 1.6; }

  @page { margin: 0.5cm; size: A5; }
  @media print { body { padding: 0; min-height: 18cm; } }
</style>
</head>
<body>
  <!-- Header -->
  <div class="clinic-header">
    <div>
      <div class="clinic-name">${esc(header.clinicName) || 'Medical Clinic'}</div>
      <div class="clinic-sub">
        ${header.address ? esc(header.address) + '<br/>' : ''}
        ${header.phone ? '📞 ' + esc(header.phone) : ''}
        ${header.workingHours ? '<br/>🕐 ' + esc(header.workingHours) : ''}
        ${header.extra ? '<br/>' + esc(header.extra) : ''}
      </div>
    </div>
    <div class="rx-label">℞</div>
  </div>

  <!-- Meta bar -->
  <div class="meta-bar">
    <div class="meta-cell">
      <div class="label">Date</div>
      <div class="value">${fmtDate(session.visitDate)}</div>
    </div>
    <div class="meta-cell">
      <div class="label">Doctor</div>
      <div class="value">${session.doctorName ? 'Dr. ' + esc(session.doctorName) : '—'}</div>
    </div>
    <div class="meta-cell" style="text-align:right">
      <div class="label">Visit</div>
      <div class="value">${esc(session.chiefComplaint)}</div>
    </div>
  </div>

  <!-- Patient info -->
  <div class="patient-box">
    <div class="patient-field">
      <div class="label">Patient</div>
      <div class="value">${esc(patient.name)}</div>
    </div>
    <div class="patient-field">
      <div class="label">Age / Gender</div>
      <div class="value">${[age, patient.gender].filter(Boolean).join(' · ') || '—'}</div>
    </div>
    <div class="patient-field">
      <div class="label">Phone</div>
      <div class="value">${esc(patient.phone) || '—'}</div>
    </div>
    ${patient.bloodType ? `
    <div class="patient-field">
      <div class="label">Blood Type</div>
      <div class="value">${esc(patient.bloodType)}</div>
    </div>` : ''}
  </div>

  <!-- Prescription items -->
  <div class="rx-section-title">Prescribed Medicines</div>
  ${rxItems}

  ${labs.length > 0 ? `
  <div class="lab-section-title">Lab Investigations Requested</div>
  ${labItems}` : ''}

  <!-- Clinical notes -->
  ${session.diagnosis ? `
  <div class="clinical-box">
    <div class="cl-label">Diagnosis</div>
    <div class="cl-value">${esc(session.diagnosis)}</div>
  </div>` : ''}
  ${session.notes ? `
  <div class="clinical-box" style="margin-top:8px">
    <div class="cl-label">Notes & Instructions</div>
    <div class="cl-value">${esc(session.notes)}</div>
  </div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <div style="font-size:11px; color:#94a3b8; line-height:1.7;">
      <div>Issued: ${fmtDate(session.visitDate)}</div>
      <div>Valid for: 30 days</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Doctor's Signature</div>
      ${session.doctorName ? `<div class="sig-name">Dr. ${esc(session.doctorName)}</div>` : ''}
    </div>
    <div class="footer-note">
      This prescription is valid for the indicated medicines only.<br/>
      Keep out of reach of children.
    </div>
  </div>
</body>
</html>`
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PrescriptionPrintModal({ session, patient, onClose }: Props) {
  const [header, setHeader] = useState<RxHeader>(() => {
    const h = loadHeader()
    return {
      clinicName:    h.clinicName ?? '',
      address:       h.address ?? '',
      phone:         h.phone ?? '',
      workingHours:  (h as any).workingHours ?? '',
      extra:         h.extra ?? '',
    }
  })
  const [editingHeader, setEditingHeader] = useState(!header.clinicName)
  const [savedHeader, setSavedHeader] = useState(false)
  const printRef = useRef(false)

  const medicines = session.prescriptions.filter(rx => rx.medicineName.trim())
  const labs = session.labOrders?.filter(l => l.testName.trim()) ?? []

  function handleSaveHeader() {
    saveHeader(header)
    setEditingHeader(false)
    setSavedHeader(true)
    setTimeout(() => setSavedHeader(false), 2000)
  }

  function handlePrint() {
    if (printRef.current) return
    printRef.current = true
    const html = buildPrintHtml(session, patient, header)
    const win = window.open('', '_blank', 'width=750,height=960,scrollbars=yes')
    if (!win) { printRef.current = false; return }
    win.document.open()
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => {
      win.print()
      printRef.current = false
    }, 400)
  }

  const inputCls = 'w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-200 dark:border-teal-800/40">
              <Pill size={16} className="text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Medical Prescription</h2>
              <p className="text-[11px] text-slate-400">{patient.name} · {new Date(session.visitDate).toLocaleDateString()}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Clinic header settings */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Clinic Header (printed on slip)</span>
              <button
                type="button"
                onClick={() => editingHeader ? handleSaveHeader() : setEditingHeader(true)}
                className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
                  editingHeader
                    ? 'bg-teal-500 text-white hover:bg-teal-600'
                    : 'text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20'
                }`}
              >
                {editingHeader ? <Check size={12} /> : <Edit3 size={12} />}
                {editingHeader ? (savedHeader ? 'Saved!' : 'Save') : 'Edit'}
              </button>
            </div>
            {editingHeader ? (
              <div className="p-4 grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Clinic Name *</label>
                  <input className={inputCls} placeholder="e.g. Al-Shifa Medical Clinic" value={header.clinicName} onChange={e => setHeader(h => ({ ...h, clinicName: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Address</label>
                  <input className={inputCls} placeholder="123 Main St, City" value={header.address} onChange={e => setHeader(h => ({ ...h, address: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Phone</label>
                  <input className={inputCls} placeholder="+1 555 0100" value={header.phone} onChange={e => setHeader(h => ({ ...h, phone: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Working Hours</label>
                  <input className={inputCls} placeholder="e.g. Sat–Thu 9am–5pm" value={header.workingHours} onChange={e => setHeader(h => ({ ...h, workingHours: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Extra line (e.g. license, specialty)</label>
                  <input className={inputCls} placeholder="License #12345 · General Practice" value={header.extra} onChange={e => setHeader(h => ({ ...h, extra: e.target.value }))} />
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                {header.clinicName ? (
                  <div className="space-y-0.5">
                    <p className="font-semibold">{header.clinicName}</p>
                    {header.address && <p className="text-xs text-slate-500">{header.address}</p>}
                    {header.phone && <p className="text-xs text-slate-500">{header.phone}</p>}
                    {header.extra && <p className="text-xs text-slate-500">{header.extra}</p>}
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs italic">No clinic info set — click Edit to add your clinic name, address and phone</p>
                )}
              </div>
            )}
          </div>

          {/* Prescription preview */}
          <div className="rounded-xl border-2 border-teal-200 dark:border-teal-800/50 overflow-hidden">
            {/* Slip header */}
            <div className="flex items-start justify-between px-5 py-4 bg-teal-50 dark:bg-teal-900/20 border-b border-teal-200 dark:border-teal-800/40">
              <div>
                <p className="text-lg font-bold text-teal-700 dark:text-teal-300">{header.clinicName || 'Medical Clinic'}</p>
                {header.address && <p className="text-xs text-teal-600/70 dark:text-teal-400/70">{header.address}</p>}
                {header.phone && <p className="text-xs text-teal-600/70 dark:text-teal-400/70">📞 {header.phone}</p>}
              </div>
              <span className="text-5xl font-black text-teal-300 dark:text-teal-700 leading-none select-none">℞</span>
            </div>

            <div className="px-5 py-4 bg-white dark:bg-slate-800 space-y-4">
              {/* Patient + date row */}
              <div className="flex flex-wrap gap-x-8 gap-y-1 text-xs pb-3 border-b border-dashed border-slate-200 dark:border-slate-700">
                <div><span className="text-slate-400 font-semibold uppercase text-[10px]">Patient </span><span className="font-bold text-slate-800 dark:text-slate-100">{patient.name}</span></div>
                {calcAge(patient.dateOfBirth) && <div><span className="text-slate-400 font-semibold uppercase text-[10px]">Age </span><span className="text-slate-700 dark:text-slate-200">{calcAge(patient.dateOfBirth)}</span></div>}
                {patient.phone && <div><span className="text-slate-400 font-semibold uppercase text-[10px]">Phone </span><span className="text-slate-700 dark:text-slate-200">{patient.phone}</span></div>}
                {patient.bloodType && <div><span className="text-slate-400 font-semibold uppercase text-[10px]">Blood </span><span className="font-bold text-red-500">{patient.bloodType}</span></div>}
                <div className="ml-auto"><span className="text-slate-400 font-semibold uppercase text-[10px]">Date </span><span className="text-slate-700 dark:text-slate-200">{fmtDate(session.visitDate)}</span></div>
                {session.doctorName && <div><span className="text-slate-400 font-semibold uppercase text-[10px]">Dr. </span><span className="font-semibold text-slate-800 dark:text-slate-100">{session.doctorName}</span></div>}
              </div>

              {/* Lab orders in preview */}
              {labs.length > 0 && (
                <div className="rounded-lg border border-indigo-200 dark:border-indigo-800 overflow-hidden">
                  <div className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-200 dark:border-indigo-800">
                    <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">🔬 Lab Investigations</p>
                  </div>
                  <div className="px-3 py-2 space-y-1.5">
                    {labs.map((l, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <div className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{l.testName}</p>
                          {l.notes && <p className="text-[11px] text-slate-400 italic">{l.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Medicines */}
              {medicines.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4 italic">No medicines added to this session</p>
              ) : (
                <div className="space-y-3">
                  {medicines.map((rx, i) => (
                    <div key={rx.id ?? i} className="flex gap-3 items-start">
                      <div className="w-6 h-6 rounded-full bg-teal-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">{rx.medicineName}</span>
                          {rx.dosage && <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded-full">{rx.dosage}</span>}
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {rx.frequency && <span>🕐 {rx.frequency}</span>}
                          {rx.duration && <span>📅 {rx.duration}</span>}
                          {rx.quantity && <span>📦 Qty: {rx.quantity}</span>}
                        </div>
                        {rx.instructions && <p className="text-[11px] text-slate-400 italic mt-0.5">{rx.instructions}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Diagnosis / Notes */}
              {(session.diagnosis || session.notes) && (
                <div className="pt-3 border-t border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                  {session.diagnosis && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diagnosis: </span>
                      <span className="text-xs text-slate-700 dark:text-slate-200">{session.diagnosis}</span>
                    </div>
                  )}
                  {session.notes && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notes: </span>
                      <span className="text-xs text-slate-600 dark:text-slate-300">{session.notes}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Signature line */}
              <div className="flex justify-end pt-4 mt-2 border-t border-dashed border-slate-200 dark:border-slate-700">
                <div className="text-center">
                  <div className="w-44 border-b-2 border-teal-400 mb-1 h-6" />
                  <p className="text-[10px] text-slate-400">Doctor's Signature</p>
                  {session.doctorName && <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-0.5">Dr. {session.doctorName}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 rounded-b-2xl">
          <p className="text-xs text-slate-400">
            {medicines.length} medicine{medicines.length !== 1 ? 's' : ''}{labs.length > 0 ? ` · ${labs.length} lab order${labs.length !== 1 ? 's' : ''}` : ''} · Clinic header saved for future prints
          </p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
              Close
            </button>
            <button
              onClick={handlePrint}
              disabled={medicines.length === 0 && labs.length === 0}
              className="flex items-center gap-2 px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Printer size={15} />
              Print Prescription
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
