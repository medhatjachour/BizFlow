import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Loader2, AlertTriangle, Phone, Mail, MapPin,
  CreditCard, CheckCircle2, Clock, XCircle, MinusCircle, Banknote,
  DollarSign, Pencil, ChevronDown, ChevronUp, Stethoscope, Calendar,
  Activity, TrendingUp, User, FileText, Trash2, Upload, Eye, FilePlus, Download, Heart, X
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import SessionFormModal from './components/SessionFormModal'
import PatientFormModal from './components/PatientFormModal'
import type { Patient } from './index'

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface Prescription {
  id: string
  medicineName: string
  dosage?: string | null
  frequency?: string | null
  duration?: string | null
  quantity?: number | null
  instructions?: string | null
  isActive?: boolean
  startDate?: string | null
  stoppedAt?: string | null
  stopReason?: string | null
}

interface Session {
  id: string
  visitDate: string
  visitType: string
  doctorName?: string | null
  chiefComplaint: string
  vitals?: string | null
  diagnosis?: string | null
  notes?: string | null
  followUpDate?: string | null
  status: string
  amountCharged?: number | null
  amountPaid?: number | null
  paymentStatus: string
  paymentMethod?: string | null
  prescriptions: Prescription[]
}

interface PatientStats {
  totalSessions: number
  firstVisit: string | null
  lastVisit: string | null
  topDiagnosis: string | null
  nextFollowUp: string | null
  totalCharged: number
  totalPaid: number
  outstanding: number
}

