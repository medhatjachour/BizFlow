/**
 * CommerceReportSection
 *
 * Self-contained report section for the Commerce plugin.
 * Includes: Generate Report (Sales / Inventory / Financial / Customer)
 *           + Today's Activity (stats grid, activity feed, trend + heatmap)
 */

import { useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  ShoppingCart, Receipt, TrendingUp, Package, DollarSign, Users,
  FileText, BarChart3, Activity,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import { useDashboardWorker } from '@renderer/hooks/useDashboardWorker'
import type { TrendsResult, HeatmapResult } from '@renderer/hooks/useDashboardWorker'
import { calculateRefundedAmount } from '@/shared/utils/refundCalculations'
import logger from '@/shared/utils/logger'
import { ReceiptPreviewModal } from '../pages/Sales/ReceiptPreviewModal'
import TodayStatsGrid from '../../../pages/Reports/components/TodayStatsGrid'
import ActivityFeed from '../../../pages/Reports/components/ActivityFeed'
import QuickInsightsPanel from '../../../pages/Reports/components/QuickInsightsPanel'
import ItemsSoldSummary from '../../../pages/Reports/components/ItemsSoldSummary'
import ReportPreviewModal from '../../../pages/Reports/components/ReportPreviewModal'
import RevenueTrendPanel from '../../../pages/Reports/components/RevenueTrendPanel'
import SalesHeatmapPanel from '../../../pages/Reports/components/SalesHeatmapPanel'
import type {
  TodayStats, ActivityItem, ItemSummary, ReportFormState, ReportType
} from '../../../pages/Reports/types'
import { formatCurrency } from '../../../pages/Reports/types'

const REPORT_TYPES: Omit<ReportType, 'title'>[] = [
  { id: 'sales',     icon: TrendingUp,   color: 'text-blue-600' },
  { id: 'inventory', icon: Package,      color: 'text-green-600' },
  { id: 'financial', icon: DollarSign,   color: 'text-purple-600' },
  { id: 'customer',  icon: Users,        color: 'text-orange-600' },
]

interface Props { refreshSignal?: number }

const CommerceReportSection: React.FC<Props> = ({ refreshSignal }) => {
  const { t } = useLanguage()
  const { error: toastError, success } = useToast()
  const { compute } = useDashboardWorker()
  const navigate = useNavigate()

  // Today's activity state
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null)
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([])
  const [itemsSummary, setItemsSummary] = useState<ItemSummary[]>([])
  const [totalPiecesSold, setTotalPiecesSold] = useState(0)
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set())
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())
  const [itemSearchQuery, setItemSearchQuery] = useState('')
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null)
  const [weeklyData, setWeeklyData] = useState<{ day: string; revenue: number; label: string }[]>([])
  const [trendResult, setTrendResult] = useState<TrendsResult | null>(null)
  const [heatmapResult, setHeatmapResult] = useState<HeatmapResult | null>(null)
  const [loadingActivity, setLoadingActivity] = useState(true)

  // Report generation state
  const [reportForm, setReportForm] = useState<ReportFormState>({
    reportType: null,
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })
  const [generating, setGenerating] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [showPreview, setShowPreview] = useState(false)

  const reportTypes: ReportType[] = REPORT_TYPES.map(r => ({
    ...r,
    title: t(r.id),
  }))

  useEffect(() => { loadAll() }, [refreshSignal])

  const loadAll = async () => {
    setLoadingActivity(true)
    await Promise.all([loadTodayStats(), loadActivityFeed(), loadWeeklyTrend()])
    setLoadingActivity(false)
  }

  const loadTodayStats = async () => {
    try {
      const s = new Date(); s.setHours(0, 0, 0, 0)
      const e = new Date(); e.setHours(23, 59, 59, 999)
      const [salesData, financeData] = await Promise.all([
        window.api.saleTransactions.getByDateRange({ startDate: s.toISOString(), endDate: e.toISOString() }),
        window.api.finance.getTransactions({ startDate: s, endDate: e }),
      ])
      let totalRevenue = 0, totalCashIn = 0, totalCOGS = 0
      salesData.forEach((sale: any) => {
        const refunded = calculateRefundedAmount(sale.items || [])
        totalRevenue += (sale.subtotal ?? sale.total) - refunded
        totalCashIn += sale.total - refunded
        sale.items?.forEach((item: any) => {
          const netQty = item.quantity - (item.refundedQuantity || 0)
          if (netQty > 0 && item.product?.baseCost) totalCOGS += netQty * item.product.baseCost
        })
      })
      const expenses = financeData.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0)
      setTodayStats({
        revenue: totalRevenue, revenueWithTax: totalCashIn,
        expenses, cogs: totalCOGS,
        profit: totalRevenue - totalCOGS - expenses,
        cashInSafe: totalCashIn - expenses,
        salesCount: salesData.length,
        expensesCount: financeData.filter((t: any) => t.type === 'expense').length,
        topProduct: '', revenueChange: 0,
      })
    } catch (err) { logger.error('CommerceReport: loadTodayStats failed', err) }
  }

  const loadActivityFeed = async () => {
    try {
      const s = new Date(); s.setHours(0, 0, 0, 0)
      const e = new Date(); e.setHours(23, 59, 59, 999)
      const [salesData, financeData] = await Promise.all([
        window.api.saleTransactions.getByDateRange({ startDate: s.toISOString(), endDate: e.toISOString() }),
        window.api.finance.getTransactions({ startDate: s, endDate: e }),
      ])

      const variantIds = new Set<string>()
      salesData.forEach((sale: any) => sale.items?.forEach((item: any) => { if (item.variantId) variantIds.add(item.variantId) }))
      const variantsMap = new Map<string, any>()
      if (variantIds.size > 0) {
        const variants = await Promise.all(Array.from(variantIds).map(id => window.api.products.getVariantById(id).catch(() => null)))
        variants.forEach((v, i) => { if (v) variantsMap.set(Array.from(variantIds)[i], v) })
      }

      const activities: ActivityItem[] = []
      salesData.forEach((sale: any) => activities.push({
        id: sale.id, type: 'sale',
        time: new Date(sale.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        description: `Sale: ${sale.customerName || 'Walk-in Customer'}`,
        amount: sale.total, icon: ShoppingCart, saleData: sale,
      }))

      const itemsMap = new Map<string, ItemSummary>()
      let totalPieces = 0
      salesData.forEach((sale: any) => {
        sale.items?.forEach((item: any) => {
          const netQty = item.quantity - (item.refundedQuantity || 0)
          if (netQty <= 0) return
          totalPieces += netQty
          const variant = item.variantId ? variantsMap.get(item.variantId) : null
          const variantName = variant ? [variant.color, variant.size].filter(Boolean).join(' / ') || 'Base Product' : 'Base Product'
          const key = item.productId
          const itemRevenue = item.totalPrice || item.price * netQty
          if (itemsMap.has(key)) {
            const ex = itemsMap.get(key)!; ex.totalQuantity += netQty; ex.revenue += itemRevenue
            const ev = ex.variants?.find(v => v.variantId === item.variantId && v.variantName === variantName)
            if (ev) { ev.quantity += netQty; ev.revenue += itemRevenue }
            else { ex.variants = ex.variants || []; ex.variants.push({ variantId: item.variantId || null, variantName, quantity: netQty, revenue: itemRevenue }) }
          } else {
            itemsMap.set(key, { productId: item.productId, productName: item.product?.name || 'Unknown', totalQuantity: netQty, revenue: itemRevenue, category: item.product?.category?.name, variants: [{ variantId: item.variantId || null, variantName, quantity: netQty, revenue: itemRevenue }] })
          }
        })
      })
      setItemsSummary(Array.from(itemsMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity))
      setTotalPiecesSold(totalPieces)

      financeData.filter((t: any) => t.type === 'expense').forEach((expense: any) => {
        activities.push({ id: expense.id, type: 'expense', time: new Date(expense.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), description: `Expense: ${expense.description}`, amount: expense.amount, icon: Receipt })
      })
      activities.sort((a, b) => { const [ah, am] = a.time.split(':').map(Number); const [bh, bm] = b.time.split(':').map(Number); return bh * 60 + bm - (ah * 60 + am) })
      setActivityFeed(activities.slice(0, 10))

      if (salesData.length > 0) {
        const hmap = await compute<HeatmapResult>('COMPUTE_HEATMAP', { timestamps: salesData.map((s: any) => s.createdAt) })
        if (hmap) setHeatmapResult(hmap)
      }
    } catch (err) { logger.error('CommerceReport: loadActivityFeed failed', err) }
  }

  const loadWeeklyTrend = async () => {
    try {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i))
        const s = new Date(d); s.setHours(0, 0, 0, 0)
        const e = new Date(d); e.setHours(23, 59, 59, 999)
        return { s, e, day: d.toLocaleDateString('en-US', { weekday: 'short' }), label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
      })
      const results = await Promise.allSettled(days.map(({ s, e }) => window.api.saleTransactions.getByDateRange({ startDate: s.toISOString(), endDate: e.toISOString() })))
      const revenues = results.map(r => {
        if (r.status !== 'fulfilled') return 0
        return (r.value as any[]).reduce((sum: number, s: any) => sum + (s.subtotal ?? s.total) - calculateRefundedAmount(s.items || []), 0)
      })
      setWeeklyData(days.map((d, i) => ({ day: d.day, label: d.label, revenue: revenues[i] })))
      const trend = await compute<TrendsResult>('COMPUTE_TRENDS', { values: revenues, labels: days.map(d => d.day) })
      if (trend) {
        setTrendResult(trend)
        const pct = revenues[5] > 0 ? parseFloat(((revenues[6] - revenues[5]) / revenues[5] * 100).toFixed(1)) : revenues[6] > 0 ? 100 : 0
        setTodayStats(prev => prev ? { ...prev, revenueChange: pct } : prev)
      }
    } catch (err) { logger.error('CommerceReport: loadWeeklyTrend failed', err) }
  }

  const handleGenerateReport = async () => {
    if (!reportForm.reportType) return
    setGenerating(true)
    try {
      const opts = { startDate: new Date(reportForm.startDate), endDate: new Date(reportForm.endDate) }
      let response: any
      switch (reportForm.reportType) {
        case 'sales':     response = await window.api.reports.getSalesData(opts); break
        case 'inventory': response = await window.api.reports.getInventoryData(opts); break
        case 'financial': response = await window.api.reports.getFinancialData(opts); break
        case 'customer':  response = await window.api.reports.getCustomerData(opts); break
      }
      if (response?.success && response.data) { setReportData(response.data); setShowPreview(true); success('Report generated') }
      else toastError(response?.error || 'Failed to generate report')
    } catch (err) { logger.error('CommerceReport: generate failed', err); toastError('Failed to generate report') }
    finally { setGenerating(false) }
  }

  const handleExportPDF = () => {
    if (!reportData || !reportForm.reportType) return
    try {
      const doc = new jsPDF()
      const rt = reportTypes.find(r => r.id === reportForm.reportType)
      const dr = `${new Date(reportForm.startDate).toLocaleDateString()} - ${new Date(reportForm.endDate).toLocaleDateString()}`
      let y = 20
      doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.text(`${rt?.title} Report`, 105, y, { align: 'center' }); y += 10
      doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100)
      doc.text(`Period: ${dr}`, 105, y, { align: 'center' }); doc.text(`Generated: ${new Date().toLocaleString()}`, 105, y + 5, { align: 'center' }); y += 15
      doc.setTextColor(0); doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text('Summary', 14, y); y += 8
      const rows: any[] = []
      if (reportForm.reportType === 'sales' && reportData.summary) rows.push(['Total Revenue', formatCurrency(reportData.summary.totalRevenue || 0)], ['Total Sales', `${reportData.summary.totalSales || 0}`], ['Avg Order', formatCurrency(reportData.summary.averageOrderValue || 0)], ['Refunded', formatCurrency(reportData.summary.totalRefunded || 0)])
      else if (reportForm.reportType === 'inventory' && reportData.summary) rows.push(['Total Value', formatCurrency(reportData.summary.totalValue || 0)], ['Products', `${reportData.summary.totalProducts || 0}`], ['Low Stock', `${reportData.summary.lowStockCount || 0}`], ['Out of Stock', `${reportData.summary.outOfStockCount || 0}`])
      else if (reportForm.reportType === 'financial' && reportData.summary) rows.push(['Revenue', formatCurrency(reportData.summary.totalRevenue || 0)], ['Expenses', formatCurrency(reportData.summary.totalExpenses || 0)], ['Net Profit', formatCurrency(reportData.summary.netProfit || 0)], ['Margin', `${(reportData.summary.profitMargin || 0).toFixed(2)}%`])
      else if (reportForm.reportType === 'customer' && reportData.summary) rows.push(['Customers', `${reportData.summary.totalCustomers || 0}`], ['Total Spent', formatCurrency(reportData.summary.totalSpent || 0)], ['Avg/Customer', formatCurrency(reportData.summary.averageSpent || 0)])
      autoTable(doc, { startY: y, head: [['Metric', 'Value']], body: rows, theme: 'grid', headStyles: { fillColor: [99, 102, 241] }, styles: { fontSize: 9 }, margin: { left: 14, right: 14 } })
      const name = `Commerce_${rt?.title}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(name); success(`Saved: ${name}`)
    } catch (err) { logger.error('PDF export error', err); toastError('PDF export failed') }
  }

  const handleExportCSV = () => {
    if (!reportData || !reportForm.reportType) return
    try {
      const rt = reportTypes.find(r => r.id === reportForm.reportType)
      let csv = `Commerce ${rt?.title} Report\nGenerated: ${new Date().toLocaleString()}\n\n`
      if (reportForm.reportType === 'sales' && reportData.summary) csv += `Revenue,${reportData.summary.totalRevenue}\nSales,${reportData.summary.totalSales}\n`
      else if (reportForm.reportType === 'financial' && reportData.summary) csv += `Revenue,${reportData.summary.totalRevenue}\nExpenses,${reportData.summary.totalExpenses}\nProfit,${reportData.summary.netProfit}\n`
      const link = document.createElement('a')
      link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
      link.setAttribute('download', `Commerce_${rt?.title}_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link); link.click(); document.body.removeChild(link)
      success('CSV downloaded')
    } catch (err) { toastError('CSV export failed') }
  }

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3 px-1">
        <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
          <ShoppingCart size={22} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Commerce Reports</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Sales · Inventory · Financial · Customers</p>
        </div>
      </div>

      {/* Generate Report */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 rounded-xl p-6 shadow-sm border border-indigo-200 dark:border-slate-600">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 bg-indigo-600 rounded-lg"><FileText size={18} className="text-white" /></div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('generateReport')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('reportSelectType')}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {reportTypes.map(rt => {
            const Icon = rt.icon
            const active = reportForm.reportType === rt.id
            return (
              <button key={rt.id} onClick={() => setReportForm(f => ({ ...f, reportType: rt.id as ReportFormState['reportType'] }))}
                className={`p-4 rounded-xl font-medium transition-all hover:scale-105 ${active ? 'bg-indigo-600 text-white shadow-lg ring-4 ring-indigo-300/40' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:shadow-md border border-slate-200 dark:border-slate-600'}`}>
                <Icon size={22} className={`mx-auto mb-1.5 ${active ? 'text-white' : rt.color}`} />
                <p className="text-sm font-semibold">{rt.title}</p>
              </button>
            )
          })}
        </div>
        {reportForm.reportType && (
          <div className="flex flex-wrap items-end gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">📅 {t('startDate')}</label>
              <input type="date" value={reportForm.startDate} onChange={e => setReportForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm" />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">📅 {t('endDate')}</label>
              <input type="date" value={reportForm.endDate} onChange={e => setReportForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm" />
            </div>
            <button onClick={handleGenerateReport} disabled={generating}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 font-semibold shadow-md hover:shadow-lg transition-all">
              <BarChart3 size={17} />
              {generating ? t('generating') : t('generateReportButton')}
            </button>
          </div>
        )}
      </div>

      {/* Today's Activity */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 p-6 rounded-xl border border-primary/20">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={22} className="text-primary" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('todaysActivity')}</h3>
          <span className="px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />{t('live')}
          </span>
        </div>
        <TodayStatsGrid todayStats={todayStats} totalPiecesSold={totalPiecesSold} itemsSummary={itemsSummary} t={t} />
      </div>

      {/* Trend + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueTrendPanel weeklyData={weeklyData} trendResult={trendResult} loading={loadingActivity} />
        <SalesHeatmapPanel heatmapResult={heatmapResult} />
      </div>

      {/* Activity Feed + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ActivityFeed activityFeed={activityFeed} expandedSales={expandedSales} setExpandedSales={setExpandedSales} totalPiecesSold={totalPiecesSold} setSelectedReceipt={setSelectedReceipt} t={t} />
        <QuickInsightsPanel todayStats={todayStats} itemsSummary={itemsSummary} trendResult={trendResult} t={t} />
      </div>

      {/* Items Sold */}
      {itemsSummary.length > 0 && (
        <ItemsSoldSummary itemsSummary={itemsSummary} totalPiecesSold={totalPiecesSold} expandedProducts={expandedProducts} setExpandedProducts={setExpandedProducts} itemSearchQuery={itemSearchQuery} setItemSearchQuery={setItemSearchQuery} />
      )}

      {/* Modals */}
      {showPreview && reportData && (
        <ReportPreviewModal showPreview={showPreview} reportData={reportData} reportForm={reportForm} setShowPreview={setShowPreview} setReportData={setReportData} setReportForm={setReportForm} handleExportPDF={handleExportPDF} handleExportCSV={handleExportCSV} reportTypes={reportTypes} t={t} />
      )}
      {selectedReceipt && <ReceiptPreviewModal transaction={selectedReceipt} onClose={() => setSelectedReceipt(null)} />}
    </div>
  )
}

export default CommerceReportSection
