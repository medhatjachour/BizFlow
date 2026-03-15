/**
 * RestaurantReportSection
 *
 * Plugin report section for the Restaurant module.
 * Reports: Orders · Tables · Menu Performance
 * Today's Activity: Tables, reservations, active orders, revenue
 */

import { useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  UtensilsCrossed, Table2, CalendarClock, ShoppingBag,
  FileText, BarChart3, Activity, DollarSign, Users, Clock,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import { useDashboardWorker } from '@renderer/hooks/useDashboardWorker'
import type { HeatmapResult, TableMetricsResult } from '@renderer/hooks/useDashboardWorker'
import logger from '@/shared/utils/logger'

interface Props { refreshSignal?: number }
type ReportType = 'orders' | 'tables' | 'menu'

interface RestaurantData {
  tables: any[]
  reservations: any[]
  activeOrders: any[]
  allOrdersToday: any[]
  revenueToday: number
}

const EMPTY: RestaurantData = { tables: [], reservations: [], activeOrders: [], allOrdersToday: [], revenueToday: 0 }

const reportOptions = [
  { id: 'orders' as ReportType, label: 'Orders Report',     icon: ShoppingBag,   color: 'text-rose-600',   desc: 'Order history & revenue' },
  { id: 'tables' as ReportType, label: 'Table Utilization', icon: Table2,         color: 'text-blue-600',   desc: 'Turnover & occupancy' },
  { id: 'menu'   as ReportType, label: 'Menu Performance',  icon: UtensilsCrossed, color: 'text-green-600', desc: 'Top items by order count' },
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

const RestaurantReportSection: React.FC<Props> = ({ refreshSignal }) => {
  const { t } = useLanguage()
  const { error: toastError, success } = useToast()
  const { compute } = useDashboardWorker()

  const [data, setData] = useState<RestaurantData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState<ReportType | null>(null)
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [generating, setGenerating] = useState(false)
  const [heatmap, setHeatmap] = useState<HeatmapResult | null>(null)
  const [tableMetrics, setTableMetrics] = useState<TableMetricsResult | null>(null)

  useEffect(() => { loadData() }, [refreshSignal])

  const loadData = async () => {
    setLoading(true)
    try {
      const api = (window as any).api.restaurant
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)

      const [r1, r2, r3, r4, r5] = await Promise.allSettled([
        api.getTables?.(),
        api.getReservations?.({ startDate: today.toISOString(), endDate: tomorrow.toISOString() }),
        api.getActiveOrders?.(),
        api.getOrders?.({ startDate: today.toISOString(), endDate: tomorrow.toISOString() }),
        api.getDailyRevenue?.({ date: today.toISOString() }),
      ])

      const tables      = r1.status === 'fulfilled' ? (r1.value || []) : []
      const reservations = r2.status === 'fulfilled' ? (r2.value || []) : []
      const activeOrders = r3.status === 'fulfilled' ? (r3.value || []) : []
      const allOrders    = r4.status === 'fulfilled' ? (r4.value || []) : []
      const revenue      = r5.status === 'fulfilled' ? Number(r5.value || 0) : 0

      setData({ tables, reservations, activeOrders, allOrdersToday: allOrders, revenueToday: revenue })

      if (allOrders.length > 0) {
        const timestamps = allOrders.map((o: any) => o.createdAt)
        const hmap = await compute<HeatmapResult>('COMPUTE_HEATMAP', { timestamps })
        if (hmap) setHeatmap(hmap)

        const orderData = allOrders.filter((o: any) => o.tableId && o.completedAt).map((o: any) => ({
          tableId: o.tableId,
          orderValue: Number(o.total || 0),
          turnoverMin: o.completedAt ? Math.max(1, Math.round((new Date(o.completedAt).getTime() - new Date(o.createdAt).getTime()) / 60000)) : 45,
          completed: o.status === 'completed',
        }))
        if (orderData.length > 0) {
          const tm = await compute<TableMetricsResult>('COMPUTE_TABLE_METRICS', { orders: orderData })
          if (tm) setTableMetrics(tm)
        }
      }
    } catch (err) { logger.error('RestaurantReport: loadData failed', err) }
    finally { setLoading(false) }
  }

  const handleGenerateReport = async () => {
    if (!reportType) return
    setGenerating(true)
    try {
      const api = (window as any).api.restaurant
      const sDate = new Date(startDate)
      const eDate = new Date(endDate); eDate.setHours(23, 59, 59, 999)
      const dr = `${sDate.toLocaleDateString()} - ${eDate.toLocaleDateString()}`
      const title = reportOptions.find(r => r.id === reportType)?.label ?? reportType
      const doc = new jsPDF()
      let y = 20

      doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.text(`Restaurant — ${title}`, 105, y, { align: 'center' }); y += 8
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100)
      doc.text(`Period: ${dr}  |  Generated: ${new Date().toLocaleString()}`, 105, y, { align: 'center' }); y += 12
      doc.setTextColor(0)

      if (reportType === 'orders') {
        const [r1] = await Promise.allSettled([api.getOrders?.({ startDate: sDate.toISOString(), endDate: eDate.toISOString() })])
        const orders = r1.status === 'fulfilled' ? (r1.value || []) : []
        const totalRev = orders.reduce((s: number, o: any) => s + Number(o.total || 0), 0)
        const completed = orders.filter((o: any) => o.status === 'completed').length
        autoTable(doc, { startY: y, head: [['Metric', 'Value']], body: [['Total Orders', orders.length.toString()], ['Completed', completed.toString()], ['Total Revenue', `$${totalRev.toFixed(2)}`], ['Avg Order Value', orders.length > 0 ? `$${(totalRev / orders.length).toFixed(2)}` : 'N/A']], theme: 'grid', headStyles: { fillColor: [225, 29, 72] }, styles: { fontSize: 9 }, margin: { left: 14, right: 14 } })
        y = (doc as any).lastAutoTable.finalY + 10
        autoTable(doc, { startY: y, head: [['Order #', 'Table', 'Total', 'Status', 'Date']], body: orders.slice(0, 50).map((o: any) => [`#${o.id.slice(-6)}`, o.table?.number || o.tableId || '-', `$${Number(o.total || 0).toFixed(2)}`, o.status || '-', new Date(o.createdAt).toLocaleDateString()]), theme: 'striped', headStyles: { fillColor: [225, 29, 72] }, styles: { fontSize: 8 }, margin: { left: 14, right: 14 } })
      } else if (reportType === 'tables') {
        const [r1] = await Promise.allSettled([api.getTables?.()])
        const tables = r1.status === 'fulfilled' ? (r1.value || []) : []
        autoTable(doc, { startY: y, head: [['Table', 'Capacity', 'Status']], body: tables.map((t: any) => [t.number || t.name || t.id, t.capacity || '-', t.status || '-']), theme: 'striped', headStyles: { fillColor: [59, 130, 246] }, styles: { fontSize: 9 }, margin: { left: 14, right: 14 } })
      } else if (reportType === 'menu') {
        const [r1] = await Promise.allSettled([api.getOrders?.({ startDate: sDate.toISOString(), endDate: eDate.toISOString() })])
        const orders = r1.status === 'fulfilled' ? (r1.value || []) : []
        const itemCounts = new Map<string, { name: string; count: number; revenue: number }>()
        orders.forEach((o: any) => o.items?.forEach((item: any) => {
          const k = item.menuItemId || item.name
          const ex = itemCounts.get(k)
          if (ex) { ex.count += item.quantity || 1; ex.revenue += Number(item.price || 0) * (item.quantity || 1) }
          else itemCounts.set(k, { name: item.menuItem?.name || item.name || k, count: item.quantity || 1, revenue: Number(item.price || 0) * (item.quantity || 1) })
        }))
        const ranked = Array.from(itemCounts.values()).sort((a, b) => b.count - a.count)
        autoTable(doc, { startY: y, head: [['Menu Item', 'Orders', 'Revenue']], body: ranked.slice(0, 30).map(i => [i.name, i.count.toString(), `$${i.revenue.toFixed(2)}`]), theme: 'striped', headStyles: { fillColor: [22, 163, 74] }, styles: { fontSize: 9 }, margin: { left: 14, right: 14 } })
      }

      const fname = `Restaurant_${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fname); success(`Saved: ${fname}`)
    } catch (err) { logger.error('RestaurantReport: generate failed', err); toastError('Failed to generate report') }
    finally { setGenerating(false) }
  }

  const occupiedTables = data.tables.filter(t => t.status === 'occupied').length
  const totalTables = data.tables.length
  const avgOrder = tableMetrics?.avgOrderValue ?? (data.allOrdersToday.length > 0 ? data.revenueToday / data.allOrdersToday.length : 0)

  // Hourly chart from heatmap
  const HOUR_LABELS = ['12a','1a','2a','3a','4a','5a','6a','7a','8a','9a','10a','11a','12p','1p','2p','3p','4p','5p','6p','7p','8p','9p','10p','11p']
  const hourChartData = heatmap ? Array.from({ length: 12 }, (_, i) => ({
    label: HOUR_LABELS[i * 2],
    count: heatmap.hourCounts[i * 2] + (heatmap.hourCounts[i * 2 + 1] ?? 0)
  })) : []
  const maxCount = Math.max(...hourChartData.map(d => d.count), 1)
  const peakBucketIdx = heatmap ? Math.floor(heatmap.peakHour / 2) : -1

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3 px-1">
        <div className="p-2.5 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
          <UtensilsCrossed size={22} className="text-rose-600 dark:text-rose-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Restaurant Reports</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Orders · Table Utilization · Menu Performance</p>
        </div>
      </div>

      {/* Generate Report */}
      <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-slate-800 dark:to-slate-700 rounded-xl p-6 shadow-sm border border-rose-200 dark:border-slate-600">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-rose-600 rounded-lg"><FileText size={17} className="text-white" /></div>
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
                className={`p-4 rounded-xl text-left transition-all hover:scale-[1.02] ${active ? 'bg-rose-600 text-white shadow-lg ring-4 ring-rose-300/40' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:shadow-md border border-slate-200 dark:border-slate-600'}`}>
                <Icon size={22} className={`mb-1.5 ${active ? 'text-white' : r.color}`} />
                <p className="text-sm font-semibold">{r.label}</p>
                <p className={`text-xs mt-0.5 ${active ? 'text-rose-100' : 'text-slate-500'}`}>{r.desc}</p>
              </button>
            )
          })}
        </div>
        {reportType && (
          <div className="flex flex-wrap items-end gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">📅 Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-rose-500 transition-all text-sm" />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">📅 End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-rose-500 transition-all text-sm" />
            </div>
            <button onClick={handleGenerateReport} disabled={generating}
              className="px-6 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2 font-semibold shadow-md transition-all">
              <BarChart3 size={16} />{generating ? 'Generating…' : 'Generate PDF Report'}
            </button>
          </div>
        )}
      </div>

      {/* Today's Activity */}
      <div className="bg-gradient-to-br from-rose-500/5 to-rose-500/10 dark:from-rose-500/10 dark:to-rose-500/5 p-6 rounded-xl border border-rose-200/50 dark:border-rose-700/30">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={20} className="text-rose-600 dark:text-rose-400" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Today's Restaurant Activity</h3>
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
            <StatCard icon={Table2}       label="Tables Occupied" value={`${occupiedTables}/${totalTables}`} sub="currently occupied"             color="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400" />
            <StatCard icon={CalendarClock} label="Reservations"   value={data.reservations.length}          sub="today"                            color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" />
            <StatCard icon={ShoppingBag}  label="Active Orders"   value={data.activeOrders.length}          sub={`${data.allOrdersToday.length} total today`} color="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" />
            <StatCard icon={DollarSign}   label="Revenue Today"   value={`$${data.revenueToday.toFixed(2)}`} sub={avgOrder > 0 ? `avg $${avgOrder.toFixed(2)}/order` : 'no orders yet'} color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" />
          </div>
        )}

        {/* Hourly chart + Table metrics */}
        {!loading && data.allOrdersToday.length > 0 && (
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Hourly distribution */}
            {heatmap && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={15} className="text-rose-600 dark:text-rose-400" />
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Peak Service Hours</h4>
                  <span className="ml-auto text-xs font-medium text-rose-600 dark:text-rose-400">Peak: {HOUR_LABELS[heatmap.peakHour]}</span>
                </div>
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart data={hourChartData} margin={{ top: 0, right: 4, left: -24, bottom: 0 }} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                      {hourChartData.map((_, i) => <Cell key={i} fill={i === peakBucketIdx ? '#e11d48' : '#fda4af'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Table metrics */}
            {tableMetrics && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Table Performance Metrics</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-rose-50 dark:bg-rose-900/10 rounded-lg">
                    <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{tableMetrics.avgTurnoverMin.toFixed(0)}<span className="text-sm font-normal text-slate-500 ml-1">min</span></p>
                    <p className="text-xs text-slate-500 mt-1">Avg table turnover</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">${tableMetrics.avgOrderValue.toFixed(0)}</p>
                    <p className="text-xs text-slate-500 mt-1">Avg order value</p>
                  </div>
                  <div className="col-span-2 text-center p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{tableMetrics.completionRate.toFixed(0)}%</p>
                    <p className="text-xs text-slate-500 mt-1">Order completion rate</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && data.allOrdersToday.length === 0 && (
          <div className="mt-4 flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-600">
            <UtensilsCrossed size={40} className="opacity-30 mb-2" />
            <p className="text-sm">No orders placed today yet</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default RestaurantReportSection
