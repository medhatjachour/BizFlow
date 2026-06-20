/**
 * Stock Movement History Component
 * Shows all stock changes for products with filtering
 */

import { useState, useEffect } from 'react'
import { Package, TrendingUp, TrendingDown, AlertTriangle, RotateCcw, Activity } from 'lucide-react'
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
  product: {
    name: string
    sku: string
  }
  user?: {
    username: string
    fullName?: string
  } | null
}

const MOVEMENT_TYPES = {
  RESTOCK: { key: 'restock', icon: TrendingUp, color: 'text-green-600 bg-green-50' },
  SALE: { key: 'saleType', icon: TrendingDown, color: 'text-blue-600 bg-blue-50' },
  ADJUSTMENT: { key: 'adjustmentType', icon: Activity, color: 'text-purple-600 bg-purple-50' },
  SHRINKAGE: { key: 'shrinkageType', icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
  RETURN: { key: 'returnType', icon: RotateCcw, color: 'text-amber-600 bg-amber-50' }
}

export default function StockHistory() {
  const { t } = useLanguage()
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Load on mount only
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false)
      loadMovements()
    }
  }, [isInitialLoad])

  const loadMovements = async () => {
    try {
      setLoading(true)
      
      const options: any = {
        limit: 50 // Reduced from 100 for faster loading
      }
      
      if (filter !== 'all') {
        options.type = filter
      }
      
      if (debouncedSearch) {
        options.search = debouncedSearch
      }
      
      // @ts-ignore
      const data = await window.api?.analytics?.getAllStockMovements(options)
      setMovements(data || [])
    } catch (error) {
      logger.error('Error loading stock movements:', error)
      setMovements([])
    } finally {
      setLoading(false)
    }
  }

  // No client-side filtering - all done server-side now
  const filteredMovements = movements

  const getMovementIcon = (type: string) => {
    const config = MOVEMENT_TYPES[type as keyof typeof MOVEMENT_TYPES] || MOVEMENT_TYPES.ADJUSTMENT
    const Icon = config.icon
    return <Icon size={16} />
  }

  const getMovementColor = (type: string) => {
    return MOVEMENT_TYPES[type as keyof typeof MOVEMENT_TYPES]?.color || MOVEMENT_TYPES.ADJUSTMENT.color
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('stockMovementHistory')}</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {t('trackAllInventoryChanges')}
          </p>
        </div>
        <button
          onClick={loadMovements}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <RotateCcw size={16} />
          {t('refreshButton')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder={t('searchByProductNameOrSKU')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
          >
            <option value="all">{t('allTypes')}</option>
            {Object.entries(MOVEMENT_TYPES).map(([key, config]) => (
              <option key={key} value={key}>{t(config.key)}</option>
            ))}
          </select>

          {/* Apply Filter Button */}
          <button
            onClick={loadMovements}
            disabled={loading}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? t('loading') : t('applyFilterButton')}
          </button>
        </div>
      </div>

      {/* Movement List */}
      {loading ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">{t('loadingMovements')}</p>
        </div>
      ) : filteredMovements.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center shadow-sm border border-slate-200 dark:border-slate-700">
          <Package size={48} className="mx-auto text-slate-400 mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            {t('noStockMovementsYet')}
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            {t('stockMovementsWillAppear')}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('dateTimeColumn')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('productColumn')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('typeColumn')}
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('quantityColumn')}
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('stockChangeColumn')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('byColumn')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('notesColumn')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredMovements.map((movement) => (
                  <tr
                    key={movement.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                      {new Date(movement.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {movement.product.name}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 text-xs">
                        {t('sku')}: {movement.product.sku}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getMovementColor(movement.type)}`}>
                        {getMovementIcon(movement.type)}
                        {t(MOVEMENT_TYPES[movement.type as keyof typeof MOVEMENT_TYPES]?.key || 'adjustmentType')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`font-bold ${movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <span className="text-slate-500 dark:text-slate-400">
                        {movement.previousStock} → {movement.newStock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                      {movement.user?.fullName || movement.user?.username || t('systemUser')}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {movement.notes || movement.reason || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(MOVEMENT_TYPES).map(([key, config]) => {
          const count = movements.filter(m => m.type === key).length
          const total = movements.filter(m => m.type === key).reduce((sum, m) => sum + Math.abs(m.quantity), 0)
          
          return (
            <div
              key={key}
              className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700"
            >
              <div className={`inline-flex p-2 rounded-lg mb-2 ${config.color}`}>
                <config.icon size={20} />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{count}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">{t(config.key)}</div>
              <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                {total} {t('unitsTotal')}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