interface CheckResult {
  id: string
  patientId: string
  title: string
  description?: string | null
  fileName: string
  filePath: string
  fileSize?: number | null
  resultDate: string
  createdAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseVitals(raw?: string | null): Record<string, string> {
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

function calcAge(dob?: string | null): string {
  if (!dob) return '–'
  return `${Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000))} yrs`
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

// ─── QuickPayModal ───────────────────────────────────────────────────────────
function QuickPayModal({
  sessions,
  onClose,
  onPaid,
}: {
  sessions: Session[]
  onClose: () => void
  onPaid: () => void
}) {
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')

  const unpaidSessions = sessions
    .filter((s) => (s.amountCharged ?? 0) > (s.amountPaid ?? 0))
    .sort((a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime())

  const totalOutstanding = unpaidSessions.reduce(
    (sum, s) => sum + ((s.amountCharged ?? 0) - (s.amountPaid ?? 0)),
    0
  )

  async function handlePay() {
    const paying = parseFloat(amount)
    if (isNaN(paying) || paying <= 0) return showToast('error', 'Enter a valid amount')
    if (paying > totalOutstanding) return showToast('error', 'Amount exceeds outstanding balance')
    setSaving(true)
    try {
      let remaining = paying
      for (const s of unpaidSessions) {
        if (remaining <= 0) break
        const due = (s.amountCharged ?? 0) - (s.amountPaid ?? 0)
        const applying = Math.min(due, remaining)
        const newPaid = (s.amountPaid ?? 0) + applying
        const newCharged = s.amountCharged ?? 0
        const newStatus = newPaid >= newCharged ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid'
        await window.api.clinic.sessions.update(s.id, {
          amountPaid: newPaid,
          paymentStatus: newStatus,
          paymentMethod: method,
        })
        remaining -= applying
      }
      showToast('success', `Payment of ${fmt(paying)} recorded`)
      onPaid()
    } catch {
      showToast('error', 'Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  function fmt(n: number) {
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Collect Payment</h2>
            <p className="text-xs text-slate-400 mt-0.5">Applied oldest-to-newest across sessions</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {/* Outstanding sessions list */}
          <div className="space-y-1.5 max-h-44 overflow-y-auto">
            {unpaidSessions.map((s) => {
              const due = (s.amountCharged ?? 0) - (s.amountPaid ?? 0)
              return (
                <div key={s.id} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                  <div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {new Date(s.visitDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {s.diagnosis && <span className="text-slate-400 ml-1.5">— {s.diagnosis}</span>}
                  </div>
                  <span className="font-bold text-red-500 dark:text-red-400">{fmt(due)}</span>
                </div>
              )
            })}
          </div>
          {/* Total */}
          <div className="flex items-center justify-between rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 px-4 py-3">
            <span className="text-sm text-red-700 dark:text-red-400 font-semibold">Total Outstanding</span>
            <span className="text-xl font-black text-red-600 dark:text-red-400">{fmt(totalOutstanding)}</span>
          </div>
          {/* Amount + method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Amount to Pay</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={totalOutstanding}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={fmt(totalOutstanding)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="transfer">Transfer</option>
                <option value="insurance">Insurance</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 transition-colors">Cancel</button>
          <button
            onClick={handlePay}
            disabled={saving || !amount || parseFloat(amount) <= 0}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 shadow-sm shadow-emerald-500/20"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Record Payment
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Config ───────────────────────────────────────────────────────────────────
const visitTypeConfig: Record<string, { label: string; cls: string; dotCls: string }> = {
  first_visit: { label: 'First Visit', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300', dotCls: 'bg-violet-500 ring-violet-200 dark:ring-violet-800' },
  follow_up:   { label: 'Follow-up',   cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',             dotCls: 'bg-sky-500 ring-sky-200 dark:ring-sky-800' },
  routine:     { label: 'Routine',     cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',         dotCls: 'bg-teal-500 ring-teal-200 dark:ring-teal-800' },
  emergency:   { label: 'Emergency',   cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',             dotCls: 'bg-red-500 ring-red-200 dark:ring-red-800' }
}

const defaultDotCls = 'bg-slate-400 ring-slate-200 dark:ring-slate-700'

const paymentStatusConfig: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  paid:    { label: 'Paid',    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
  partial: { label: 'Partial', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',        icon: Clock },
  unpaid:  { label: 'Unpaid',  cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',                icon: XCircle },
  waived:  { label: 'Waived',  cls: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',           icon: MinusCircle }
}

const paymentMethodIcons: Record<string, React.ElementType> = {
  cash: Banknote, card: CreditCard, insurance: DollarSign, other: DollarSign
}

const bloodTypeColors: Record<string, string> = {
  'A+': 'bg-red-100 text-red-700', 'A-': 'bg-red-100 text-red-700',
  'B+': 'bg-blue-100 text-blue-700', 'B-': 'bg-blue-100 text-blue-700',
  'O+': 'bg-emerald-100 text-emerald-700', 'O-': 'bg-emerald-100 text-emerald-700',
  'AB+': 'bg-purple-100 text-purple-700', 'AB-': 'bg-purple-100 text-purple-700'
}

const vitalLabels: Record<string, string> = {
  bp: 'BP', temp: 'Temp', weight: 'Weight', height: 'Height', pulse: 'Pulse', o2sat: 'O₂ Sat'
}

const statusColors: Record<string, string> = {
  completed: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  active:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
}

const avatarColors = [
  'from-teal-500 to-teal-600',
  'from-violet-500 to-violet-600',
  'from-sky-500 to-sky-600',
  'from-amber-500 to-amber-600',
  'from-rose-500 to-rose-600',
  'from-indigo-500 to-indigo-600'
]

// ─── Upload Check Result Modal ────────────────────────────────────────────────
function UploadCheckResultModal({
  patientId,
  onClose,
  onSaved
}: {
  patientId: string
  onClose: () => void
  onSaved: () => void
}) {
  const { showToast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [resultDate, setResultDate] = useState(new Date().toISOString().slice(0, 10))
  const [uploading, setUploading] = useState(false)

  const handleUpload = async () => {
    if (!title.trim()) { showToast('error', 'Please enter a title'); return }
    setUploading(true)
    try {
      const result = await window.api.clinic.checkResults.upload({
        patientId,
        title: title.trim(),
        description: description.trim() || undefined,
        resultDate
      })
      if (result) {
        showToast('success', 'Check result uploaded successfully')
        onSaved()
      }
      // If result is null the user cancelled the file dialog — just close
      onClose()
    } catch {
      showToast('error', 'Failed to upload check result')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
              <FilePlus className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Upload Check Result</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Blood Test, X-Ray, MRI Scan"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Result Date</label>
            <input
              type="date"
              value={resultDate}
              onChange={(e) => setResultDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Notes (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Any notes about this result..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2">
            <Upload className="h-3.5 w-3.5 flex-shrink-0" />
            After clicking Upload, a file picker will open — select a PDF file.
          </p>
        </div>

        <div className="flex items-center gap-3 px-6 pb-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || !title.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload PDF
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── PDF Viewer Modal (in-app) ────────────────────────────────────────────────
function PdfViewerModal({ result, onClose }: { result: CheckResult; onClose: () => void }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let url: string | null = null
    window.api.clinic.checkResults.getBuffer(result.filePath)
      .then((base64) => {
        if (!base64) { setError(true); setLoading(false); return }
        const binary = atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const blob = new Blob([bytes], { type: 'application/pdf' })
        url = URL.createObjectURL(blob)
        setBlobUrl(url)
        setLoading(false)
      })
      .catch(() => { setError(true); setLoading(false) })
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [result.filePath])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
            <FileText className="h-4 w-4 text-red-500 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">{result.title}</h2>
            <p className="text-xs text-slate-400">{result.fileName}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <XCircle className="h-4 w-4" /> Close
        </button>
      </div>
      {/* PDF content */}
      <div className="flex-1 overflow-hidden bg-slate-700">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-10 w-10 animate-spin text-teal-400" />
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <AlertTriangle className="h-12 w-12 text-amber-400" />
            <p className="text-white font-medium">Could not load PDF</p>
            <p className="text-slate-400 text-sm">The file may have been moved or deleted.</p>
          </div>
        )}
        {blobUrl && !error && (
          <iframe src={blobUrl} className="w-full h-full border-none" title={result.title} />
        )}
      </div>
    </div>
  )
}


function TimelineSession({
  session,
  isLast,
  onEdit
}: {
  session: Session
  isLast: boolean
  onEdit: (s: Session) => void
}) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)

  const vitals = parseVitals(session.vitals)
  const vitalList = Object.entries(vitals).filter(([, v]) => v)

  const visitCfg = visitTypeConfig[session.visitType] ?? { label: session.visitType, cls: 'bg-slate-100 text-slate-600', dotCls: defaultDotCls }
  const paymentCfg = paymentStatusConfig[session.paymentStatus] ?? paymentStatusConfig.unpaid
  const PayIcon = paymentCfg.icon
  const MethodIcon = session.paymentMethod ? (paymentMethodIcons[session.paymentMethod] ?? DollarSign) : null
  const balance = (session.amountCharged ?? 0) - (session.amountPaid ?? 0)

  const date = new Date(session.visitDate)

  return (
    <div className="flex gap-4">
      {/* Timeline column */}
      <div className="flex flex-col items-center w-14 flex-shrink-0">
        {/* Dot */}
        <div className={`w-4 h-4 rounded-full ring-4 ${visitCfg.dotCls} flex-shrink-0 mt-4 z-10`} />
        {/* Connector line */}
        {!isLast && (
          <div className="w-0.5 flex-1 bg-gradient-to-b from-slate-300 to-slate-200 dark:from-slate-600 dark:to-slate-700 mt-1 min-h-[2rem]" />
        )}
      </div>

      {/* Card */}
      <div className="flex-1 mb-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-700/60 hover:shadow-md transition-all overflow-hidden">
        {/* Header row – clickable to expand */}
        <div
          className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors"
          onClick={() => setOpen((o) => !o)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setOpen((o) => !o)}
        >
          {/* Date block */}
          <div className="flex flex-col items-center bg-slate-100 dark:bg-slate-700 rounded-xl px-2.5 py-1.5 flex-shrink-0 min-w-[44px] text-center">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase">
              {date.toLocaleDateString(undefined, { month: 'short' })}
            </span>
            <span className="text-lg font-extrabold text-slate-800 dark:text-white leading-tight">
              {date.getDate()}
            </span>
            <span className="text-[10px] text-slate-400">{date.getFullYear()}</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${visitCfg.cls}`}>
                {t(session.visitType as any) ?? visitCfg.label}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[session.status] ?? ''}`}>
                {t(session.status as any)}
              </span>
              {session.doctorName && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <User className="h-3 w-3" />Dr. {session.doctorName}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 truncate">{session.chiefComplaint}</p>
            {session.diagnosis && (
              <p className="text-xs text-slate-400 truncate mt-0.5">Dx: {session.diagnosis}</p>
            )}
          </div>

          {/* Payment summary + expand */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${paymentCfg.cls}`}>
              <PayIcon className="h-3 w-3" />
              {t(session.paymentStatus as any) ?? paymentCfg.label}
            </div>
            {session.amountCharged != null && session.amountCharged > 0 && (
              <div className="text-xs text-slate-400 flex items-center gap-1">
                {MethodIcon && <MethodIcon className="h-3 w-3" />}
                <span>{(session.amountPaid ?? 0).toFixed(0)}/{session.amountCharged.toFixed(0)}</span>
                {balance > 0 && <span className="text-red-500 font-semibold">-{balance.toFixed(0)}</span>}
              </div>
            )}
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(session) }}
                className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                title="Edit session"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {open
                ? <ChevronUp className="h-4 w-4 text-slate-400" />
                : <ChevronDown className="h-4 w-4 text-slate-400" />
              }
            </div>
          </div>
        </div>

        {/* Expanded details */}
        {open && (
          <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-4 space-y-4 bg-slate-50/60 dark:bg-slate-800/40">
            {/* Vitals row */}
            {vitalList.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Vitals</p>
                <div className="flex flex-wrap gap-2">
                  {vitalList.map(([k, v]) => (
                    <div key={k} className="flex flex-col items-center bg-white dark:bg-slate-700 rounded-xl px-3 py-1.5 border border-slate-100 dark:border-slate-600 min-w-[56px] text-center">
                      <span className="text-[10px] text-slate-400 uppercase">{vitalLabels[k] ?? k}</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{v as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {session.diagnosis && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('diagnosis')}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{session.diagnosis}</p>
                </div>
              )}
              {session.notes && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('notes')}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{session.notes}</p>
                </div>
              )}
            </div>

            {/* Prescriptions table */}
            {session.prescriptions.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t('prescriptions')}</p>
                <div className="rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-700">
                      <tr>
                        {[t('medicine'), t('dosage'), t('frequency'), t('duration'), t('qty'), 'Status'].map((h) => (
                          <th key={h} className="px-3 py-1.5 text-left font-semibold text-slate-500 dark:text-slate-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {session.prescriptions.map((rx) => (
                        <tr key={rx.id} className={(rx.isActive ?? true) ? '' : 'opacity-60'}>
                          <td className="px-3 py-1.5 font-medium text-slate-800 dark:text-slate-200">{rx.medicineName}</td>
                          <td className="px-3 py-1.5 text-slate-500">{rx.dosage ?? '–'}</td>
                          <td className="px-3 py-1.5 text-slate-500">{rx.frequency ?? '–'}</td>
                          <td className="px-3 py-1.5 text-slate-500">{rx.duration ?? '–'}</td>
                          <td className="px-3 py-1.5 text-slate-500">{rx.quantity ?? '–'}</td>
                          <td className="px-3 py-1.5">
                            {(rx.isActive ?? true)
                              ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Active</span>
                              : <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-full" title={rx.stoppedAt ? `Stopped ${new Date(rx.stoppedAt).toLocaleDateString()}` : undefined}><span className="h-1.5 w-1.5 rounded-full bg-slate-400" />Stopped</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Payment detail + follow-up */}
            <div className="flex flex-wrap gap-4 pt-1">
              {session.amountCharged != null && session.amountCharged > 0 && (
                <div className="flex items-center gap-3 bg-white dark:bg-slate-700 rounded-xl px-4 py-2 border border-slate-100 dark:border-slate-600">
                  <div className="text-center">
                    <div className="text-[10px] text-slate-400 uppercase">Charged</div>
                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{session.amountCharged.toFixed(2)}</div>
                  </div>
                  <div className="text-slate-300 dark:text-slate-600">→</div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-400 uppercase">Paid</div>
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{(session.amountPaid ?? 0).toFixed(2)}</div>
                  </div>
                  {balance > 0 && (
                    <>
                      <div className="text-slate-300 dark:text-slate-600">=</div>
                      <div className="text-center">
                        <div className="text-[10px] text-slate-400 uppercase">Due</div>
                        <div className="text-sm font-bold text-red-500 dark:text-red-400">{balance.toFixed(2)}</div>
                      </div>
                    </>
                  )}
                  {session.paymentMethod && (
                    <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${paymentCfg.cls}`}>
                      {MethodIcon && <MethodIcon className="h-3 w-3" />}
                      <span className="capitalize">{session.paymentMethod}</span>
                    </div>
                  )}
                </div>
              )}
              {session.followUpDate && (
                <div className="flex items-center gap-2 bg-teal-50 dark:bg-teal-900/20 rounded-xl px-4 py-2 border border-teal-100 dark:border-teal-800/40">
                  <Calendar className="h-4 w-4 text-teal-500" />
                  <div>
                    <div className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase">{t('followUpDate')}</div>
                    <div className="text-sm font-medium text-teal-700 dark:text-teal-300">
                      {new Date(session.followUpDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PatientProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { showToast } = useToast()

  const [patient, setPatient] = useState<(Omit<Patient, 'sessions'> & { sessions: Session[] }) | null>(null)
  const [stats, setStats] = useState<PatientStats | null>(null)
  const [checkResults, setCheckResults] = useState<CheckResult[]>([])
  const [loading, setLoading] = useState(true)
  const [editSession, setEditSession] = useState<Session | null>(null)
  const [showEditPatient, setShowEditPatient] = useState(false)
  const [showNewSession, setShowNewSession] = useState(false)
  const [showUploadResult, setShowUploadResult] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [viewingResult, setViewingResult] = useState<CheckResult | null>(null)
  const [showResultsPanel, setShowResultsPanel] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [pat, st, cr] = await Promise.all([
        window.api.clinic.patients.getById(id),
        window.api.clinic.stats.patientStats(id),
        window.api.clinic.checkResults.getByPatient(id)
      ])
      if (!pat) {
        showToast('error', t('errorLoadingData'))
        navigate('/clinic')
        return
      }
      setPatient(pat)
      setStats(st)
      setCheckResults(cr ?? [])
    } catch {
      showToast('error', t('errorLoadingData'))
      navigate('/clinic')
    } finally {
      setLoading(false)
    }
  }, [id, navigate, showToast, t])

  useEffect(() => { load() }, [load])

  const handleDeleteResult = async (id: string) => {
    if (!confirm('Delete this check result? This cannot be undone.')) return
    try {
      await window.api.clinic.checkResults.delete(id)
      setCheckResults((prev) => prev.filter((r) => r.id !== id))
      showToast('success', 'Check result deleted')
    } catch {
      showToast('error', 'Failed to delete check result')
    }
  }

  const handleExportPdf = async () => {
    if (!patient) return
    setExportingPdf(true)
    try {
      const result = await (window.api.clinic as any).patients_exportPdf({
        patient,
        sessions: patient.sessions ?? [],
        stats,
        checkResults,
      })
      if (result?.success) showToast('success', 'Medical record exported')
    } catch {
      showToast('error', 'Failed to export PDF')
    } finally {
      setExportingPdf(false)
    }
  }

  // Derived colors
  const colorIdx = patient ? patient.name.charCodeAt(0) % avatarColors.length : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
      </div>
    )
  }

