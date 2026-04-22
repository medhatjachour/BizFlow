import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, Loader2, CheckCircle2, Footprints, Users, DollarSign,
  ChevronLeft, ChevronRight, CalendarDays, X, Zap, Trash2,
  AlertTriangle, ChevronDown, ChevronUp, Phone
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'

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
  const [savingAnon, setSavingAnon] = useState(false)

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
    setCheckingIn(trainee.id)
    try {
      const status = subStatus(trainee)
      const type = status !== 'none' ? 'subscription_visit' : 'walkin'
      await (window.api as any).gym?.sessions?.create({
        traineeId: trainee.id,
        type,
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

  // ── Anonymous walk-in ─────────────────────────────────────────────────────────
  async function handleAnonSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSavingAnon(true)
    try {
      await (window.api as any).gym?.sessions?.create({
        type: 'walkin',
        date: selDate,
        amount: anonAmount ? parseFloat(anonAmount) : 0,
        notes: anonName.trim() ? `Walk-in: ${anonName.trim()}` : undefined
      })
      toast.success('Walk-in logged!')
      setShowAnon(false)
      setAnonName('')
      setAnonAmount('')
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
  const totalSubs = sessions.filter(s => s.type === 'subscription_visit').length
  const totalWalkins = sessions.filter(s => s.type === 'walkin').length
  const totalRevenue = sessions.reduce((sum, s) => sum + (s.amount ?? 0), 0)
  const isToday = selDate === todayStr()

  // ── Calendar grid ─────────────────────────────────────────────────────────────
  const calGrid = buildCalGrid(calMonth.year, calMonth.month)
  const monthLabel = new Date(calMonth.year, calMonth.month - 1, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400'

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
              {atRisk.length} member{atRisk.length !== 1 ? 's' : ''} haven't visited in 14+ days
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
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Quick Check-in</h2>
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
            placeholder="Search member by name or phone…"
            className="w-full pl-10 pr-10 py-3 rounded-xl border-2 border-orange-200 dark:border-orange-700/60 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        {/* Search results */}
        {searchRes.length > 0 && (
          <div className="space-y-2 mb-3 max-h-72 overflow-y-auto">
            {searchRes.map(t => {
              const status = subStatus(t)
              const badgeConf = {
                active:   { label: 'Active Sub',     cls: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
                expiring: { label: 'Expiring Soon',  cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
                none:     { label: 'No Subscription', cls: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' }
              }[status]
              const isCIn = checkingIn === t.id
              const isFlash = flashId === t.id

              return (
                <div
                  key={t.id}
                  className={`flex items-center justify-between p-3 rounded-xl border bg-white dark:bg-slate-800 transition-all duration-300 ${
                    isFlash ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-sm font-bold text-orange-600 shrink-0">
                      {t.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.name}</p>
                      {t.phone && <p className="text-xs text-slate-400">{t.phone}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium hidden sm:block ${badgeConf.cls}`}>
                      {badgeConf.label}
                    </span>
                    <button
                      onClick={() => checkIn(t)}
                      disabled={!!checkingIn}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                        isFlash
                          ? 'bg-emerald-500 text-white'
                          : status !== 'none'
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                          : 'bg-orange-500 hover:bg-orange-600 text-white'
                      }`}
                    >
                      {isCIn
                        ? <Loader2 size={12} className="animate-spin" />
                        : isFlash
                        ? <CheckCircle2 size={12} />
                        : null}
                      {isCIn ? 'Logging…' : isFlash ? 'Done!' : 'Check In'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* No results hint */}
        {search.trim().length > 1 && !searching && searchRes.length === 0 && (
          <p className="text-xs text-slate-400 mb-3">No members found — log as anonymous walk-in below.</p>
        )}

        {/* Anonymous walk-in toggle */}
        {!showAnon ? (
          <button
            onClick={() => { setShowAnon(true); setSearch(''); setSearchRes([]) }}
            className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
          >
            <Footprints size={14} />
            Log anonymous walk-in (not in member list)
          </button>
        ) : (
          <form onSubmit={handleAnonSubmit} className="flex flex-wrap items-center gap-2 mt-2">
            <input
              value={anonName}
              onChange={e => setAnonName(e.target.value)}
              placeholder="Name (optional)"
              className="flex-1 min-w-32 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <input
              value={anonAmount}
              onChange={e => setAnonAmount(e.target.value)}
              placeholder="Amount ($)"
              type="number" min="0" step="0.01"
              className="w-28 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              type="submit"
              disabled={savingAnon}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 flex items-center gap-1.5"
            >
              {savingAnon ? <Loader2 size={13} className="animate-spin" /> : <Footprints size={13} />}
              Log
            </button>
            <button
              type="button"
              onClick={() => { setShowAnon(false); setAnonName(''); setAnonAmount('') }}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X size={14} />
            </button>
          </form>
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
                Today
              </button>
            )}
          </div>

          {/* Day summary strip */}
          <div className="grid grid-cols-4 gap-3">
            {([
              { icon: Users,        label: 'Total',       value: sessions.length,              cls: 'text-slate-700 dark:text-slate-200',  bg: 'bg-slate-50 dark:bg-slate-700/30' },
              { icon: CalendarDays, label: 'Subscribers', value: totalSubs,                    cls: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
              { icon: Footprints,   label: 'Walk-ins',    value: totalWalkins,                 cls: 'text-orange-500',                     bg: 'bg-orange-50 dark:bg-orange-900/20' },
              { icon: DollarSign,   label: 'Revenue',     value: `$${totalRevenue.toFixed(0)}`, cls: 'text-teal-600 dark:text-teal-400',   bg: 'bg-teal-50 dark:bg-teal-900/20' },
            ] as const).map(({ icon: Icon, label, value, cls, bg }) => (
              <div key={label} className={`${bg} rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-center`}>
                <Icon size={15} className={`mx-auto mb-1 ${cls}`} />
                <p className={`text-xl font-bold tabular-nums ${cls}`}>{value}</p>
                <p className="text-[11px] text-slate-400">{label}</p>
              </div>
            ))}
          </div>

          {/* Session list */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                {sessions.length > 0
                  ? `${sessions.length} check-in${sessions.length !== 1 ? 's' : ''}`
                  : 'No check-ins yet'}
              </h3>
              {loadingDay && <Loader2 size={14} className="animate-spin text-slate-400" />}
            </div>

            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-slate-400">
                <CalendarDays size={36} className="mb-3 opacity-30" />
                <p className="text-sm font-medium">
                  {isToday ? 'No check-ins yet today' : 'No check-ins on this day'}
                </p>
                {isToday && (
                  <p className="text-xs mt-1 opacity-70">Use Quick Check-in above to log attendance</p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {sessions.map((s, i) => {
                  const time = new Date(s.date).toLocaleTimeString('en-US', {
                    hour: '2-digit', minute: '2-digit', hour12: true
                  })
                  const isSub = s.type === 'subscription_visit'
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <span className="text-xs text-slate-400 w-16 shrink-0 tabular-nums">{time}</span>
                      <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-xs font-bold text-orange-600 shrink-0">
                        {(s.trainee?.name ?? 'W').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                          {s.trainee?.name ?? <span className="italic text-slate-400">Anonymous walk-in</span>}
                        </p>
                        {s.notes && <p className="text-xs text-slate-400 truncate">{s.notes}</p>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        isSub
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                          : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                      }`}>
                        {isSub ? 'Subscription' : 'Walk-in'}
                      </span>
                      {(s.amount ?? 0) > 0 && (
                        <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 tabular-nums shrink-0">
                          ${s.amount.toFixed(2)}
                        </span>
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
            Numbers show daily check-ins
          </p>
        </div>
      </div>

      {/* ── Delete confirm dialog ──────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">Remove check-in?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              This will remove <strong>{deleteTarget.trainee?.name ?? 'the anonymous walk-in'}</strong>'s check-in record. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
