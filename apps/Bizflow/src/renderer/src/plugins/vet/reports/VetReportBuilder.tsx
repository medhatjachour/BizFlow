/**
 * VetReportBuilder
 * On-demand, range-based report generator for the Vet Clinic — used by
 * VetReportSection for the Sessions, Sales, Medicines and Revenue reports.
 * Each report shows KPI cards + a detail table and exports to CSV.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Loader2, Download, ClipboardList, ShoppingBag, Pill, DollarSign,
  TrendingUp, TrendingDown, AlertCircle, PackageMinus, PackageX,
  Activity, Banknote, Receipt, Layers, ChevronLeft, ChevronRight,
  FileText, FileSpreadsheet
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import VetPeriodFilter, { rangeForPreset } from '../pages/components/VetPeriodFilter'
import { bi, exportReport, type ReportPayload } from './reportExport'

export type ReportType = 'sessions' | 'sales' | 'medicines' | 'revenue'

const PAGE_SIZE = 25

const fmt = (n: number) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtInt = (n: number) => (Number(n) || 0).toLocaleString('en-US')

function toEnd(iso?: string) { return iso ? `${iso}T23:59:59.999` : undefined }
function toStart(iso?: string) { return iso ? `${iso}T00:00:00.000` : undefined }

function downloadCSV(rows: (string | number)[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

interface Kpi { label: string; value: string; icon: any; color: string }

const KpiCard = ({ label, value, icon: Icon, color }: Kpi) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
    <div className="flex items-center gap-2 mb-1.5">
      <Icon size={15} className={color} />
      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">{label}</span>
    </div>
    <p className={`text-xl font-bold ${color}`}>{value}</p>
  </div>
)

function Pager({ page, pageCount, total, onPage, label }: {
  page: number; pageCount: number; total: number; onPage: (p: number) => void; label?: string
}) {
  if (pageCount <= 1) return null
  const from = page * PAGE_SIZE + 1
  const to = Math.min((page + 1) * PAGE_SIZE, total)
  return (
    <div className="flex items-center justify-between gap-2 pt-3 mt-1 border-t border-slate-100 dark:border-slate-700/60">
      <span className="text-[11px] text-slate-400">{from}–{to} {label || 'of'} {total}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(Math.max(0, page - 1))} disabled={page <= 0}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft size={14} />
        </button>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums px-1">{page + 1} / {pageCount}</span>
        <button onClick={() => onPage(Math.min(pageCount - 1, page + 1))} disabled={page >= pageCount - 1}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

const STATUS_BADGE: Record<string, string> = {
  paid:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  partial:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  unpaid:    'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
  waived:    'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
  refunded:  'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  expired:   'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
  low:       'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  out:       'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
  ok:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
}

const TITLES: Record<ReportType, { label: string; icon: any; tint: string }> = {
  sessions:  { label: 'Sessions Report',  icon: ClipboardList, tint: 'text-teal-500' },
  sales:     { label: 'Sales Report',     icon: ShoppingBag,   tint: 'text-violet-500' },
  medicines: { label: 'Medicines Report', icon: Pill,          tint: 'text-purple-500' },
  revenue:   { label: 'Revenue / P&L',    icon: DollarSign,    tint: 'text-emerald-500' },
}

export default function VetReportBuilder({ type }: { type: ReportType }) {
  const toast = useToast()
  const { t, language } = useLanguage()
  const [range, setRange] = useState<{ from?: string; to?: string }>(() => rangeForPreset('month'))
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [page, setPage] = useState(0)
  // Server-paginated sale detail (sales report only) — avoids loading thousands of rows.
  const [salesPageData, setSalesPageData] = useState<{ rows: any[]; total: number; loading: boolean }>({ rows: [], total: 0, loading: false })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const from = range.from, to = range.to
      const startISO = toStart(from), endISO = toEnd(to)

      if (type === 'sessions') {
        const res = await window.api.vet?.sessions.getRecent({ filter: 'all', startDate: startISO, endDate: endISO, skip: 0, take: 3000 }).catch(() => ({ data: [] }))
        setData((res as any)?.data ?? [])
      } else if (type === 'sales') {
        // KPIs + top medicines come from the server aggregate; the detail table is paginated separately.
        const summary = await window.api.vet?.medicines.getSummary({ from: startISO, to: endISO }).catch(() => null)
        setData({ summary })
      } else if (type === 'medicines') {
        const res = await window.api.vet?.medicines.getAll({ skip: 0, take: 2000 }).catch(() => ({ data: [] }))
        setData((res as any)?.data ?? [])
      } else {
        const [sessRes, medSummary, expSummary] = await Promise.all([
          window.api.vet?.sessions.getRecent({ filter: 'all', startDate: startISO, endDate: endISO, skip: 0, take: 4000 }).catch(() => ({ data: [] })),
          window.api.vet?.medicines.getSummary({ from: startISO, to: endISO }).catch(() => null),
          window.api.vet?.expenses?.summary({ from, to }).catch(() => null),
        ])
        setData({ sessions: (sessRes as any)?.data ?? [], medSummary, expSummary })
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [type, range.from, range.to])

  useEffect(() => { load() }, [load])

  // Reset to first page whenever the report type or range changes.
  useEffect(() => { setPage(0) }, [type, range.from, range.to])

  // Server-side fetch of the current sale-detail page (sales report only).
  useEffect(() => {
    if (type !== 'sales') return
    let active = true
    setSalesPageData(p => ({ ...p, loading: true }))
    window.api.vet?.medicines.getSales({ from: toStart(range.from), to: toEnd(range.to), skip: page * PAGE_SIZE, take: PAGE_SIZE })
      .then((r: any) => { if (active) setSalesPageData({ rows: r?.data ?? [], total: r?.total ?? 0, loading: false }) })
      .catch(() => { if (active) setSalesPageData({ rows: [], total: 0, loading: false }) })
    return () => { active = false }
  }, [type, range.from, range.to, page])

  const rangeLabel = range.from || range.to
    ? `${range.from ?? '…'} → ${range.to ?? '…'}`
    : (t('vetPeriodAll') || 'All time')
  const fileStamp = `${range.from ?? 'all'}_${range.to ?? 'all'}`

  // ── Derived view-models ────────────────────────────────────────────────────
  const sessionsVm = useMemo(() => {
    if (type !== 'sessions' || !Array.isArray(data)) return null
    const rows = data as any[]
    let charged = 0, collected = 0, paid = 0, partial = 0, unpaid = 0
    const byType: Record<string, number> = {}
    const byVet: Record<string, { count: number; charged: number }> = {}
    for (const s of rows) {
      const c = Number(s.amountCharged) || 0
      const p = Number(s.amountPaid) || 0
      charged += c; collected += p
      const st = s.paymentStatus ?? (c <= 0 ? 'unpaid' : p >= c - 0.005 ? 'paid' : p > 0 ? 'partial' : 'unpaid')
      if (st === 'paid') paid++; else if (st === 'partial') partial++; else if (st === 'unpaid') unpaid++
      byType[s.visitType ?? 'other'] = (byType[s.visitType ?? 'other'] ?? 0) + 1
      const vet = s.vetName || '—'
      byVet[vet] = { count: (byVet[vet]?.count ?? 0) + 1, charged: (byVet[vet]?.charged ?? 0) + c }
    }
    return {
      rows, charged, collected, outstanding: Math.max(0, charged - collected),
      paid, partial, unpaid, avg: rows.length ? charged / rows.length : 0,
      byType: Object.entries(byType).sort((a, b) => b[1] - a[1]),
      byVet: Object.entries(byVet).sort((a, b) => b[1].charged - a[1].charged),
    }
  }, [type, data])

  const medsVm = useMemo(() => {
    if (type !== 'medicines' || !Array.isArray(data)) return null
    const meds = data as any[]
    const nowMs = Date.now()
    let stockValue = 0, retailValue = 0, lowStock = 0, outOfStock = 0, expiredBatches = 0, expiringSoon = 0
    const rows = meds.map((m: any) => {
      const batches = m.batches ?? []
      const active = batches.filter((b: any) => b.quantity > 0)
      const stock = Number(m.totalStock) || active.reduce((s: number, b: any) => s + b.quantity, 0)
      const value = active.reduce((s: number, b: any) => s + b.quantity * (b.costPerUnit ?? 0), 0)
      const retail = active.reduce((s: number, b: any) => s + b.quantity * (b.sellingPrice ?? 0), 0)
      const hasExpired = batches.some((b: any) => new Date(b.expiryDate).getTime() < nowMs && b.quantity > 0)
      const soon = batches.some((b: any) => { const d = (new Date(b.expiryDate).getTime() - nowMs) / 86400000; return d >= 0 && d <= 30 && b.quantity > 0 })
      stockValue += value; retailValue += retail
      const out = stock <= 0
      if (out) outOfStock++; else if (m.isLowStock) lowStock++
      if (hasExpired) expiredBatches++
      if (soon) expiringSoon++
      const status = out ? 'out' : hasExpired ? 'expired' : m.isLowStock ? 'low' : 'ok'
      return { id: m.id, name: m.name, category: m.category ?? '—', unit: m.unit ?? '', stock, value, retail, status, nearestExpiry: m.nearestExpiry, minimumStock: m.minimumStock ?? 0 }
    }).sort((a, b) => b.value - a.value)
    return { rows, stockValue, retailValue, lowStock, outOfStock, expiredBatches, expiringSoon, totalMeds: meds.length }
  }, [type, data])

  // ── KPI rows ───────────────────────────────────────────────────────────────
  const kpis: Kpi[] = useMemo(() => {
    if (type === 'sessions' && sessionsVm) {
      const v = sessionsVm
      return [
        { label: t('vetSessions') || 'Sessions', value: fmtInt(v.rows.length), icon: ClipboardList, color: 'text-teal-600 dark:text-teal-400' },
        { label: t('vetRevenue') || 'Charged', value: `$${fmt(v.charged)}`, icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400' },
        { label: t('amountPaid') || 'Collected', value: `$${fmt(v.collected)}`, icon: Banknote, color: 'text-violet-600 dark:text-violet-400' },
        { label: t('vetOutstanding') || 'Outstanding', value: `$${fmt(v.outstanding)}`, icon: AlertCircle, color: v.outstanding > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400' },
        { label: t('vetAvgTicket') || 'Avg / visit', value: `$${fmt(v.avg)}`, icon: Activity, color: 'text-sky-600 dark:text-sky-400' },
      ]
    }
    if (type === 'sales') {
      const s = data?.summary
      const items = Number(s?.unitsSold) || 0
      const margin = s?.margin ?? (s && s.revenue > 0 ? (s.grossProfit / s.revenue) * 100 : 0)
      return [
        { label: t('vetSalesTab') || 'Sales', value: fmtInt(s?.saleCount ?? 0), icon: ShoppingBag, color: 'text-violet-600 dark:text-violet-400' },
        { label: t('vetRevenue') || 'Revenue', value: `$${fmt(s?.revenue ?? 0)}`, icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400' },
        { label: 'COGS', value: `$${fmt(s?.costOfGoods ?? 0)}`, icon: TrendingDown, color: 'text-orange-500 dark:text-orange-400' },
        { label: t('vetGrossProfit') || 'Gross Profit', value: `$${fmt(s?.grossProfit ?? 0)}`, icon: DollarSign, color: (s?.grossProfit ?? 0) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500' },
        { label: `${t('vetMargin') || 'Margin'} (${(margin || 0).toFixed(0)}%)`, value: `${(margin || 0).toFixed(1)}%`, icon: Activity, color: margin >= 40 ? 'text-emerald-600 dark:text-emerald-400' : margin >= 20 ? 'text-amber-500' : 'text-red-500' },
        { label: t('vetUnitsSold') || 'Units sold', value: fmtInt(items), icon: Layers, color: 'text-slate-600 dark:text-slate-300' },
      ]
    }
    if (type === 'medicines' && medsVm) {
      const v = medsVm
      return [
        { label: t('vetMedicines') || 'Medicines', value: fmtInt(v.totalMeds), icon: Pill, color: 'text-violet-600 dark:text-violet-400' },
        { label: t('vetStockValue') || 'Stock value', value: `$${fmt(v.stockValue)}`, icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400' },
        { label: t('vetRetailValue') || 'Retail value', value: `$${fmt(v.retailValue)}`, icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400' },
        { label: t('vetOutOfStock') || 'Out of stock', value: fmtInt(v.outOfStock), icon: PackageX, color: v.outOfStock > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400' },
        { label: t('vetLowStock') || 'Low stock', value: fmtInt(v.lowStock), icon: PackageMinus, color: v.lowStock > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400' },
        { label: t('vetExpiredBatches') || 'Expired', value: fmtInt(v.expiredBatches), icon: PackageX, color: v.expiredBatches > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400' },
      ]
    }
    if (type === 'revenue' && data) {
      const sessions = data.sessions ?? []
      const clinical = sessions.reduce((s: number, x: any) => s + (Number(x.amountCharged) || 0), 0)
      const collected = sessions.reduce((s: number, x: any) => s + (Number(x.amountPaid) || 0), 0)
      const medRev = data.medSummary?.revenue ?? 0
      const cogs = data.medSummary?.costOfGoods ?? 0
      const exp = data.expSummary?.totalExpenses ?? 0
      const totalRev = clinical + medRev
      const net = clinical + (medRev - cogs) - exp
      const collRate = clinical > 0 ? (collected / clinical) * 100 : 0
      return [
        { label: t('vetTotalRevenue') || 'Total Revenue', value: `$${fmt(totalRev)}`, icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400' },
        { label: t('vetGrossProfit') || 'Gross Profit', value: `$${fmt(clinical + (medRev - cogs))}`, icon: DollarSign, color: 'text-blue-600 dark:text-blue-400' },
        { label: t('vetExpenses') || 'Expenses', value: `$${fmt(exp)}`, icon: Receipt, color: 'text-red-500 dark:text-red-400' },
        { label: t('vetNetIncome') || 'Net Income', value: `$${fmt(net)}`, icon: Banknote, color: net >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-500' },
        { label: t('vetCollectionRate') || 'Collection rate', value: `${collRate.toFixed(0)}%`, icon: Activity, color: collRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400' },
      ]
    }
    return []
  }, [type, sessionsVm, medsVm, data, t])

  // ── CSV export ──────────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false)
  async function handleExport() {
    setExporting(true)
    try {
    let rows: (string | number)[][] = []
    if (type === 'sessions' && sessionsVm) {
      rows = [
        ['Sessions Report', rangeLabel],
        [],
        ['Date', 'Patient', 'Species', 'Visit Type', 'Vet', 'Diagnosis', 'Charged', 'Paid', 'Status'],
        ...sessionsVm.rows.map((s: any) => [
          new Date(s.visitDate).toLocaleString(), s.patient?.name ?? '', s.patient?.species ?? '',
          s.visitType ?? '', s.vetName ?? '', s.diagnosis ?? '',
          Number(s.amountCharged) || 0, Number(s.amountPaid) || 0, s.paymentStatus ?? '',
        ]),
        [],
        ['Summary'],
        ['Sessions', sessionsVm.rows.length],
        ['Charged', sessionsVm.charged.toFixed(2)],
        ['Collected', sessionsVm.collected.toFixed(2)],
        ['Outstanding', sessionsVm.outstanding.toFixed(2)],
        ['Avg / visit', sessionsVm.avg.toFixed(2)],
      ]
    } else if (type === 'sales') {
      const s = data?.summary
      // Fetch the full detail set for the export (the on-screen table is paginated).
      const allRes = await window.api.vet?.medicines.getSales({ from: toStart(range.from), to: toEnd(range.to), skip: 0, take: 100000 }).catch(() => ({ data: [] }))
      const allRows = (allRes as any)?.data ?? []
      rows = [
        ['Sales Report', rangeLabel],
        [],
        ['Date', 'Medicine', 'Qty', 'Unit Price', 'Total', 'Patient/Owner', 'Payment'],
        ...allRows.map((r: any) => [
          new Date(r.saleDate).toLocaleString(), r.medicine?.name ?? '', r.quantity ?? 0,
          r.unitPrice ?? 0, r.totalPrice ?? 0, r.ownerName ?? r.patientName ?? '', r.paymentStatus ?? '',
        ]),
        [],
        ['Summary'],
        ['Sales', s?.saleCount ?? 0],
        ['Revenue', (s?.revenue ?? 0).toFixed(2)],
        ['COGS', (s?.costOfGoods ?? 0).toFixed(2)],
        ['Gross Profit', (s?.grossProfit ?? 0).toFixed(2)],
        ['Margin %', (s?.margin ?? 0).toFixed(1) + '%'],
        [],
        ['Top Medicines by Revenue'],
        ['Medicine', 'Sales', 'Revenue', 'Gross Profit'],
        ...((s?.topMedicines ?? []).map((m: any) => [m.name, m.saleCount, (m.revenue ?? 0).toFixed(2), (m.grossProfit ?? 0).toFixed(2)])),
      ]
    } else if (type === 'medicines' && medsVm) {
      rows = [
        ['Medicines / Inventory Report', new Date().toLocaleString()],
        [],
        ['Medicine', 'Category', 'Stock', 'Unit', 'Min', 'Stock Value', 'Retail Value', 'Status', 'Nearest Expiry'],
        ...medsVm.rows.map((m: any) => [
          m.name, m.category, m.stock, m.unit, m.minimumStock, m.value.toFixed(2), m.retail.toFixed(2), m.status,
          m.nearestExpiry ? new Date(m.nearestExpiry).toLocaleDateString() : '',
        ]),
        [],
        ['Summary'],
        ['Total medicines', medsVm.totalMeds],
        ['Stock value', medsVm.stockValue.toFixed(2)],
        ['Retail value', medsVm.retailValue.toFixed(2)],
        ['Out of stock', medsVm.outOfStock],
        ['Low stock', medsVm.lowStock],
        ['Expired batches', medsVm.expiredBatches],
        ['Expiring soon (30d)', medsVm.expiringSoon],
      ]
    } else if (type === 'revenue' && data) {
      const sessions = data.sessions ?? []
      const clinical = sessions.reduce((s: number, x: any) => s + (Number(x.amountCharged) || 0), 0)
      const collected = sessions.reduce((s: number, x: any) => s + (Number(x.amountPaid) || 0), 0)
      const medRev = data.medSummary?.revenue ?? 0
      const cogs = data.medSummary?.costOfGoods ?? 0
      const exp = data.expSummary?.totalExpenses ?? 0
      const byCat = normalizeByCategory(data.expSummary?.byCategory)
      rows = [
        ['Revenue / Profit & Loss', rangeLabel],
        [],
        ['Line', 'Amount'],
        ['Clinical revenue', clinical.toFixed(2)],
        ['Medicine revenue', medRev.toFixed(2)],
        ['Medicine COGS', (-cogs).toFixed(2)],
        ['Gross profit', (clinical + (medRev - cogs)).toFixed(2)],
        ['Total expenses', (-exp).toFixed(2)],
        ['Net income', (clinical + (medRev - cogs) - exp).toFixed(2)],
        ['Collected (clinical)', collected.toFixed(2)],
        ['Collection rate %', clinical > 0 ? ((collected / clinical) * 100).toFixed(1) + '%' : '0%'],
        [],
        ['Expense Breakdown'],
        ['Category', 'Amount'],
        ...byCat.map(c => [c.category, c.total.toFixed(2)]),
      ]
    }
    downloadCSV(rows, `vet-${type}-report-${fileStamp}.csv`)
    } catch (err: any) {
      toast.error(err?.message ?? 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  // ── PDF / Excel export ──────────────────────────────────────────────────────
  const [exportingDoc, setExportingDoc] = useState<'pdf' | 'excel' | null>(null)

  const buildPayload = useCallback(async (): Promise<ReportPayload> => {
    const L = bi(language)
    const meta = [{ label: L('Period', 'الفترة'), value: rangeLabel }]
    const kpiPairs = kpis.map(k => ({ label: k.label, value: k.value }))
    const titleByType: Record<ReportType, string> = {
      sessions:  L('Sessions Report', 'تقرير الجلسات'),
      sales:     L('Sales Report', 'تقرير المبيعات'),
      medicines: L('Medicines / Inventory Report', 'تقرير الأدوية / المخزون'),
      revenue:   L('Revenue / Profit & Loss', 'الإيرادات / الأرباح والخسائر'),
    }
    const base: ReportPayload = {
      title: titleByType[type],
      subtitle: rangeLabel,
      lang: language === 'ar' ? 'ar' : 'en',
      currency: '$',
      meta, kpis: kpiPairs, sections: [],
      fileBase: `vet-${type}-${fileStamp}`,
    }

    if (type === 'sessions' && sessionsVm) {
      base.sections = [{
        heading: L('Sessions', 'الجلسات'),
        columns: [
          { key: 'date', label: L('Date', 'التاريخ') },
          { key: 'patient', label: L('Patient', 'الحيوان') },
          { key: 'species', label: L('Species', 'النوع') },
          { key: 'visitType', label: L('Visit Type', 'نوع الزيارة') },
          { key: 'vet', label: L('Vet', 'الطبيب') },
          { key: 'diagnosis', label: L('Diagnosis', 'التشخيص') },
          { key: 'charged', label: L('Charged', 'المطلوب'), isMoney: true },
          { key: 'paid', label: L('Paid', 'المدفوع'), isMoney: true },
          { key: 'status', label: L('Status', 'الحالة') },
        ],
        rows: sessionsVm.rows.map((s: any) => ({
          date: new Date(s.visitDate).toLocaleDateString(),
          patient: s.patient?.name ?? '', species: s.patient?.species ?? '',
          visitType: s.visitType ?? '', vet: s.vetName ?? '', diagnosis: s.diagnosis ?? '',
          charged: Number(s.amountCharged) || 0, paid: Number(s.amountPaid) || 0, status: s.paymentStatus ?? '',
        })),
        totals: { charged: sessionsVm.charged, paid: sessionsVm.collected },
      }]
    } else if (type === 'sales') {
      const s = data?.summary
      const allRes = await window.api.vet?.medicines.getSales({ from: toStart(range.from), to: toEnd(range.to), skip: 0, take: 100000 }).catch(() => ({ data: [] }))
      const allRows = (allRes as any)?.data ?? []
      base.sections = [
        {
          heading: L('Sales', 'المبيعات'),
          columns: [
            { key: 'date', label: L('Date', 'التاريخ') },
            { key: 'medicine', label: L('Medicine', 'الدواء') },
            { key: 'qty', label: L('Qty', 'الكمية'), align: 'right' },
            { key: 'unitPrice', label: L('Unit Price', 'سعر الوحدة'), isMoney: true },
            { key: 'total', label: L('Total', 'الإجمالي'), isMoney: true },
            { key: 'customer', label: L('Patient / Owner', 'الحيوان / المالك') },
            { key: 'payment', label: L('Payment', 'الدفع') },
          ],
          rows: allRows.map((r: any) => ({
            date: new Date(r.saleDate).toLocaleDateString(), medicine: r.medicine?.name ?? '',
            qty: r.quantity ?? 0, unitPrice: Number(r.unitPrice) || 0, total: Number(r.totalPrice) || 0,
            customer: r.ownerName ?? r.patientName ?? '', payment: r.paymentStatus ?? '',
          })),
          totals: { total: Number(s?.revenue) || 0 },
        },
        {
          heading: L('Top Medicines', 'أكثر الأدوية مبيعاً'),
          columns: [
            { key: 'name', label: L('Medicine', 'الدواء') },
            { key: 'saleCount', label: L('Sales', 'المبيعات'), align: 'right' },
            { key: 'revenue', label: L('Revenue', 'الإيراد'), isMoney: true },
            { key: 'grossProfit', label: L('Gross Profit', 'إجمالي الربح'), isMoney: true },
          ],
          rows: (s?.topMedicines ?? []).map((m: any) => ({
            name: m.name, saleCount: m.saleCount, revenue: Number(m.revenue) || 0, grossProfit: Number(m.grossProfit) || 0,
          })),
        },
      ]
    } else if (type === 'medicines' && medsVm) {
      base.sections = [{
        heading: L('Inventory', 'المخزون'),
        columns: [
          { key: 'name', label: L('Medicine', 'الدواء') },
          { key: 'category', label: L('Category', 'الفئة') },
          { key: 'stock', label: L('Stock', 'المخزون'), align: 'right' },
          { key: 'unit', label: L('Unit', 'الوحدة') },
          { key: 'min', label: L('Min', 'الحد الأدنى'), align: 'right' },
          { key: 'value', label: L('Stock Value', 'قيمة المخزون'), isMoney: true },
          { key: 'retail', label: L('Retail Value', 'قيمة البيع'), isMoney: true },
          { key: 'status', label: L('Status', 'الحالة') },
          { key: 'expiry', label: L('Nearest Expiry', 'أقرب انتهاء') },
        ],
        rows: medsVm.rows.map((m: any) => ({
          name: m.name, category: m.category, stock: m.stock, unit: m.unit, min: m.minimumStock,
          value: Number(m.value) || 0, retail: Number(m.retail) || 0, status: m.status,
          expiry: m.nearestExpiry ? new Date(m.nearestExpiry).toLocaleDateString() : '',
        })),
        totals: { value: medsVm.stockValue, retail: medsVm.retailValue },
      }]
    } else if (type === 'revenue' && data) {
      const sessions = data.sessions ?? []
      const clinical = sessions.reduce((a: number, x: any) => a + (Number(x.amountCharged) || 0), 0)
      const collected = sessions.reduce((a: number, x: any) => a + (Number(x.amountPaid) || 0), 0)
      const medRev = data.medSummary?.revenue ?? 0
      const cogs = data.medSummary?.costOfGoods ?? 0
      const exp = data.expSummary?.totalExpenses ?? 0
      const byCat = normalizeByCategory(data.expSummary?.byCategory)
      base.sections = [
        {
          heading: L('Profit & Loss', 'الأرباح والخسائر'),
          columns: [
            { key: 'line', label: L('Line', 'البند') },
            { key: 'amount', label: L('Amount', 'المبلغ'), isMoney: true },
          ],
          rows: [
            { line: L('Clinical revenue', 'إيراد العيادة'), amount: clinical },
            { line: L('Medicine revenue', 'إيراد الأدوية'), amount: medRev },
            { line: L('Medicine COGS', 'تكلفة الأدوية'), amount: -cogs },
            { line: L('Gross profit', 'إجمالي الربح'), amount: clinical + (medRev - cogs) },
            { line: L('Total expenses', 'إجمالي المصاريف'), amount: -exp },
            { line: L('Net income', 'صافي الدخل'), amount: clinical + (medRev - cogs) - exp },
            { line: L('Collected (clinical)', 'المُحصّل (العيادة)'), amount: collected },
          ],
        },
        {
          heading: L('Expense Breakdown', 'تفصيل المصاريف'),
          columns: [
            { key: 'category', label: L('Category', 'الفئة') },
            { key: 'amount', label: L('Amount', 'المبلغ'), isMoney: true },
          ],
          rows: byCat.map(c => ({ category: c.category, amount: c.total })),
          totals: { amount: byCat.reduce((a, c) => a + c.total, 0) },
        },
      ]
    }
    return base
  }, [type, language, rangeLabel, kpis, sessionsVm, medsVm, data, range.from, range.to, fileStamp])

  async function handleExportDoc(format: 'pdf' | 'excel') {
    setExportingDoc(format)
    try {
      const payload = await buildPayload()
      const res = await exportReport(format, payload)
      if (res?.success) toast.success(format === 'pdf' ? (t('vetReportPdfSaved') || 'PDF saved') : (t('vetReportExcelSaved') || 'Excel saved'))
    } catch (err: any) {
      toast.error(err?.message ?? 'Export failed')
    } finally {
      setExportingDoc(null)
    }
  }

  const Title = TITLES[type]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Title.icon size={18} className={Title.tint} />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{Title.label}</h3>
            <p className="text-[11px] text-slate-400">{rangeLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {type !== 'medicines' && (
            <VetPeriodFilter compact defaultPreset="month"
              presets={['today', 'week', 'month', 'year', 'custom']}
              onChange={(r) => setRange({ from: r.from, to: r.to })} />
          )}
          <button onClick={handleExport} disabled={loading || exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50">
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} {t('exportCSV') || 'Export CSV'}
          </button>
          <button onClick={() => handleExportDoc('pdf')} disabled={loading || exportingDoc !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50">
            {exportingDoc === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} {t('vetExportPdf') || 'PDF'}
          </button>
          <button onClick={() => handleExportDoc('excel')} disabled={loading || exportingDoc !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors disabled:opacity-50">
            {exportingDoc === 'excel' ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} {t('vetExportExcel') || 'Excel'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-violet-500" /></div>
      ) : (
        <>
          {/* KPIs */}
          {kpis.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {kpis.map(k => <KpiCard key={k.label} {...k} />)}
            </div>
          )}

          {/* Body per type */}
          {type === 'sessions' && sessionsVm && <SessionsBody vm={sessionsVm} t={t} page={page} setPage={setPage} />}
          {type === 'sales' && <SalesBody data={data} t={t} pageData={salesPageData} page={page} setPage={setPage} />}
          {type === 'medicines' && medsVm && <MedicinesBody vm={medsVm} t={t} page={page} setPage={setPage} />}
          {type === 'revenue' && data && <RevenueBody data={data} t={t} />}
        </>
      )}
    </div>
  )
}

