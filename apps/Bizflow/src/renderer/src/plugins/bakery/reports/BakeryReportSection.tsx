/**
 * BakeryReportSection
 *
 * Plugin report section for the Bakery module.
 * Reports: Production · Ingredients · Waste
 * Today's Activity: Batches, schedule, low ingredients, waste
 */

import { useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  Croissant, ClipboardList, Wheat, AlertTriangle,
  FileText, BarChart3, Activity,
  ChefHat, Scale, Flame,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import { useDashboardWorker } from '@renderer/hooks/useDashboardWorker'
import type { TrendsResult, EfficiencyResult } from '@renderer/hooks/useDashboardWorker'
import logger from '@/shared/utils/logger'

interface Props { refreshSignal?: number }

type ReportType = 'production' | 'ingredients' | 'waste'

interface BakeryData {
  todayBatches: any[]
  weekBatches: any[]
  lowIngredients: any[]
  wasteLogs: any[]
  schedule: any[]
}

const EMPTY: BakeryData = { todayBatches: [], weekBatches: [], lowIngredients: [], wasteLogs: [], schedule: [] }

const reportOptions = [
  { id: 'production' as ReportType, label: 'Production Batches', icon: ClipboardList, color: 'text-amber-600', desc: 'Batch output by date range' },
  { id: 'ingredients' as ReportType, label: 'Ingredient Stock',  icon: Wheat,          color: 'text-green-600', desc: 'Pantry & low-stock summary' },
  { id: 'waste'      as ReportType, label: 'Waste & Spoilage',   icon: Scale,          color: 'text-red-600',   desc: 'Waste logs & spoilage cost' },
]

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

const BakeryReportSection: React.FC<Props> = ({ refreshSignal }) => {
  const { t } = useLanguage()
  const { error: toastError, success } = useToast()
  const { compute } = useDashboardWorker()

  const [data, setData] = useState<BakeryData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState<ReportType | null>(null)
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [generating, setGenerating] = useState(false)
  const [effResult, setEffResult] = useState<EfficiencyResult | null>(null)

  useEffect(() => { loadData() }, [refreshSignal])

  const loadData = async () => {
    setLoading(true)
    try {
      const api = (window as any).api.bakery
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
      const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 6)

      const [r1, r2, r3, r4, r5] = await Promise.allSettled([
        api.getProductionBatches?.({ startDate: today.toISOString(), endDate: tomorrow.toISOString() }),
        api.getProductionBatches?.({ startDate: weekAgo.toISOString(), endDate: tomorrow.toISOString() }),
        api.getLowIngredients?.(),
        api.getWasteLogs?.({ startDate: today.toISOString(), endDate: tomorrow.toISOString() }),
        api.getProductionSchedule?.({ date: today.toISOString() }),
      ])

      const todayBatches = r1.status === 'fulfilled' ? (r1.value?.data || r1.value || []) : []
      const weekBatches  = r2.status === 'fulfilled' ? (r2.value?.data || r2.value || []) : []
      const lowIng       = r3.status === 'fulfilled' ? (r3.value              || []) : []
      const wasteLogs    = r4.status === 'fulfilled' ? (r4.value?.data || r4.value || []) : []
      const schedule     = r5.status === 'fulfilled' ? (r5.value?.data || r5.value || []) : []

      setData({ todayBatches, weekBatches, lowIngredients: lowIng, wasteLogs, schedule })

      // Worker analytics
      if (weekBatches.length > 0) {
        const buckets: number[] = []
        for (let i = 6; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0)
          const next = new Date(d); next.setDate(next.getDate() + 1)
          buckets.push(weekBatches.filter((b: any) => new Date(b.createdAt) >= d && new Date(b.createdAt) < next).length)
        }
        const trend = await compute<TrendsResult>('COMPUTE_TRENDS', { values: buckets, labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] })
        if (trend) {
          // Keep trend computation warm for future chart blocks.
        }
      }

      if (todayBatches.length > 0) {
        const batches = todayBatches.filter((b: any) => b.plannedQuantity && b.actualQuantity).map((b: any) => ({ name: b.recipe?.name || `Batch ${b.id.slice(-4)}`, planned: Number(b.plannedQuantity), actual: Number(b.actualQuantity) }))
        if (batches.length > 0) {
          const eff = await compute<EfficiencyResult>('COMPUTE_EFFICIENCY', { batches })
          if (eff) setEffResult(eff)
        }
      }
    } catch (err) { logger.error('BakeryReport: loadData failed', err) }
    finally { setLoading(false) }
  }

  const handleGenerateReport = async () => {
    if (!reportType) return
    setGenerating(true)
    try {
      const api = (window as any).api.bakery
      const sDate = new Date(startDate)
      const eDate = new Date(endDate); eDate.setHours(23, 59, 59, 999)
      const doc = new jsPDF()
      const dr = `${sDate.toLocaleDateString()} - ${eDate.toLocaleDateString()}`
      const title = reportOptions.find(r => r.id === reportType)?.label ?? reportType
      let y = 20

      doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.text(`Bakery — ${title}`, 105, y, { align: 'center' }); y += 8
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100)
      doc.text(`Period: ${dr}  |  Generated: ${new Date().toLocaleString()}`, 105, y, { align: 'center' }); y += 12
      doc.setTextColor(0)

      if (reportType === 'production') {
        const [r1] = await Promise.allSettled([
          api.getProductionBatches?.({ startDate: sDate.toISOString(), endDate: eDate.toISOString() }),
          api.getProductionSchedule?.({ date: sDate.toISOString() }),
        ])
        const batches = r1.status === 'fulfilled' ? (r1.value?.data || r1.value || []) : []
        const total = batches.length
        const completed = batches.filter((b: any) => b.status === 'completed').length
        const totalActual = batches.reduce((s: number, b: any) => s + Number(b.actualQuantity || 0), 0)

        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Summary', 14, y); y += 7
        autoTable(doc, { startY: y, head: [['Metric', 'Value']], body: [['Total Batches', total.toString()], ['Completed', completed.toString()], ['Total Units Produced', totalActual.toString()], ['Completion Rate', total > 0 ? `${((completed / total) * 100).toFixed(1)}%` : 'N/A']], theme: 'grid', headStyles: { fillColor: [217, 119, 6] }, styles: { fontSize: 9 }, margin: { left: 14, right: 14 } })
        y = (doc as any).lastAutoTable.finalY + 10
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Batch Details', 14, y); y += 5
        autoTable(doc, { startY: y, head: [['Recipe', 'Date', 'Planned', 'Actual', 'Status']], body: batches.slice(0, 50).map((b: any) => [b.recipe?.name || 'Unknown', new Date(b.createdAt).toLocaleDateString(), b.plannedQuantity || '-', b.actualQuantity || '-', b.status || '-']), theme: 'striped', headStyles: { fillColor: [217, 119, 6] }, styles: { fontSize: 8 }, margin: { left: 14, right: 14 } })
      } else if (reportType === 'ingredients') {
        const [r1, r2] = await Promise.allSettled([api.getLowIngredients?.(), api.getWasteLogs?.({ startDate: sDate.toISOString(), endDate: eDate.toISOString() })])
        const low = r1.status === 'fulfilled' ? (r1.value              || []) : []
        const waste = r2.status === 'fulfilled' ? (r2.value?.data || r2.value || []) : []
        autoTable(doc, { startY: y, head: [['Ingredient', 'Quantity', 'Unit', 'Threshold', 'Status']], body: low.map((i: any) => [i.name, i.quantity, i.unit || 'unit', i.minThreshold || '-', Number(i.quantity) <= 0 ? 'OUT OF STOCK' : 'LOW']), theme: 'striped', headStyles: { fillColor: [22, 163, 74] }, styles: { fontSize: 9 }, margin: { left: 14, right: 14 } })
        y = (doc as any).lastAutoTable.finalY + 10
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text('Waste Logs', 14, y); y += 5
        autoTable(doc, { startY: y, head: [['Item', 'Quantity', 'Reason', 'Date']], body: waste.slice(0, 30).map((w: any) => [w.ingredient?.name || w.itemName || 'Unknown', w.quantity, w.reason || '-', new Date(w.createdAt).toLocaleDateString()]), theme: 'striped', headStyles: { fillColor: [220, 38, 38] }, styles: { fontSize: 9 }, margin: { left: 14, right: 14 } })
      } else if (reportType === 'waste') {
        const [r1] = await Promise.allSettled([api.getWasteLogs?.({ startDate: sDate.toISOString(), endDate: eDate.toISOString() })])
        const waste = r1.status === 'fulfilled' ? (r1.value?.data || r1.value || []) : []
        autoTable(doc, { startY: y, head: [['Item', 'Qty', 'Cost', 'Reason', 'Date']], body: waste.map((w: any) => [w.ingredient?.name || w.itemName || 'Unknown', w.quantity, w.cost ? `$${w.cost}` : '-', w.reason || '-', new Date(w.createdAt).toLocaleDateString()]), theme: 'striped', headStyles: { fillColor: [220, 38, 38] }, styles: { fontSize: 9 }, margin: { left: 14, right: 14 } })
      }

      const fname = `Bakery_${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fname); success(`Saved: ${fname}`)
    } catch (err) { logger.error('BakeryReport: generate failed', err); toastError('Failed to generate report') }
    finally { setGenerating(false) }
  }

  // Derived stats
  const completedToday = data.todayBatches.filter(b => b.status === 'completed').length
  const inProgressToday = data.todayBatches.filter(b => b.status === 'in_progress' || b.status === 'started').length
  const totalWasteQty = data.wasteLogs.reduce((s, w) => s + Number(w.quantity || 0), 0)

  // Bar chart data: batches by status mix
  const batchChartData = ['completed', 'in_progress', 'scheduled'].map(status => ({
    status: status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1),
    count: data.todayBatches.filter(b => b.status === status).length,
  }))
  const barColors: Record<string, string> = { Completed: '#16a34a', 'In Progress': '#f59e0b', Scheduled: '#6366f1' }

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3 px-1">
        <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
          <Croissant size={22} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('bakeryReportTitle')}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('bakeryReportSubtitle')}</p>
        </div>
      </div>

      {/* Generate Report */}
      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-slate-800 dark:to-slate-700 rounded-xl p-6 shadow-sm border border-amber-200 dark:border-slate-600">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-amber-500 rounded-lg"><FileText size={17} className="text-white" /></div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('bakeryReportGenerate')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('bakeryReportSelectHint')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          {reportOptions.map(r => {
            const Icon = r.icon
            const active = reportType === r.id
            return (
              <button key={r.id} onClick={() => setReportType(r.id)}
                className={`p-4 rounded-xl text-left transition-all hover:scale-[1.02] ${active ? 'bg-amber-500 text-white shadow-lg ring-4 ring-amber-300/40' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:shadow-md border border-slate-200 dark:border-slate-600'}`}>
                <Icon size={22} className={`mb-1.5 ${active ? 'text-white' : r.color}`} />
                <p className="text-sm font-semibold">{r.label}</p>
                <p className={`text-xs mt-0.5 ${active ? 'text-amber-100' : 'text-slate-500'}`}>{r.desc}</p>
              </button>
            )
          })}
        </div>
        {reportType && (
          <div className="flex flex-wrap items-end gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">📅 {t('bakeryReportStartDate')}</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] transition-all text-sm" />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">📅 {t('bakeryReportEndDate')}</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] transition-all text-sm" />
            </div>
            <button onClick={handleGenerateReport} disabled={generating}
              className="px-6 py-2.5 bg-[color:var(--accent)] text-[color:var(--accent-contrast)] rounded-lg hover:bg-[color:var(--accent-strong)] disabled:opacity-50 flex items-center gap-2 font-semibold shadow-md transition-all">
              <BarChart3 size={16} />{generating ? t('bakeryReportGenerating') : t('bakeryReportGeneratePDF')}
            </button>
          </div>
        )}
      </div>

      {/* Today's Activity */}
      <div className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 dark:from-amber-500/10 dark:to-amber-500/5 p-6 rounded-xl border border-amber-200/50 dark:border-amber-700/30">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={20} className="text-amber-600 dark:text-amber-400" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('bakeryReportTodayActivity')}</h3>
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
            <StatCard icon={ChefHat}       label={t('bakeryReportBatchesToday')} value={data.todayBatches.length} sub={`${completedToday} ${t('bakeryReportCompleted')}`}       color="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" />
            <StatCard icon={Flame}         label={t('bakeryReportInProgress')}   value={inProgressToday}           sub={`${data.schedule.length} ${t('bakeryReportScheduled')}`}   color="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" />
            <StatCard icon={AlertTriangle} label={t('bakeryReportLowIngredients')} value={data.lowIngredients.length} sub={t('bakeryReportBelowThreshold')}                         color="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" />
            <StatCard icon={Scale}         label={t('bakeryReportWasteToday')}   value={totalWasteQty}              sub={`${data.wasteLogs.length} ${t('bakeryReportLogEntries')}`}  color="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400" />
          </div>
        )}

        {/* Efficiency + Batch distribution */}
        {!loading && data.todayBatches.length > 0 && (
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Batch status distribution */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t('bakeryReportBatchStatus')}</h4>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={batchChartData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {batchChartData.map((d, i) => <Cell key={i} fill={barColors[d.status] || '#6366f1'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Efficiency summary */}
            {effResult && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('bakeryReportYieldEff')}</h4>
                <p className="text-xs text-slate-500 mb-3">{t('bakeryReportYieldSub')}</p>
                <div className="flex items-center gap-4 mb-3">
                  <div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{effResult.overallPct.toFixed(0)}%</p>
                    <p className="text-xs text-slate-500">{t('bakeryReportOverallYield')}</p>
                  </div>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-3">
                    <div className={`h-3 rounded-full transition-all ${effResult.overallPct >= 95 ? 'bg-green-500' : effResult.overallPct >= 80 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(effResult.overallPct, 100)}%` }} />
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-slate-500">
                  <span className="text-green-600 dark:text-green-400 font-semibold">↑ {effResult.aboveTarget} {t('bakeryReportAboveTarget')}</span>
                  <span className="text-red-600 dark:text-red-400 font-semibold">↓ {effResult.belowTarget} {t('bakeryFinanceBelowTarget')}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Low ingredients alert */}
        {!loading && data.lowIngredients.length > 0 && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/10 rounded-xl p-4 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
              <h4 className="text-sm font-semibold text-red-700 dark:text-red-400">{t('bakeryReportLowStockTitle')} ({data.lowIngredients.length})</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.lowIngredients.slice(0, 8).map((ing: any) => (
                <span key={ing.id} className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-xs font-medium">
                  {ing.name} — {ing.quantity} {ing.unit || 'units'}
                </span>
              ))}
              {data.lowIngredients.length > 8 && <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg text-xs">+{data.lowIngredients.length - 8} more</span>}
            </div>
          </div>
        )}

        {!loading && data.todayBatches.length === 0 && (
          <div className="mt-4 flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-600">
            <Croissant size={40} className="opacity-30 mb-2" />
            <p className="text-sm">{t('bakeryReportNoBatches')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default BakeryReportSection
