/**
 * ClinicFinanceSection
 *
 * Finance section for the Clinic plugin.
 * Tabs: Activity Overview · Visit Trends · Top Diagnoses
 * APIs: clinic.stats.overview, clinic.stats.visitTrend, clinic.stats.topDiagnoses, clinic.sessions.getRecent
 */

import { useState, useEffect } from 'react'
import {
  Stethoscope, Users, Calendar, Activity,
  TrendingUp, ClipboardList, RefreshCcw, Heart, BarChart3,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts'
import logger from '@/shared/utils/logger'

type TabType = 'activity' | 'trends' | 'diagnoses'

const COLORS = ['#14b8a6', '#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#84cc16']

const StatCard = ({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
    <div className="flex items-start justify-between mb-3">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
      <div className={`p-2 rounded-xl ${color}`}><Icon size={16} /></div>
    </div>
    <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</p>}
  </div>
)

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${active ? 'bg-teal-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
      {icon}{label}
    </button>
  )
}

const ClinicFinanceSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('activity')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [overviewStats, setOverviewStats] = useState<any>(null)
  const [visitTrend, setVisitTrend] = useState<any[]>([])
  const [topDiagnoses, setTopDiagnoses] = useState<any[]>([])
  const [recentSessions, setRecentSessions] = useState<any[]>([])

  useEffect(() => { loadData() }, [])

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true)
    try {
      const api = (window as any).api.clinic

      const [r1, r2, r3, r4] = await Promise.allSettled([
        api.stats?.overview?.(),
        api.stats?.visitTrend?.(30),
        api.stats?.topDiagnoses?.(10),
        api.sessions?.getRecent?.(),
      ])

      if (r1.status === 'fulfilled') setOverviewStats(r1.value)
      if (r2.status === 'fulfilled') setVisitTrend(Array.isArray(r2.value) ? r2.value : [])
      if (r3.status === 'fulfilled') setTopDiagnoses(Array.isArray(r3.value) ? r3.value : [])
      if (r4.status === 'fulfilled') setRecentSessions(Array.isArray(r4.value) ? r4.value : [])
    } catch (err) { logger.error('ClinicFinance: loadData failed', err) }
    finally { setLoading(false); setRefreshing(false) }
  }

  const totalSessions = overviewStats?.totalSessions ?? overviewStats?.sessionCount ?? recentSessions.length
  const totalPatients = overviewStats?.totalPatients ?? overviewStats?.patientCount ?? 0
  const avgVisitsPerDay = overviewStats?.avgVisitsPerDay ?? (visitTrend.length > 0 ? (visitTrend.reduce((s, v) => s + Number(v.count || 0), 0) / visitTrend.length).toFixed(1) : 0)
  const activeDoctors = overviewStats?.activeDoctors ?? overviewStats?.doctorCount ?? 0

  // Visit trend chart data
  const trendData = visitTrend.map(v => ({
    date: typeof v.date === 'string' ? v.date.slice(5) : v.date,
    visits: Number(v.count || v.visits || 0),
  }))

  // Diagnoses chart data
  const diagData = topDiagnoses.map(d => ({
    name: (d.diagnosis || d.name || 'Unknown').slice(0, 20),
    count: Number(d.count || d.total || 0),
  }))

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 px-1">
          <div className="p-2.5 bg-teal-100 dark:bg-teal-900/30 rounded-xl">
            <Stethoscope size={22} className="text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Clinic Analytics</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Activity · Visit Trends · Top Diagnoses</p>
          </div>
        </div>
        <button onClick={() => loadData(true)} disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium disabled:opacity-50">
          <RefreshCcw size={15} className={refreshing ? 'animate-spin' : ''} />Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-2 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap gap-2">
          <TabButton active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} icon={<Activity size={16} />} label="Activity Overview" />
          <TabButton active={activeTab === 'trends'} onClick={() => setActiveTab('trends')} icon={<TrendingUp size={16} />} label="Visit Trends" />
          <TabButton active={activeTab === 'diagnoses'} onClick={() => setActiveTab('diagnoses')} icon={<ClipboardList size={16} />} label="Top Diagnoses" />
        </div>
      </div>

      {/* Activity Overview */}
      {activeTab === 'activity' && (
        <div className="space-y-5">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-200 dark:bg-slate-700 rounded-xl" />)}</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Calendar} label="Total Sessions" value={totalSessions} sub="all time" color="bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400" />
              <StatCard icon={Users} label="Total Patients" value={totalPatients} sub="registered" color="bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400" />
              <StatCard icon={Activity} label="Avg Daily Visits" value={avgVisitsPerDay} sub="30-day average" color="bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400" />
              <StatCard icon={Heart} label="Active Doctors" value={activeDoctors} sub="practitioners" color="bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400" />
            </div>
          )}

          {/* Recent sessions summary */}
          {!loading && recentSessions.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recent Sessions</h4>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {recentSessions.slice(0, 6).map((s: any, i) => (
                  <div key={s.id || i} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{s.patient?.name || s.patientName || 'Patient'}</p>
                      <p className="text-xs text-slate-500">{s.doctor?.name || s.doctorName || 'Doctor'} · {s.type || s.sessionType || 'Consultation'}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.status === 'completed' ? 'bg-green-100 text-green-700' :
                        s.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'}`}>
                        {s.status || 'unknown'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visit Trends */}
      {activeTab === 'trends' && (
        <div className="space-y-5">
          {loading ? (
            <div className="animate-pulse h-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          ) : trendData.length > 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Daily Visits — Last 30 Days</h4>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="visits" stroke="#14b8a6" strokeWidth={2.5} dot={{ r: 2.5, fill: '#14b8a6' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <TrendingUp size={40} className="opacity-30 mb-2" /><p className="text-sm">No visit trend data available</p>
            </div>
          )}

          {/* Summary cards */}
          {!loading && trendData.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <StatCard icon={TrendingUp} label="Peak Day" value={`${Math.max(...trendData.map(d => d.visits))} visits`} sub="highest single day" color="bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400" />
              <StatCard icon={Activity} label="Total Visits" value={trendData.reduce((s, d) => s + d.visits, 0)} sub="30-day total" color="bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400" />
              <StatCard icon={BarChart3} label="Avg / Day" value={(trendData.reduce((s, d) => s + d.visits, 0) / trendData.length).toFixed(1)} sub="mean visits/day" color="bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400" />
            </div>
          )}
        </div>
      )}

      {/* Top Diagnoses */}
      {activeTab === 'diagnoses' && (
        <div className="space-y-5">
          {loading ? (
            <div className="animate-pulse space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />)}</div>
          ) : diagData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Top Diagnoses Frequency</h4>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={diagData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {diagData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {diagData.map((diag, i) => {
                  const maxCount = diagData[0]?.count || 1
                  const pct = ((diag.count / maxCount) * 100).toFixed(0)
                  return (
                    <div key={i} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{diag.name}</span>
                        <span className="text-sm font-bold" style={{ color: COLORS[i % COLORS.length] }}>{diag.count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <ClipboardList size={40} className="opacity-30 mb-2" /><p className="text-sm">No diagnosis data available</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ClinicFinanceSection
