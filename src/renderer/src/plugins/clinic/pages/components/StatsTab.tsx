import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Users, ClipboardList, UserPlus, Calendar, Activity, Loader2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Overview {
  totalPatients: number
  sessionsThisMonth: number
  newPatientsThisMonth: number
  followUpsDue: number
  todaySessions: number
}

interface DiagnosisEntry {
  diagnosis: string
  count: number
}

interface TrendEntry {
  date: string
  count: number
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType
  label: string
  value: number | string
  color: string
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
        <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
      </div>
    </div>
  )
}

export default function StatsTab() {
  const { t } = useLanguage()
  const [overview, setOverview] = useState<Overview | null>(null)
  const [diagnoses, setDiagnoses] = useState<DiagnosisEntry[]>([])
  const [trend, setTrend] = useState<TrendEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [ov, dx, tr] = await Promise.all([
          window.api.clinic.stats.overview(),
          window.api.clinic.stats.topDiagnoses(8),
          window.api.clinic.stats.visitTrend(30)
        ])
        if (!cancelled) {
          setOverview(ov)
          setDiagnoses(dx)
          setTrend(tr)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    )
  }

  const maxDx = diagnoses[0]?.count ?? 1

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard
            icon={Users}
            label={t('totalPatients')}
            value={overview.totalPatients}
            color="bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400"
          />
          <StatCard
            icon={Activity}
            label={t('todaySessions')}
            value={overview.todaySessions}
            color="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
          />
          <StatCard
            icon={ClipboardList}
            label={t('sessionsThisMonth')}
            value={overview.sessionsThisMonth}
            color="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
          />
          <StatCard
            icon={UserPlus}
            label={t('newPatientsMonth')}
            value={overview.newPatientsThisMonth}
            color="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            icon={Calendar}
            label={t('followUpsDue')}
            value={overview.followUpsDue}
            color="bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
          />
        </div>
      )}

      {/* Visit trend chart */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
          {t('visitTrend30Days')}
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickFormatter={(v) => v.slice(5)}
              interval={4}
            />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', background: '#1e293b', color: '#fff' }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top diagnoses */}
      {diagnoses.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">
            {t('topDiagnoses')}
          </h3>
          <div className="space-y-2">
            {diagnoses.map((d, i) => (
              <div key={d.diagnosis} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-700 dark:text-slate-200 truncate">{d.diagnosis}</span>
                    <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 ml-2">{d.count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full"
                      style={{ width: `${(d.count / maxDx) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
