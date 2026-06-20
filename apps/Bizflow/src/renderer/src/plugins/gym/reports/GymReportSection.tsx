/**
 * GymReportSection
 * Shown in the kernel Reports page when the Gym plugin is active.
 */
import { useState, useEffect, useCallback } from 'react'
import { Dumbbell, Users, Footprints, TrendingUp, TrendingDown, Loader2, Download, CalendarX } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'

interface Props { refreshSignal?: number }

function fmt(n: number) { return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
        <div className={`p-1.5 rounded-lg ${color}`}><Icon size={14} /></div>
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{value}</p>
    </div>
  )
}

function downloadCSV(rows: (string | number)[][], filename: string) {
  const csv = rows
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function GymReportSection({ refreshSignal }: Props) {
  const toast = useToast()
  const [stats, setStats] = useState<any | null>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [st, sess] = await Promise.all([
        (window.api as any).gym?.stats?.overview('month'),
        (window.api as any).gym?.sessions?.getAll({ period: 'month', skip: 0, take: 50 })
      ])
      setStats(st)
      const sessData: any[] = Array.isArray(sess) ? sess : sess?.data ?? []
      setSessions(sessData)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load gym report')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load, refreshSignal])

  function handleExport() {
    if (!stats) return
    const rows: (string | number)[][] = [
      ['Gym Monthly Report', new Date().toLocaleDateString()],
      [],
      ['Metric', 'Value'],
      ['Active Members', stats.activeMembers],
      ['Expiring This Week', stats.expiringSoon],
      ['Today Check-ins', stats.todayCheckIns],
      ['Monthly Revenue', stats.revenue],
      ['Subscription Revenue', stats.subRevenue],
      ['Walk-in Revenue', stats.walkRevenue],
      ['Total Expenses', stats.totalExpenses],
      ['Net Income', stats.netIncome],
      [],
      ['Session Date', 'Type', 'Trainee', 'Coach', 'Amount'],
      ...sessions.map(s => [
        new Date(s.date).toLocaleDateString(),
        s.type,
        s.trainee?.name ?? 'Anonymous',
        s.coach?.name ?? '—',
        s.amount ?? 0
      ])
    ]
    downloadCSV(rows, `gym-report-${new Date().toISOString().slice(0,10)}.csv`)
  }

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800/40">
            <Dumbbell size={18} className="text-orange-500" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Gym</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Monthly activity & financial summary</p>
          </div>
        </div>
        {stats && (
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <Download size={13} />
            Export CSV
          </button>
        )}
      </div>

      {loading && !stats ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-7 w-7 animate-spin text-orange-400" />
        </div>
      ) : stats ? (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users}      label="Active Members"    value={stats.activeMembers}  color="bg-orange-100 dark:bg-orange-900/30 text-orange-600" />
            <StatCard icon={CalendarX}  label="Expiring This Week" value={stats.expiringSoon}  color="bg-amber-100 dark:bg-amber-900/30 text-amber-600" />
            <StatCard icon={Footprints} label="Today Check-ins"   value={stats.todayCheckIns}  color="bg-teal-100 dark:bg-teal-900/30 text-teal-600" />
            <StatCard icon={TrendingUp} label="Monthly Revenue"   value={`$${fmt(stats.revenue)}`} color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" />
          </div>

          {/* Revenue vs Expenses */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Subscription Revenue</p>
              <p className="text-xl font-bold text-orange-600 tabular-nums">${fmt(stats.subRevenue)}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Walk-in Revenue</p>
              <p className="text-xl font-bold text-teal-600 tabular-nums">${fmt(stats.walkRevenue)}</p>
            </div>
            <div className={`rounded-xl border p-4 ${stats.netIncome >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40'}`}>
              <div className="flex items-center gap-1 mb-1">
                {stats.netIncome >= 0 ? <TrendingUp size={12} className="text-emerald-600" /> : <TrendingDown size={12} className="text-red-600" />}
                <p className="text-xs text-slate-500 dark:text-slate-400">Net Income</p>
              </div>
              <p className={`text-xl font-bold tabular-nums ${stats.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {stats.netIncome >= 0 ? '' : '-'}${fmt(Math.abs(stats.netIncome))}
              </p>
            </div>
          </div>

          {/* Recent sessions */}
          {sessions.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Recent Sessions This Month</h3>
                <span className="text-xs text-slate-400">{sessions.length} records</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-60 overflow-y-auto">
                {sessions.slice(0, 20).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">{new Date(s.date).toLocaleDateString()}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.type === 'walkin' ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'}`}>
                        {s.type === 'walkin' ? 'Walk-in' : 'Subscription'}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">{s.trainee?.name ?? <span className="text-slate-400 italic">Anonymous</span>}</span>
                    </div>
                    {s.amount > 0 && (
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">${fmt(s.amount)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-slate-400 text-center py-6">No gym data for this period.</p>
      )}
    </div>
  )
}
