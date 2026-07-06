/**
 * VetFinanceSection
 * Finance tab for the Vet Clinic plugin — shown at /finance → Vet
 */
import { useState, useEffect, useCallback } from 'react'
import {
  PawPrint, TrendingUp, TrendingDown, AlertCircle, Receipt,
  Loader2, RefreshCcw, Banknote, BarChart3, Users, Activity,
  Wallet, Download, Pill, Phone
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import VetPeriodFilter, { rangeForPreset } from '../pages/components/stats/VetPeriodFilter'

function fmt(n: number) { return (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
const toStart = (iso?: string) => iso ? `${iso}T00:00:00.000` : undefined
const toEnd   = (iso?: string) => iso ? `${iso}T23:59:59.999` : undefined

function normalizeByCategory(raw: any): Array<{ category: string; total: number }> {
  if (!raw) return []
  const arr = Array.isArray(raw)
    ? raw.map((x: any) => ({ category: x.category, total: Number(x.total) || 0 }))
    : Object.entries(raw).map(([category, total]) => ({ category, total: Number(total) || 0 }))
  return arr.sort((a, b) => b.total - a.total)
}

function downloadCSV(rows: (string | number)[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

const EXPENSE_CATEGORIES = [
  { value: 'rent',             label: 'Rent' },
  { value: 'utilities',        label: 'Utilities' },
  { value: 'medical_supplies', label: 'Medical Supplies' },
  { value: 'medications',      label: 'Medications' },
  { value: 'equipment',        label: 'Equipment' },
  { value: 'maintenance',      label: 'Maintenance' },
  { value: 'lab_fees',         label: 'Lab Fees' },
  { value: 'insurance',        label: 'Insurance' },
  { value: 'marketing',        label: 'Marketing' },
  { value: 'cleaning',         label: 'Cleaning' },
  { value: 'salaries',         label: 'Salaries' },
  { value: 'other',            label: 'Other' },
]

function getCatLabel(val: string) {
  return EXPENSE_CATEGORIES.find(c => c.value === val)?.label ?? val.replace(/_/g,' ')
}

interface FinanceSummary {
  clinicalRevenue: number
  clinicalCollected: number
  medicineRevenue: number
  medicineCost: number
  medicineProfit: number
  medicineSales: number
  totalRevenue: number
  totalExpenses: number
  grossProfit: number
  netIncome: number
  sessionOutstanding: number
  pharmacyOutstanding: number
  byCategory: Array<{ category: string; total: number }>
  topMedicines: any[]
}

interface Debtor { id: string; name: string; species: string; ownerName?: string; ownerPhone?: string; outstanding: number }

export default function VetFinanceSection() {
  const toast = useToast()
  const { t } = useLanguage()
  const [range,     setRange]     = useState<{ from?: string; to?: string }>(() => rangeForPreset('month'))
  const [rangeLabel, setRangeLabel] = useState('This month')
  const [summary,   setSummary]   = useState<FinanceSummary | null>(null)
  const [debtors,   setDebtors]   = useState<Debtor[]>([])
  const [expenses,  setExpenses]  = useState<any[]>([])
  const [salesBreak, setSalesBreak] = useState<any>(null)
  const [turnover,  setTurnover]  = useState<any>(null)
  const [loading,   setLoading]   = useState(false)
  const [tab,       setTab]       = useState<'overview' | 'medicines' | 'inventory' | 'debtors' | 'expenses'>('overview')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { from, to } = range
      const [expSum, medSum, debtorRes, expList, salesBd, turn] = await Promise.all([
        window.api.vet?.expenses?.summary({ from, to }).catch(() => null),
        window.api.vet?.medicines.getSummary({ from: toStart(from), to: toEnd(to) }).catch(() => null),
        window.api.vet?.patients?.getDebtors({ skip: 0, take: 500 }).catch(() => ({ data: [] })),
        window.api.vet?.expenses?.getAll({ from, to, skip: 0, take: 500 }).catch(() => ({ data: [] })),
        window.api.vet?.stats.salesBreakdown({ from: toStart(from), to: toEnd(to) }).catch(() => null),
        window.api.vet?.stats.inventoryTurnover({ from: toStart(from), to: toEnd(to) }).catch(() => null),
      ])

      const clinicalRevenue   = Number(expSum?.revenue)   || 0
      const clinicalCollected = Number(expSum?.collected) || 0
      const medicineRevenue   = Number(medSum?.revenue)     || 0
      const medicineCost      = Number(medSum?.costOfGoods) || 0
      const medicineProfit    = Number(medSum?.grossProfit) || (medicineRevenue - medicineCost)
      const medicineSales     = Number(medSum?.saleCount)   || 0
      const totalRevenue      = clinicalRevenue + medicineRevenue
      const totalExpenses     = Number(expSum?.totalExpenses) || 0
      const grossProfit       = clinicalRevenue + medicineProfit

      const debtorRows = (debtorRes as any)?.data ?? []
      const sessionOutstanding = debtorRows.reduce((s: number, d: any) => s + (Number(d.outstanding) || 0), 0)

      setSummary({
        clinicalRevenue, clinicalCollected, medicineRevenue, medicineCost, medicineProfit, medicineSales,
        totalRevenue, totalExpenses, grossProfit,
        netIncome:           grossProfit - totalExpenses,
        sessionOutstanding,
        pharmacyOutstanding: Number(medSum?.pharmacyOutstanding) || 0,
        byCategory:          normalizeByCategory(expSum?.byCategory),
        topMedicines:        medSum?.topMedicines ?? [],
      })

      setDebtors(
        debtorRows
          .map((d: any) => ({ id: d.id, name: d.name, species: d.species, ownerName: d.ownerName, ownerPhone: d.ownerPhone, outstanding: Number(d.outstanding) || 0 }))
          .sort((a: Debtor, b: Debtor) => b.outstanding - a.outstanding)
      )
      setExpenses((expList as any)?.data ?? [])
      setSalesBreak(salesBd ?? null)
      setTurnover(turn ?? null)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load finance data')
    } finally {
      setLoading(false)
    }
  }, [range.from, range.to])

  useEffect(() => { load() }, [load])

  const TABS = [
    { key: 'overview' as const, label: t('overview')  || 'Overview',  icon: BarChart3 },
    { key: 'medicines' as const, label: t('vetStoreSales') || 'Store & Medicines', icon: Pill },
    { key: 'inventory' as const, label: t('vetTurnover') || 'Inventory & Turnover', icon: Activity },
    { key: 'debtors'  as const, label: t('vetDebtors') || 'Debtors',   icon: Users },
    { key: 'expenses' as const, label: t('vetExpenses') || 'Expenses', icon: Receipt },
  ]

  const grossMarginPct = summary && summary.totalRevenue > 0
    ? (summary.grossProfit / summary.totalRevenue) * 100
    : 0
  const collectionRate = summary && summary.clinicalRevenue > 0
    ? (summary.clinicalCollected / summary.clinicalRevenue) * 100
    : 0
  const receivables = summary ? summary.sessionOutstanding + summary.pharmacyOutstanding : 0

  const kpiCards = summary ? [
    { label: t('vetTotalRevenue') || 'Total Revenue', value: fmt(summary.totalRevenue), icon: TrendingUp,   color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/40' },
    { label: `${t('vetGrossProfit') || 'Gross Profit'} (${grossMarginPct.toFixed(0)}%)`, value: fmt(summary.grossProfit), icon: Banknote, color: summary.grossProfit >= 0 ? 'text-blue-600' : 'text-red-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800/40' },
    { label: t('vetExpenses') || 'Expenses', value: fmt(summary.totalExpenses), icon: TrendingDown, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800/40' },
    { label: t('vetNetIncome') || 'Net Income', value: fmt(summary.netIncome), icon: Receipt, color: summary.netIncome >= 0 ? 'text-teal-600' : 'text-red-600', bg: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-200 dark:border-teal-800/40' },
    { label: `${t('vetCollectionRate') || 'Collection'} (${collectionRate.toFixed(0)}%)`, value: fmt(summary.clinicalCollected), icon: Activity, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-800/40' },
    { label: t('vetReceivables') || 'Receivables', value: fmt(receivables), icon: Wallet, color: receivables > 0 ? 'text-amber-600' : 'text-slate-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800/40' },
  ] : []

  function handleExport() {
    if (!summary) return
    const rows: (string | number)[][] = [
      ['Vet Finance Report', rangeLabel],
      [],
      ['Line', 'Amount'],
      ['Clinical revenue', summary.clinicalRevenue.toFixed(2)],
      ['Medicine revenue', summary.medicineRevenue.toFixed(2)],
      ['Total revenue', summary.totalRevenue.toFixed(2)],
      ['Medicine COGS', (-summary.medicineCost).toFixed(2)],
      ['Gross profit', summary.grossProfit.toFixed(2)],
      ['Total expenses', (-summary.totalExpenses).toFixed(2)],
      ['Net income', summary.netIncome.toFixed(2)],
      ['Clinical collected', summary.clinicalCollected.toFixed(2)],
      ['Collection rate %', collectionRate.toFixed(1) + '%'],
      ['Session receivables', summary.sessionOutstanding.toFixed(2)],
      ['Pharmacy receivables', summary.pharmacyOutstanding.toFixed(2)],
      ['Total receivables', receivables.toFixed(2)],
      [],
      ['Expense Breakdown'],
      ['Category', 'Amount'],
      ...summary.byCategory.map(c => [getCatLabel(c.category), c.total.toFixed(2)]),
      [],
      ['Debtors (patients with outstanding sessions)'],
      ['Patient', 'Owner', 'Outstanding'],
      ...debtors.map(d => [d.name, d.ownerName ?? '', d.outstanding.toFixed(2)]),
    ]
    downloadCSV(rows, `vet-finance-${range.from ?? 'all'}_${range.to ?? 'all'}.csv`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800/40">
            <PawPrint size={20} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('vetFinanceTitle') || 'Vet Clinic — Finance'}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('vetFinanceSubtitle') || 'Revenue, profit, receivables and expenses'} · {rangeLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <VetPeriodFilter compact defaultPreset="month"
            presets={['today', 'week', 'month', 'year', 'custom']}
            onChange={(r) => {
              setRange({ from: r.from, to: r.to })
              setRangeLabel(r.preset === 'custom'
                ? `${r.from ?? '…'} → ${r.to ?? '…'}`
                : (r.preset.charAt(0).toUpperCase() + r.preset.slice(1)))
            }} />
          <button onClick={handleExport} disabled={loading || !summary}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50">
            <Download size={14} /> {t('exportCSV') || 'Export CSV'}
          </button>
          <button onClick={load} disabled={loading}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading && !summary ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-violet-500" /></div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {kpiCards.map(({ label, value, icon: Icon, color, bg, border }) => (
              <div key={label} className={`rounded-xl border p-4 ${bg} ${border}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} className={color} />
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</span>
                </div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Inner tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 gap-1">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${tab === key ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {/* Overview tab */}
          {tab === 'overview' && summary && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Expense breakdown */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                  <Receipt size={14} className="text-red-500" /> Expense Breakdown
                </h3>
                {summary.byCategory.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No expenses this period</p>
                ) : (
                  <div className="space-y-3">
                    {summary.byCategory.map(({ category: cat, total }) => {
                      const max = Math.max(...summary.byCategory.map(x => x.total))
                      const pct = max > 0 ? (total / max) * 100 : 0
                      return (
                        <div key={cat}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-600 dark:text-slate-300">{getCatLabel(cat)}</span>
                            <span className="font-semibold text-red-600 dark:text-red-400">{fmt(total)}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Income statement + revenue composition */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                  <Activity size={14} className="text-violet-500" /> {t('vetIncomeStatement') || 'Income Statement'}
                </h3>

                {/* Revenue composition bar */}
                {summary.totalRevenue > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span>{t('vetRevenueMix') || 'Revenue mix'}</span>
                      <span>{t('vetTotalRevenue') || 'Total'}: {fmt(summary.totalRevenue)}</span>
                    </div>
                    <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
                      <div className="bg-emerald-500 h-full" style={{ width: `${(summary.clinicalRevenue / summary.totalRevenue) * 100}%` }} title="Clinical" />
                      <div className="bg-violet-500 h-full" style={{ width: `${(summary.medicineRevenue / summary.totalRevenue) * 100}%` }} title="Medicine" />
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-[11px]">
                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {t('vetClinical') || 'Clinical'} {fmt(summary.clinicalRevenue)}</span>
                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><span className="h-2 w-2 rounded-full bg-violet-500" /> {t('vetMedicine') || 'Medicine'} {fmt(summary.medicineRevenue)}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  {[
                    { label: t('vetClinicalRevenue') || 'Clinical Revenue',     value: summary.clinicalRevenue,  color: 'text-emerald-600' },
                    { label: `${t('vetMedicineRevenue') || 'Medicine Revenue'} (${summary.medicineSales})`, value: summary.medicineRevenue, color: 'text-violet-600' },
                    { label: t('vetTotalRevenue') || 'Total Revenue',           value: summary.totalRevenue,     color: 'text-blue-600', bold: true },
                    { label: t('vetMedicineCogs') || 'Medicine COGS',           value: -summary.medicineCost,    color: 'text-orange-500' },
                    { label: `${t('vetGrossProfit') || 'Gross Profit'} (${grossMarginPct.toFixed(0)}%)`, value: summary.grossProfit, color: 'text-blue-600', bold: true },
                    { label: t('vetTotalExpenses') || 'Total Expenses',         value: -summary.totalExpenses,   color: 'text-red-500' },
                    { label: t('vetNetIncome') || 'Net Income',                 value: summary.netIncome,        color: summary.netIncome >= 0 ? 'text-teal-600' : 'text-red-600', bold: true },
                  ].map(({ label, value, color, bold }) => (
                    <div key={label} className={`flex justify-between items-center py-1.5 ${bold ? 'border-t border-slate-200 dark:border-slate-700 font-semibold' : ''}`}>
                      <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
                      <span className={`text-sm font-semibold ${color} tabular-nums`}>
                        {value < 0 ? `-${fmt(-value)}` : fmt(value)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center py-1.5 mt-1 border-t border-dashed border-slate-200 dark:border-slate-700">
                    <span className="text-xs text-slate-400">{t('vetCollectionRate') || 'Collection rate (clinical)'}</span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{collectionRate.toFixed(0)}% · {fmt(summary.clinicalCollected)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-xs text-slate-400">{t('vetReceivables') || 'Receivables'} ({t('vetSessions') || 'sessions'} + {t('vetPharmacy') || 'pharmacy'})</span>
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{fmt(receivables)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Store & Medicines tab */}
          {tab === 'medicines' && summary && (
            <div className="space-y-5">
              {/* Medicine KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  { label: t('vetMedicineRevenue') || 'Medicine revenue', value: fmt(summary.medicineRevenue), color: 'text-emerald-600 dark:text-emerald-400' },
                  { label: t('vetMedicineCogs') || 'COGS', value: fmt(summary.medicineCost), color: 'text-orange-500 dark:text-orange-400' },
                  { label: t('vetGrossProfit') || 'Gross profit', value: fmt(summary.medicineProfit), color: summary.medicineProfit >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500' },
                  { label: t('vetMargin') || 'Margin', value: `${summary.medicineRevenue > 0 ? ((summary.medicineProfit / summary.medicineRevenue) * 100).toFixed(1) : '0'}%`, color: 'text-violet-600 dark:text-violet-400' },
                  { label: t('vetSalesTab') || 'Sales', value: String(summary.medicineSales), color: 'text-slate-600 dark:text-slate-300' },
                ].map(c => (
                  <div key={c.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{c.label}</span>
                    <p className={`text-xl font-bold mt-1 ${c.color}`}>{c.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top medicines */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                    <Pill size={14} className="text-violet-500" /> {t('vetTopMedicines') || 'Top medicines by revenue'}
                  </h3>
                  {summary.topMedicines.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8">{t('vetNoSales') || 'No sales this period'}</p>
                  ) : (
                    <div className="space-y-3">
                      {summary.topMedicines.slice(0, 8).map((m: any) => {
                        const max = Math.max(...summary.topMedicines.map((x: any) => Number(x.revenue) || 0))
                        const pct = max > 0 ? ((Number(m.revenue) || 0) / max) * 100 : 0
                        return (
                          <div key={m.id}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-600 dark:text-slate-300 truncate">{m.name} <span className="text-slate-400">· {m.saleCount}</span></span>
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(m.revenue)}</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Sales by category */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                    <BarChart3 size={14} className="text-emerald-500" /> {t('vetSalesByCategory') || 'Sales by category'}
                  </h3>
                  {!Array.isArray(salesBreak?.byCategory) || salesBreak.byCategory.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8">{t('vetNoSales') || 'No sales this period'}</p>
                  ) : (
                    <div className="space-y-3">
                      {salesBreak.byCategory.slice(0, 8).map((c: any) => {
                        const max = Math.max(...salesBreak.byCategory.map((x: any) => Number(x.revenue) || 0))
                        const pct = max > 0 ? ((Number(c.revenue) || 0) / max) * 100 : 0
                        return (
                          <div key={c.category}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-600 dark:text-slate-300 capitalize">{c.category}</span>
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(c.revenue)}
                                <span className="ml-1 text-[10px] text-blue-500">+{fmt(c.profit)} {t('vetProfit') || 'profit'}</span>
                              </span>
                            </div>
                            <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Inventory & Turnover tab */}
          {tab === 'inventory' && (
            <div className="space-y-5">
              {!turnover ? (
                <p className="text-xs text-slate-400 text-center py-8">{t('vetNoData') || 'No inventory data'}</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                      { label: t('vetStockValue') || 'Stock value', value: fmt(turnover.overall.stockValue), sub: '', color: 'text-emerald-600 dark:text-emerald-400' },
                      { label: t('vetTurnoverRatio') || 'Turnover / yr', value: `${(Number(turnover.overall.turnover) || 0).toFixed(1)}×`, sub: '', color: 'text-violet-600 dark:text-violet-400' },
                      { label: t('vetDaysOnHand') || 'Days on hand', value: turnover.overall.daysOnHand != null ? Math.round(turnover.overall.daysOnHand).toString() : '∞', sub: '', color: 'text-blue-600 dark:text-blue-400' },
                      { label: t('vetDeadStock') || 'Dead stock', value: fmt(turnover.overall.deadStockValue), sub: `${turnover.overall.deadStockCount} ${t('vetItems') || 'items'}`, color: turnover.overall.deadStockValue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400' },
                      { label: t('vetExpiringValue') || 'Expiring (30d)', value: fmt(turnover.overall.expiringValue), sub: '', color: turnover.overall.expiringValue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400' },
                      { label: t('vetExpiredValue') || 'Expired', value: fmt(turnover.overall.expiredValue), sub: '', color: turnover.overall.expiredValue > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400' },
                    ].map(c => (
                      <div key={c.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{c.label}</span>
                        <p className={`text-lg font-bold mt-1 ${c.color}`}>{c.value}</p>
                        {c.sub && <p className="text-[10px] text-slate-400">{c.sub}</p>}
                      </div>
                    ))}
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('vetTurnoverByMedicine') || 'Turnover by medicine'}</span>
                      <span className="text-[11px] text-slate-400 ml-2">{t('vetTurnoverHint') || 'fastest movers first · dead stock last'}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400">
                            {[t('vetMedicine') || 'Medicine', t('vetStockValue') || 'Stock value', 'COGS', t('vetUnitsSold') || 'Units sold', t('vetTurnoverRatio') || 'Turnover', t('vetDaysOnHand') || 'Days', ''].map((h, i) => (
                              <th key={i} className={`px-4 py-2 font-medium whitespace-nowrap ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {turnover.items.slice(0, 60).map((m: any) => (
                            <tr key={m.id} className={`hover:bg-slate-50/60 dark:hover:bg-slate-700/20 ${m.dead ? 'bg-amber-50/40 dark:bg-amber-900/10' : ''}`}>
                              <td className="px-4 py-2 text-slate-800 dark:text-slate-200">{m.name}</td>
                              <td className="px-4 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">{fmt(m.stockValue)}</td>
                              <td className="px-4 py-2 text-right tabular-nums text-orange-500">{fmt(m.cogs)}</td>
                              <td className="px-4 py-2 text-right tabular-nums text-slate-500">{(Number(m.unitsSold) || 0).toFixed(1)}</td>
                              <td className="px-4 py-2 text-right tabular-nums font-semibold text-violet-600 dark:text-violet-400">{(Number(m.turnover) || 0).toFixed(1)}×</td>
                              <td className="px-4 py-2 text-right tabular-nums text-blue-600 dark:text-blue-400">{m.daysOnHand != null ? Math.round(m.daysOnHand) : '∞'}</td>
                              <td className="px-4 py-2 text-right">
                                {m.dead && m.stockValue > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{t('vetDead') || 'dead'}</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Debtors tab */}
          {tab === 'debtors' && summary && (
            <div className="space-y-4">
              {/* Receivables split */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: t('vetSessionReceivables') || 'Session receivables', value: summary.sessionOutstanding, icon: Activity, color: 'text-teal-600 dark:text-teal-400' },
                  { label: t('vetPharmacyReceivables') || 'Pharmacy receivables', value: summary.pharmacyOutstanding, icon: Pill, color: 'text-violet-600 dark:text-violet-400' },
                  { label: t('vetTotalReceivables') || 'Total receivables', value: receivables, icon: Wallet, color: 'text-amber-600 dark:text-amber-400' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon size={15} className={color} />
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
                    </div>
                    <p className={`text-xl font-bold ${color}`}>{fmt(value)}</p>
                  </div>
                ))}
              </div>

              {debtors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <AlertCircle size={36} className="mb-2 opacity-30" />
                  <p className="text-sm font-medium">{t('vetNoSessionDebtors') || 'No patients with outstanding sessions'}</p>
                  {summary.pharmacyOutstanding > 0 && (
                    <p className="text-xs mt-1">{t('vetPharmacyOwedNote') || 'Pharmacy balances are settled from owner profiles.'}</p>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {debtors.length} {t('vetPatientsOutstanding') || 'patient(s) with outstanding sessions'}
                    </span>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {t('total') || 'Total'}: {fmt(debtors.reduce((s, d) => s + d.outstanding, 0))}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-[28rem] overflow-y-auto">
                    {debtors.map(d => (
                      <div key={d.id} className="flex items-center gap-4 px-5 py-3">
                        <PawPrint size={14} className="text-violet-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{d.name} <span className="text-xs text-slate-400 capitalize">· {d.species}</span></p>
                          {d.ownerName && (
                            <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                              {d.ownerName}{d.ownerPhone ? <><Phone size={9} className="inline" /> {d.ownerPhone}</> : null}
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">{fmt(d.outstanding)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Expenses tab */}
          {tab === 'expenses' && (
            expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Receipt size={36} className="mb-2 opacity-30" />
                <p className="text-sm font-medium">No expenses this period</p>
                <p className="text-xs mt-1">Record expenses in the Vet → Expenses tab</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {expenses.slice(0, 100).map((exp: any) => (
                    <div key={exp.id} className="flex items-center gap-4 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{exp.description}</p>
                        <p className="text-xs text-slate-400">{getCatLabel(exp.category)} · {new Date(exp.date).toLocaleDateString()}</p>
                      </div>
                      <span className="text-sm font-semibold text-red-600 dark:text-red-400 tabular-nums">{fmt(exp.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <span className="text-xs text-slate-400">{expenses.length} records</span>
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">
                    Total: {fmt(expenses.reduce((s: number, e: any) => s + Number(e.amount), 0))}
                  </span>
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}