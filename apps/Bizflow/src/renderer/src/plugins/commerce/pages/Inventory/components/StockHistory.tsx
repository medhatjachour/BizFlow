import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  History,
  Package,
  RefreshCw,
  RotateCcw,
  Search,
  TrendingDown,
  TrendingUp
} from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import logger from '@/shared/utils/logger'

type StockMovement = {
  id: string
  type: string
  quantity: number
  previousStock: number
  newStock: number
  reason?: string
  notes?: string
  createdAt: string
  product: { name: string; sku: string }
  user?: { username: string; fullName?: string } | null
}

const MOVEMENT_TYPES = {
  RESTOCK: {
    key: 'restock',
    labelKey: 'inventoryUiRestock',
    icon: TrendingUp,
    style: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900'
  },
  SALE: {
    key: 'saleType',
    labelKey: 'inventoryUiSale',
    icon: TrendingDown,
    style: 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900'
  },
  ADJUSTMENT: {
    key: 'adjustmentType',
    labelKey: 'inventoryUiAdjustment',
    icon: Activity,
    style: 'text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-900'
  },
  SHRINKAGE: {
    key: 'shrinkageType',
    labelKey: 'inventoryUiShrinkage',
    icon: AlertTriangle,
    style: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900'
  },
  RETURN: {
    key: 'returnType',
    labelKey: 'inventoryUiReturn',
    icon: RotateCcw,
    style: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900'
  }
} as const

