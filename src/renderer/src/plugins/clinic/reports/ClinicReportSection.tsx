/**
 * ClinicReportSection
 *
 * Plugin report section for the Clinic module.
 * Reports: Sessions · Patients · Prescriptions
 * Today's Activity: Sessions today, follow-ups, diagnoses, new patients
 */

import { useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  Stethoscope, Users, CalendarClock, ClipboardList,
  FileText, BarChart3, Activity, TrendingUp, Heart,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import { useDashboardWorker } from '@renderer/hooks/useDashboardWorker'
import type { DiagnosisFreqResult } from '@renderer/hooks/useDashboardWorker'
import logger from '@/shared/utils/logger'

interface Props { refreshSignal?: number }
type ReportType = 'sessions' | 'patients' | 'prescriptions'

interface ClinicData {
  patientCount: number
  todaySessions: any[]
  followUps: any[]
  todayPrescriptions: any[]
  patients: any[]
}

const EMPTY: ClinicData = { patientCount: 0, todaySessions: [], followUps: [], todayPrescriptions: [], patients: [] }

const reportOptions = [
  { id: 'sessions'      as ReportType, label: 'Sessions Report',      icon: ClipboardList, color: 'text-teal-600',   desc: 'Appointments by date range' },
  { id: 'patients'      as ReportType, label: 'Patients Report',      icon: Users,          color: 'text-indigo-600', desc: 'Demographics & history' },
  { id: 'prescriptions' as ReportType, label: 'Prescriptions Report', icon: Heart,          color: 'text-pink-600',   desc: 'Medications prescribed' },
]

const DIAGNOSIS_COLORS = ['#0d9488', '#6366f1', '#f59e0b', '#e11d48', '#8b5cf6', '#06b6d4', '#22c55e', '#f97316']

const StatCard = ({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
    <div className="flex items-start justify-between mb-2">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
      <div className={`p-1.5 rounded-lg ${color}`}><Icon size={14} /></div>
    </div>
    <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</p>}
  </div>
)

const ClinicReportSection: React.FC<Props> = ({ refreshSignal }) => {
  const { t } = useLanguage()
  const { error: toastError, success } = useToast()
  const { compute } = useDashboardWorker()

  const [data, setData] = useState<ClinicData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState<ReportType | null>(null)
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [generating, setGenerating] = useState(false)
  const [diagnosisFreq, setDiagnosisFreq] = useState<DiagnosisFreqResult | null>(null)

  useEffect(() => { loadData() }, [refreshSignal])

  const loadData = async () => {
    setLoading(true)
    try {
      const api = (window as any).api.clinic
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)

      const [r1, r2, r3, r4, r5] = await Promise.allSettled([
        api.getPatientCount?.(),
        api.getSessions?.({ startDate: today.toISOString(), endDate: tomorrow.toISOString() }),
        api.getUpcomingFollowUps?.(7),
        api.getPrescriptions?.({ startDate: today.toISOString(), endDate: tomorrow.toISOString() }),
        api.getPatients?.({ limit: 200 }),
      ])

      const patientCount   = r1.status === 'fulfilled' ? Number(r1.value || 0) : 0
      const todaySessions  = r2.status === 'fulfilled' ? (r2.value || []) : []
      const followUps      = r3.status === 'fulfilled' ? (r3.value || []) : []
      const todayRx        = r4.status === 'fulfilled' ? (r4.value || []) : []
      const patients       = r5.status === 'fulfilled' ? (r5.value || []) : []

      setData({ patientCount, todaySessions, followUps, todayPrescriptions: todayRx, patients })

      // Worker: diagnosis frequency
      const diagnoses = todaySessions.flatMap((s: any) => {
        if (Array.isArray(s.diagnoses)) return s.diagnoses.map((d: any) => typeof d === 'string' ? d : d.name || d.diagnosis || 'Unknown')
        if (s.diagnosis) return [typeof s.diagnosis === 'string' ? s.diagnosis : s.diagnosis.name || 'Unknown']
        return []
      })
      if (diagnoses.length > 0) {
        const freq = await compute<DiagnosisFreqResult>('COMPUTE_DIAGNOSIS_FREQ', { diagnoses })
        if (freq) setDiagnosisFreq(freq)
      }
    } catch (err) { logger.error('ClinicReport: loadData failed', err) }
    finally { setLoading(false) }
  }

  const handleGenerateReport = async () => {
    if (!reportType) return
    setGenerating(true)
    try {
      const api = (window as any).api.clinic
      const sDate = new Date(startDate)
      const eDate = new Date(endDate); eDate.setHours(23, 59, 59, 999)
      const dr = `${sDate.toLocaleDateString()} - ${eDate.toLocaleDateString()}`
      const title = reportOptions.find(r => r.id === reportType)?.label ?? reportType
      const doc = new jsPDF()
      let y = 20

      doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.text(`Clinic — ${title}`, 105, y, { align: 'center' }); y += 8
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100)
      doc.text(`Period: ${dr}  |  Generated: ${new Date().toLocaleString()}`, 105, y, { align: 'center' }); y += 12
      doc.setTextColor(0)

      if (reportType === 'sessions') {
        const [r1] = await Promise.allSettled([api.getSessions?.({ startDate: sDate.toISOString(), endDate: eDate.toISOString() })])
        const sessions = r1.status === 'fulfilled' ? (r1.value || []) : []
        autoTable(doc, { startY: y, head: [['Metric', 'Value']], body: [['Total Sessions', sessions.length.toString()], ['Unique Patients', new Set(sessions.map((s: any) => s.patientId)).size.toString()]], theme: 'grid', headStyles: { fillColor: [13, 148, 136] }, styles: { fontSize: 9 }, margin: { left: 14, right: 14 } })
        y = (doc as any).lastAutoTable.finalY + 10
        autoTable(doc, { startY: y, head: [['Patient', 'Date', 'Diagnosis', 'Treatment']], body: sessions.slice(0, 50).map((s: any) => [s.patient?.name || s.patientId || '-', new Date(s.createdAt).toLocaleDateString(), s.diagnosis || (s.diagnoses?.[0]?.name) || '-', s.treatment || '-']), theme: 'striped', headStyles: { fillColor: [13, 148, 136] }, styles: { fontSize: 8 }, margin: { left: 14, right: 14 } })
      } else if (reportType === 'patients') {
        const [r1] = await Promise.allSettled([api.getPatients?.({ limit: 1000 })])
        const pts = r1.status === 'fulfilled' ? (r1.value || []) : []
        autoTable(doc, { startY: y, head: [['Name', 'DOB', 'Gender', 'Phone', 'Registered']], body: pts.slice(0, 50).map((p: any) => [p.name || '-', p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : '-', p.gender || '-', p.phone || '-', new Date(p.createdAt).toLocaleDateString()]), theme: 'striped', headStyles: { fillColor: [99, 102, 241] }, styles: { fontSize: 8 }, margin: { left: 14, right: 14 } })
      } else if (reportType === 'prescriptions') {
        const [r1] = await Promise.allSettled([api.getPrescriptions?.({ startDate: sDate.toISOString(), endDate: eDate.toISOString() })])
        const rxList = r1.status === 'fulfilled' ? (r1.value || []) : []
        autoTable(doc, { startY: y, head: [['Patient', 'Medication', 'Dosage', 'Date']], body: rxList.slice(0, 50).map((rx: any) => [rx.patient?.name || rx.patientId || '-', rx.medication || rx.name || '-', rx.dosage || '-', new Date(rx.createdAt).toLocaleDateString()]), theme: 'striped', headStyles: { fillColor: [236, 72, 153] }, styles: { fontSize: 8 }, margin: { left: 14, right: 14 } })
      }

      const fname = `Clinic_${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fname); success(`Saved: ${fname}`)
    } catch (err) { logger.error('ClinicReport: generate failed', err); toastError('Failed to generate report') }
    finally { setGenerating(false) }
  }

  const diagChartData = (diagnosisFreq?.ranked ?? []).slice(0, 8).map(d => ({ name: d.name.length > 14 ? d.name.slice(0, 12) + '…' : d.name, count: d.count }))

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3 px-1">
        <div className="p-2.5 bg-teal-100 dark:bg-teal-900/30 rounded-xl">
          <Stethoscope size={22} className="text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Clinic Reports</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Sessions · Patients · Prescriptions</p>
        </div>
      </div>

      {/* Generate Report */}
      <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700 rounded-xl p-6 shadow-sm border border-teal-200 dark:border-slate-600">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-teal-600 rounded-lg"><FileText size={17} className="text-white" /></div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Generate Report</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Select a report type and date range</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          {reportOptions.map(r => {
            const Icon = r.icon
            const active = reportType === r.id
            return (
              <button key={r.id} onClick={() => setReportType(r.id)}
                className={`p-4 rounded-xl text-left transition-all hover:scale-[1.02] ${active ? 'bg-teal-600 text-white shadow-lg ring-4 ring-teal-300/40' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:shadow-md border border-slate-200 dark:border-slate-600'}`}>
                <Icon size={22} className={`mb-1.5 ${active ? 'text-white' : r.color}`} />
                <p className="text-sm font-semibold">{r.label}</p>
                <p className={`text-xs mt-0.5 ${active ? 'text-teal-100' : 'text-slate-500'}`}>{r.desc}</p>
              </button>
            )
          })}
        </div>
        {reportType && (
          <div className="flex flex-wrap items-end gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">📅 Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500 transition-all text-sm" />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">📅 End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-teal-500 transition-all text-sm" />
            </div>
            <button onClick={handleGenerateReport} disabled={generating}
              className="px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2 font-semibold shadow-md transition-all">
              <BarChart3 size={16} />{generating ? 'Generating…' : 'Generate PDF Report'}
            </button>
          </div>
        )}
      </div>

      {/* Today's Activity */}
      <div className="bg-gradient-to-br from-teal-500/5 to-teal-500/10 dark:from-teal-500/10 dark:to-teal-500/5 p-6 rounded-xl border border-teal-200/50 dark:border-teal-700/30">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={20} className="text-teal-600 dark:text-teal-400" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Today's Clinic Activity</h3>
          <span className="px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />Live
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users}       label="Total Patients"     value={data.patientCount}             sub="registered patients"                 color="bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400" />
            <StatCard icon={Stethoscope} label="Sessions Today"     value={data.todaySessions.length}     sub={`${new Set(data.todaySessions.map((s: any) => s.patientId)).size} unique patients`} color="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" />
            <StatCard icon={CalendarClock} label="Follow-ups Due"   value={data.followUps.length}         sub="within 7 days"                       color="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" />
            <StatCard icon={Heart}       label="Prescriptions"      value={data.todayPrescriptions.length} sub="issued today"                       color="bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400" />
          </div>
        )}

        {/* Diagnosis frequency + Follow-ups */}
        {!loading && (
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Diagnoses chart */}
            {diagChartData.length > 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Today's Diagnosis Frequency</h4>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={diagChartData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {diagChartData.map((_, i) => <Cell key={i} fill={DIAGNOSIS_COLORS[i % DIAGNOSIS_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {diagnosisFreq && (
                  <p className="text-xs text-slate-400 mt-2">{diagnosisFreq.total} total diagnoses · {diagnosisFreq.unique} unique · Most common: <span className="font-semibold text-teal-600 dark:text-teal-400">{diagnosisFreq.ranked[0]?.name}</span></p>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 py-8">
                <ClipboardList size={32} className="opacity-30 mb-2" />
                <p className="text-sm">No diagnoses recorded today</p>
              </div>
            )}

            {/* Follow-ups list */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <CalendarClock size={15} className="text-amber-600 dark:text-amber-400" />
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Upcoming Follow-ups (7 days)</h4>
              </div>
              {data.followUps.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {data.followUps.slice(0, 8).map((fu: any) => (
                    <div key={fu.id} className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg">
                      <div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{fu.patient?.name || fu.patientName || 'Patient'}</p>
                        <p className="text-[10px] text-slate-500">{fu.notes || fu.reason || 'Follow-up'}</p>
                      </div>
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap">
                        {fu.followUpDate ? new Date(fu.followUpDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-slate-400 dark:text-slate-600">
                  <CalendarClock size={28} className="opacity-30 mb-2" />
                  <p className="text-xs">No follow-ups scheduled</p>
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && data.todaySessions.length === 0 && (
          <div className="mt-4 flex flex-col items-center justify-center py-6 text-slate-400 dark:text-slate-600">
            <Stethoscope size={36} className="opacity-30 mb-2" />
            <p className="text-sm">No sessions recorded today</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ClinicReportSection