function normalizeByCategory(raw: any): Array<{ category: string; total: number }> {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map((x: any) => ({ category: x.category, total: Number(x.total) || 0 }))
  return Object.entries(raw).map(([category, total]) => ({ category, total: Number(total) || 0 }))
    .sort((a, b) => b.total - a.total)
}

const Panel = ({ title, icon: Icon, tint, children, right }: any) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
      <Icon size={14} className={tint} /> {title}
      {right && <span className="ml-auto text-xs font-normal text-slate-400">{right}</span>}
    </h4>
    {children}
  </div>
)

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  )
}

// ── Sessions body ─────────────────────────────────────────────────────────────
function SessionsBody({ vm, t, page, setPage }: { vm: any; t: any; page: number; setPage: (p: number) => void }) {
  const pageCount = Math.max(1, Math.ceil(vm.rows.length / PAGE_SIZE))
  const pageRows = vm.rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title={t('visitTypes') || 'By Visit Type'} icon={Activity} tint="text-teal-500">
          {vm.byType.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">{t('vetNoDataYet') || 'No data'}</p> : (
            <div className="space-y-2">
              {vm.byType.map(([name, count]: [string, number]) => {
                const pct = vm.rows.length ? (count / vm.rows.length) * 100 : 0
                return (
                  <div key={name}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="capitalize text-slate-600 dark:text-slate-300">{name.replace('_', ' ')}</span>
                      <span className="text-slate-400">{count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <Bar pct={pct} color="bg-teal-500" />
                  </div>
                )
              })}
            </div>
          )}
        </Panel>
        <Panel title={t('vetByVet') || 'By Veterinarian'} icon={ClipboardList} tint="text-violet-500">
          {vm.byVet.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">{t('vetNoDataYet') || 'No data'}</p> : (
            <div className="space-y-2">
              {vm.byVet.map(([name, v]: [string, any]) => {
                const max = vm.byVet[0]?.[1]?.charged ?? 1
                return (
                  <div key={name}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-slate-600 dark:text-slate-300 truncate">{name}</span>
                      <span className="text-slate-400 shrink-0">{v.count} · ${fmt(v.charged)}</span>
                    </div>
                    <Bar pct={max > 0 ? (v.charged / max) * 100 : 0} color="bg-violet-500" />
                  </div>
                )
              })}
            </div>
          )}
        </Panel>
      </div>

      <Panel title={t('vetSessions') || 'Sessions'} icon={ClipboardList} tint="text-teal-500" right={`${vm.rows.length}`}>
        {vm.rows.length === 0 ? <p className="text-xs text-slate-400 text-center py-6">{t('noSessions') || 'No sessions in range'}</p> : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100 dark:border-slate-700">
                  <th className="px-2 py-1.5 font-medium">{t('date') || 'Date'}</th>
                  <th className="px-2 py-1.5 font-medium">{t('vetPatient') || 'Patient'}</th>
                  <th className="px-2 py-1.5 font-medium">{t('visitType') || 'Type'}</th>
                  <th className="px-2 py-1.5 font-medium">{t('vetVet') || 'Vet'}</th>
                  <th className="px-2 py-1.5 font-medium text-right">{t('charged') || 'Charged'}</th>
                  <th className="px-2 py-1.5 font-medium text-right">{t('amountPaid') || 'Paid'}</th>
                  <th className="px-2 py-1.5 font-medium text-center">{t('status') || 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {pageRows.map((s: any) => {
                  const c = Number(s.amountCharged) || 0, p = Number(s.amountPaid) || 0
                  const st = s.paymentStatus ?? (c <= 0 ? 'unpaid' : p >= c - 0.005 ? 'paid' : p > 0 ? 'partial' : 'unpaid')
                  return (
                    <tr key={s.id} className="text-slate-700 dark:text-slate-300">
                      <td className="px-2 py-1.5 whitespace-nowrap text-slate-400">{new Date(s.visitDate).toLocaleDateString()}</td>
                      <td className="px-2 py-1.5 font-medium truncate max-w-[140px]">{s.patient?.name ?? '—'}</td>
                      <td className="px-2 py-1.5 capitalize">{(s.visitType ?? '').replace('_', ' ')}</td>
                      <td className="px-2 py-1.5 truncate max-w-[100px]">{s.vetName || '—'}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">${fmt(c)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">${fmt(p)}</td>
                      <td className="px-2 py-1.5 text-center"><span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${STATUS_BADGE[st] ?? STATUS_BADGE.unpaid}`}>{st}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <Pager page={page} pageCount={pageCount} total={vm.rows.length} onPage={setPage} />
          </div>
        )}
      </Panel>
    </div>
  )
}

// ── Sales body ────────────────────────────────────────────────────────────────
function SalesBody({ data, t, pageData, page, setPage }: {
  data: any; t: any; pageData: { rows: any[]; total: number; loading: boolean }; page: number; setPage: (p: number) => void
}) {
  const s = data?.summary
  const rows = pageData.rows
  const total = pageData.total
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const top = s?.topMedicines ?? []
  return (
    <div className="space-y-5">
      <Panel title={t('vetTopMedicines') || 'Top Medicines by Revenue'} icon={Pill} tint="text-violet-500">
        {top.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">{t('vetNoSalesInPeriod') || 'No sales in period'}</p> : (
          <div className="space-y-2.5">
            {top.map((m: any, i: number) => {
              const maxRev = top[0]?.revenue ?? 1
              return (
                <div key={m.id}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <span className="text-slate-400 w-4">{i + 1}</span>
                      <span className="truncate max-w-[180px]">{m.name}</span>
                      <span className="text-[10px] text-slate-400">{m.saleCount}×</span>
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">${fmt(m.revenue)}</span>
                  </div>
                  <Bar pct={maxRev > 0 ? (m.revenue / maxRev) * 100 : 0} color="bg-violet-500" />
                </div>
              )
            })}
          </div>
        )}
      </Panel>

      <Panel title={t('vetSaleDetail') || 'Sale Detail'} icon={ShoppingBag} tint="text-violet-500" right={`${total}`}>
        {total === 0 && !pageData.loading ? <p className="text-xs text-slate-400 text-center py-6">{t('vetNoSalesInPeriod') || 'No sales in period'}</p> : (
          <div className={`overflow-x-auto -mx-2 ${pageData.loading ? 'opacity-50' : ''}`}>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100 dark:border-slate-700">
                  <th className="px-2 py-1.5 font-medium">{t('date') || 'Date'}</th>
                  <th className="px-2 py-1.5 font-medium">{t('vetMedicine') || 'Medicine'}</th>
                  <th className="px-2 py-1.5 font-medium text-right">{t('quantity') || 'Qty'}</th>
                  <th className="px-2 py-1.5 font-medium text-right">{t('total') || 'Total'}</th>
                  <th className="px-2 py-1.5 font-medium">{t('vetCustomer') || 'Customer'}</th>
                  <th className="px-2 py-1.5 font-medium text-center">{t('status') || 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {rows.map((r: any) => {
                  const st = r.paymentStatus ?? (r.status === 'refunded' ? 'refunded' : 'paid')
                  return (
                    <tr key={r.id} className="text-slate-700 dark:text-slate-300">
                      <td className="px-2 py-1.5 whitespace-nowrap text-slate-400">{new Date(r.saleDate).toLocaleDateString()}</td>
                      <td className="px-2 py-1.5 font-medium truncate max-w-[160px]">{r.medicine?.name ?? '—'}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{r.quantity}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">${fmt(r.totalPrice)}</td>
                      <td className="px-2 py-1.5 truncate max-w-[140px]">{r.ownerName || r.patientName || '—'}</td>
                      <td className="px-2 py-1.5 text-center"><span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${STATUS_BADGE[st] ?? STATUS_BADGE.paid}`}>{st}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <Pager page={page} pageCount={pageCount} total={total} onPage={setPage} />
          </div>
        )}
      </Panel>
    </div>
  )
}

// ── Medicines body ────────────────────────────────────────────────────────────
function MedicinesBody({ vm, t, page, setPage }: { vm: any; t: any; page: number; setPage: (p: number) => void }) {
  const pageCount = Math.max(1, Math.ceil(vm.rows.length / PAGE_SIZE))
  const pageRows = vm.rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
  return (
    <Panel title={t('vetInventory') || 'Inventory'} icon={Pill} tint="text-purple-500" right={`${vm.totalMeds}`}>
      {vm.rows.length === 0 ? <p className="text-xs text-slate-400 text-center py-6">{t('vetNoDataYet') || 'No medicines'}</p> : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100 dark:border-slate-700">
                <th className="px-2 py-1.5 font-medium">{t('vetMedicine') || 'Medicine'}</th>
                <th className="px-2 py-1.5 font-medium">{t('category') || 'Category'}</th>
                <th className="px-2 py-1.5 font-medium text-right">{t('vetStock') || 'Stock'}</th>
                <th className="px-2 py-1.5 font-medium text-right">{t('vetStockValue') || 'Value'}</th>
                <th className="px-2 py-1.5 font-medium text-center">{t('status') || 'Status'}</th>
                <th className="px-2 py-1.5 font-medium">{t('vetExpiry') || 'Nearest Expiry'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {pageRows.map((m: any) => (
                <tr key={m.id} className="text-slate-700 dark:text-slate-300">
                  <td className="px-2 py-1.5 font-medium truncate max-w-[180px]">{m.name}</td>
                  <td className="px-2 py-1.5 capitalize text-slate-400">{String(m.category).replace('_', ' ')}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{m.stock} {m.unit}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">${fmt(m.value)}</td>
                  <td className="px-2 py-1.5 text-center"><span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${STATUS_BADGE[m.status] ?? STATUS_BADGE.ok}`}>{m.status === 'out' ? 'OUT' : m.status}</span></td>
                  <td className="px-2 py-1.5 whitespace-nowrap text-slate-400">{m.nearestExpiry ? new Date(m.nearestExpiry).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager page={page} pageCount={pageCount} total={vm.rows.length} onPage={setPage} />
        </div>
      )}
    </Panel>
  )
}

// ── Revenue / P&L body ────────────────────────────────────────────────────────
function RevenueBody({ data, t }: { data: any; t: any }) {
  const sessions = data.sessions ?? []
  const clinical = sessions.reduce((s: number, x: any) => s + (Number(x.amountCharged) || 0), 0)
  const collected = sessions.reduce((s: number, x: any) => s + (Number(x.amountPaid) || 0), 0)
  const medRev = data.medSummary?.revenue ?? 0
  const cogs = data.medSummary?.costOfGoods ?? 0
  const grossProfit = clinical + (medRev - cogs)
  const exp = data.expSummary?.totalExpenses ?? 0
  const net = grossProfit - exp
  const byCat = normalizeByCategory(data.expSummary?.byCategory)
  const totalRev = clinical + medRev

  const lines = [
    { label: t('vetClinicalRevenue') || 'Clinical revenue', value: clinical, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: t('vetMedicineRevenue') || 'Medicine revenue', value: medRev, color: 'text-violet-600 dark:text-violet-400' },
    { label: t('vetTotalRevenue') || 'Total revenue', value: totalRev, color: 'text-blue-600 dark:text-blue-400', bold: true },
    { label: t('vetMedicineCogs') || 'Medicine COGS', value: -cogs, color: 'text-orange-500 dark:text-orange-400' },
    { label: t('vetGrossProfit') || 'Gross profit', value: grossProfit, color: 'text-blue-600 dark:text-blue-400', bold: true },
    { label: t('vetTotalExpenses') || 'Total expenses', value: -exp, color: 'text-red-500 dark:text-red-400' },
    { label: t('vetNetIncome') || 'Net income', value: net, color: net >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-500', bold: true },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Panel title={t('vetIncomeStatement') || 'Income Statement'} icon={DollarSign} tint="text-emerald-500">
        <div className="space-y-1">
          {lines.map(l => (
            <div key={l.label} className={`flex justify-between items-center py-2 ${l.bold ? 'border-t border-slate-200 dark:border-slate-700 font-semibold' : ''}`}>
              <span className="text-sm text-slate-600 dark:text-slate-300">{l.label}</span>
              <span className={`text-sm font-semibold tabular-nums ${l.color}`}>{l.value < 0 ? `-$${fmt(-l.value)}` : `$${fmt(l.value)}`}</span>
            </div>
          ))}
          <div className="flex justify-between items-center py-2 mt-1 border-t border-dashed border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-400">{t('vetCollectionRate') || 'Collection rate (clinical)'}</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{clinical > 0 ? ((collected / clinical) * 100).toFixed(0) : 0}% · ${fmt(collected)}</span>
          </div>
        </div>
      </Panel>

      <Panel title={t('vetExpenseBreakdown') || 'Expense Breakdown'} icon={Receipt} tint="text-red-500" right={`$${fmt(exp)}`}>
        {byCat.length === 0 ? <p className="text-xs text-slate-400 text-center py-6">{t('vetNoExpensesPeriod') || 'No expenses this period'}</p> : (
          <div className="space-y-3">
            {byCat.map(({ category, total }) => {
              const max = Math.max(...byCat.map(c => c.total))
              return (
                <div key={category}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="capitalize text-slate-600 dark:text-slate-300">{category.replace(/_/g, ' ')}</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">${fmt(total)}</span>
                  </div>
                  <Bar pct={max > 0 ? (total / max) * 100 : 0} color="bg-red-500" />
                </div>
              )
            })}
          </div>
        )}
      </Panel>
    </div>
  )
}
