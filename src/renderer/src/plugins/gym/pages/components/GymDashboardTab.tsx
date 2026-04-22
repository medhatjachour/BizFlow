import { useState, useEffect, useCallback } from 'react'
import {
  Loader2, RefreshCcw, Users, CalendarX, Footprints, TrendingUp, Zap,
  AlertTriangle, Phone, Clock, Lock, ClipboardList, UserCheck, Plus,
  ArrowRight, DollarSign
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useToast } from '@renderer/contexts/ToastContext'

type Tab = 'attendance' | 'trainees' | 'coaches' | 'subscriptions' | 'walkins' | 'plans' | 'lockers' | 'programs'

interface Props { onNavigate: (tab: Tab) => void }

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtShort(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return fmt(n)
}

function StatCard({ icon: Icon, label, value, sub, color, bg, border, onClick }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string
  color: string; bg: string; border: string; onClick?: () => void
}) {
  return (
    <div onClick={onClick}
      className={`rounded-xl border p-4 ${bg} ${border} ${onClick ? 'cursor-pointer hover:shadow-md' : ''} transition-all`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={16} className={color} />
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</span>
        </div>
        {onClick && <ArrowRight size={12} className="text-slate-300 dark:text-slate-600" />}
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function GymDashboardTab({ onNavigate }: Props) {
  const toast = useToast()
  const [stats, setStats] = useState<any | null>(null)
  const [atRisk, setAtRisk] = useState<any[]>([])
  const [expiringSubs, setExpiringSubs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [overview, risk, subs] = await Promise.all([
        (window.api as any).gym?.stats?.overview('month'),
        (window.api as any).gym?.alerts?.atRisk(14).catch(() => []),
        (window.api as any).gym?.subscriptions?.getAll({ status: 'active', take: 300 }).catch(() => ({ data: [] })),
      ])
      setStats(overview)
      setAtRisk(risk ?? [])
      const now = Date.now()
      const week = 7 * 86_400_000
      const subsData: any[] = Array.isArray(subs) ? subs : (subs?.data ?? [])
      setExpiringSubs(
        subsData
          .filter(s => { const t = new Date(s.endDate).getTime(); return t >= now && t <= now + week })
          .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
      )
    } catch (err: any) { toast.error(err.message ?? 'Failed to load dashboard') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl">💪</div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{greeting}!</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {stats
                ? `${stats.todayCheckIns} check-ins today · ${stats.activeMembers} active members`
                : 'Loading dashboard…'}
            </p>
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && !stats ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>
      ) : stats ? (
        <>
          {/* Primary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Active Members" value={stats.activeMembers}
              sub="with valid subscription"
              color="text-orange-600" bg="bg-orange-50 dark:bg-orange-900/20" border="border-orange-200 dark:border-orange-800/40"
              onClick={() => onNavigate('trainees')} />
            <StatCard icon={CalendarX} label="Expiring This Week" value={stats.expiringSoon}
              sub={stats.expiringSoon > 0 ? 'tap to renew' : 'all good ✓'}
              color={stats.expiringSoon > 0 ? 'text-amber-600' : 'text-slate-400'}
              bg="bg-amber-50 dark:bg-amber-900/20" border="border-amber-200 dark:border-amber-800/40"
              onClick={() => onNavigate('subscriptions')} />
            <StatCard icon={Footprints} label="Today's Check-ins" value={stats.todayCheckIns}
              sub="sessions logged"
              color="text-teal-600" bg="bg-teal-50 dark:bg-teal-900/20" border="border-teal-200 dark:border-teal-800/40"
              onClick={() => onNavigate('attendance')} />
            <StatCard icon={TrendingUp} label="Monthly Revenue" value={fmtShort(stats.revenue)}
              sub={`Net ${stats.netIncome >= 0 ? '+' : ''}${fmtShort(stats.netIncome)}`}
              color={stats.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}
              bg="bg-emerald-50 dark:bg-emerald-900/20" border="border-emerald-200 dark:border-emerald-800/40" />
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={UserCheck} label="New Members" value={stats.newMembersThisMonth ?? 0}
              sub="joined this month"
              color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20" border="border-blue-200 dark:border-blue-800/40"
              onClick={() => onNavigate('trainees')} />
            <StatCard icon={ClipboardList} label="Active Programs" value={stats.activePrograms ?? 0}
              sub="training programs"
              color="text-purple-600" bg="bg-purple-50 dark:bg-purple-900/20" border="border-purple-200 dark:border-purple-800/40"
              onClick={() => onNavigate('programs')} />
            <StatCard
              icon={Lock}
              label="Locker Occupancy"
              value={stats.totalLockers ? `${stats.occupiedLockers}/${stats.totalLockers}` : '—'}
              sub={stats.totalLockers ? `${stats.totalLockers - (stats.occupiedLockers ?? 0)} available` : 'No lockers set up'}
              color="text-slate-600" bg="bg-slate-50 dark:bg-slate-800/60" border="border-slate-200 dark:border-slate-700"
              onClick={() => onNavigate('lockers')} />
            <StatCard icon={AlertTriangle} label="At-Risk Members" value={atRisk.length}
              sub="inactive 14+ days"
              color={atRisk.length > 0 ? 'text-red-600' : 'text-slate-400'}
              bg={atRisk.length > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-slate-800/60'}
              border={atRisk.length > 0 ? 'border-red-200 dark:border-red-800/40' : 'border-slate-200 dark:border-slate-700'}
              onClick={() => onNavigate('attendance')} />
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</p>
            <div className="flex flex-wrap gap-2">
              {([
                { label: 'Add Member',        icon: Plus,       tab: 'trainees'      as Tab, cls: 'bg-orange-500 hover:bg-orange-600 text-white' },
                { label: 'Log Walk-in',        icon: Footprints, tab: 'attendance'    as Tab, cls: 'bg-teal-500 hover:bg-teal-600 text-white' },
                { label: 'New Subscription',   icon: Plus,       tab: 'subscriptions' as Tab, cls: 'bg-amber-500 hover:bg-amber-600 text-white' },
                { label: 'New Program',        icon: ClipboardList, tab: 'programs'   as Tab, cls: 'bg-purple-500 hover:bg-purple-600 text-white' },
                { label: 'Manage Lockers',     icon: Lock,       tab: 'lockers'       as Tab, cls: 'bg-slate-600 hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 text-white' },
                { label: 'View Coaches',       icon: UserCheck,  tab: 'coaches'       as Tab, cls: 'bg-blue-500 hover:bg-blue-600 text-white' },
                { label: 'Membership Plans',   icon: DollarSign, tab: 'plans'         as Tab, cls: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200' },
              ] as const).map(({ label, icon: Icon, tab, cls }) => (
                <button key={tab} onClick={() => onNavigate(tab)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl transition-colors ${cls}`}>
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Two-column: At-Risk + Expiring Subs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* At-Risk Members */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-500" />
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">At-Risk Members</h3>
                  {atRisk.length > 0 && (
                    <span className="text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full">
                      {atRisk.length}
                    </span>
                  )}
                </div>
                <button onClick={() => onNavigate('attendance')} className="text-xs text-orange-500 hover:text-orange-600 font-medium">
                  View all →
                </button>
              </div>
              {atRisk.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-slate-400">
                  <span className="text-3xl mb-2">🎉</span>
                  <p className="text-sm">All active members visited recently</p>
                </div>
              ) : (
                <div className="space-y-0.5 max-h-52 overflow-y-auto">
                  {atRisk.slice(0, 8).map(m => (
                    <div key={m.traineeId}
                      className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-700/60 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{m.name}</p>
                        <p className="text-xs text-slate-400">{m.planName}</p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-xs font-bold text-red-500">
                          {m.daysSince >= 999 ? 'Never visited' : `${m.daysSince}d inactive`}
                        </p>
                        {m.phone && (
                          <a href={`tel:${m.phone}`}
                            className="flex items-center justify-end gap-0.5 text-[10px] text-slate-400 hover:text-orange-500 transition-colors">
                            <Phone size={9} /> {m.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                  {atRisk.length > 8 && (
                    <p className="text-xs text-center text-slate-400 pt-2">+{atRisk.length - 8} more — view Attendance tab</p>
                  )}
                </div>
              )}
            </div>

            {/* Expiring Subscriptions */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-amber-500" />
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Expiring This Week</h3>
                  {expiringSubs.length > 0 && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">
                      {expiringSubs.length}
                    </span>
                  )}
                </div>
                <button onClick={() => onNavigate('subscriptions')} className="text-xs text-orange-500 hover:text-orange-600 font-medium">
                  Manage →
                </button>
              </div>
              {expiringSubs.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-slate-400">
                  <span className="text-3xl mb-2">✅</span>
                  <p className="text-sm">No subscriptions expiring this week</p>
                </div>
              ) : (
                <div className="space-y-0.5 max-h-52 overflow-y-auto">
                  {expiringSubs.map(s => {
                    const daysLeft = Math.ceil((new Date(s.endDate).getTime() - Date.now()) / 86_400_000)
                    return (
                      <div key={s.id}
                        className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-700/60 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{s.trainee?.name ?? '—'}</p>
                          <p className="text-xs text-slate-400">{s.plan?.name ?? '—'}</p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className={`text-xs font-bold ${daysLeft <= 1 ? 'text-red-500' : 'text-amber-600'}`}>
                            {daysLeft === 0 ? 'Expires today!' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d left`}
                          </p>
                          <button onClick={() => onNavigate('subscriptions')}
                            className="text-[10px] text-orange-500 hover:text-orange-600 font-medium transition-colors">
                            Renew →
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 7-day visit trend */}
          {stats.visitTrend?.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={14} className="text-orange-500" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">7-Day Visit Trend</h3>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={stats.visitTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={v => [v, 'Check-ins']} labelFormatter={d => `Date: ${d}`} />
                  <Line type="monotone" dataKey="count" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Revenue breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              { label: 'Subscription Revenue', value: fmt(stats.subRevenue),    color: 'text-orange-600' },
              { label: 'Walk-in Revenue',       value: fmt(stats.walkRevenue),   color: 'text-teal-600' },
              { label: 'Total Expenses',        value: fmt(stats.totalExpenses), color: 'text-red-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
                <p className={`text-xl font-bold ${color} tabular-nums`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Member Types At a Glance */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Member Types</p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Registered Trainees */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30">
                <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0">
                  <Users size={16} className="text-orange-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5 mb-0.5">
                    <p className="text-lg font-bold text-orange-700 dark:text-orange-400 tabular-nums">{stats.totalTrainees ?? '—'}</p>
                    <span className="text-[10px] font-semibold bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded-full whitespace-nowrap">Trainees</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">Registered profiles — have full history, measurements &amp; goals</p>
                </div>
              </div>

              {/* Active Subscribers */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                  <UserCheck size={16} className="text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5 mb-0.5">
                    <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{stats.activeMembers ?? '—'}</p>
                    <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full whitespace-nowrap">Active subs</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">Trainees on a live plan — time-bound access with optional coach</p>
                </div>
              </div>

              {/* Anonymous Walk-ins */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800/30">
                <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0">
                  <Footprints size={16} className="text-teal-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5 mb-0.5">
                    <p className="text-lg font-bold text-teal-700 dark:text-teal-400 tabular-nums">{stats.anonymousWalkInsToday ?? 0}</p>
                    <span className="text-[10px] font-semibold bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 px-1.5 py-0.5 rounded-full whitespace-nowrap">Today's anon</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">One-off visitors — no profile, pay per entry, no history kept</p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