  if (!patient) return null

  const sessions = patient.sessions ?? []
  const hasFinance = (stats?.totalCharged ?? 0) > 0
  const collectPct = hasFinance ? Math.round(((stats?.totalPaid ?? 0) / (stats?.totalCharged ?? 1)) * 100) : 0

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* ── Gradient Banner ─────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-500 px-6 pt-5 pb-6 flex-shrink-0">
        {/* Back button */}
        <button
          onClick={() => navigate('/clinic')}
          className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('back')}
        </button>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Avatar + name */}
          <div className="flex items-center gap-5">
            <div className={`h-20 w-20 rounded-2xl bg-gradient-to-br ${avatarColors[colorIdx]} flex items-center justify-center flex-shrink-0 shadow-lg ring-4 ring-white/25`}>
              <span className="text-2xl font-bold text-white">{initials(patient.name)}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{patient.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {patient.dateOfBirth && (
                  <span className="bg-white/20 text-white text-sm px-2.5 py-0.5 rounded-full">
                    {calcAge(patient.dateOfBirth)}
                  </span>
                )}
                {patient.gender && (
                  <span className="bg-white/20 text-white text-sm px-2.5 py-0.5 rounded-full capitalize">
                    {t(patient.gender as any)}
                  </span>
                )}
                {patient.bloodType && (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${bloodTypeColors[patient.bloodType] ?? 'bg-white/20 text-white'}`}>
                    {patient.bloodType}
                  </span>
                )}
                {patient.nationalId && (
                  <span className="bg-white/15 text-white/80 text-xs px-2 py-0.5 rounded-full">{patient.nationalId}</span>
                )}
                {(patient as any).folderNumber && (
                  <span className="bg-white/20 text-white text-xs font-mono font-medium px-2.5 py-0.5 rounded-full border border-white/30">
                    #{(patient as any).folderNumber}
                  </span>
                )}
              </div>
              {patient.allergies && (
                <div className="flex items-center gap-1.5 mt-2 bg-amber-400/20 rounded-lg px-2.5 py-1 w-fit">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-200" />
                  <span className="text-xs text-amber-100 font-medium">{patient.allergies}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowEditPatient(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-sm font-medium transition-colors border border-white/20"
            >
              <Pencil className="h-4 w-4" />
              {t('editPatient')}
            </button>
            <button
              onClick={() => setShowUploadResult(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-sm font-medium transition-colors border border-white/20"
            >
              <FilePlus className="h-4 w-4" />
              Upload Result
            </button>
            <button
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-sm font-medium transition-colors border border-white/20 disabled:opacity-60"
            >
              {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export PDF
            </button>
            <button
              onClick={() => setShowNewSession(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-teal-700 rounded-xl text-sm font-semibold hover:bg-teal-50 transition-colors shadow-md"
            >
              <Plus className="h-4 w-4" />
              {t('newSession')}
            </button>
          </div>
        </div>

        {/* Contact row */}
        <div className="flex flex-wrap gap-4 mt-4">
          {patient.phone && (
            <div className="flex items-center gap-1.5 text-white/80 text-sm">
              <Phone className="h-3.5 w-3.5" /> {patient.phone}
            </div>
          )}
          {patient.email && (
            <div className="flex items-center gap-1.5 text-white/80 text-sm">
              <Mail className="h-3.5 w-3.5" /> {patient.email}
            </div>
          )}
          {patient.address && (
            <div className="flex items-center gap-1.5 text-white/80 text-sm">
              <MapPin className="h-3.5 w-3.5" /> {patient.address}
            </div>
          )}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 p-6 space-y-6">
        {/* ── Stat cards ─── */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0">
                <Stethoscope className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalSessions}</div>
                <div className="text-xs text-slate-400">{t('totalVisits')}</div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {stats.lastVisit
                    ? new Date(stats.lastVisit).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                    : '–'
                  }
                </div>
                <div className="text-xs text-slate-400">{t('lastVisit')}</div>
              </div>
            </div>

            <div className={`rounded-2xl p-4 border flex items-center gap-3 ${
              (stats.outstanding ?? 0) > 0
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40'
                : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40'
            }`}>
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                (stats.outstanding ?? 0) > 0
                  ? 'bg-red-100 dark:bg-red-900/40'
                  : 'bg-emerald-100 dark:bg-emerald-900/40'
              }`}>
                <DollarSign className={`h-5 w-5 ${(stats.outstanding ?? 0) > 0 ? 'text-red-500' : 'text-emerald-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-2xl font-bold ${
                  (stats.outstanding ?? 0) > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {(stats.outstanding ?? 0) > 0 ? stats.outstanding.toFixed(0) : '✓'}
                </div>
                <div className="text-xs text-slate-400">
                  {(stats.outstanding ?? 0) > 0 ? t('outstanding') : t('fullyPaid')}
                </div>
              </div>
              {(stats.outstanding ?? 0) > 0 && (
                <button
                  onClick={() => setShowPayModal(true)}
                  className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                >
                  <Banknote className="h-3.5 w-3.5" />
                  Pay
                </button>
              )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.totalPaid > 0 ? stats.totalPaid.toFixed(2) : '–'}
                </div>
                <div className="text-xs text-slate-400">{t('totalPaid')}</div>
              </div>
            </div>

            {/* Check Results card */}
            <button
              onClick={() => setShowResultsPanel((v) => !v)}
              className={`rounded-2xl p-4 border flex items-center gap-3 text-left transition-all ${
                showResultsPanel
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700/60 shadow-sm'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800/50'
              }`}
            >
              <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-red-500 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{checkResults.length}</div>
                <div className="text-xs text-slate-400">Check Results</div>
              </div>
              {checkResults.length > 0 && (
                showResultsPanel
                  ? <ChevronUp className="h-4 w-4 text-red-400 flex-shrink-0" />
                  : <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
              )}
            </button>
          </div>
        )}

        {/* ── Expandable check results panel ─── */}
        {showResultsPanel && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-100 dark:border-red-800/30 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-red-50 dark:border-red-800/20 bg-red-50/60 dark:bg-red-900/10">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-red-500" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Check Results</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-semibold">{checkResults.length}</span>
              </div>
              <button
                onClick={() => setShowUploadResult(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors"
              >
                <FilePlus className="h-3.5 w-3.5" /> Upload PDF
              </button>
            </div>
            {checkResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <FileText className="h-8 w-8 text-slate-200 dark:text-slate-700" />
                <p className="text-sm text-slate-400">No check results uploaded yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {checkResults.map((r) => {
                  const formatSize = (bytes?: number | null) => {
                    if (!bytes) return ''
                    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
                    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
                  }
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                      <div className="h-9 w-9 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-4 w-4 text-red-500 dark:text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{r.title}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(r.resultDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          {r.fileSize ? ` · ${formatSize(r.fileSize)}` : ''}
                        </p>
                        {r.description && <p className="text-xs text-slate-400 truncate">{r.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => setViewingResult(r)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-400 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" /> View PDF
                        </button>
                        <button
                          onClick={() => handleDeleteResult(r.id)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Financial breakdown ─── */}
        {hasFinance && stats && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
              {t('financeSummary')}
            </h3>
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              <div className="text-center">
                <div className="text-xs text-slate-400">{t('totalCharged')}</div>
                <div className="text-xl font-bold text-slate-800 dark:text-slate-100">{stats.totalCharged.toFixed(2)}</div>
              </div>
              <div className="text-2xl text-slate-200 dark:text-slate-600">→</div>
              <div className="text-center">
                <div className="text-xs text-slate-400">{t('totalPaid')}</div>
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.totalPaid.toFixed(2)}</div>
              </div>
              {stats.outstanding > 0 && (
                <>
                  <div className="text-2xl text-slate-200 dark:text-slate-600">=</div>
                  <div className="text-center">
                    <div className="text-xs text-slate-400">{t('outstanding')}</div>
                    <div className="text-xl font-bold text-red-500 dark:text-red-400">{stats.outstanding.toFixed(2)}</div>
                  </div>
                </>
              )}
            </div>
            <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, collectPct)}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5 text-xs text-slate-400">
              <span>{collectPct}% {t('collected')}</span>
              {stats.outstanding > 0 && (
                <span className="text-red-500">{stats.outstanding.toFixed(2)} due</span>
              )}
            </div>
          </div>
        )}

        {/* ── Medical notes ─── */}
        {(patient.medicalNotes || stats?.topDiagnosis || stats?.nextFollowUp || (patient as any).folderNumber) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(patient as any).folderNumber && (
              <div className="bg-teal-50 dark:bg-teal-900/20 rounded-2xl p-4 border border-teal-100 dark:border-teal-800/40">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-teal-500" />
                  <span className="text-xs font-bold text-teal-500 uppercase tracking-wider">{t('folderNumber')}</span>
                </div>
                <p className="text-lg font-mono font-bold text-teal-700 dark:text-teal-300">#{(patient as any).folderNumber}</p>
              </div>
            )}
            {stats?.topDiagnosis && (
              <div className="bg-violet-50 dark:bg-violet-900/20 rounded-2xl p-4 border border-violet-100 dark:border-violet-800/40">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-violet-500" />
                  <span className="text-xs font-bold text-violet-500 uppercase tracking-wider">{t('commonDiagnosis')}</span>
                </div>
                <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">{stats.topDiagnosis}</p>
              </div>
            )}
            {stats?.nextFollowUp && (
              <div className="bg-teal-50 dark:bg-teal-900/20 rounded-2xl p-4 border border-teal-100 dark:border-teal-800/40">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-teal-500" />
                  <span className="text-xs font-bold text-teal-500 uppercase tracking-wider">{t('nextFollowUp')}</span>
                </div>
                <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">
                  {new Date(stats.nextFollowUp).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' })}
                </p>
              </div>
            )}
            {patient.medicalNotes && (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 border border-amber-100 dark:border-amber-800/40">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">{t('medicalNotes')}</span>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-300 line-clamp-3">{patient.medicalNotes}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Prescriptions summary ─── */}
        {(() => {
          const allRx = sessions.flatMap((s) =>
            (s.prescriptions ?? []).map((rx: any) => ({ ...rx, sessionDate: s.visitDate, diagnosis: s.diagnosis }))
          )
          if (allRx.length === 0) return null
          const activeCount = allRx.filter((rx: any) => rx.isActive ?? true).length
          const stoppedCount = allRx.length - activeCount
          return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700/60 bg-pink-50/60 dark:bg-pink-900/10">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-pink-500" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Prescriptions</span>
                  {activeCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-semibold">{activeCount} active</span>
                  )}
                  {stoppedCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 font-semibold">{stoppedCount} stopped</span>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      {['Medicine', 'Dosage', 'Frequency', 'Duration', 'Diagnosis', 'Date / Status'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {allRx.map((rx: any) => (
                      <tr key={rx.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors ${(rx.isActive ?? true) ? '' : 'opacity-60'}`}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {(rx.isActive ?? true)
                              ? <span className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" title="Active" />
                              : <span className="h-2 w-2 rounded-full bg-slate-400 flex-shrink-0" title={rx.stoppedAt ? `Stopped ${new Date(rx.stoppedAt).toLocaleDateString()}` : 'Discontinued'} />}
                            <span className="font-medium text-slate-800 dark:text-slate-200">{rx.medicineName}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-slate-500">{rx.dosage ?? '–'}</td>
                        <td className="px-3 py-2 text-slate-500">{rx.frequency ?? '–'}</td>
                        <td className="px-3 py-2 text-slate-500">{rx.duration ?? '–'}</td>
                        <td className="px-3 py-2 text-slate-500 max-w-[140px] truncate">{rx.diagnosis ?? '–'}</td>
                        <td className="px-3 py-2 text-slate-400 whitespace-nowrap">
                          {(rx.isActive ?? true)
                            ? new Date(rx.sessionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                            : <span className="text-slate-400">{rx.stoppedAt ? `Stopped ${new Date(rx.stoppedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : new Date(rx.sessionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })()}

        {/* ── Session Timeline ─── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">{t('sessionHistory')}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
                {stats?.firstVisit && (
                  <> · since {new Date(stats.firstVisit).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</>
                )}
              </p>
            </div>
            {/* Legend */}
            <div className="hidden sm:flex items-center gap-3 flex-wrap">
              {Object.entries(visitTypeConfig).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${cfg.dotCls}`} />
                  <span className="text-xs text-slate-400">{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>

          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
                <Stethoscope className="h-8 w-8 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('noSessionsFound')}</p>
              <p className="text-xs text-slate-400 mt-0.5 mb-4">This patient has no sessions yet</p>
              <button
                onClick={() => setShowNewSession(true)}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4" /> {t('newSession')}
              </button>
            </div>
          ) : (
            <div className="relative">
              {sessions.map((s, i) => (
                <TimelineSession
                  key={s.id}
                  session={s}
                  isLast={i === sessions.length - 1}
                  onEdit={(session) => setEditSession(session)}
                />
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Modals ───────────────────────────────────────────────────── */}
      {showEditPatient && (
        <PatientFormModal
          patient={patient as any}
          onClose={() => setShowEditPatient(false)}
          onSaved={() => { setShowEditPatient(false); load() }}
        />
      )}
      {showNewSession && (
        <SessionFormModal
          defaultPatient={patient as any}
          onClose={() => setShowNewSession(false)}
          onSaved={() => { setShowNewSession(false); load() }}
        />
      )}
      {editSession && (
        <SessionFormModal
          existingSession={{ ...editSession, patientId: patient.id, patient: { id: patient.id, name: patient.name } }}
          onClose={() => setEditSession(null)}
          onSaved={() => { setEditSession(null); load() }}
        />
      )}
      {showUploadResult && (
        <UploadCheckResultModal
          patientId={patient.id}
          onClose={() => setShowUploadResult(false)}
          onSaved={() => load()}
        />
      )}
      {viewingResult && (
        <PdfViewerModal
          result={viewingResult}
          onClose={() => setViewingResult(null)}
        />
      )}
      {showPayModal && sessions.length > 0 && (
        <QuickPayModal
          sessions={sessions}
          onClose={() => setShowPayModal(false)}
          onPaid={() => { setShowPayModal(false); load() }}
        />
      )}
    </div>
  )
}
