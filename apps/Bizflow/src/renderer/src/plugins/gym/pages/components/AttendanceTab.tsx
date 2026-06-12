import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, Loader2, CheckCircle2, Footprints, Users, DollarSign,
  ChevronLeft, ChevronRight, CalendarDays, X, Zap, Trash2,
  AlertTriangle, ChevronDown, ChevronUp, Phone, Minus, Plus
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

// ─── Types ────────────────────────────────────────────────────────────────────
type CalendarData = Record<string, { total: number; walkin: number; sub: number; revenue: number }>

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function fmtDate(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  })
}

function offsetDay(d: string, delta: number): string {
  const date = new Date(d + 'T00:00:00')
  date.setDate(date.getDate() + delta)
  return date.toISOString().slice(0, 10)
}

function buildCalGrid(year: number, month: number): (string | null)[][] {
  const firstDow = new Date(year, month - 1, 1).getDay()
  const days = new Date(year, month, 0).getDate()
  const startPad = (firstDow + 6) % 7  // Mon = 0
  const cells: (string | null)[] = Array(startPad).fill(null)
  for (let d = 1; d <= days; d++) {
    cells.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  const weeks: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7).concat(Array(7).fill(null)).slice(0, 7))
  }
  return weeks
}

function subStatus(trainee: any): 'active' | 'expiring' | 'none' {
  const sub = trainee.subscriptions?.[0]
  if (!sub) return 'none'
  const daysLeft = Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / 86_400_000)
  return daysLeft <= 7 ? 'expiring' : 'active'
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AttendanceTab() {
  const toast = useToast()
  const { t } = useLanguage()

  // ── Date & calendar ──
  const [selDate, setSelDate] = useState(todayStr())
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })

  // ── Sessions for selected date ──
  const [sessions, setSessions] = useState<any[]>([])
  const [loadingDay, setLoadingDay] = useState(false)

  // ── Monthly calendar data ──
  const [calData, setCalData] = useState<CalendarData>({})

  // ── Quick check-in ──
  const [search, setSearch] = useState('')
  const [searchRes, setSearchRes] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [checkingIn, setCheckingIn] = useState<string | null>(null)
  const [flashId, setFlashId] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Anonymous walk-in ──
  const [showAnon, setShowAnon] = useState(false)
  const [anonName, setAnonName] = useState('')
  const [anonAmount, setAnonAmount] = useState('')
  const [anonPayMethod, setAnonPayMethod] = useState('cash')
  const [savingAnon, setSavingAnon] = useState(false)
  const [anonPresets, setAnonPresets] = useState<number[]>([10, 20, 50])
  const [anonPresetInput, setAnonPresetInput] = useState('')

  // ── Fee-based member walk-in (no subscription) ──
  const [feeTarget, setFeeTarget] = useState<any | null>(null)
  const [feeAmount, setFeeAmount] = useState('')
  const [feePayMethod, setFeePayMethod] = useState('cash')
  const [checkingInFee, setCheckingInFee] = useState(false)
  const [feePresets, setFeePresets] = useState<number[]>([10, 20, 50])
  const [feePresetInput, setFeePresetInput] = useState('')

  // ── Delete confirm ──
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── At-Risk alerts ──
  const [atRisk, setAtRisk] = useState<any[]>([])
  const [riskExpanded, setRiskExpanded] = useState(false)

  // ── Loaders ──────────────────────────────────────────────────────────────────
  const loadDay = useCallback(async (date: string) => {
    setLoadingDay(true)
    try {
      const res = await (window.api as any).gym?.sessions?.getAll({ date, take: 500 })
      setSessions(Array.isArray(res) ? res : res?.data ?? [])
    } catch {
      setSessions([])
    } finally {
      setLoadingDay(false)
    }
  }, [])

  const loadCalendar = useCallback(async (year: number, month: number) => {
    try {
      const data = await (window.api as any).gym?.sessions?.getCalendar({ year, month })
      setCalData(data ?? {})
    } catch {
      setCalData({})
    }
  }, [])

  useEffect(() => { loadDay(selDate) }, [selDate, loadDay])
  useEffect(() => { loadCalendar(calMonth.year, calMonth.month) }, [calMonth, loadCalendar])
  useEffect(() => {
    ;(window.api as any).gym?.alerts?.atRisk(14)
      .then((r: any[]) => setAtRisk(r ?? []))
      .catch(() => setAtRisk([]))
  }, [])

  // ── Search debounce ───────────────────────────────────────────────────────────
  function handleSearchChange(q: string) {
    setSearch(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) { setSearchRes([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await (window.api as any).gym?.trainees?.getAll({ search: q, take: 8 })
        setSearchRes(Array.isArray(res) ? res : res?.data ?? [])
      } catch {
        setSearchRes([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }

  // ── Check-in ──────────────────────────────────────────────────────────────────
  async function checkIn(trainee: any) {
    const status = subStatus(trainee)
    // No active subscription → open inline fee form instead of logging $0
    if (status === 'none') {
      setFeeTarget(trainee)
      return
    }
    setCheckingIn(trainee.id)
    try {
      await (window.api as any).gym?.sessions?.create({
        traineeId: trainee.id,
        type: 'subscription_visit',
        date: selDate,
        amount: 0
      })
      setFlashId(trainee.id)
      setTimeout(() => setFlashId(null), 1800)
      toast.success(`${trainee.name} checked in!`)
      setSearch('')
      setSearchRes([])
      loadDay(selDate)
      loadCalendar(calMonth.year, calMonth.month)
    } catch (err: any) {
      toast.error(err.message ?? 'Check-in failed')
    } finally {
      setCheckingIn(null)
    }
  }

  // ── Fee-based member check-in (registered trainee, no subscription) ──────────
  async function checkInWithFee(e: React.FormEvent) {
    e.preventDefault()
    if (!feeTarget) return
    const amt = parseFloat(feeAmount)
    if (!amt || amt <= 0) { toast.error('Enter a valid visit fee'); return }
    setCheckingInFee(true)
    try {
      await (window.api as any).gym?.sessions?.create({
        traineeId: feeTarget.id,
        type: 'walkin',
        date: selDate,
        amount: amt,
        paymentMethod: feePayMethod
      })
      setFlashId(feeTarget.id)
      setTimeout(() => setFlashId(null), 1800)
      toast.success(`${feeTarget.name} checked in!`)
      setFeeTarget(null); setFeeAmount(''); setFeePayMethod('cash')
      setSearch(''); setSearchRes([])
      loadDay(selDate); loadCalendar(calMonth.year, calMonth.month)
    } catch (err: any) {
      toast.error(err.message ?? 'Check-in failed')
    } finally {
      setCheckingInFee(false)
    }
  }

  // ── Anonymous walk-in ─────────────────────────────────────────────────────────
  async function handleAnonSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(anonAmount)
    if (!amt || amt <= 0) { toast.error('Payment is required for anonymous walk-ins'); return }
    setSavingAnon(true)
    try {
      await (window.api as any).gym?.sessions?.create({
        type: 'walkin',
        date: selDate,
        amount: amt,
        paymentMethod: anonPayMethod,
        notes: anonName.trim() ? `Walk-in: ${anonName.trim()}` : undefined
      })
      toast.success('Walk-in logged!')
      setShowAnon(false)
      setAnonName(''); setAnonAmount(''); setAnonPayMethod('cash')
      loadDay(selDate)
      loadCalendar(calMonth.year, calMonth.month)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to log walk-in')
    } finally {
      setSavingAnon(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await (window.api as any).gym?.sessions?.delete(deleteTarget.id)
      toast.success('Check-in removed')
      setDeleteTarget(null)
      loadDay(selDate)
      loadCalendar(calMonth.year, calMonth.month)
    } catch (err: any) {
      toast.error(err.message ?? 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  // ── Calendar nav ──────────────────────────────────────────────────────────────
  function changeMonth(delta: number) {
    setCalMonth(prev => {
      let m = prev.month + delta
      let y = prev.year
      if (m > 12) { m = 1; y++ }
      if (m < 1) { m = 12; y-- }
      return { year: y, month: m }
    })
  }

  function selectDay(day: string) {
    if (day > todayStr()) return
    setSelDate(day)
    // if different month, sync calendar view
    const [y, m] = day.split('-').map(Number)
    if (y !== calMonth.year || m !== calMonth.month) {
      setCalMonth({ year: y, month: m })
    }
  }

  // ── Derived stats ─────────────────────────────────────────────────────────────
  const totalSubs        = sessions.filter(s => s.type === 'subscription_visit').length
  const totalMemberWalks = sessions.filter(s => s.type === 'walkin' && s.traineeId).length
  const totalAnonWalks   = sessions.filter(s => s.type === 'walkin' && !s.traineeId).length
  const totalRevenue     = sessions.reduce((sum, s) => sum + (s.amount ?? 0), 0)
  const isToday = selDate === todayStr()

  // ── Calendar grid ─────────────────────────────────────────────────────────────
  const calGrid = buildCalGrid(calMonth.year, calMonth.month)
  const monthLabel = new Date(calMonth.year, calMonth.month - 1, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-5">
      {/* ── At-Risk Alert Banner ─────────────────────────────────────────────── */}
      {atRisk.length > 0 && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 overflow-hidden">
          <button
            className="w-full flex items-center gap-3 px-5 py-3 text-left"
            onClick={() => setRiskExpanded(v => !v)}
          >
            <AlertTriangle size={16} className="text-amber-500 shrink-0" />
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex-1">
              {atRisk.length} {t('gymAtRiskBanner')}
            </span>
            {riskExpanded ? <ChevronUp size={14} className="text-amber-500" /> : <ChevronDown size={14} className="text-amber-500" />}
          </button>
          {riskExpanded && (
            <div className="border-t border-amber-200 dark:border-amber-700 divide-y divide-amber-100 dark:divide-amber-800">
              {atRisk.map(m => (
                <div key={m.traineeId} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{m.name}</p>
                    <p className="text-xs text-slate-400">{m.planName} · Last visit: {m.lastVisit ? new Date(m.lastVisit).toLocaleDateString() : 'Never'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{m.daysSince === 999 ? 'Never' : `${m.daysSince}d ago`}</span>
                    {m.phone && (
                      <a href={`tel:${m.phone}`} className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 hover:bg-amber-200 transition-colors">
                        <Phone size={12} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Quick Check-in card ─────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/10 rounded-2xl border border-orange-200 dark:border-orange-800/40 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-orange-500/10">
            <Zap size={16} className="text-orange-500" />
          </div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t('gymQuickCheckIn')}</h2>
          <span className="ml-auto text-xs font-medium text-slate-400">
            {isToday ? 'Today' : fmtDate(selDate).split(',')[0]}
          </span>
        </div>

        {/* Search input */}
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          {searching && (
            <Loader2 size={13} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-orange-400 pointer-events-none" />
          )}
          <input
            ref={searchRef}
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder={t('gymSearchMember')}
            className="w-full pl-10 pr-10 py-3 rounded-xl border-2 border-orange-200 dark:border-orange-700/60 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        {/* Search results */}
        {searchRes.length > 0 && (
          <div className="space-y-2 mb-3 max-h-72 overflow-y-auto">
            {searchRes.map(tr => {
              const status = subStatus(tr)
              const isCIn = checkingIn === tr.id
              const isFlash = flashId === tr.id
              const isFeeOpen = feeTarget?.id === tr.id
              const sub = tr.subscriptions?.[0]
              const daysLeft = sub ? Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / 86_400_000) : null
              const statusConf = {
                active:   { label: t('gymActiveSub'),      cls: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800/40', avatarCls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700' },
                expiring: { label: t('gymExpiringSoon'),   cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',         border: 'border-amber-200 dark:border-amber-800/40',   avatarCls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700'   },
                none:     { label: t('gymNoSubscription'), cls: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400',            border: 'border-blue-100 dark:border-blue-900/40',     avatarCls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700'      }
              }[status]
              return (
                <div key={tr.id} className={`rounded-xl border bg-white dark:bg-slate-800 transition-all duration-300 overflow-hidden ${
                  isFlash ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : statusConf.border
                }`}>
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${statusConf.avatarCls}`}>
                        {tr.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{tr.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {tr.phone && <p className="text-xs text-slate-400">{tr.phone}</p>}
                          {daysLeft !== null && daysLeft >= 0 && <span className="text-[10px] text-slate-400">· {daysLeft}d left</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold hidden sm:block ${statusConf.cls}`}>
                        {statusConf.label}
                      </span>
                      <button
                        onClick={() => checkIn(tr)}
                        disabled={!!checkingIn || isFeeOpen}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                          isFlash ? 'bg-emerald-500 text-white'
                            : status !== 'none' ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                      >
                        {isCIn ? <Loader2 size={12} className="animate-spin" /> : isFlash ? <CheckCircle2 size={12} /> : null}
                        {isCIn ? t('gymLoggingIn') : isFlash ? t('gymDone') : status !== 'none' ? t('gymCheckIn') : 'Log Visit (Paid)'}
                      </button>
                    </div>
                  </div>
                  {isFeeOpen && (
                    <form onSubmit={checkInWithFee} className="border-t border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/10 px-3 py-3 space-y-2.5">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 shrink-0">Visit fee</span>
                        {/* Stepper */}
                        <div className="flex items-center rounded-xl border-2 border-blue-300 dark:border-blue-600 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
                          <button type="button"
                            onClick={() => setFeeAmount(v => String(Math.max(0, (parseFloat(v) || 0) - 5)))}
                            className="px-2.5 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors active:scale-90">
                            <Minus size={13} />
                          </button>
                          <div className="relative">
                            <input
                              value={feeAmount} onChange={e => setFeeAmount(e.target.value)}
                              type="number" min="0" step="0.5" required autoFocus
                              placeholder="0.00"
                              className="w-20 text-center text-base font-bold text-blue-700 dark:text-blue-300 bg-transparent focus:outline-none py-1.5 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                          <button type="button"
                            onClick={() => setFeeAmount(v => String((parseFloat(v) || 0) + 5))}
                            className="px-2.5 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors active:scale-90">
                            <Plus size={13} />
                          </button>
                        </div>
                        {/* Quick amounts */}
                        <div className="flex flex-wrap gap-1 items-center">
                          {feePresets.map(q => (
                            <button key={q} type="button"
                              onClick={() => setFeeAmount(String(q))}
                              className={`group relative px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                                parseFloat(feeAmount) === q
                                  ? 'bg-blue-500 border-blue-500 text-white'
                                  : 'border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                              }`}>
                              {q}
                              {![10, 20, 50].includes(q) && (
                                <span
                                  onClick={e => { e.stopPropagation(); setFeePresets(p => p.filter(x => x !== q)) }}
                                  className="hidden group-hover:inline-flex absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 text-white rounded-full items-center justify-center text-[9px] cursor-pointer leading-none"
                                >×</span>
                              )}
                            </button>
                          ))}
                          {/* Add custom preset */}
                          <form onSubmit={e => {
                            e.preventDefault()
                            const v = parseFloat(feePresetInput)
                            if (v > 0 && !feePresets.includes(v)) setFeePresets(p => [...p, v].sort((a,b) => a-b))
                            setFeePresetInput('')
                          }} className="flex items-center gap-0.5">
                            <input
                              value={feePresetInput} onChange={e => setFeePresetInput(e.target.value)}
                              type="number" min="1" placeholder="+"
                              className="w-10 text-center text-[11px] font-bold px-1 py-1 rounded-l-lg border border-blue-300 dark:border-blue-600 bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                            <button type="submit"
                              className="px-1.5 py-1 rounded-r-lg bg-blue-400 hover:bg-blue-500 text-white text-[11px] font-bold border border-blue-400 transition-colors">
                              ✓
                            </button>
                          </form>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select value={feePayMethod} onChange={e => setFeePayMethod(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400">
                          <option value="cash">💵 Cash</option>
                          <option value="card">💳 Card</option>
                          <option value="transfer">📲 Transfer</option>
                        </select>
                        <button type="submit" disabled={checkingInFee || !feeAmount || parseFloat(feeAmount) <= 0}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors">
                          {checkingInFee ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />} Confirm
                        </button>
                        <button type="button" onClick={() => { setFeeTarget(null); setFeeAmount(''); setFeePayMethod('cash') }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white/60 rounded-lg transition-colors">
                          <X size={13} />
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* No results hint */}
        {search.trim().length > 1 && !searching && searchRes.length === 0 && (
          <p className="text-xs text-slate-400 mb-3">{t('gymNoMembersFound')}</p>
        )}

        {/* Anonymous walk-in toggle */}
        {!showAnon ? (
          <button
            onClick={() => { setShowAnon(true); setSearch(''); setSearchRes([]) }}
            className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            <Footprints size={14} />
            {t('gymLogAnon')}
          </button>
        ) : (
          <div className="mt-2 rounded-xl border border-teal-200 dark:border-teal-800/50 bg-teal-50 dark:bg-teal-900/10 p-3">
            <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 mb-2 flex items-center gap-1.5">
              <Footprints size={12} /> Anonymous Walk-in <span className="text-red-500 ml-1">— payment required</span>
            </p>
            <form onSubmit={handleAnonSubmit} className="space-y-2.5">
              {/* Name */}
              <input
                value={anonName} onChange={e => setAnonName(e.target.value)}
                placeholder={t('gymAnonName')}
                className="w-full px-3 py-2 rounded-lg border border-teal-200 dark:border-teal-700 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              {/* Amount stepper */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-semibold text-teal-700 dark:text-teal-400 shrink-0">Amount <span className="text-red-500">*</span></span>
                <div className="flex items-center rounded-xl border-2 border-teal-400 dark:border-teal-600 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
                  <button type="button"
                    onClick={() => setAnonAmount(v => String(Math.max(0, (parseFloat(v) || 0) - 5)))}
                    className="px-2.5 py-2 text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors active:scale-90">
                    <Minus size={13} />
                  </button>
                  <input
                    value={anonAmount} onChange={e => setAnonAmount(e.target.value)}
                    type="number" min="0" step="0.5" required
                    placeholder="0.00"
                    className="w-20 text-center text-base font-bold text-teal-700 dark:text-teal-300 bg-transparent focus:outline-none py-1.5 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button type="button"
                    onClick={() => setAnonAmount(v => String((parseFloat(v) || 0) + 5))}
                    className="px-2.5 py-2 text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors active:scale-90">
                    <Plus size={13} />
                  </button>
                </div>
                {/* Quick amounts */}
                <div className="flex flex-wrap gap-1 items-center">
                  {anonPresets.map(q => (
                    <button key={q} type="button"
                      onClick={() => setAnonAmount(String(q))}
                      className={`group relative px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                        parseFloat(anonAmount) === q
                          ? 'bg-teal-500 border-teal-500 text-white'
                          : 'border-teal-300 dark:border-teal-600 text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/30'
                      }`}>
                      {q}
                      {![10, 20, 50].includes(q) && (
                        <span
                          onClick={e => { e.stopPropagation(); setAnonPresets(p => p.filter(x => x !== q)) }}
                          className="hidden group-hover:inline-flex absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 text-white rounded-full items-center justify-center text-[9px] cursor-pointer leading-none"
                        >×</span>
                      )}
                    </button>
                  ))}
                  {/* Add custom preset */}
                  <form onSubmit={e => {
                    e.preventDefault()
                    const v = parseFloat(anonPresetInput)
                    if (v > 0 && !anonPresets.includes(v)) setAnonPresets(p => [...p, v].sort((a,b) => a-b))
                    setAnonPresetInput('')
                  }} className="flex items-center gap-0.5">
                    <input
                      value={anonPresetInput} onChange={e => setAnonPresetInput(e.target.value)}
                      type="number" min="1" placeholder="+"
                      className="w-10 text-center text-[11px] font-bold px-1 py-1 rounded-l-lg border border-teal-300 dark:border-teal-600 bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-400"
                    />
                    <button type="submit"
                      className="px-1.5 py-1 rounded-r-lg bg-teal-400 hover:bg-teal-500 text-white text-[11px] font-bold border border-teal-400 transition-colors">
                      ✓
                    </button>
                  </form>
                </div>
              </div>
              {/* Method + submit */}
              <div className="flex items-center gap-2">
                <select value={anonPayMethod} onChange={e => setAnonPayMethod(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-teal-200 dark:border-teal-700 bg-white dark:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-400">
                  <option value="cash">💵 Cash</option>
                  <option value="card">💳 Card</option>
                  <option value="transfer">📲 Transfer</option>
                </select>
                <button type="submit" disabled={savingAnon || !anonAmount || parseFloat(anonAmount) <= 0}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
                  {savingAnon ? <Loader2 size={13} className="animate-spin" /> : <Footprints size={13} />}
                  {t('gymLog')}
                </button>
                <button type="button" onClick={() => { setShowAnon(false); setAnonName(''); setAnonAmount(''); setAnonPayMethod('cash') }}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white/60 rounded-lg transition-colors">
                  <X size={14} />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ── Date Navigator + Day View + Calendar ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left/center: date nav + summary + list */}
        <div className="lg:col-span-2 space-y-4">

          {/* Date navigator */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
            <button
              onClick={() => setSelDate(offsetDay(selDate, -1))}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex-1 text-center">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{fmtDate(selDate)}</p>
              {isToday && (
                <p className="text-xs text-orange-500 font-medium">Today</p>
              )}
            </div>
            <button
              onClick={() => setSelDate(offsetDay(selDate, 1))}
              disabled={selDate >= todayStr()}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
            {!isToday && (
              <button
                onClick={() => setSelDate(todayStr())}
                className="px-3 py-1.5 text-xs font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                {t('gymToday')}
              </button>
            )}
          </div>

          {/* Day summary strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800/40 p-3 text-center">
              <CalendarDays size={15} className="mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
              <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{totalSubs}</p>
              <p className="text-[11px] text-slate-400">{t('gymSubscribers')}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800/40 p-3 text-center">
              <Users size={15} className="mx-auto mb-1 text-blue-600 dark:text-blue-400" />
              <p className="text-xl font-bold tabular-nums text-blue-600 dark:text-blue-400">{totalMemberWalks}</p>
              <p className="text-[11px] text-slate-400">Member Walk-ins</p>
            </div>
            <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-200 dark:border-teal-800/40 p-3 text-center">
              <Footprints size={15} className="mx-auto mb-1 text-teal-600 dark:text-teal-400" />
              <p className="text-xl font-bold tabular-nums text-teal-600 dark:text-teal-400">{totalAnonWalks}</p>
              <p className="text-[11px] text-slate-400">Anonymous</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800/40 p-3 text-center">
              <DollarSign size={15} className="mx-auto mb-1 text-orange-600 dark:text-orange-400" />
              <p className="text-xl font-bold tabular-nums text-orange-600 dark:text-orange-400">{totalRevenue.toFixed(2)}</p>
              <p className="text-[11px] text-slate-400">{t('gymRevenue')}</p>
            </div>
          </div>

          {/* Session list */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                {sessions.length > 0
                  ? `${sessions.length} ${sessions.length !== 1 ? t('gymDailyCheckIns') : t('gymDailyCheckIns')}`
                  : t('gymNoCheckinsYet')}
              </h3>
              {loadingDay && <Loader2 size={14} className="animate-spin text-slate-400" />}
            </div>

            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-slate-400">
                <CalendarDays size={36} className="mb-3 opacity-30" />
                <p className="text-sm font-medium">
                  {isToday ? t('gymNoCheckInsToday') : t('gymNoCheckInsDay')}
                </p>
                {isToday && (
                  <p className="text-xs mt-1 opacity-70">{t('gymUseQuickCheckin')}</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {sessions.map((s, i) => {
                  const time = new Date(s.date).toLocaleTimeString('en-US', {
                    hour: '2-digit', minute: '2-digit', hour12: true
                  })
                  const isSub   = s.type === 'subscription_visit'
                  const isAnon  = s.type === 'walkin' && !s.traineeId
                  const isMember = s.type === 'walkin' && s.traineeId

                  const typeConf = isSub
                    ? { label: '✅ ' + t('gymSubscriptionType'), cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300', avatarCls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700', rowCls: '' }
                    : isMember
                    ? { label: '👤 ' + t('gymMemberVisit'),      cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',            avatarCls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700',    rowCls: '' }
                    : { label: '🚶 ' + t('gymAnonymous'),         cls: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',            avatarCls: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600',    rowCls: 'bg-teal-50/30 dark:bg-teal-900/5' }

                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group ${typeConf.rowCls}`}
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <span className="text-xs text-slate-400 w-16 shrink-0 tabular-nums">{time}</span>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${typeConf.avatarCls}`}>
                        {(s.trainee?.name ?? (isAnon ? '?' : 'W')).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                          {s.trainee?.name ?? <span className="italic text-slate-400">{t('gymAnonymous')}</span>}
                        </p>
                        {s.notes && <p className="text-xs text-slate-400 truncate">{s.notes}</p>}
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${typeConf.cls}`}>
                        {typeConf.label}
                      </span>
                      {(s.amount ?? 0) > 0 ? (
                        <span className="text-xs font-bold text-orange-600 dark:text-orange-400 tabular-nums shrink-0 min-w-[50px] text-right">
                          {s.amount.toFixed(2)}
                          {s.paymentMethod && <span className="text-[9px] text-slate-400 font-normal ml-1">{s.paymentMethod}</span>}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300 dark:text-slate-600 tabular-nums shrink-0 min-w-[50px] text-right">—</span>
                      )}
                      <button
                        onClick={() => setDeleteTarget(s)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all ml-1 shrink-0"
                        title="Remove check-in"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Monthly mini-calendar */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 h-fit">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => changeMonth(-1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
            >
              <ChevronLeft size={13} />
            </button>
            <p className="text-xs font-semibold text-slate-800 dark:text-white">{monthLabel}</p>
            <button
              onClick={() => changeMonth(1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
            >
              <ChevronRight size={13} />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div key={i} className="text-center text-[10px] font-medium text-slate-400 py-0.5">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          {calGrid.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {week.map((day, di) => {
                if (!day) return <div key={di} className="py-1" />
                const count = calData[day]?.total ?? 0
                const isSelected = day === selDate
                const isT = day === todayStr()
                const isFuture = day > todayStr()

                return (
                  <button
                    key={day}
                    onClick={() => selectDay(day)}
                    disabled={isFuture}
                    title={count > 0 ? `${count} check-in${count !== 1 ? 's' : ''}` : undefined}
                    className={`relative flex flex-col items-center justify-center py-1 rounded-lg text-[11px] transition-all ${
                      isSelected
                        ? 'bg-orange-500 text-white font-bold'
                        : isT
                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 font-bold'
                        : isFuture
                        ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer'
                    }`}
                  >
                    <span className="leading-tight">{parseInt(day.slice(8))}</span>
                    {count > 0 && (
                      <span className={`text-[8px] font-bold leading-none ${
                        isSelected ? 'text-white/80' : 'text-orange-500 dark:text-orange-400'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}

          <p className="text-[10px] text-slate-400 text-center mt-3">
            {t('gymDailyNumbers')}
          </p>
        </div>
      </div>

      {/* ── Delete confirm dialog ──────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">{t('gymRemoveCheckin')}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              {t('gymRemoveCheckinConfirm')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {t('gymCancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {t('gymRemove')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
