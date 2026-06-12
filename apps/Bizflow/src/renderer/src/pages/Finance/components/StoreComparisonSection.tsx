/**
 * Store Comparison Section
 * Displays side-by-side store performance metrics
 * Shows at bottom of Finance Overview tab
 */

import { useEffect, useState } from 'react'
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts'
import { Store, TrendingUp, DollarSign, ShoppingCart, Package } from 'lucide-react'
import { useLanguage } from '../../../contexts/LanguageContext'
import logger from '../../../../../shared/utils/logger'

interface StoreMetrics {
  storeId: string
  storeName: string
  revenue: number
  profit: number
  profitMargin: number
  transactions: number
  inventoryValue: number
  productCount: number
  averageOrderValue: number
}

interface StoreComparisonProps {
  startDate?: Date
  endDate?: Date
}

type ChartMetric = 'revenue' | 'profit' | 'transactions' | 'inventory' | 'profitMargin' | 'avgOrder'

export default function StoreComparisonSection({ startDate, endDate }: StoreComparisonProps) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [stores, setStores] = useState<StoreMetrics[]>([])
  const [allStores, setAllStores] = useState<StoreMetrics[]>([])
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedMetrics, setSelectedMetrics] = useState<ChartMetric[]>(['revenue', 'profit'])

  useEffect(() => {
    loadStoreComparison()
  }, [startDate, endDate])

  const toggleMetric = (metric: ChartMetric) => {
    setSelectedMetrics(prev => {
      const newMetrics = prev.includes(metric) 
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
      logger.info('📊 Selected metrics:', newMetrics)
      return newMetrics
    })
  }

  const loadStoreComparison = async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await window.api.analytics.compareStores({
        storeIds: [], // Empty = all stores
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString()
      })

      const allStoresData = result.stores || []
      setAllStores(allStoresData)
      
      // If no stores selected, show all
      if (selectedStoreIds.length === 0) {
        setStores(allStoresData)
        setSelectedStoreIds(allStoresData.map(s => s.storeId))
      } else {
        // Filter by selected stores
        const filtered = allStoresData.filter(s => selectedStoreIds.includes(s.storeId))
        setStores(filtered)
      }
    } catch (err) {
      logger.error('Error loading store comparison:', err)
      setError('Failed to load store comparison data')
    } finally {
      setLoading(false)
    }
  }

  const toggleStore = (storeId: string) => {
    setSelectedStoreIds(prev => {
      const newSelection = prev.includes(storeId)
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId]
      
      // Update filtered stores
      if (newSelection.length === 0) {
        setStores(allStores)
        return allStores.map(s => s.storeId)
      } else {
        setStores(allStores.filter(s => newSelection.includes(s.storeId)))
        return newSelection
      }
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  // Prepare data for chart based on selected metric
  const getMetricValue = (store: StoreMetrics, metric: ChartMetric) => {
    switch(metric) {
      case 'revenue': return store.revenue
      case 'profit': return store.profit
      case 'transactions': return store.transactions
      case 'inventory': return store.inventoryValue
      case 'profitMargin': return store.profitMargin
      case 'avgOrder': return store.averageOrderValue
      default: return 0
    }
  }

  const getMetricLabel = (metric: ChartMetric) => {
    switch(metric) {
      case 'revenue': return 'Revenue'
      case 'profit': return 'Profit'
      case 'transactions': return 'Transactions'
      case 'inventory': return 'Inventory Value'
      case 'profitMargin': return 'Profit Margin (%)'
      case 'avgOrder': return 'Avg Order Value'
      default: return ''
    }
  }

  const chartData = stores.map(store => {
    const data: any = { name: store.storeName }
    selectedMetrics.forEach(metric => {
      data[metric] = getMetricValue(store, metric)
    })
    return data
  })
  
  // Debug log
  logger.info('📈 Chart data:', { 
    selectedMetrics, 
    chartData,
    storesCount: stores.length 
  })

  const getMetricColor = (metric: ChartMetric) => {
    switch(metric) {
      case 'revenue': return '#10b981'
      case 'profit': return '#3b82f6'
      case 'transactions': return '#f59e0b'
      case 'inventory': return '#8b5cf6'
      case 'profitMargin': return '#ec4899'
      case 'avgOrder': return '#06b6d4'
      default: return '#6b7280'
    }
  }

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Store className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-foreground">{t('storeComparison')}</h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Store className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-foreground">{t('storeComparison')}</h2>
        </div>
        <div className="text-center text-red-500 py-8">{error}</div>
      </div>
    )
  }

  if (stores.length === 0) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Store className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-foreground">{t('storeComparison')}</h2>
        </div>
        <div className="text-center text-gray-400 py-8">
          {t('noStoresFound')}
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Store className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-foreground">{t('storePerformanceComparison')}</h2>
        </div>
        <span className="text-sm text-gray-400">
          {stores.length} {stores.length === 1 ? t('storeLabel') : t('storesLabel')}
        </span>
      </div>

      {/* Store Selector */}
      {allStores.length > 1 && (
        <div className="mb-4 ">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-400 mr-2">{t('selectStores')}:</span>
            {allStores.map(store => (
              <button
                key={store.storeId}
                onClick={() => toggleStore(store.storeId)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedStoreIds.includes(store.storeId)
                    ? 'bg-primary text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                {store.storeName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Store Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        {stores.map((store) => (
          <div key={store.storeId} className="glass-card p-5 hover:shadow-xl transition-all duration-300 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-bold text-lg text-foreground truncate">{store.storeName}</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-gray-400">{t('revenueLabel')}</span>
                </div>
                <span className="font-bold text-green-400">{formatCurrency(store.revenue)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-gray-400">{t('profitLabel')}</span>
                </div>
                <span className="font-bold text-blue-400">{formatCurrency(store.profit)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400 pl-6">{t('profitMarginLabel')}</span>
                <span className={`font-bold ${
                  store.profitMargin >= 20 ? 'text-green-400' : 
                  store.profitMargin >= 10 ? 'text-yellow-400' : 
                  'text-red-400'
                }`}>
                  {formatPercent(store.profitMargin)}
                </span>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t border-gray-700/50">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-gray-400">{t('transactionsLabel2')}</span>
                </div>
                <span className="font-bold text-purple-400">{store.transactions.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400 pl-6">{t('avgOrderValue')}</span>
                <span className="font-semibold text-gray-300">{formatCurrency(store.averageOrderValue)}</span>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t border-gray-700/50">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-gray-400">{t('inventoryValueLabel')}</span>
                </div>
                <span className="font-bold text-orange-400">{formatCurrency(store.inventoryValue)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400 pl-6">{t('productCountLabel')}</span>
                <span className="font-semibold text-gray-300">{store.productCount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Chart */}
      {stores.length >= 1 && (
        <div className="mt-8 glass-card p-5">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-foreground mb-3">{t('storePerformanceComparison')}</h3>
            
            {/* Multi-Metric Selector */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-400 mr-2 self-center">{t('compare')} {t('by')}:</span>
              {(['revenue', 'profit', 'transactions', 'inventory', 'profitMargin', 'avgOrder'] as ChartMetric[]).map(metric => (
                <button
                  key={metric}
                  onClick={() => toggleMetric(metric)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedMetrics.includes(metric)
                      ? 'bg-primary text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {getMetricLabel(metric)}
                </button>
              ))}
            </div>
            
            {/* Debug info */}
            {selectedMetrics.length === 0 && (
              <p className="text-sm text-yellow-500 mt-2">Please select at least one metric to compare</p>
            )}
          </div>
          
          {selectedMetrics.length > 0 && (
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartData} key={selectedMetrics.join('-')}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                
                {/* Left Y-axis for currency values (Revenue, Profit, Inventory, Avg Order) */}
                {(selectedMetrics.includes('revenue') || selectedMetrics.includes('profit') || 
                  selectedMetrics.includes('inventory') || selectedMetrics.includes('avgOrder')) && (
                  <YAxis 
                    yAxisId="currency" 
                    stroke="#9ca3af"
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                )}
                
                {/* Right Y-axis for counts (Transactions) */}
                {selectedMetrics.includes('transactions') && (
                  <YAxis 
                    yAxisId="count" 
                    orientation="right" 
                    stroke="#f59e0b"
                    tickFormatter={(value) => value.toLocaleString()}
                  />
                )}
                
                {/* Far right Y-axis for percentages (Profit Margin) */}
                {selectedMetrics.includes('profitMargin') && !selectedMetrics.includes('transactions') && (
                  <YAxis 
                    yAxisId="percent" 
                    orientation="right" 
                    stroke="#ec4899"
                    tickFormatter={(value) => `${value.toFixed(0)}%`}
                  />
                )}
                
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#f3f4f6' }}
                  formatter={(value: number | undefined, name: string | undefined) => {
                    if (value === undefined || name === undefined) return ['', '']
                    const metric = name as ChartMetric
                    if (metric === 'transactions') return [value.toLocaleString(), getMetricLabel(metric)]
                    if (metric === 'profitMargin') return [`${value.toFixed(1)}%`, getMetricLabel(metric)]
                    return [formatCurrency(value), getMetricLabel(metric)]
                  }}
                />
                <Legend formatter={(value) => getMetricLabel(value as ChartMetric)} />
                
                {/* Render bars with appropriate Y-axis */}
                {selectedMetrics.includes('revenue') && (
                  <Bar 
                    yAxisId="currency"
                    dataKey="revenue" 
                    fill={getMetricColor('revenue')} 
                    name="revenue"
                    radius={[8, 8, 0, 0]} 
                  />
                )}
                {selectedMetrics.includes('profit') && (
                  <Bar 
                    yAxisId="currency"
                    dataKey="profit" 
                    fill={getMetricColor('profit')} 
                    name="profit"
                    radius={[8, 8, 0, 0]} 
                  />
                )}
                {selectedMetrics.includes('inventory') && (
                  <Bar 
                    yAxisId="currency"
                    dataKey="inventory" 
                    fill={getMetricColor('inventory')} 
                    name="inventory"
                    radius={[8, 8, 0, 0]} 
                  />
                )}
                {selectedMetrics.includes('avgOrder') && (
                  <Bar 
                    yAxisId="currency"
                    dataKey="avgOrder" 
                    fill={getMetricColor('avgOrder')} 
                    name="avgOrder"
                    radius={[8, 8, 0, 0]} 
                  />
                )}
                {selectedMetrics.includes('transactions') && (
                  <Bar 
                    yAxisId="count"
                    dataKey="transactions" 
                    fill={getMetricColor('transactions')} 
                    name="transactions"
                    radius={[8, 8, 0, 0]} 
                  />
                )}
                {selectedMetrics.includes('profitMargin') && (
                  <Bar 
                    yAxisId={selectedMetrics.includes('transactions') ? 'count' : 'percent'}
                    dataKey="profitMargin" 
                    fill={getMetricColor('profitMargin')} 
                    name="profitMargin"
                    radius={[8, 8, 0, 0]} 
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Store Rankings */}
      <div className="mt-8">
        <h3 className="text-lg font-bold mb-4 text-foreground">Store Rankings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Top by Revenue */}
          <div className="glass-card p-5 border border-gray-700/50">
            <h4 className="font-bold text-sm text-gray-300 mb-4 flex items-center gap-2">
              🏆 <span>Top by Revenue</span>
            </h4>
            <ol className="space-y-2">
              {[...stores].sort((a, b) => b.revenue - a.revenue).slice(0, 5).map((store, index) => (
                <li key={store.storeId} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`font-bold w-6 text-center ${
                      index === 0 ? 'text-yellow-400' : 
                      index === 1 ? 'text-gray-300' : 
                      index === 2 ? 'text-orange-400' : 'text-gray-500'
                    }`}>{index + 1}.</span>
                    <span className="truncate text-gray-300">{store.storeName}</span>
                  </span>
                  <span className="font-bold text-green-400 ml-2">{formatCurrency(store.revenue)}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Top by Profit Margin */}
          <div className="glass-card p-5 border border-gray-700/50">
            <h4 className="font-bold text-sm text-gray-300 mb-4 flex items-center gap-2">
              💎 <span>Top by Profit Margin</span>
            </h4>
            <ol className="space-y-2">
              {[...stores].sort((a, b) => b.profitMargin - a.profitMargin).slice(0, 5).map((store, index) => (
                <li key={store.storeId} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`font-bold w-6 text-center ${
                      index === 0 ? 'text-yellow-400' : 
                      index === 1 ? 'text-gray-300' : 
                      index === 2 ? 'text-orange-400' : 'text-gray-500'
                    }`}>{index + 1}.</span>
                    <span className="truncate text-gray-300">{store.storeName}</span>
                  </span>
                  <span className="font-bold text-blue-400 ml-2">{formatPercent(store.profitMargin)}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Top by Transactions */}
          <div className="glass-card p-5 border border-gray-700/50">
            <h4 className="font-bold text-sm text-gray-300 mb-4 flex items-center gap-2">
              🛒 <span>Top by Transactions</span>
            </h4>
            <ol className="space-y-2">
              {[...stores].sort((a, b) => b.transactions - a.transactions).slice(0, 5).map((store, index) => (
                <li key={store.storeId} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`font-bold w-6 text-center ${
                      index === 0 ? 'text-yellow-400' : 
                      index === 1 ? 'text-gray-300' : 
                      index === 2 ? 'text-orange-400' : 'text-gray-500'
                    }`}>{index + 1}.</span>
                    <span className="truncate text-gray-300">{store.storeName}</span>
                  </span>
                  <span className="font-bold text-purple-400 ml-2">{store.transactions.toLocaleString()}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