export default function StockHistory() {
  const { t } = useLanguage()
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    void loadMovements()
  }, [filter, debouncedSearch])

  async function loadMovements() {
    try {
      setLoading(true)
      setError(null)
      const options: { limit: number; type?: string; search?: string } = { limit: 50 }
      if (filter !== 'all') options.type = filter
      if (debouncedSearch) options.search = debouncedSearch

      const data = await (window as any).api?.analytics?.getAllStockMovements(options)
      setMovements(data || [])
    } catch (loadError) {
      logger.error('Error loading stock movements:', loadError)
      setMovements([])
      setError(t('inventoryUiHistoryLoadError'))
    } finally {
      setLoading(false)
    }
  }

  const summary = useMemo(() => {
    return Object.entries(MOVEMENT_TYPES).map(([type, config]) => {
      const matching = movements.filter((movement) => movement.type === type)
      return {
        type,
        config,
        count: matching.length,
        units: matching.reduce((sum, movement) => sum + Math.abs(movement.quantity), 0)
      }
    })
  }, [movements])

  const unitsAdded = movements
    .filter((movement) => movement.quantity > 0)
    .reduce((sum, movement) => sum + movement.quantity, 0)
  const unitsRemoved = movements
    .filter((movement) => movement.quantity < 0)
    .reduce((sum, movement) => sum + Math.abs(movement.quantity), 0)

  const movementConfig = (type: string) =>
    MOVEMENT_TYPES[type as keyof typeof MOVEMENT_TYPES] || MOVEMENT_TYPES.ADJUSTMENT

  return (
    <div className="max-w-[1600px] mx-auto space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900 text-violet-600 dark:text-violet-400 flex items-center justify-center">
            <History size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-950 dark:text-white">{t('stockMovementHistory')}</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('inventoryUiHistoryDescription')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadMovements()}
          disabled={loading}
          className="self-start lg:self-auto h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 inline-flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:border-slate-400 disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {t('inventoryUiRefreshLedger')}
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
        <div className="flex flex-col xl:flex-row xl:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder={t('searchByProductNameOrSKU')}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10"
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto" aria-label={t('inventoryUiMovementType')}>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`h-8 px-3 rounded-md text-[10px] font-bold whitespace-nowrap ${filter === 'all' ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              {t('inventoryUiAllMovements')}
            </button>
            {Object.entries(MOVEMENT_TYPES).map(([type, config]) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilter(type)}
                className={`h-8 px-3 rounded-md inline-flex items-center gap-1.5 text-[10px] font-bold whitespace-nowrap ${filter === type ? config.style + ' border' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                <config.icon size={12} />
                {t(config.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300"><AlertTriangle size={15} />{error}</div>
          <button type="button" onClick={() => void loadMovements()} className="text-[11px] font-bold text-rose-700 dark:text-rose-300">{t('inventoryUiRetry')}</button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-7 gap-2">
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-3">
          <ArrowUpRight size={14} className="text-emerald-600 mb-2" />
          <p className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300">+{unitsAdded.toLocaleString()}</p>
          <p className="text-[9px] font-bold uppercase text-emerald-600 dark:text-emerald-400">{t('inventoryUiUnitsAdded')}</p>
        </div>
        <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-3">
          <ArrowDownRight size={14} className="text-rose-600 mb-2" />
          <p className="text-lg font-bold tabular-nums text-rose-700 dark:text-rose-300">-{unitsRemoved.toLocaleString()}</p>
          <p className="text-[9px] font-bold uppercase text-rose-600 dark:text-rose-400">{t('inventoryUiUnitsRemoved')}</p>
        </div>
        {summary.map(({ type, config, count, units }) => (
          <div key={type} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
            <config.icon size={14} className="text-slate-400 mb-2" />
            <div className="flex items-end justify-between gap-1">
              <div><p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{count}</p><p className="text-[9px] font-bold uppercase text-slate-400">{t(config.labelKey)}</p></div>
              <span className="text-[9px] text-slate-400 whitespace-nowrap">{units} {t('inventoryUiUnits')}</span>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden animate-pulse">
          <div className="h-10 bg-slate-100 dark:bg-slate-800" />
          {[1, 2, 3, 4, 5, 6].map((row) => <div key={row} className="h-14 border-t border-slate-100 dark:border-slate-800" />)}
        </div>
      ) : movements.length === 0 && !error ? (
        <div className="min-h-72 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center justify-center text-center px-6">
          <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3"><Package size={22} className="text-slate-400" /></div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('noStockMovementsYet')}</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{searchTerm || filter !== 'all' ? t('inventoryUiNoLedgerMatches') : t('stockMovementsWillAppear')}</p>
        </div>
      ) : movements.length > 0 ? (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div><h3 className="text-xs font-bold text-slate-900 dark:text-white">{t('inventoryUiMovementLedger')}</h3><p className="text-[10px] text-slate-500">{t('inventoryUiMovementLedgerDescription')}</p></div>
            <span className="text-[10px] font-semibold text-slate-400">{movements.length} {t('inventoryUiEntries')}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <tr className="text-[9px] font-bold uppercase text-slate-500">
                  <th className="px-4 py-2.5">{t('inventoryUiDateTime')}</th><th className="px-4 py-2.5">{t('Product')}</th><th className="px-4 py-2.5">{t('inventoryUiMovement')}</th><th className="px-4 py-2.5 text-right">{t('inventoryUiQuantity')}</th><th className="px-4 py-2.5 text-right">{t('inventoryUiBalance')}</th><th className="px-4 py-2.5">{t('inventoryUiOperator')}</th><th className="px-4 py-2.5">{t('inventoryUiAuditNote')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {movements.map((movement) => {
                  const config = movementConfig(movement.type)
                  const MovementIcon = config.icon
                  return (
                    <tr key={movement.id} className="hover:bg-violet-50/30 dark:hover:bg-violet-950/10 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap"><p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{new Date(movement.createdAt).toLocaleDateString()}</p><p className="text-[9px] text-slate-400">{new Date(movement.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></td>
                      <td className="px-4 py-3"><p className="text-xs font-bold text-slate-900 dark:text-white max-w-[220px] truncate">{movement.product.name}</p><p className="text-[9px] font-mono text-slate-400">{movement.product.sku}</p></td>
                      <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-bold ${config.style}`}><MovementIcon size={11} />{t(config.labelKey)}</span></td>
                      <td className={`px-4 py-3 text-right text-xs font-bold tabular-nums ${movement.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{movement.quantity > 0 ? '+' : ''}{movement.quantity}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap"><span className="text-[10px] text-slate-400">{movement.previousStock}</span><span className="mx-1.5 text-slate-300">→</span><span className="text-xs font-bold text-slate-900 dark:text-white">{movement.newStock}</span></td>
                      <td className="px-4 py-3 text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">{movement.user?.fullName || movement.user?.username || t('systemUser')}</td>
                      <td className="px-4 py-3 text-[10px] text-slate-500 dark:text-slate-400 max-w-[260px] truncate" title={movement.notes || movement.reason}>{movement.notes || movement.reason || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}