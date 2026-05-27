import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../../../contexts/ToastContext'
import { useLanguage } from '../../../contexts/LanguageContext'
import * as XLSX from 'xlsx'
import logger from '../../../../../shared/utils/logger'
import type { Expense, ExpenseCategory, ExpenseFormData, DateRange, PayrollEmployee } from '../types'

export const EXPENSE_CATEGORIES = [
  { id: 'rent',        nameKey: 'rentLease',        color: 'bg-blue-500' },
  { id: 'utilities',   nameKey: 'utilities',         color: 'bg-yellow-500' },
  { id: 'supplies',    nameKey: 'officeSupplies',    color: 'bg-purple-500' },
  { id: 'inventory',   nameKey: 'inventoryStock',    color: 'bg-green-500' },
  { id: 'marketing',   nameKey: 'marketing',         color: 'bg-pink-500' },
  { id: 'maintenance', nameKey: 'maintenance',       color: 'bg-orange-500' },
  { id: 'fees',        nameKey: 'feesCharges',       color: 'bg-red-500' },
  { id: 'insurance',   nameKey: 'insurance',         color: 'bg-indigo-500' },
  { id: 'other',       nameKey: 'other',             color: 'bg-slate-500' },
] as const

const EMPTY_FORM: ExpenseFormData = {
  amount: 0,
  description: '',
  category: 'other',
  vendor: '',
  paymentMethod: 'cash',
  recurrence: 'one_time',
  date: new Date().toISOString().slice(0, 10),
  notes: '',
}

