/**
 * Expenses Management Page
 * Comprehensive expense tracking and management
 * 
 * Features:
 * - Add/Edit/Delete expenses
 * - Category-based organization
 * - Expense history with filtering
 * - Analytics and charts
 * - Export capabilities
 */

import { useState, useEffect } from 'react'
import { 
  Plus, 
  DollarSign, 
  Filter, 
  Download,
  Edit2,
  Trash2,
  Receipt,
  Building2,
  Zap,
  Package,
  CreditCard,
  Briefcase,
  ShoppingBag,
  Wrench,
  Megaphone,
  MoreHorizontal,
  X,
  Save,
  Search,
  Users,
  TrendingUp
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useLanguage } from '../../contexts/LanguageContext'
import * as XLSX from 'xlsx'
import { Pie, Bar } from 'react-chartjs-2'

type ExpenseCategory = 
  | 'rent'
  | 'utilities'
  | 'supplies'
  | 'inventory'
  | 'marketing'
  | 'maintenance'
  | 'fees'
  | 'insurance'
  | 'other'

type Expense = {
  id: string
  amount: number
  description: string
  category: ExpenseCategory
  userId: string
  createdAt: string
  user?: {
    username: string
  }
}

// Note: EXPENSE_CATEGORIES names will be translated dynamically using getCategoryName
const EXPENSE_CATEGORIES = [
  { id: 'rent', nameKey: 'rentLease', icon: Building2, color: 'bg-blue-500' },
  { id: 'utilities', nameKey: 'utilities', icon: Zap, color: 'bg-yellow-500' },
  { id: 'supplies', nameKey: 'officeSupplies', icon: Package, color: 'bg-purple-500' },
  { id: 'inventory', nameKey: 'inventoryStock', icon: ShoppingBag, color: 'bg-green-500' },
  { id: 'marketing', nameKey: 'marketing', icon: Megaphone, color: 'bg-pink-500' },
  { id: 'maintenance', nameKey: 'maintenance', icon: Wrench, color: 'bg-orange-500' },
  { id: 'fees', nameKey: 'feesCharges', icon: CreditCard, color: 'bg-red-500' },
  { id: 'insurance', nameKey: 'insurance', icon: Briefcase, color: 'bg-indigo-500' },
  { id: 'other', nameKey: 'other', icon: MoreHorizontal, color: 'bg-slate-500' }
] as const

