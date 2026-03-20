import { useState, useEffect, useCallback, useRef } from 'react'
import { ClipboardList, Loader2, Plus, ChevronDown, ChevronUp, DollarSign, CreditCard, Banknote, CheckCircle2, Clock, XCircle, MinusCircle } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import SessionFormModal from './SessionFormModal'

type FilterType = 'today' | 'week' | 'month' | 'all'

interface Prescription {
  id: string
  medicineName: string
  dosage?: string | null
  frequency?: string | null
  duration?: string | null
  quantity?: number | null
  instructions?: string | null
}

interface Session {
  id: string
  patientId: string
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
  patient: { id: string; name: string; phone: string; bloodType?: string | null }
}

const statusColors: Record<string, string> = {
  completed: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  active:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
}

const visitTypeConfig: Record<string, { label: string; cls: string }> = {
  first_visit: { label: 'First Visit',  cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  follow_up:   { label: 'Follow-up',    cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' },
  routine:     { label: 'Routine',      cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
  emergency:   { label: 'Emergency',    cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' }
}

const paymentStatusConfig: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  paid:    { label: 'Paid',    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
  partial: { label: 'Partial', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',         icon: Clock },
  unpaid:  { label: 'Unpaid',  cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',                 icon: XCircle },
  waived:  { label: 'Waived',  cls: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',            icon: MinusCircle }
}

const paymentMethodIcons: Record<string, React.ElementType> = {
  cash:      Banknote,
  card:      CreditCard,
  insurance: DollarSign,
  other:     DollarSign
}

const statusOptions: { value: string; icon: React.ElementType; cls: string }[] = [
  { value: 'completed', icon: CheckCircle2, cls: statusColors.completed },
  { value: 'active',    icon: Clock,        cls: statusColors.active },
  { value: 'cancelled', icon: XCircle,      cls: statusColors.cancelled }
]

function StatusDropdown({ status, onChange, disabled }: {
  status: string
  onChange: (s: string) => void
  disabled?: boolean
}) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOut)
    return () => document.removeEventListener('mousedown', handleOut)
  }, [open])

  const current = statusOptions.find(o => o.value === status)
  const CurrentIcon = current?.icon ?? MinusCircle

  return (
    <div ref={ref} className="relative">
      <button
        disabled={disabled}
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v) }}
        className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium transition-all ${
          statusColors[status] ?? ''
        } ${
          disabled
            ? 'opacity-60 cursor-not-allowed'
            : 'hover:opacity-80 cursor-pointer ring-offset-1 hover:ring-2 hover:ring-current/30'
        }`}
      >
        <CurrentIcon className="h-3 w-3" />
        {t(status as any)}
        <ChevronDown className="h-2.5 w-2.5 opacity-60" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 min-w-[148px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
          {statusOptions.map(opt => {
            const Icon = opt.icon
            const isActive = opt.value === status
            return (
              <button
                key={opt.value}
                onClick={(e) => { e.stopPropagation(); setOpen(false); if (!isActive) onChange(opt.value) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-50 dark:bg-slate-700/60'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                }`}
              >
                <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${opt.cls}`}>
                  <Icon className="h-3 w-3" />
                  {t(opt.value as any)}
                </span>
                {isActive && (
                  <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-teal-500 flex-shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function parseVitals(raw?: string | null): Record<string, string> {
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

function VitalPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center bg-white dark:bg-slate-700/80 rounded-lg px-3 py-2 border border-slate-100 dark:border-slate-600 min-w-[64px]">
      <span className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{value}</span>
    </div>
  )
}

const vitalLabels: Record<string, string> = {
  bp: 'BP', temp: 'Temp', weight: 'Wt', height: 'Ht', pulse: 'Pulse', o2sat: 'O₂'
}

function SessionCard({ session, onEdit, onDelete, onStatusChange, statusUpdating }: {
  session: Session
  onEdit: (s: Session) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: string) => void
  statusUpdating: boolean
}) {
  const { t } = useLanguage()
  const [expanded, setExpanded] = useState(false)
  const vitals = parseVitals(session.vitals)
  const vitalEntries = Object.entries(vitals).filter(([, v]) => v)

  const visitTypeCfg = visitTypeConfig[session.visitType] ?? { label: session.visitType, cls: 'bg-slate-100 text-slate-600' }
  const paymentCfg = paymentStatusConfig[session.paymentStatus] ?? paymentStatusConfig.unpaid
  const PayIcon = paymentCfg.icon
  const MethodIcon = session.paymentMethod ? (paymentMethodIcons[session.paymentMethod] ?? DollarSign) : DollarSign

  const balance = (session.amountCharged ?? 0) - (session.amountPaid ?? 0)

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden hover:border-teal-200 dark:hover:border-teal-700 transition-colors shadow-sm">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        {/* Avatar */}
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-xs font-bold text-white">
            {session.patient.name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')}
          </span>
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 dark:text-white text-sm">{session.patient.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${visitTypeCfg.cls}`}>
              {t(session.visitType as any) ?? visitTypeCfg.label}
            </span>
            <StatusDropdown
              status={session.status}
              onChange={(s) => onStatusChange(session.id, s)}
              disabled={statusUpdating}
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
            <span>{new Date(session.visitDate).toLocaleDateString()}</span>
            {session.doctorName && <span>Dr. {session.doctorName}</span>}
            <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[180px]">{session.chiefComplaint}</span>
          </div>
        </div>

        {/* Payment summary */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${paymentCfg.cls}`}>
            <PayIcon className="h-3 w-3" />
            {t(session.paymentStatus as any) ?? paymentCfg.label}
          </div>
          {session.amountCharged != null && session.amountCharged > 0 && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <MethodIcon className="h-3 w-3" />
              <span>
                {session.amountPaid?.toFixed(0) ?? '0'}
                {' / '}
                {session.amountCharged.toFixed(0)}
              </span>
              {balance > 0 && (
                <span className="text-red-500 dark:text-red-400 font-medium">(-{balance.toFixed(0)})</span>
              )}
            </div>
          )}
        </div>

        {/* Actions + expand */}
        <div className="flex items-center gap-1 ml-1 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(session) }}
            className="text-xs px-2 py-1 text-blue-600 dark:text-blue-400 hover:underline"
          >{t('edit')}</button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(session.id) }}
            className="text-xs px-2 py-1 text-red-500 dark:text-red-400 hover:underline"
          >{t('delete')}</button>
          {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-4 space-y-4 bg-slate-50/50 dark:bg-slate-800/60">
          {/* Vitals */}
          {vitalEntries.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t('vitals')}</p>
              <div className="flex flex-wrap gap-2">
                {vitalEntries.map(([k, v]) => (
                  <VitalPill key={k} label={vitalLabels[k] ?? k} value={v as string} />
                ))}
              </div>
            </div>
          )}

          {/* Diagnosis */}
          {session.diagnosis && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('diagnosis')}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{session.diagnosis}</p>
            </div>
          )}

          {/* Notes */}
          {session.notes && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('notes')}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{session.notes}</p>
            </div>
          )}

          {/* Prescriptions */}
          {session.prescriptions.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t('prescriptions')}</p>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-700/60">
                    <tr>
                      {[t('medicine'), t('dosage'), t('frequency'), t('duration'), t('qty')].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {session.prescriptions.map((rx) => (
                      <tr key={rx.id} className="bg-white dark:bg-slate-800">
                        <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{rx.medicineName}</td>
                        <td className="px-3 py-2 text-slate-500">{rx.dosage ?? '–'}</td>
                        <td className="px-3 py-2 text-slate-500">{rx.frequency ?? '–'}</td>
                        <td className="px-3 py-2 text-slate-500">{rx.duration ?? '–'}</td>
                        <td className="px-3 py-2 text-slate-500">{rx.quantity ?? '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payment detail row */}
          {(session.amountCharged != null || session.followUpDate) && (
            <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-100 dark:border-slate-700">
              {session.amountCharged != null && (
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-xs text-slate-400 mb-0.5">{t('charged')}</div>
                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{session.amountCharged?.toFixed(2)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-400 mb-0.5">{t('paid')}</div>
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{(session.amountPaid ?? 0).toFixed(2)}</div>
                  </div>
                  {balance > 0 && (
                    <div className="text-center">
                      <div className="text-xs text-slate-400 mb-0.5">{t('balance')}</div>
                      <div className="text-sm font-bold text-red-500 dark:text-red-400">{balance.toFixed(2)}</div>
                    </div>
                  )}
                  {session.paymentMethod && (
                    <div className="text-center">
                      <div className="text-xs text-slate-400 mb-0.5">{t('method')}</div>
                      <div className="text-sm font-semibold text-slate-600 dark:text-slate-300 capitalize">{session.paymentMethod}</div>
                    </div>
                  )}
                </div>
              )}
              {session.followUpDate && (
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">{t('followUpDate')}:</span>
                  <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                    {new Date(session.followUpDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SessionsTab() {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('today')
  const [showNewSession, setShowNewSession] = useState(false)
  const [editSession, setEditSession] = useState<Session | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.api.clinic.sessions.getRecent({ filter })
      setSessions(data)
    } catch {
      showToast('error', t('errorLoadingData'))
    } finally {
      setLoading(false)
    }
  }, [filter, showToast, t])

  useEffect(() => { load() }, [load])

  async function handleStatusChange(id: string, newStatus: string) {
    setUpdatingStatusId(id)
    try {
      await window.api.clinic.sessions.update(id, { status: newStatus })
      setSessions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s))
      showToast('success', t('updatedSuccessfully'))
    } catch {
      showToast('error', t('errorUpdatingRecord'))
    } finally {
      setUpdatingStatusId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('confirmDelete'))) return
    try {
      await window.api.clinic.sessions.delete(id)
      showToast('success', t('deletedSuccessfully'))
      load()
    } catch {
      showToast('error', t('errorDeletingRecord'))
    }
  }

  const filters: { key: FilterType; label: string }[] = [
    { key: 'today', label: t('today') },
    { key: 'week', label: t('thisWeek') },
    { key: 'month', label: t('thisMonth') },
    { key: 'all', label: t('all') }
  ]

  const totalCharged = sessions.reduce((s, x) => s + (x.amountCharged ?? 0), 0)
  const totalPaid = sessions.reduce((s, x) => s + (x.amountPaid ?? 0), 0)
  const totalOutstanding = totalCharged - totalPaid

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === key
                  ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowNewSession(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-teal-500/20"
        >
          <Plus className="h-4 w-4" />
          {t('newSession')}
        </button>
      </div>

      {/* Finance summary bar */}
      {!loading && sessions.length > 0 && totalCharged > 0 && (
        <div className="flex items-center gap-6 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-5 py-3 border border-slate-200 dark:border-slate-700">
          <div>
            <div className="text-xs text-slate-400 mb-0.5">{t('totalCharged')}</div>
            <div className="text-base font-bold text-slate-700 dark:text-slate-200">{totalCharged.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-0.5">{t('totalCollected')}</div>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{totalPaid.toFixed(2)}</div>
          </div>
          {totalOutstanding > 0 && (
            <div>
              <div className="text-xs text-slate-400 mb-0.5">{t('outstanding')}</div>
              <div className="text-base font-bold text-red-500 dark:text-red-400">{totalOutstanding.toFixed(2)}</div>
            </div>
          )}
          <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-400">
            <ClipboardList className="h-3.5 w-3.5" />
            {sessions.length} {t('sessions')}
          </div>
        </div>
      )}

      {/* Session list */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-500">
          <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <ClipboardList className="h-10 w-10 opacity-40" />
          </div>
          <p className="text-base font-medium text-slate-500 dark:text-slate-400">{t('noSessionsFound')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              onEdit={setEditSession}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              statusUpdating={updatingStatusId === s.id}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {(showNewSession || editSession) && (
        <SessionFormModal
          existingSession={editSession}
          onClose={() => { setShowNewSession(false); setEditSession(null) }}
          onSaved={() => { setShowNewSession(false); setEditSession(null); load() }}
        />
      )}
    </div>
  )
}