export function useExpenses() {
  const { success, error } = useToast()
  const { t } = useLanguage()

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | 'all'>('all')
  const [dateRange, setDateRange] = useState<DateRange>('30days')
  const [totalSalaries, setTotalSalaries] = useState(0)
  const [totalBaseSalary, setTotalBaseSalary] = useState(0)
  const [totalOvertimePay, setTotalOvertimePay] = useState(0)
  const [totalExtraShiftPay, setTotalExtraShiftPay] = useState(0)
  const [totalGrossPay, setTotalGrossPay] = useState(0)
  const [payrollDetails, setPayrollDetails] = useState<PayrollEmployee[]>([])
  const [employeeCount, setEmployeeCount] = useState(0)
  const [totalCOGS, setTotalCOGS] = useState(0)
  const [includeCOGS, setIncludeCOGS] = useState(true)
  const [includeSalaries, setIncludeSalaries] = useState(true)
  const [formData, setFormData] = useState<ExpenseFormData>(EMPTY_FORM)

  const buildDateBounds = useCallback((range: DateRange) => {
    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999)
    let startDate = new Date()
    switch (range) {
      case '7days':  startDate.setDate(startDate.getDate() - 7); break
      case '30days': startDate.setDate(startDate.getDate() - 30); break
      case '90days': startDate.setDate(startDate.getDate() - 90); break
      case 'all':    startDate = new Date('2000-01-01'); break
    }
    startDate.setHours(0, 0, 0, 0)
    return { startDate, endDate }
  }, [])

  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true)
      if (!window.api.expenses?.getAll) { setExpenses([]); return }
      const { startDate, endDate } = buildDateBounds(dateRange)
      const data = await window.api.expenses.getAll({
        startDate: startDate.toISOString(),
        endDate:   endDate.toISOString(),
      })
      setExpenses(data)
    } catch (err) {
      logger.error('Error loading expenses:', err)
      error(t('failedToLoadData'))
    } finally {
      setLoading(false)
    }
  }, [dateRange, buildDateBounds, error, t])

  const getPayrollRange = useCallback((range: DateRange) => {
    const now = new Date()
    const endYear  = now.getFullYear()
    const endMonth = now.getMonth() + 1
    switch (range) {
      case '7days':
      case '30days':
        return { startYear: endYear, startMonth: endMonth, endYear, endMonth }
      case '90days': {
        const start = new Date(now)
        start.setMonth(start.getMonth() - 2)
        return { startYear: start.getFullYear(), startMonth: start.getMonth() + 1, endYear, endMonth }
      }
      case 'all':
        return { startYear: 2000, startMonth: 1, endYear, endMonth }
    }
  }, [])

  const loadSalaryData = useCallback(async () => {
    try {
      const range  = getPayrollRange(dateRange)
      const result = await window.api.employees.payroll.getSummary(range)
      const emps: PayrollEmployee[] = result?.employees ?? []
      const tot  = result?.totals  ?? {}
      setPayrollDetails(emps)
      setEmployeeCount(emps.length)
      setTotalBaseSalary(tot.baseSalary    ?? 0)
      setTotalOvertimePay(tot.overtimePay  ?? 0)
      setTotalExtraShiftPay(tot.extraShiftPay ?? 0)
      setTotalGrossPay(tot.grossPay        ?? 0)
      setTotalSalaries(tot.netPay          ?? 0)
    } catch (err) {
      logger.error('Failed to load salary data:', err)
    }
  }, [dateRange, getPayrollRange])

  const loadCOGSData = useCallback(async () => {
    try {
      if (!window.api.saleTransactions?.getByDateRange) { setTotalCOGS(0); return }
      const { startDate, endDate } = buildDateBounds(dateRange)
      const salesData = await window.api.saleTransactions.getByDateRange({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      })
      let cogs = 0
      salesData.forEach((sale: any) => {
        sale.items?.forEach((item: any) => {
          const net = item.quantity - (item.refundedQuantity || 0)
          if (net > 0 && item.product?.baseCost) cogs += net * item.product.baseCost
        })
      })
      setTotalCOGS(cogs)
    } catch (err) {
      logger.error('Failed to load COGS data:', err)
    }
  }, [dateRange, buildDateBounds])

  useEffect(() => {
    loadExpenses()
    loadSalaryData()
    loadCOGSData()
    setIncludeCOGS(localStorage.getItem('includeCOGSInCalculations') !== 'false')
    setIncludeSalaries(localStorage.getItem('includeSalariesInCalculations') !== 'false')
  }, [loadExpenses, loadSalaryData, loadCOGSData])

  useEffect(() => {
    localStorage.setItem('includeCOGSInCalculations', String(includeCOGS))
    localStorage.setItem('includeSalariesInCalculations', String(includeSalaries))
  }, [includeCOGS, includeSalaries])

  // ── helpers ──────────────────────────────────────────────────────────────

  const getCategoryName = (id: ExpenseCategory) => {
    const cat = EXPENSE_CATEGORIES.find(c => c.id === id)
    return cat ? t(cat.nameKey) : t('other')
  }

  const getCategoryColor = (id: ExpenseCategory) =>
    EXPENSE_CATEGORIES.find(c => c.id === id)?.color ?? 'bg-slate-500'

  // ── derived data ─────────────────────────────────────────────────────────

  const filteredExpenses = expenses.filter(e => {
    const matchSearch =
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.vendor ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchCat = filterCategory === 'all' || e.category === filterCategory
    return matchSearch && matchCat
  })

  const operationalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0)
  const totalExpenses = operationalExpenses + (includeCOGS ? totalCOGS : 0)
  const totalWithSalaries = totalExpenses + (includeSalaries ? totalSalaries : 0)

  const expensesByCategory = EXPENSE_CATEGORIES.map(cat => ({
    ...cat,
    total: filteredExpenses.filter(e => e.category === cat.id).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.total > 0)

  const categoriesForCharts = [
    ...expensesByCategory,
    ...(totalSalaries > 0 && includeSalaries
      ? [{ id: 'salaries' as const, nameKey: 'employeeSalaries', color: 'bg-purple-500', total: totalSalaries }]
      : []),
    ...(totalCOGS > 0 && includeCOGS
      ? [{ id: 'cogs' as const, nameKey: 'costOfGoodsSold', color: 'bg-green-500', total: totalCOGS }]
      : []),
  ]

  // ── actions ───────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingExpense(null)
    setFormData(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setFormData({
      amount:        expense.amount,
      description:   expense.description,
      category:      expense.category,
      vendor:        expense.vendor        ?? '',
      paymentMethod: expense.paymentMethod ?? 'cash',
      recurrence:    expense.recurrence    ?? 'one_time',
      date:          expense.date
                       ? new Date(expense.date).toISOString().slice(0, 10)
                       : new Date().toISOString().slice(0, 10),
      notes:         expense.notes         ?? '',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingExpense(null)
    setFormData(EMPTY_FORM)
  }

  const apiAvailable = typeof window !== 'undefined' && !!window.api.expenses?.getAll

  const handleSave = async () => {
    if (!apiAvailable) return
    if (formData.amount <= 0)         { error(t('expenseAmountRequired'));      return }
    if (!formData.description.trim()) { error(t('expenseDescriptionRequired')); return }

    try {
      const payload = {
        amount:        formData.amount,
        description:   formData.description,
        category:      formData.category,
        vendor:        formData.vendor        || undefined,
        paymentMethod: formData.paymentMethod,
        recurrence:    formData.recurrence,
        date:          formData.date,
        notes:         formData.notes         || undefined,
      }
      if (editingExpense) {
        await window.api.expenses.update(editingExpense.id, payload)
      } else {
        await window.api.expenses.create(payload)
      }
      success(editingExpense ? t('expenseUpdated') : t('expenseAdded'))
      closeModal()
      loadExpenses()
    } catch (err) {
      logger.error('Error saving expense:', err)
      error(t('failedToSaveExpense'))
    }
  }

  const handleDelete = async (id: string) => {
    if (!apiAvailable) return
    if (!confirm(t('confirmDeleteExpense'))) return
    try {
      await window.api.expenses.delete(id)
      success(t('expenseDeleted'))
      loadExpenses()
    } catch (err) {
      logger.error('Error deleting expense:', err)
      error(t('failedToDeleteExpense'))
    }
  }

  const handleExport = () => {
    try {
      const rows = filteredExpenses.map(e => ({
        Date: new Date(e.createdAt).toLocaleDateString(),
        Category: getCategoryName(e.category),
        Description: e.description.replace(/^\[.*?\]\s*/, ''),
        Amount: e.amount,
        'Added By': e.user?.username ?? 'Unknown',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Expenses')
      XLSX.writeFile(wb, `expenses-${dateRange}-${new Date().toISOString().split('T')[0]}.xlsx`)
      success(t('expensesExported'))
    } catch (err) {
      logger.error('Export error:', err)
      error(t('failedToExportExpenses'))
    }
  }

  return {
    // state
    loading,
    showModal,
    editingExpense,
    searchTerm, setSearchTerm,
    filterCategory, setFilterCategory,
    dateRange, setDateRange,
    formData, setFormData,
    includeCOGS,
    includeSalaries,
    setIncludeCOGS,
    setIncludeSalaries,
    apiAvailable,
    // derived
    filteredExpenses,
    operationalExpenses,
    totalCOGS,
    totalExpenses,
    totalSalaries,
    totalBaseSalary,
    totalOvertimePay,
    totalExtraShiftPay,
    totalGrossPay,
    totalWithSalaries,
    employeeCount,
    payrollDetails,
    categoriesForCharts,
    // helpers
    getCategoryName,
    getCategoryColor,
    // actions
    openAdd,
    openEdit,
    closeModal,
    handleSave,
    handleDelete,
    handleExport,
    t,
  }
}