export default function Expenses() {
  const { user } = useAuth()
  const { success, error } = useToast()
  const { t } = useLanguage()
  
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | 'all'>('all')
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days' | 'all'>('30days')
  const [totalSalaries, setTotalSalaries] = useState<number>(0)
  const [employeeCount, setEmployeeCount] = useState<number>(0)
  const [totalCOGS, setTotalCOGS] = useState<number>(0)
  const [includeCOGS, setIncludeCOGS] = useState<boolean>(true)
  
  // Form state
  const [formData, setFormData] = useState({
    amount: 0,
    description: '',
    category: 'other' as ExpenseCategory
  })

  useEffect(() => {
    loadExpenses()
    loadSalaryData()
    loadCOGSData()
    // Load COGS setting from localStorage
    const cogsEnabled = localStorage.getItem('includeCOGSInCalculations') !== 'false'
    setIncludeCOGS(cogsEnabled)
  }, [dateRange])

  const loadSalaryData = async () => {
    try {
      const employees = await window.api.employees.getAll()
      const activeSalaries = employees
        .filter((emp: any) => emp.salary && emp.salary > 0)
        .reduce((sum: number, emp: any) => sum + emp.salary, 0)
      
      setTotalSalaries(activeSalaries)
      setEmployeeCount(employees.length)
    } catch (err) {
      console.error('Failed to load salary data:', err)
    }
  }

  const loadCOGSData = async () => {
    try {
      // Calculate date range
      const endDate = new Date()
      endDate.setHours(23, 59, 59, 999)
      let startDate = new Date()
      
      switch (dateRange) {
        case '7days':
          startDate.setDate(startDate.getDate() - 7)
          break
        case '30days':
          startDate.setDate(startDate.getDate() - 30)
          break
        case '90days':
          startDate.setDate(startDate.getDate() - 90)
          break
        case 'all':
          startDate = new Date('2000-01-01')
          break
      }
      startDate.setHours(0, 0, 0, 0)

      // Get sales data to calculate COGS
      const salesData = await window.api.saleTransactions.getByDateRange({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })

      // Calculate COGS accounting for refunds
      let totalCOGS = 0
      salesData.forEach((sale: any) => {
        sale.items?.forEach((item: any) => {
          const refundedQty = item.refundedQuantity || 0
          const netQty = item.quantity - refundedQty
          if (netQty > 0 && item.product?.baseCost) {
            totalCOGS += netQty * item.product.baseCost
          }
        })
      })

      setTotalCOGS(totalCOGS)
    } catch (err) {
      console.error('Failed to load COGS data:', err)
    }
  }

  const loadExpenses = async () => {
    try {
      setLoading(true)
      
      // Calculate date range
      const endDate = new Date()
      endDate.setHours(23, 59, 59, 999)
      let startDate = new Date()
      
      switch (dateRange) {
        case '7days':
          startDate.setDate(startDate.getDate() - 7)
          break
        case '30days':
          startDate.setDate(startDate.getDate() - 30)
          break
        case '90days':
          startDate.setDate(startDate.getDate() - 90)
          break
        case 'all':
          startDate = new Date('2000-01-01')
          break
      }
      startDate.setHours(0, 0, 0, 0)

      // @ts-ignore - Call finance API to get transactions
      const data = await window.api.finance.getTransactions({
        startDate: startDate,
        endDate: endDate
      })

      // Filter only expenses
      const expenseData = data.filter((t: any) => t.type === 'expense')
      setExpenses(expenseData)
    } catch (err) {
      console.error('Error loading expenses:', err)
      error(t('failedToLoadData'))
    } finally {
      setLoading(false)
    }
  }

  const handleAddExpense = () => {
    setEditingExpense(null)
    setFormData({
      amount: 0,
      description: '',
      category: 'other'
    })
    setShowModal(true)
  }

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    setFormData({
      amount: expense.amount,
      description: expense.description,
      category: expense.category
    })
    setShowModal(true)
  }

  const handleSaveExpense = async () => {
    try {
      if (formData.amount <= 0) {
        error(t('expenseAmountRequired'))
        return
      }

      if (!formData.description.trim()) {
        error(t('expenseDescriptionRequired'))
        return
      }

      if (!user) {
        error(t('mustBeLoggedIn'))
        return
      }

      if (editingExpense) {
        // Update existing expense
        await window.api.finance.updateTransaction(editingExpense.id, {
          type: 'expense',
          amount: formData.amount,
          description: `[${formData.category}] ${formData.description}`
        })
      } else {
        // Create new expense
        await window.api.finance.addTransaction({
          type: 'expense',
          amount: formData.amount,
          description: `[${formData.category}] ${formData.description}`,
          userId: user.id
        })
      }

      success(editingExpense ? t('expenseUpdated') : t('expenseAdded'))
      setShowModal(false)
      setEditingExpense(null)
      setFormData({ amount: 0, description: '', category: 'other' })
      loadExpenses()
    } catch (err) {
      console.error('Error saving expense:', err)
      error(t('failedToSaveExpense'))
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm(t('confirmDeleteExpense'))) return

    try {
      await window.api.finance.deleteTransaction(expenseId)
      success(t('expenseDeleted'))
      loadExpenses()
    } catch (err) {
      console.error('Error deleting expense:', err)
      error(t('failedToDeleteExpense'))
    }
  }

  const handleExport = () => {
    try {
      const exportData = filteredExpenses.map(expense => ({
        Date: new Date(expense.createdAt).toLocaleDateString(),
        Category: getCategoryName(expense.category),
        Description: expense.description.replace(/^\[.*?\]\s*/, ''), // Remove category prefix
        Amount: expense.amount,
        'Added By': expense.user?.username || 'Unknown'
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Expenses')

      const date = new Date().toISOString().split('T')[0]
      const filename = `expenses-${dateRange}-${date}.xlsx`
      XLSX.writeFile(wb, filename)

      success(t('expensesExported'))
    } catch (err) {
      console.error('Export error:', err)
      error(t('failedToExportExpenses'))
    }
  }

  // Extract category from description (format: [category] description)
  const getCategoryFromDescription = (description: string): ExpenseCategory => {
    const match = description.match(/^\[(.*?)\]/)
    if (match && match[1]) {
      return match[1] as ExpenseCategory
    }
    return 'other'
  }

  // Enhance expenses with category
  const enhancedExpenses = expenses.map(expense => ({
    ...expense,
    category: getCategoryFromDescription(expense.description)
  }))

  // Filter expenses
  const filteredExpenses = enhancedExpenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || expense.category === filterCategory
    return matchesSearch && matchesCategory
  })

  // Calculate statistics
  const operationalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)
  const totalExpenses = operationalExpenses + (includeCOGS ? totalCOGS : 0)
  const totalWithSalaries = totalExpenses + totalSalaries
  const expensesByCategory = EXPENSE_CATEGORIES.map(cat => ({
    ...cat,
    total: filteredExpenses
      .filter(e => e.category === cat.id)
      .reduce((sum, e) => sum + e.amount, 0)
  })).filter(cat => cat.total > 0)
  
  // Add salaries as a virtual category if there are any
  const categoriesWithSalaries = totalSalaries > 0 
    ? [...expensesByCategory, {
        id: 'salaries' as const,
        nameKey: 'employeeSalaries',
        icon: Users,
        color: 'bg-purple-500',
        total: totalSalaries
      }]
    : expensesByCategory

  // Add COGS as a virtual category if there is any AND setting is enabled
  const categoriesWithCOGS = (totalCOGS > 0 && includeCOGS)
    ? [...categoriesWithSalaries, {
        id: 'cogs' as const,
        nameKey: 'costOfGoodsSold',
        icon: Package,
        color: 'bg-green-500',
        total: totalCOGS
      }]
    : categoriesWithSalaries

  const getCategoryName = (categoryId: ExpenseCategory) => {
    const cat = EXPENSE_CATEGORIES.find(c => c.id === categoryId)
    return cat ? t(cat.nameKey) : t('other')
  }

  const getCategoryIcon = (categoryId: ExpenseCategory) => {
    const Icon = EXPENSE_CATEGORIES.find(c => c.id === categoryId)?.icon || MoreHorizontal
    return <Icon size={16} />
  }

  const getCategoryColor = (categoryId: ExpenseCategory) => {
    return EXPENSE_CATEGORIES.find(c => c.id === categoryId)?.color || 'bg-slate-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">{t('loading')}...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6  mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('expensesManagement')}</h1>
          <p className="text-slate-600 dark:text-slate-400">{t('trackBusinessExpenses')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Download size={18} />
            {t('export')}
          </button>
          <button
            onClick={handleAddExpense}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus size={18} />
            {t('add')} {t('expenses')}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('operationalExpenses')}</h3>
            <div className="p-2 bg-red-500/10 rounded-lg">
              <DollarSign size={20} className="text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            ${operationalExpenses.toFixed(2)}
          </p>
          <p className="text-sm text-slate-500 mt-1">{filteredExpenses.length} {t('expenseTransactions')}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('costOfGoodsSold')}</h3>
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Package size={20} className="text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            ${totalCOGS.toFixed(2)}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {includeCOGS ? t('fromSales') : `${t('fromSales')} (${t('excluded')})`}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('totalExpenses')}</h3>
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <TrendingUp size={20} className="text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            ${totalExpenses.toFixed(2)}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {includeCOGS ? t('includingCOGS') : t('excludingCOGS')}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('employeeSalaries')}</h3>
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Users size={20} className="text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            ${totalSalaries.toFixed(2)}
          </p>
          <p className="text-sm text-slate-500 mt-1">{employeeCount} {t('expenseEmployees')}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('totalWithSalaries')}</h3>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Filter size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            ${totalWithSalaries.toFixed(2)}
          </p>
          <p className="text-sm text-slate-500 mt-1">{t('completeOverview')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('searchExpenses')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as any)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">{t('expenseAllCategories')}</option>
            {EXPENSE_CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{t(cat.nameKey)}</option>
            ))}
          </select>

          {/* Date Range */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="7days">{t('expenseLast7Days')}</option>
            <option value="30days">{t('expenseLast30Days')}</option>
            <option value="90days">{t('expenseLast90Days')}</option>
            <option value="all">{t('expenseAllTime')}</option>
          </select>
        </div>
      </div>

      {/* Charts */}
      {categoriesWithCOGS.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Pie Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">{t('expensesByCategoryIncludingSalariesAndCOGS')}</h3>
            <div className="h-64">
              <Pie
                data={{
                  labels: categoriesWithCOGS.map(c => t(c.nameKey)),
                  datasets: [{
                    data: categoriesWithCOGS.map(c => c.total),
                    backgroundColor: [
                      'rgba(59, 130, 246, 0.8)',
                      'rgba(234, 179, 8, 0.8)',
                      'rgba(168, 85, 247, 0.8)',
                      'rgba(34, 197, 94, 0.8)',
                      'rgba(236, 72, 153, 0.8)',
                      'rgba(251, 146, 60, 0.8)',
                      'rgba(239, 68, 68, 0.8)',
                      'rgba(99, 102, 241, 0.8)',
                      'rgba(100, 116, 139, 0.8)',
                      'rgba(147, 51, 234, 0.8)',
                      'rgba(34, 197, 94, 0.8)' // Extra color for COGS
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'right' },
                    tooltip: {
                      callbacks: {
                        label: (context) => {
                          const value = context.parsed
                          const percentage = ((value / totalWithSalaries) * 100).toFixed(1)
                          return `${context.label}: $${value.toFixed(2)} (${percentage}%)`
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">{t('categoryBreakdown')}</h3>
            <div className="h-64">
              <Bar
                data={{
                  labels: categoriesWithCOGS.map(c => t(c.nameKey)),
                  datasets: [{
                    label: 'Amount ($)',
                    data: categoriesWithCOGS.map(c => c.total),
                    backgroundColor: categoriesWithCOGS.map(c => {
                      // Use different colors for salaries and COGS
                      if (c.id === 'salaries') return 'rgba(147, 51, 234, 0.8)'
                      if (c.id === 'cogs') return 'rgba(34, 197, 94, 0.8)'
                      return 'rgba(239, 68, 68, 0.8)'
                    }),
                    borderColor: categoriesWithCOGS.map(c => {
                      if (c.id === 'salaries') return 'rgb(147, 51, 234)'
                      if (c.id === 'cogs') return 'rgb(34, 197, 94)'
                      return 'rgb(239, 68, 68)'
                    }),
                    borderWidth: 1
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (context) => `$${(context.parsed.y ?? 0).toFixed(2)}`
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => '$' + value
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Expense List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white">{t('expenseHistory')}</h3>
        </div>
        
        <div className="overflow-x-auto">
          {filteredExpenses.length > 0 ? (
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {t('date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {t('category')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {t('description')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {t('amount')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {t('recordedBy')}
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                      {new Date(expense.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded ${getCategoryColor(expense.category)}/20`}>
                          <div className="text-slate-900 dark:text-white">
                            {getCategoryIcon(expense.category)}
                          </div>
                        </div>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {getCategoryName(expense.category)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                      {expense.description.replace(/^\[.*?\]\s*/, '')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                        ${expense.amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                      {expense.user?.username || t('unknown')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditExpense(expense)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                          title={t('edit')}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title={t('delete')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <Receipt size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-600 dark:text-slate-400">{t('noExpensesFound')}</p>
              <p className="text-sm text-slate-500 mt-1">{t('addFirstExpense')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingExpense ? `${t('edit')} ${t('expenses')}` : `${t('add')} ${t('expenses')}`}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingExpense(null)
                  setFormData({ amount: 0, description: '', category: 'other' })
                }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('category')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {EXPENSE_CATEGORIES.map((cat) => {
                    const Icon = cat.icon
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setFormData({ ...formData, category: cat.id as ExpenseCategory })}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          formData.category === cat.id
                            ? 'border-primary bg-primary/10'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <Icon size={20} className="mx-auto mb-1" />
                        <p className="text-xs font-medium text-center">{t(cat.nameKey).split(' ')[0]}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('amount')} ($)
                </label>
                <input
                  type="number"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0.00"
                  min="0"
                  step="1"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder={t('expenseDetails')}
                  rows={3}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-6">
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingExpense(null)
                  setFormData({ amount: 0, description: '', category: 'other' })
                }}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSaveExpense}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Save size={18} />
                {editingExpense ? `${t('edit')} ${t('expenses')}` : `${t('add')} ${t('expenses')}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
