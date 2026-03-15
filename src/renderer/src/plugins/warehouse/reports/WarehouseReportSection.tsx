/**
 * WarehouseReportSection
 *
 * Plugin report section for the Warehouse module.
 * Reports: Stock Levels · Transfers · Critical Stock
 * Today's Activity: Transfers, critical items, stock value, locations
 */

import { useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  Warehouse, Package, ArrowLeftRight, AlertTriangle,
  FileText, BarChart3, Activity, MapPin, TrendingUp,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import { useDashboardWorker } from '@renderer/hooks/useDashboardWorker'
import type { StockValueResult } from '@renderer/hooks/useDashboardWorker'
import logger from '@/shared/utils/logger'

interface Props { refreshSignal?: number }
type ReportType = 'stock' | 'transfers' | 'critical'

interface WarehouseData {
  locations: any[]
  todayTransfers: any[]
  allStockItems: any[]
  criticalItems: any[]
}

const EMPTY: WarehouseData = { locations: [], todayTransfers: [], allStockItems: [], criticalItems: [] }

const reportOptions = [
  { id: 'stock'     as ReportType, label: 'Stock Levels',    icon: Package,       color: 'text-blue-600',  desc: 'All inventory by location' },
  { id: 'transfers' as ReportType, label: 'Transfers Log',   icon: ArrowLeftRight, color: 'text-indigo-600', desc: 'Stock movements by period' },
  { id: 'critical'  as ReportType, label: 'Critical Alerts', icon: AlertTriangle, color: 'text-red-600',   desc: 'Low & out-of-stock items' },
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

const WarehouseReportSection: React.FC<Props> = ({ refreshSignal }) => {
  const { t } = useLanguage()
  const { error: toastError, success } = useToast()
  const { compute } = useDashboardWorker()

  const [data, setData] = useState<WarehouseData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState<ReportType | null>(null)
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [generating, setGenerating] = useState(false)
  const [stockValue, setStockValue] = useState<StockValueResult | null>(null)

  useEffect(() => { loadData() }, [refreshSignal])

  const loadData = async () => {
    setLoading(true)
    try {
      const api = (window as any).api.warehouse
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)

      const [r1, r2, r3, r4] = await Promise.allSettled([
        api.getLocations?.(),
        api.getTransfers?.({ startDate: today.toISOString(), endDate: tomorrow.toISOString() }),
        api.getAllStockItems?.(),
        api.getCriticalStockItems?.(),
      ])

      const locations     = r1.status === 'fulfilled' ? (r1.value || []) : []
      const todayTransfers = r2.status === 'fulfilled' ? (r2.value || []) : []
      const allStockItems  = r3.status === 'fulfilled' ? (r3.value || []) : []
      const criticalItems  = r4.status === 'fulfilled' ? (r4.value || []) : []

      setData({ locations, todayTransfers, allStockItems, criticalItems })

      // Worker: stock value
      if (allStockItems.length > 0 && locations.length > 0) {
        const stocks = allStockItems.map((item: any) => ({
          locationId: item.locationId || item.warehouseLocationId || '',
          locationName: locations.find((l: any) => l.id === (item.locationId || item.warehouseLocationId))?.name || 'Unknown',
          quantity: Number(item.quantity || 0),
          capacity: Number(item.capacity || 100),
          unitValue: Number(item.product?.baseCost || item.unitCost || 0),
        }))
        const sv = await compute<StockValueResult>('COMPUTE_STOCK_VALUE', { stocks })
        if (sv) setStockValue(sv)
      }
    } catch (err) { logger.error('WarehouseReport: loadData failed', err) }
    finally { setLoading(false) }
  }

  const handleGenerateReport = async () => {
    if (!reportType) return
    setGenerating(true)
    try {
      const api = (window as any).api.warehouse
      const sDate = new Date(startDate)
      const eDate = new Date(endDate); eDate.setHours(23, 59, 59, 999)
      const dr = `${sDate.toLocaleDateString()} - ${eDate.toLocaleDateString()}`
      const title = reportOptions.find(r => r.id === reportType)?.label ?? reportType
      const doc = new jsPDF()
      let y = 20

      doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.text(`Warehouse — ${title}`, 105, y, { align: 'center' }); y += 8
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100)
      doc.text(`Period: ${dr}  |  Generated: ${new Date().toLocaleString()}`, 105, y, { align: 'center' }); y += 12
      doc.setTextColor(0)

      if (reportType === 'stock') {
        const [r1, r2] = await Promise.allSettled([api.getAllStockItems?.(), api.getLocations?.()])
        const items = r1.status === 'fulfilled' ? (r1.value || []) : []
        const locs  = r2.status === 'fulfilled' ? (r2.value || []) : []
        const totalValue = items.reduce((s: number, i: any) => s + Number(i.quantity || 0) * Number(i.product?.baseCost || 0), 0)
        autoTable(doc, { startY: y, head: [['Metric', 'Value']], body: [['Total Items (SKUs)', items.length.toString()], ['Total Stock Value', `$${totalValue.toFixed(2)}`], ['Locations', locs.length.toString()]], theme: 'grid', headStyles: { fillColor: [59, 130, 246] }, styles: { fontSize: 9 }, margin: { left: 14, right: 14 } })
        y = (doc as any).lastAutoTable.finalY + 10
        autoTable(doc, { startY: y, head: [['Product', 'Location', 'Qty', 'Unit Cost', 'Total Value']], body: items.slice(0, 50).map((i: any) => [i.product?.name || i.productId || 'Unknown', locs.find((l: any) => l.id === (i.locationId || i.warehouseLocationId))?.name || '-', i.quantity || 0, `$${Number(i.product?.baseCost || 0).toFixed(2)}`, `$${(Number(i.quantity || 0) * Number(i.product?.baseCost || 0)).toFixed(2)}`]), theme: 'striped', headStyles: { fillColor: [59, 130, 246] }, styles: { fontSize: 8 }, margin: { left: 14, right: 14 } })
      } else if (reportType === 'transfers') {
        const [r1] = await Promise.allSettled([api.getTransfers?.({ startDate: sDate.toISOString(), endDate: eDate.toISOString() })])
        const transfers = r1.status === 'fulfilled' ? (r1.value || []) : []
        autoTable(doc, { startY: y, head: [['Transfer ID', 'From', 'To', 'Items', 'Date', 'Status']], body: transfers.map((tr: any) => [`#${tr.id.slice(-6)}`, tr.fromLocation?.name || '-', tr.toLocation?.name || '-', (tr.items?.length || 0).toString(), new Date(tr.createdAt).toLocaleDateString(), tr.status || '-']), theme: 'striped', headStyles: { fillColor: [99, 102, 241] }, styles: { fontSize: 8 }, margin: { left: 14, right: 14 } })
      } else if (reportType === 'critical') {
        const [r1] = await Promise.allSettled([api.getCriticalStockItems?.()])
        const items = r1.status === 'fulfilled' ? (r1.value || []) : []
        autoTable(doc, { startY: y, head: [['Product', 'Location', 'Qty', 'Threshold', 'Status']], body: items.map((i: any) => [i.product?.name || i.productId || 'Unknown', i.location?.name || '-', i.quantity || 0, i.minThreshold || '-', Number(i.quantity) <= 0 ? 'OUT OF STOCK' : 'LOW STOCK']), theme: 'striped', headStyles: { fillColor: [220, 38, 38] }, styles: { fontSize: 8 }, margin: { left: 14, right: 14 } })
      }

      const fname = `Warehouse_${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fname); success(`Saved: ${fname}`)
    } catch (err) { logger.error('WarehouseReport: generate failed', err); toastError('Failed to generate report') }
    finally { setGenerating(false) }
  }

  const totalStockQty = data.allStockItems.reduce((s, i) => s + Number(i.quantity || 0), 0)
  const totalValue = stockValue?.totalValue ?? data.allStockItems.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.product?.baseCost || 0), 0)

  // Top locations by stock value
  const topLocations = (stockValue?.topLocations ?? []).slice(0, 8)
  const maxLocValue = Math.max(...topLocations.map(l => l.value), 1)

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3 px-1">
        <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
          <Warehouse size={22} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Warehouse Reports</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Stock Levels · Transfers · Critical Alerts</p>
        </div>
      </div>

      {/* Generate Report */}
      <div className="bg-gradient-to-br from-blue-50 to-sky-50 dark:from-slate-800 dark:to-slate-700 rounded-xl p-6 shadow-sm border border-blue-200 dark:border-slate-600">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-blue-600 rounded-lg"><FileText size={17} className="text-white" /></div>
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
                className={`p-4 rounded-xl text-left transition-all hover:scale-[1.02] ${active ? 'bg-blue-600 text-white shadow-lg ring-4 ring-blue-300/40' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:shadow-md border border-slate-200 dark:border-slate-600'}`}>
                <Icon size={22} className={`mb-1.5 ${active ? 'text-white' : r.color}`} />
                <p className="text-sm font-semibold">{r.label}</p>
                <p className={`text-xs mt-0.5 ${active ? 'text-blue-100' : 'text-slate-500'}`}>{r.desc}</p>
              </button>
            )
          })}
        </div>
        {reportType && (
          <div className="flex flex-wrap items-end gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">📅 Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">📅 End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
            </div>
            <button onClick={handleGenerateReport} disabled={generating}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-semibold shadow-md transition-all">
              <BarChart3 size={16} />{generating ? 'Generating…' : 'Generate PDF Report'}
            </button>
          </div>
        )}
      </div>

      {/* Today's Activity */}
      <div className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 dark:from-blue-500/10 dark:to-blue-500/5 p-6 rounded-xl border border-blue-200/50 dark:border-blue-700/30">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={20} className="text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Today's Warehouse Activity</h3>
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
            <StatCard icon={MapPin}        label="Locations"       value={data.locations.length}      sub="active warehouse locations"     color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" />
            <StatCard icon={ArrowLeftRight} label="Transfers Today" value={data.todayTransfers.length} sub="stock movements"                 color="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" />
            <StatCard icon={AlertTriangle} label="Critical Items"  value={data.criticalItems.length}  sub="low / out of stock"              color="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" />
            <StatCard icon={TrendingUp}    label="Total Stock Value" value={`$${totalValue.toFixed(0)}`} sub={`${totalStockQty} total units`} color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" />
          </div>
        )}

        {/* Stock by location + critical items */}
        {!loading && (
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top locations by value */}
            {topLocations.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Stock Value by Location</h4>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={topLocations} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v: number | undefined) => `$${(v ?? 0).toFixed(2)}`} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {topLocations.map((_, i) => <Cell key={i} fill={`hsl(${210 + i * 15}, 70%, ${55 - i * 3}%)`} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Critical items list */}
            {data.criticalItems.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={15} className="text-red-600 dark:text-red-400" />
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Critical Stock Alerts</h4>
                </div>
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {data.criticalItems.slice(0, 10).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/10 rounded-lg">
                      <div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.product?.name || 'Unknown'}</p>
                        <p className="text-[10px] text-slate-500">{item.location?.name || '-'}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${Number(item.quantity) <= 0 ? 'bg-red-200 dark:bg-red-900/40 text-red-800 dark:text-red-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                        {Number(item.quantity) <= 0 ? 'OUT' : `${item.quantity} left`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && data.allStockItems.length === 0 && (
          <div className="mt-4 flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-600">
            <Warehouse size={40} className="opacity-30 mb-2" />
            <p className="text-sm">No stock data available yet</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default WarehouseReportSection
