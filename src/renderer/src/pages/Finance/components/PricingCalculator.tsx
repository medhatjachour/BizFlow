/**
 * Pricing Calculator Component
 * Calculates optimal product pricing based on:
 * - Product costs
 * - Sales volume
 * - Operating expenses (bills, salaries)
 * - Inflation rate
 * - Tax rate
 * - Desired profit margin
 */

import { useState, useEffect } from 'react'
import { Calculator, TrendingUp, TrendingDown, DollarSign, Percent, Users, AlertCircle, CheckCircle, Download, HelpCircle, Search } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useLanguage } from '../../../contexts/LanguageContext'
import logger from '../../../../../shared/utils/logger'

type Product = {
  id: string
  name: string
  currentPrice: number
  cost: number
  monthlySales: number
}

type OperatingExpenses = {
  monthlyBills: number
  totalSalaries: number
  otherExpenses: number
}

type PricingResult = {
  productId: string
  productName: string
  currentPrice: number
  cost: number
  monthlySales: number
  allocatedExpenses: number
  inflationAdjustment: number
  taxAmount: number
  recommendedPrice: number
  profitPerUnit: number
  profitMargin: number
  monthlyRevenue: number
  monthlyProfit: number
}

const PAGE_SIZE = 50

export default function PricingCalculator() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [pagedProducts, setPagedProducts] = useState<Product[]>([])
  const [productCache, setProductCache] = useState<Record<string, Product>>({})
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProductsCount, setTotalProductsCount] = useState(0)
  const [autoSelectNewItems, setAutoSelectNewItems] = useState(true)
  
  // Operating Expenses
  const [expenses, setExpenses] = useState<OperatingExpenses>({
    monthlyBills: 0,
    totalSalaries: 0,
    otherExpenses: 0
  })
  
  // Pricing Parameters
  const [inflationRate, setInflationRate] = useState(3.5) // %
  const [taxRate, setTaxRate] = useState(15) // %
  const [desiredProfitMargin, setDesiredProfitMargin] = useState(30) // %
  const [includeExpenses, setIncludeExpenses] = useState(true)
  
  // Results
  const [results, setResults] = useState<PricingResult[]>([])

  useEffect(() => {
    loadData(1, '')
  }, [])

  const loadData = async (page = 1, query = searchQuery) => {
    try {
      setLoading(true)
      setCurrentPage(page)
      
      // Load products with sales data - use inventory search endpoint
      // @ts-ignore
      const inventoryResponse = await window.api['search:inventory']({
        filters: {
          query,
          categoryIds: [],
          stockStatus: []
        },
        sort: { field: 'name', direction: 'asc' },
        pagination: {
          page,
          limit: PAGE_SIZE
        },
        includeImages: false,
        includeMetrics: false
      })
      
      const productsData = Array.isArray(inventoryResponse?.items) ? inventoryResponse.items : []
      
      // Load employees for salary calculation
      // @ts-ignore
      const employeesData = await window.api.employees.getAll()
      
      // Load sale transactions (last 30 days) via new API
      const now = new Date()
      const endDate = new Date(now)
      endDate.setHours(23, 59, 59, 999)
      const startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 30)
      startDate.setHours(0, 0, 0, 0)

      // @ts-ignore
      const saleTransactionsApi = window.api?.saleTransactions
      const saleTransactionsData = await saleTransactionsApi?.getByDateRange?.({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })
      
      // Ensure we have arrays
      const safeEmployeesData = Array.isArray(employeesData) ? employeesData : []
      const safeTransactionsData = Array.isArray(saleTransactionsData) ? saleTransactionsData : []
      
      // Only consider completed transactions within the window
      const completedTransactions = safeTransactionsData.filter((transaction: any) => {
        if (!transaction) return false
        const saleDate = new Date(transaction.createdAt)
        return transaction.status === 'completed' && saleDate >= startDate && saleDate <= endDate
      })
      
      // Calculate monthly sales per product
      const salesByProduct = new Map<string, number>()
      completedTransactions.forEach((transaction: any) => {
        (transaction.items || []).forEach((item: any) => {
          if (!item?.productId) return
          const current = salesByProduct.get(item.productId) || 0
          salesByProduct.set(item.productId, current + (item.quantity || 0))
        })
      })
      
      // Format products with sales data
      const formattedProducts: Product[] = productsData.map((p: any) => ({
        id: p.id,
        name: p.name,
        currentPrice: p.basePrice || 0,
        cost: p.baseCost || 0,
        monthlySales: salesByProduct.get(p.id) || 0
      }))
      
      setPagedProducts(formattedProducts)

      const responsePage = inventoryResponse?.page || page
      const responseTotalPages = Math.max(inventoryResponse?.totalPages || 1, 1)
      const responseTotalCount = inventoryResponse?.totalCount || formattedProducts.length

      setCurrentPage(responsePage)
      setTotalPages(responseTotalPages)
      setTotalProductsCount(responseTotalCount)

      setProductCache(prev => {
        const next = { ...prev }
        formattedProducts.forEach(product => {
          next[product.id] = product
        })
        return next
      })

      if (autoSelectNewItems) {
        setSelectedProducts(prev => {
          const updated = new Set(prev)
          formattedProducts.forEach(product => updated.add(product.id))
          return updated
        })
      }
      
      // Calculate total salaries
      const totalSalaries = safeEmployeesData.reduce((sum: number, emp: any) => sum + (emp.salary || 0), 0)
      setExpenses(prev => ({ ...prev, totalSalaries }))
      
    } catch (error) {
      logger.error('Error loading pricing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculatePricing = () => {
    setCalculating(true)
    
    try {
      const selectedProductsList = Array.from(selectedProducts)
        .map(id => productCache[id])
        .filter((product): product is Product => Boolean(product))
      
      if (selectedProductsList.length === 0) {
        setCalculating(false)
        return
      }
      
      // Calculate total monthly sales volume
      const totalMonthlySales = selectedProductsList.reduce((sum, p) => sum + p.monthlySales, 0)
      
      // Calculate total operating expenses
      const totalExpenses = includeExpenses 
        ? expenses.monthlyBills + expenses.totalSalaries + expenses.otherExpenses
        : 0
      
      // Calculate pricing for each product
      const calculatedResults: PricingResult[] = selectedProductsList.map(product => {
        // 1. Base cost
        let basePrice = product.cost
        
        // 2. Allocate expenses proportionally based on sales volume
        const salesRatio = totalMonthlySales > 0 ? product.monthlySales / totalMonthlySales : 0
        const allocatedExpenses = totalExpenses * salesRatio
        const expensePerUnit = product.monthlySales > 0 ? allocatedExpenses / product.monthlySales : 0
        basePrice += expensePerUnit
        
        // 3. Apply inflation adjustment
        const inflationAdjustment = basePrice * (inflationRate / 100)
        basePrice += inflationAdjustment
        
        // 4. Apply desired profit margin (before tax)
        const profitAmount = basePrice * (desiredProfitMargin / 100)
        basePrice += profitAmount
        
        // 5. Calculate tax on the selling price
        const taxAmount = basePrice * (taxRate / 100)
        const recommendedPrice = basePrice + taxAmount
        
        // Calculate metrics
        const profitPerUnit = recommendedPrice - product.cost - expensePerUnit - taxAmount
        const profitMargin = recommendedPrice > 0 ? (profitPerUnit / recommendedPrice) * 100 : 0
        const monthlyRevenue = recommendedPrice * product.monthlySales
        const monthlyProfit = profitPerUnit * product.monthlySales
        
        return {
          productId: product.id,
          productName: product.name,
          currentPrice: product.currentPrice,
          cost: product.cost,
          monthlySales: product.monthlySales,
          allocatedExpenses: expensePerUnit,
          inflationAdjustment,
          taxAmount,
          recommendedPrice: Math.round(recommendedPrice * 100) / 100, // Round to 2 decimals
          profitPerUnit,
          profitMargin,
          monthlyRevenue,
          monthlyProfit
        }
      })
      
      setResults(calculatedResults)
    } catch (error) {
      logger.error('Error calculating pricing:', error)
    } finally {
      setCalculating(false)
    }
  }

  const toggleProductSelection = (productId: string) => {
    setAutoSelectNewItems(false)
    setSelectedProducts(prev => {
      const newSelection = new Set(prev)
      if (newSelection.has(productId)) {
        newSelection.delete(productId)
      } else {
        newSelection.add(productId)
      }
      return newSelection
    })
  }

  const selectAllProducts = () => {
    setSelectedProducts(prev => {
      const newSelection = new Set(prev)
      pagedProducts.forEach(product => newSelection.add(product.id))
      return newSelection
    })
  }

  const deselectAllProducts = () => {
    setAutoSelectNewItems(false)
    setSelectedProducts(new Set())
  }

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
    loadData(1, value)
  }

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return
    loadData(page, searchQuery)
  }

  const exportResults = () => {
    if (results.length === 0) return
    
    const exportData = results.map(r => ({
      'Product Name': r.productName,
      'Current Price': `$${r.currentPrice.toFixed(2)}`,
      'Product Cost': `$${r.cost.toFixed(2)}`,
      'Monthly Sales': r.monthlySales,
      'Allocated Expenses': `$${r.allocatedExpenses.toFixed(2)}`,
      'Inflation Adjustment': `$${r.inflationAdjustment.toFixed(2)}`,
      'Tax Amount': `$${r.taxAmount.toFixed(2)}`,
      'Recommended Price': `$${r.recommendedPrice.toFixed(2)}`,
      'Price Change': `$${(r.recommendedPrice - r.currentPrice).toFixed(2)}`,
      'Profit Per Unit': `$${r.profitPerUnit.toFixed(2)}`,
      'Profit Margin': `${r.profitMargin.toFixed(2)}%`,
      'Monthly Revenue': `$${r.monthlyRevenue.toFixed(2)}`,
      'Monthly Profit': `$${r.monthlyProfit.toFixed(2)}`
    }))
    
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Pricing Analysis')
    
    const date = new Date().toISOString().split('T')[0]
    XLSX.writeFile(wb, `pricing-analysis-${date}.xlsx`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">{t('loading')}...</p>
        </div>
      </div>
    )
  }

  const totalExpenses = expenses.monthlyBills + expenses.totalSalaries + expenses.otherExpenses
  const totalMonthlyRevenue = results.reduce((sum, r) => sum + r.monthlyRevenue, 0)
  const totalMonthlyProfit = results.reduce((sum, r) => sum + r.monthlyProfit, 0)
  const startIndex = totalProductsCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const endIndex = totalProductsCount === 0 ? 0 : Math.min(currentPage * PAGE_SIZE, totalProductsCount)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <Calculator size={28} />
          <h2 className="text-2xl font-bold">{t('pricingSmartCalculator')}</h2>
          
          {/* Info Button with Tooltip */}
          <div className="relative group ml-auto">
            <button className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
              <HelpCircle size={20} />
            </button>
            
            {/* Tooltip on Hover */}
            <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3">{t('pricingHowItWorks')}</h3>
                  <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                    <div className="flex items-start gap-2">
                      <span className="font-semibold min-w-[20px]">1.</span>
                      <span><strong>{t('pricingBaseCost')}:</strong> {t('pricingBaseCostDesc')}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-semibold min-w-[20px]">2.</span>
                      <span><strong>{t('pricingAllocatedExpenses')}:</strong> {t('pricingExpensesAllocationDesc')}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-semibold min-w-[20px]">3.</span>
                      <span><strong>{t('pricingInflationAdjustment')}:</strong> {t('pricingInflationAdjustmentDesc')}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-semibold min-w-[20px]">4.</span>
                      <span><strong>{t('pricingMargin')}:</strong> {t('pricingDesiredMarginDesc')}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-semibold min-w-[20px]">5.</span>
                      <span><strong>{t('pricingTaxes')}:</strong> {t('pricingTaxesDesc')}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-mono text-slate-600 dark:text-slate-400">
                      (Cost + Expenses) × (1 + Inflation%) × (1 + Profit%) × (1 + Tax%)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="text-blue-100">
          {t('pricingDescription')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Inputs */}
        <div className="lg:col-span-1 space-y-6">
          {/* Operating Expenses */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={20} className="text-blue-600" />
              <h3 className="font-semibold text-slate-900 dark:text-white">{t('pricingOperatingExpenses')}</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('pricingMonthlyBills')}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    value={expenses.monthlyBills}
                    onChange={(e) => setExpenses({ ...expenses, monthlyBills: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    min="0"
                    step="100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('pricingTotalSalaries')}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    value={expenses.totalSalaries}
                    onChange={(e) => setExpenses({ ...expenses, totalSalaries: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    min="0"
                    step="100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('pricingOtherExpenses')}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    value={expenses.otherExpenses}
                    onChange={(e) => setExpenses({ ...expenses, otherExpenses: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    min="0"
                    step="100"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('pricingIncludeInPricing')}</span>
                    <div className="relative group">
                      <HelpCircle size={14} className="text-slate-400 hover:text-slate-600 cursor-help" />
                      <div className="absolute bottom-full left-0 mb-2 w-80 bg-slate-800 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="text-left">
                          <strong>{t('pricingOperatingExpenses')}:</strong><br />
                          {t('pricingExpensesAllocationTooltip')}
                        </div>
                      </div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeExpenses}
                      onChange={(e) => setIncludeExpenses(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {t('total')}: ${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  {includeExpenses && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                      <CheckCircle size={12} />
                      {t('pricingIncludedInCalculations')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Parameters */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Percent size={20} className="text-purple-600" />
              <h3 className="font-semibold text-slate-900 dark:text-white">{t('pricingParameters')}</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('pricingInflationRate')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    value={inflationRate}
                    onChange={(e) => setInflationRate(Number(e.target.value))}
                    min="0"
                    max="20"
                    step="0.5"
                    className="flex-1"
                  />
                  <span className="w-16 text-right font-semibold text-slate-900 dark:text-white">
                    {inflationRate.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('pricingTaxRate')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    min="0"
                    max="30"
                    step="0.5"
                    className="flex-1"
                  />
                  <span className="w-16 text-right font-semibold text-slate-900 dark:text-white">
                    {taxRate.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('pricingDesiredMargin')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    value={desiredProfitMargin}
                    onChange={(e) => setDesiredProfitMargin(Number(e.target.value))}
                    min="0"
                    max="100"
                    step="5"
                    className="flex-1"
                  />
                  <span className="w-16 text-right font-semibold text-slate-900 dark:text-white">
                    {desiredProfitMargin.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Calculate Button */}
          <button
            onClick={calculatePricing}
            disabled={calculating || selectedProducts.size === 0}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg"
          >
            {calculating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                {t('calculating')}...
              </>
            ) : (
              <>
                <Calculator size={20} />
                {t('pricingCalculate')}
              </>
            )}
          </button>
        </div>

        {/* Right Column: Products & Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Selection */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users size={20} className="text-green-600" />
                <h3 className="font-semibold text-slate-900 dark:text-white">{t('pricingSelectProducts')}</h3>
                <span className="text-sm text-slate-500">
                  ({selectedProducts.size} {t('pricingSelected')} {t('of')} {totalProductsCount || pagedProducts.length})
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={selectAllProducts}
                  className="text-sm px-3 py-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                >
                  {t('pricingSelectPage')}
                </button>
                <button
                  onClick={deselectAllProducts}
                  className="text-sm px-3 py-1 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                >
                  {t('pricingClearAll')}
                </button>
              </div>
            </div>

            {/* Search Box */}
            <div className="relative mb-4">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t('pricingSearchProducts')}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              )}
            </div>

            {totalProductsCount === 0 ? (
              <div className="text-center py-8">
                <AlertCircle size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-slate-500">{t('pricingNoProducts')}</p>
                <p className="text-sm text-slate-400 mt-1">{t('pricingNoProductsDesc')}</p>
              </div>
            ) : pagedProducts.length === 0 ? (
              <div className="text-center py-8">
                <Search size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-slate-500">
                  {searchQuery ? `${t('noResultsFor')} "${searchQuery}"` : t('pricingNoProductsOnPage')}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  {searchQuery ? t('tryDifferentSearch') : t('pricingAdjustFilters')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {t('showing')} {startIndex}-{endIndex} {t('of')} {totalProductsCount} {t('products')}
                  </span>
                  <span>{t('page')} {currentPage} {t('of')} {totalPages}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                  {pagedProducts.map(product => (
                  <label
                    key={product.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedProducts.has(product.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(product.id)}
                      onChange={() => toggleProductSelection(product.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white text-sm truncate">
                        {product.name}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-500">
                          ${product.currentPrice.toFixed(2)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {product.monthlySales} sales/mo
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="px-3 py-1 text-sm rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('previous')}
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1 text-sm rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('next')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          {results.length > 0 && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign size={18} />
                    <span className="text-sm font-medium opacity-90">{t('pricingMonthlyRevenue')}</span>
                    <div className="relative group">
                      <HelpCircle size={14} className="opacity-70 hover:opacity-100 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-black/90 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="text-center">
                          <strong>{t('pricingMonthlyRevenue')}:</strong><br />
                          {t('pricingMonthlyRevenueTooltip')}
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">
                    ${totalMonthlyRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-4 shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={18} />
                    <span className="text-sm font-medium opacity-90">{t('pricingMonthlyProfit')}</span>
                    <div className="relative group">
                      <HelpCircle size={14} className="opacity-70 hover:opacity-100 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-black/90 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="text-center">
                          <strong>{t('pricingMonthlyProfit')}:</strong><br />
                          {t('pricingMonthlyProfitTooltip')}
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">
                    ${totalMonthlyProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-4 shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Percent size={18} />
                    <span className="text-sm font-medium opacity-90">{t('pricingAvgMargin')}</span>
                    <div className="relative group">
                      <HelpCircle size={14} className="opacity-70 hover:opacity-100 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-black/90 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="text-center">
                          <strong>{t('pricingAvgMargin')}:</strong><br />
                          {t('pricingAvgMarginTooltip')}
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">
                    {(results.reduce((sum, r) => sum + r.profitMargin, 0) / results.length).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Results Table */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{t('pricingResults')}</h3>
                  <button
                    onClick={exportResults}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download size={16} />
                    {t('pricingExportExcel')}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">{t('pricingProduct')}</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">{t('pricingCurrent')}</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">{t('pricingRecommended')}</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">{t('change')}</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">{t('pricingMargin')}</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">{t('pricingMonthlyProfit')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {results.map((result) => {
                        const priceChange = result.recommendedPrice - result.currentPrice
                        const changePercent = result.currentPrice > 0 ? (priceChange / result.currentPrice) * 100 : 0
                        
                        return (
                          <tr key={result.productId} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white">{result.productName}</p>
                                <p className="text-xs text-slate-500">{result.monthlySales} {t('pricingSalesPerMonth')}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">
                              ${result.currentPrice.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-bold text-blue-600 dark:text-blue-400">
                                ${result.recommendedPrice.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className={`inline-flex items-center gap-1 ${
                                priceChange >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {priceChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                <span className="font-medium">
                                  {priceChange >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                                result.profitMargin >= 30 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                result.profitMargin >= 15 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                              }`}>
                                {result.profitMargin.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400">
                              ${result.monthlyProfit.toFixed(2)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pricing Breakdown Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">{t('pricingHowCalculated')}</h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li>• <strong>{t('pricingBase')}:</strong> {t('pricingBaseCost')} + {includeExpenses ? t('pricingAllocatedExpensesLower') : t('pricingNoExpenses')} ({t('pricingProportionalToSales')})</li>
                      <li>• <strong>{t('pricingInflationAdjustment')}:</strong> {inflationRate.toFixed(1)}% {t('pricingAdjustmentAdded')}</li>
                      <li>• <strong>{t('pricingMargin')}:</strong> {desiredProfitMargin.toFixed(0)}% {t('pricingAddedForProfit')}</li>
                      <li>• <strong>{t('pricingTaxes')}:</strong> {taxRate.toFixed(1)}% {t('pricingAddedOnFinalPrice')}</li>
                    </ul>
                    {includeExpenses && totalExpenses > 0 && (
                      <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-800/30 rounded-lg">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          <strong>💡 {t('pricingExpensesAllocation')}:</strong> ${totalExpenses.toLocaleString()} {t('pricingTotalExpensesDistributed')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
