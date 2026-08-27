import { useState, useEffect, useCallback } from 'react'
import {
  Search, X, Calendar, Loader2, Receipt, TrendingUp, DollarSign, BarChart2, AlertCircle,
  ChevronLeft, ChevronRight, Layers, List, SlidersHorizontal,
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import DateField from '@renderer/components/DateField'
import type { Sale, SaleGroup } from './vetSales.types'
import { PAGE_SIZE } from './vetSales.shared'
import SaleRow from './SaleRow'
import SaleGroupRow from './SaleGroupRow'
import EditSaleModal from './EditSaleModal'
import RefundModal from './RefundModal'

const api = (window as any).api?.vet?.medicines

// ── Sales History ─────────────────────────────────────────────────────────────

export function SalesHistory() {
  const toast = useToast()
  const { t } = useLanguage()
  const [viewMode, setViewMode] = useState<'grouped' | 'individual'>('grouped')
  const [sales, setSales]       = useState<Sale[]>([])
  const [groups, setGroups]     = useState<SaleGroup[]>([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [search, setSearch]   = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [preset, setPreset]   = useState<'today' | 'week' | 'month' | ''>('')
  const [page, setPage]       = useState(1)
  const [catFilter, setCatFilter] = useState('all')
  const [catOptions, setCatOptions] = useState<string[]>(['all'])
  const [editTarget, setEditTarget] = useState<Sale | null>(null)
  const [refundTarget, setRefundTarget] = useState<{ kind: 'sale'; sale: Sale } | { kind: 'group'; group: SaleGroup } | null>(null)
  // Collapsible sections — remembered so the table can stay the focus.
  const [showFilters, setShowFilters] = useState<boolean>(() => { try { return localStorage.getItem('vet_sales_showFilters') !== '0' } catch { return true } })
  const [showStats, setShowStats]     = useState<boolean>(() => { try { return localStorage.getItem('vet_sales_showStats') === '1' } catch { return false } })
  useEffect(() => { try { localStorage.setItem('vet_sales_showFilters', showFilters ? '1' : '0') } catch {} }, [showFilters])
  useEffect(() => { try { localStorage.setItem('vet_sales_showStats', showStats ? '1' : '0') } catch {} }, [showStats])

  useEffect(() => {
    ;(window as any).api?.vet?.medicineCategories?.getAll()
      .then((rows: { name: string }[]) => setCatOptions(['all', ...(rows ?? []).map((r: { name: string }) => r.name)]))
      .catch(() => {})
  }, [])

  function handleDateFrom(v: string) { setDateFrom(v); setPreset(''); setPage(1) }
  function handleDateTo(v: string)   { setDateTo(v);   setPreset(''); setPage(1) }

  function applyPreset(p: 'today' | 'week' | 'month') {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
    const today = fmt(now)
    if (p === 'today') { setDateFrom(today); setDateTo(today) }
    else if (p === 'week') {
      const w = new Date(now); w.setDate(now.getDate() - 6)
      setDateFrom(fmt(w)); setDateTo(today)
    } else {
      const m = new Date(now); m.setDate(now.getDate() - 29)
      setDateFrom(fmt(m)); setDateTo(today)
    }
    setPreset(p); setPage(1)
  }

  function clearFilters() { setDateFrom(''); setDateTo(''); setSearch(''); setDebouncedSearch(''); setPreset(''); setCatFilter('all'); setPage(1) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const common = {
        from: dateFrom || undefined,
        to:   dateTo   || undefined,
        search:   debouncedSearch.trim() || undefined,
        category: catFilter !== 'all' ? catFilter : undefined,
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
      }
      if (viewMode === 'grouped') {
        const res = await api.getSaleGroups(common)
        setGroups(res.data ?? [])
        setTotal(res.total ?? 0)
      } else {
        const res = await api.getSales(common)
        setSales(res.data ?? [])
        setTotal(res.total ?? 0)
      }
    } catch (err: any) { toast.error(err?.message ?? 'Failed to load sales') }
    finally { setLoading(false) }
  }, [dateFrom, dateTo, debouncedSearch, catFilter, page, viewMode])

  useEffect(() => { load() }, [load])

  // Debounce the free-text search before hitting the backend.
  useEffect(() => {
    const id = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300)
    return () => clearTimeout(id)
  }, [search])

  function switchMode(m: 'grouped' | 'individual') { if (m !== viewMode) { setViewMode(m); setPage(1) } }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilters = !!(dateFrom || dateTo || search || catFilter !== 'all')
  const activeFilterCount = (dateFrom || dateTo ? 1 : 0) + (catFilter !== 'all' ? 1 : 0)

  // Filtering happens server-side now; render the loaded page as-is.
  const displayed = sales
  const displayedGroups = groups

  const revenue = viewMode === 'grouped'
    ? displayedGroups.reduce((sum, g) => sum + g.total, 0)
    : displayed.reduce((sum, s) => sum + s.totalPrice, 0)
  const totalCogs = viewMode === 'grouped'
    ? displayedGroups.reduce((sum, g) => sum + g.cost, 0)
    : displayed.reduce((sum, s) => {
        const qty = s.saleUnit === 'sub' && s.medicine?.subUnit
          ? s.quantity / (s.medicine?.subUnitsPerContainer ?? 1)
          : s.quantity
        return sum + (s.costTotal ?? qty * (s.batch?.costPerUnit ?? 0))
      }, 0)
  const grossProfit = revenue - totalCogs
  const outstanding = viewMode === 'grouped'
    ? displayedGroups.reduce((sum, g) => sum + g.remaining, 0)
    : displayed.reduce((sum, s) => { const paid = s.amountPaid ?? s.totalPrice; return sum + Math.max(0, s.totalPrice - paid) }, 0)
  const isEmpty = viewMode === 'grouped' ? displayedGroups.length === 0 : displayed.length === 0

  function pageNumbers() {
    const pages: number[] = []
    let start = Math.max(1, page - 2)
    const end  = Math.min(totalPages, start + 4)
    start = Math.max(1, end - 4)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

      {/* Compact toolbar — always visible so the sales table stays the focus */}
      <div className="px-5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder={t('vetSearchSales')||'Search medicine or customer…'}
            className="pl-8 pr-7 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] w-44 sm:w-56" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={12} /></button>
          )}
        </div>

        {/* Quick date presets (always handy) */}
        <div className="hidden md:flex gap-1">
          {(['today', 'week', 'month'] as const).map(p => (
            <button key={p} onClick={() => applyPreset(p)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors
                ${preset === p
                  ? 'bg-violet-600 text-white'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-violet-400 dark:hover:border-violet-600'}`}>
              {p === 'today' ? (t('vetToday')||'Today') : p === 'week' ? (t('vetThisWeek')||'Week') : (t('vetThisMonth')||'Month')}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Grouped / Individual view toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button onClick={() => switchMode('grouped')}
              title={t('vetViewGroupedHint') || 'Show items grouped by transaction'}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors
                ${viewMode === 'grouped' ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
              <Layers className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t('vetViewGrouped') || 'Grouped'}</span>
            </button>
            <button onClick={() => switchMode('individual')}
              title={t('vetViewIndividualHint') || 'Show every item on its own line'}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors
                ${viewMode === 'individual' ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
              <List className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t('vetViewIndividual') || 'Individual'}</span>
            </button>
          </div>

          {/* Filters toggle */}
          <button onClick={() => setShowFilters(v => !v)} title={t('vetToggleFilters') || 'Show / hide filters'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors
              ${showFilters
                ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-violet-400'}`}>
            <SlidersHorizontal className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t('vetFilters') || 'Filters'}</span>
            {activeFilterCount > 0 && <span className="px-1 min-w-[16px] text-center text-[9px] font-black rounded-full bg-violet-600 text-white">{activeFilterCount}</span>}
          </button>

          {/* Stats toggle */}
          <button onClick={() => setShowStats(v => !v)} title={t('vetToggleStats') || 'Show / hide stats'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors
              ${showStats
                ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-violet-400'}`}>
            <BarChart2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t('vetStats') || 'Stats'}</span>
          </button>
        </div>
      </div>

      {/* Filters (collapsible) */}
      {showFilters && (
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 shrink-0 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
              <DateField value={dateFrom} onChange={handleDateFrom} wrapperClassName="w-40"
                className="px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)]" />
              <span className="text-slate-400">–</span>
              <DateField value={dateTo} onChange={handleDateTo} wrapperClassName="w-40"
                className="px-2.5 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)]" />
            </div>
            {/* presets again here for small screens where they're hidden above */}
            <div className="flex md:hidden gap-1">
              {(['today', 'week', 'month'] as const).map(p => (
                <button key={p} onClick={() => applyPreset(p)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors
                    ${preset === p ? 'bg-violet-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-violet-400'}`}>
                  {p === 'today' ? (t('vetToday')||'Today') : p === 'week' ? (t('vetThisWeek')||'Week') : (t('vetThisMonth')||'Month')}
                </button>
              ))}
            </div>
            {hasFilters && (
              <button onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="h-3 w-3" /> {t('vetClearFilters')||'Clear filters'}
              </button>
            )}
          </div>
          {/* Category filter row */}
          {catOptions.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">Category:</span>
              {catOptions.map(c => (
                <button key={c} onClick={() => { setCatFilter(c); setPage(1) }}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-md capitalize transition-colors
                    ${catFilter === c ? 'bg-violet-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-600'}`}>
                  {c === 'all' ? (t('vetFilterAll')||'All') : c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* KPI row (collapsible) */}
      {showStats && (
        <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 shrink-0">
          {([
              { label: viewMode === 'grouped' ? (t('vetTransactions')||'Transactions') : (t('vetTotalSales')||'Total Sales'), val: String(total), icon: Receipt, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' },
              { label: t('vetRevenue')||'Revenue',       val: `$${revenue.toFixed(2)}`,   icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
              { label: t('vetCOGS')||'COGS',          val: `$${totalCogs.toFixed(2)}`,  icon: DollarSign, color: 'text-orange-600 dark:text-orange-400',  bg: 'bg-orange-50 dark:bg-orange-900/20' },
              { label: t('vetGrossProfit')||'Gross Profit',  val: `$${grossProfit.toFixed(2)}`, icon: BarChart2,  color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-900/20' },
              { label: t('vetOutstanding')||'Outstanding',  val: `$${outstanding.toFixed(2)}`,icon: AlertCircle, color: outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400', bg: outstanding > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-100 dark:bg-slate-800' },
          ]).map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl px-4 py-3 flex items-center gap-3`}>
              <s.icon className={`h-6 w-6 shrink-0 ${s.color}`} />
              <div className="min-w-0">
                <p className={`text-lg font-black ${s.color} leading-none truncate`}>{s.val}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto px-5">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-violet-500" /></div>
        ) : isEmpty ? (
          <div className="text-center py-16 text-slate-400">
            <Receipt className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">{t('vetNoSalesFound')||'No sales found'}</p>
            {hasFilters && <button onClick={clearFilters} className="mt-2 text-sm text-violet-600 dark:text-violet-400 hover:underline">{t('vetClearFilters')||'Clear filters'}</button>}
          </div>
        ) : viewMode === 'grouped' ? (
          /* ── Grouped transactions ── */
          <div className="space-y-2 pb-2">
            {displayedGroups.map(g => (
              <SaleGroupRow key={g.groupKey} group={g} onPaid={load}
                onEdit={(s) => setEditTarget(s)}
                onRefundItem={(s) => setRefundTarget({ kind: 'sale', sale: s })}
                onRefundGroup={(grp) => setRefundTarget({ kind: 'group', group: grp })} />
            ))}
          </div>
        ) : (
          /* ── Individual line items ── */
          <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mb-2">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50">
                    {['Date', 'Medicine', 'Batch', 'Customer', 'Qty', 'Unit Price', 'Discount', 'Total', 'COGS', 'Profit', 'Paid', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {displayed.map(s => {
                    const cogs       = s.costTotal ?? s.quantity * (s.batch?.costPerUnit ?? 0)
                    const profit     = s.grossProfit ?? (s.totalPrice - cogs)
                    const paidAmt    = s.amountPaid ?? s.totalPrice
                    const remaining  = Math.max(0, s.totalPrice - paidAmt)
                    const pstatus    = s.paymentStatus ?? (remaining > 0.005 ? 'partial' : 'paid')
                    const statusMap: Record<string, string> = {
                      paid:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
                      partial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
                      unpaid:  'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
                    }
                    return (
                    <SaleRow key={s.id} s={s} cogs={cogs} profit={profit} paidAmt={paidAmt}
                      remaining={remaining} pstatus={pstatus} statusMap={statusMap}
                      onPaid={load}
                      onEdit={() => setEditTarget(s)}
                      onRefund={() => setRefundTarget({ kind: 'sale', sale: s })} />
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="shrink-0 px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/40">
          <p className="text-xs text-slate-400">
            {t('vetPageLabel')||'Page'} <span className="font-semibold text-slate-600 dark:text-slate-300">{page}</span> {t('vetOfLabel')||'of'} <span className="font-semibold text-slate-600 dark:text-slate-300">{totalPages}</span>
             · {total} {t('vetRecordsLabel')||'records'}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={14} />
            </button>
            {pageNumbers().map(pg => (
              <button key={pg} onClick={() => setPage(pg)}
                className={`w-8 h-8 text-xs font-semibold rounded-lg transition-colors
                  ${page === pg
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'}`}>
                {pg}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {editTarget && (
        <EditSaleModal sale={editTarget} onClose={() => setEditTarget(null)} onSaved={load} />
      )}
      {refundTarget && (
        <RefundModal target={refundTarget} onClose={() => setRefundTarget(null)} onDone={load} />
      )}
    </div>
  )
}
