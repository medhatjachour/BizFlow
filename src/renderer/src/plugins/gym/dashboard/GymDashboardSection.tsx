/**
 * GymDashboardSection
 * Shown in the kernel Dashboard page when the Gym plugin is active.
 * Full command-centre: KPIs, at-risk members, expiring subs, quick actions, trend chart.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dumbbell, Loader2, RefreshCcw, Users, CalendarX, Footprints, TrendingUp, Zap,
  AlertTriangle, Phone, Clock, Lock, ClipboardList, UserCheck, Plus, ArrowRight, DollarSign
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props { refreshSignal?: number }

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtShort(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return fmt(n)
}

function KpiCard({ icon: Icon, label, value, sub, color, bg, border, onClick }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string
  color: string; bg: string; border: string; onClick?: () => void
}) {
  return (
    <div onClick={onClick}
      className={`rounded-xl border p-3.5 ${bg} ${border} ${onClick ? 'cursor-pointer hover:shadow-md' : ''} transition-all`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Icon size={14} className={color} />
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-none">{label}</span>
        </div>
        {onClick && <ArrowRight size={11} className="text-slate-300 dark:text-slate-600" />}
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function GymDashboardSection({ refreshSignal }: Props) {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [stats, setStats] = useState<any | null>(null)
  const [atRisk, setAtRisk] = useState<any[]>([])
  const [expiringSubs, setExpiringSubs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [overview, risk, subs] = await Promise.allSettled([
        (window.api as any).gym?.stats?.overview('month'),
        (window.api as any).gym?.alerts?.atRisk(14),
        (window.api as any).gym?.subscriptions?.getAll({ status: 'active', take: 300 }),
      ])
      const s = overview.status === 'fulfilled' ? overview.value : null
      setStats(s)
      setAtRisk(risk.status === 'fulfilled' ? (risk.value ?? []) : [])
      if (subs.status === 'fulfilled') {
        const now = Date.now()
        const week = 7 * 86_400_000
        const arr: any[] = Array.isArray(subs.value) ? subs.value : (subs.value?.data ?? [])
        setExpiringSubs(
          arr.filter(s => { const t = new Date(s.endDate).getTime(); return t >= now && t <= now + week })
             .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
        )
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load, refreshSignal])

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800/40">
            <Dumbbell size={16} className="text-orange-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t('gymTitle')}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {stats ? `${stats.todayCheckIns} ${t('gymTodayCheckIns').toLowerCase()} · ${stats.activeMembers} ${t('gymActiveMembers').toLowerCase()}` : 'Loading…'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/gym')}
            className="text-xs text-orange-600 hover:underline font-medium">{t('gymOpenGym')} →</button>
          <button onClick={load} disabled={loading}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <RefreshCcw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {loading && !stats ? (
          <div className="flex justify-center py-10"><Loader2 className="h-7 w-7 animate-spin text-orange-400" /></div>
        ) : stats ? (
          <>
            {/* Row 1 KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard icon={Users} label="Active Members" value={stats.activeMembers}
                sub="valid subscription" color="text-orange-600"
                bg="bg-orange-50 dark:bg-orange-900/20" border="border-orange-200 dark:border-orange-800/40"
                onClick={() => navigate('/gym')} />
              <KpiCard icon={CalendarX} label="Expiring This Week" value={stats.expiringSoon}
                sub={stats.expiringSoon > 0 ? 'need renewal' : 'all good ✓'}
                color={stats.expiringSoon > 0 ? 'text-amber-600' : 'text-slate-400'}
                bg="bg-amber-50 dark:bg-amber-900/20" border="border-amber-200 dark:border-amber-800/40"
                onClick={() => navigate('/gym')} />
              <KpiCard icon={Footprints} label="Today's Check-ins" value={stats.todayCheckIns}
                sub="sessions logged" color="text-teal-600"
                bg="bg-teal-50 dark:bg-teal-900/20" border="border-teal-200 dark:border-teal-800/40"
                onClick={() => navigate('/gym')} />
              <KpiCard icon={TrendingUp} label="Monthly Revenue" value={fmtShort(stats.revenue)}
                sub={`Net ${stats.netIncome >= 0 ? '+' : ''}${fmtShort(stats.netIncome)}`}
                color={stats.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}
                bg="bg-emerald-50 dark:bg-emerald-900/20" border="border-emerald-200 dark:border-emerald-800/40" />
            </div>

            {/* Row 2 KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard icon={UserCheck} label={t('gymNewThisMonth')} value={stats.newMembersThisMonth ?? 0}
                sub="joined" color="text-blue-600"
                bg="bg-blue-50 dark:bg-blue-900/20" border="border-blue-200 dark:border-blue-800/40"
                onClick={() => navigate('/gym')} />
              <KpiCard icon={ClipboardList} label={t('gymActivePrograms')} value={stats.activePrograms ?? 0}
                sub="training programs" color="text-purple-600"
                bg="bg-purple-50 dark:bg-purple-900/20" border="border-purple-200 dark:border-purple-800/40"
                onClick={() => navigate('/gym')} />
              <KpiCard icon={Lock} label={t('gymLockerOccupancy')}
                value={stats.totalLockers ? `${stats.occupiedLockers}/${stats.totalLockers}` : '—'}
                sub={stats.totalLockers ? `${stats.totalLockers - (stats.occupiedLockers ?? 0)} free` : 'none set up'}
                color="text-slate-600" bg="bg-slate-50 dark:bg-slate-700/40" border="border-slate-200 dark:border-slate-700"
                onClick={() => navigate('/gym')} />
              <KpiCard icon={AlertTriangle} label={t('gymAtRiskMembers')} value={atRisk.length}
                sub="inactive 14+ days"
                color={atRisk.length > 0 ? 'text-red-600' : 'text-slate-400'}
                bg={atRisk.length > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-slate-700/40'}
                border={atRisk.length > 0 ? 'border-red-200 dark:border-red-800/40' : 'border-slate-200 dark:border-slate-700'}
                onClick={() => navigate('/gym')} />
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'gymAddMember',       icon: Plus,          cls: 'bg-orange-500 hover:bg-orange-600 text-white' },
                { key: 'gymNewSub',          icon: Plus,          cls: 'bg-amber-500 hover:bg-amber-600 text-white' },
                { key: 'gymNewProgramBtn',   icon: ClipboardList, cls: 'bg-purple-500 hover:bg-purple-600 text-white' },
                { key: 'gymManageLockers',   icon: Lock,          cls: 'bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white' },
                { key: 'gymViewFinance',     icon: DollarSign,    cls: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200' },
              ] as const).map(({ key, icon: Icon, cls }) => (
                <button key={key} onClick={() => navigate('/gym')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${cls}`}>
                  <Icon size={12} /> {t(key)}
                </button>
              ))}
            </div>

            {/* At-Risk + Expiring panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* At-Risk */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle size={13} className="text-red-500" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{t('gymAtRiskPanel')}</span>
                    {atRisk.length > 0 && (
                      <span className="text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-full">{atRisk.length}</span>
                    )}
                  </div>
                  <button onClick={() => navigate('/gym')} className="text-[11px] text-orange-500 hover:text-orange-600 font-medium">View →</button>
                </div>
                {atRisk.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-5">🎉 All active members visited recently</p>
                ) : (
                  <div className="space-y-0 max-h-40 overflow-y-auto">
                    {atRisk.slice(0, 5).map(m => (
                      <div key={m.traineeId} className="flex items-center justify-between py-1.5 border-b border-slate-200 dark:border-slate-600 last:border-0">
                        <div>
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-100">{m.name}</p>
                          <p className="text-[10px] text-slate-400">{m.planName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-bold text-red-500">{m.daysSince >= 999 ? 'Never' : `${m.daysSince}d`}</p>
                          {m.phone && (
                            <a href={`tel:${m.phone}`} className="flex items-center gap-0.5 text-[10px] text-slate-400 hover:text-orange-500">
                              <Phone size={8} /> {m.phone}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                    {atRisk.length > 5 && <p className="text-[10px] text-center text-slate-400 pt-1">+{atRisk.length - 5} more</p>}
                  </div>
                )}
              </div>

              {/* Expiring Subscriptions */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-amber-500" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{t('gymExpiringPanel')}</span>
                    {expiringSubs.length > 0 && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full">{expiringSubs.length}</span>
                    )}
                  </div>
                  <button onClick={() => navigate('/gym')} className="text-[11px] text-orange-500 hover:text-orange-600 font-medium">Manage →</button>
                </div>
                {expiringSubs.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-5">✅ No subscriptions expiring this week</p>
                ) : (
                  <div className="space-y-0 max-h-40 overflow-y-auto">
                    {expiringSubs.slice(0, 5).map(s => {
                      const daysLeft = Math.ceil((new Date(s.endDate).getTime() - Date.now()) / 86_400_000)
                      return (
                        <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-slate-200 dark:border-slate-600 last:border-0">
                          <div>
                            <p className="text-xs font-medium text-slate-800 dark:text-slate-100">{s.trainee?.name ?? '—'}</p>
                            <p className="text-[10px] text-slate-400">{s.plan?.name ?? '—'}</p>
                          </div>
                          <p className={`text-[11px] font-bold ${daysLeft <= 1 ? 'text-red-500' : 'text-amber-600'}`}>
                            {daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d`}
                          </p>
                        </div>
                      )
                    })}
                    {expiringSubs.length > 5 && <p className="text-[10px] text-center text-slate-400 pt-1">+{expiringSubs.length - 5} more</p>}
                  </div>
                )}
              </div>
            </div>

            {/* 7-day visit trend */}
            {stats.visitTrend?.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <Zap size={13} className="text-orange-500" />
                  <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">{t('gymDayVisitTrend')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={130}>
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
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: t('gymSubRevenue'),  value: fmt(stats.subRevenue),    color: 'text-orange-600' },
                { label: t('gymWalkRevenue'), value: fmt(stats.walkRevenue),   color: 'text-teal-600' },
                { label: t('gymExpenses'),    value: fmt(stats.totalExpenses), color: 'text-red-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3 text-center border border-slate-200 dark:border-slate-700">
                  <p className="text-[10px] text-slate-400 mb-1">{label}</p>
                  <p className={`text-sm font-bold ${color} tabular-nums`}>{value}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-400 text-center py-6">{t('gymNoDataAvailable')}</p>
        )}
      </div>
    </div>
  )
}
