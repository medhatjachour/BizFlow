import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import logger from '@/shared/utils/logger'
import { EXPENSE_CATEGORIES, EMPTY_EXPENSE_FORM } from '../constants'
import { buildDateBounds, exportExpensesToExcel } from '../utils'
import type {
  Expense,
  ExpenseCategory,
  ExpenseFormData,
  DateRange,
  PayrollEmployee,
  PaymentMethod,
  ViewMode
} from '../types'

export function useExpenses() {
  const { success, error } = useToast()
  const { t, language } = useLanguage()

  // State
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [viewingReceipt, setViewingReceipt] = useState<Expense | null>(null)
  
  // Filters & Layout State
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | 'all'>('all')
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<PaymentMethod | 'all'>('all')
  const [dateRange, setDateRange] = useState<DateRange>('30days')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Payroll & COGS
  const [totalSalaries, setTotalSalaries] = useState(0)
  const [totalBaseSalary, setTotalBaseSalary] = useState(0)
  const [totalOvertimePay, setTotalOvertimePay] = useState(0)
  const [totalExtraShiftPay, setTotalExtraShiftPay] = useState(0)
  const [totalGrossPay, setTotalGrossPay] = useState(0)
  const [payrollDetails, setPayrollDetails] = useState<PayrollEmployee[]>([])
  const [employeeCount, setEmployeeCount] = useState(0)
  const [totalCOGS, setTotalCOGS] = useState(0)
  
  // Toggle switches
  const [includeCOGS, setIncludeCOGS] = useState(() => localStorage.getItem('bizflow:expenses:cogs') !== 'false')
  const [includeSalaries, setIncludeSalaries] = useState(() => localStorage.getItem('bizflow:expenses:salaries') !== 'false')
  const [formData, setFormData] = useState<ExpenseFormData>(EMPTY_EXPENSE_FORM)

  const apiAvailable = typeof window !== 'undefined' && !!window.api?.expenses?.getAll

  // Load Main Expenses
  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true)
      if (!window.api?.expenses?.getAll) {
        setExpenses([])
        return
      }
      const { startDate, endDate } = buildDateBounds(dateRange)
      const data = await window.api.expenses.getAll({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      })
      setExpenses(data || [])
    } catch (err) {
      logger.error('Error loading expenses:', err)
      error(t('failedToLoadData') || 'Failed to load expense records')
    } finally {
      setLoading(false)
    }
  }, [dateRange, error, t])

  // Load Payroll
  const loadSalaryData = useCallback(async () => {
    try {
      if (!window.api?.employees?.payroll?.getSummary) return
      const now = new Date()
      const result = await window.api.employees.payroll.getSummary({
        startYear: dateRange === '90days' ? now.getFullYear() : now.getFullYear(),
        startMonth: dateRange === '90days' ? Math.max(1, now.getMonth() - 2) : now.getMonth() + 1,
        endYear: now.getFullYear(),
        endMonth: now.getMonth() + 1,
      })
      const emps: PayrollEmployee[] = result?.employees ?? []
      const tot = result?.totals ?? {}
      setPayrollDetails(emps)
      setEmployeeCount(emps.length)
      setTotalBaseSalary(tot.baseSalary ?? 0)
      setTotalOvertimePay(tot.overtimePay ?? 0)
      setTotalExtraShiftPay(tot.extraShiftPay ?? 0)
      setTotalGrossPay(tot.grossPay ?? 0)
      setTotalSalaries(tot.netPay ?? 0)
    } catch (err) {
      logger.error('Failed to load salary data:', err)
    }
  }, [dateRange])

  // Load COGS
  const loadCOGSData = useCallback(async () => {
    try {
      if (!window.api?.saleTransactions?.getByDateRange) {
        setTotalCOGS(0)
        return
      }
      const { startDate, endDate } = buildDateBounds(dateRange)
      const salesData = await window.api.saleTransactions.getByDateRange({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      })
      let cogs = 0
      salesData?.forEach((sale: any) => {
        sale.items?.forEach((item: any) => {
          const net = item.quantity - (item.refundedQuantity || 0)
          if (net > 0 && item.product?.baseCost) {
            cogs += net * item.product.baseCost
          }
        })
      })
      setTotalCOGS(cogs)
    } catch (err) {
      logger.error('Failed to load COGS data:', err)
    }
  }, [dateRange])

  useEffect(() => {
    loadExpenses()
    loadSalaryData()
    loadCOGSData()
  }, [loadExpenses, loadSalaryData, loadCOGSData])

  useEffect(() => {
    localStorage.setItem('bizflow:expenses:cogs', String(includeCOGS))
    localStorage.setItem('bizflow:expenses:salaries', String(includeSalaries))
  }, [includeCOGS, includeSalaries])

  // Helpers
  const getCategoryName = useCallback((id: ExpenseCategory) => {
    const cat = EXPENSE_CATEGORIES.find((c) => c.id === id)
    return cat ? t(cat.nameKey) || id : t('other') || 'Other'
  }, [t])

  const getCategoryConfig = useCallback((id: ExpenseCategory) => {
    return EXPENSE_CATEGORIES.find((c) => c.id === id) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
  }, [])

  // Filtered dataset
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const q = searchTerm.toLowerCase().trim()
      const matchSearch =
        !q ||
        e.description?.toLowerCase().includes(q) ||
        (e.vendor ?? '').toLowerCase().includes(q) ||
        (e.referenceNumber ?? '').toLowerCase().includes(q)

      const matchCat = filterCategory === 'all' || e.category === filterCategory
      const matchMethod = filterPaymentMethod === 'all' || e.paymentMethod === filterPaymentMethod
      return matchSearch && matchCat && matchMethod
    })
  }, [expenses, searchTerm, filterCategory, filterPaymentMethod])

  // Aggregate stats
  const operationalExpenses = useMemo(() => filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0), [filteredExpenses])
  const taxDeductibleTotal = useMemo(() => filteredExpenses.filter(e => e.isTaxDeductible).reduce((s, e) => s + (e.amount || 0), 0), [filteredExpenses])
  const totalExpenses = operationalExpenses + (includeCOGS ? totalCOGS : 0)
  const totalWithSalaries = totalExpenses + (includeSalaries ? totalSalaries : 0)

  const categoriesForCharts = useMemo(() => {
    const byCategory = EXPENSE_CATEGORIES.map((cat) => ({
      ...cat,
      total: filteredExpenses.filter((e) => e.category === cat.id).reduce((s, e) => s + e.amount, 0),
    })).filter((c) => c.total > 0)

    return [
      ...byCategory,
      ...(totalSalaries > 0 && includeSalaries
        ? [{ id: 'salaries' as const, nameKey: 'employeeSalaries', color: 'bg-purple-500', total: totalSalaries }]
        : []),
      ...(totalCOGS > 0 && includeCOGS
        ? [{ id: 'cogs' as const, nameKey: 'costOfGoodsSold', color: 'bg-green-500', total: totalCOGS }]
        : []),
    ]
  }, [filteredExpenses, totalSalaries, totalCOGS, includeCOGS, includeSalaries])

  // Actions
  const openAdd = () => {
    setEditingExpense(null)
    setFormData(EMPTY_EXPENSE_FORM)
    setShowModal(true)
  }

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setFormData({
      amount: expense.amount,
      description: expense.description,
      category: expense.category,
      vendor: expense.vendor ?? '',
      paymentMethod: expense.paymentMethod ?? 'cash',
      recurrence: expense.recurrence ?? 'one_time',
      date: expense.date ? new Date(expense.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      notes: expense.notes ?? '',
      referenceNumber: expense.referenceNumber ?? '',
      isTaxDeductible: expense.isTaxDeductible ?? false,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingExpense(null)
    setFormData(EMPTY_EXPENSE_FORM)
  }

  const handleSave = async () => {
    if (!apiAvailable) return
    if (formData.amount <= 0) {
      error(t('expenseAmountRequired') || 'Amount must be greater than 0')
      return
    }
    if (!formData.description.trim()) {
      error(t('expenseDescriptionRequired') || 'Description is required')
      return
    }

    try {
      const payload = {
        amount: Number(formData.amount),
        description: formData.description.trim(),
        category: formData.category,
        vendor: formData.vendor.trim() || undefined,
        paymentMethod: formData.paymentMethod,
        recurrence: formData.recurrence,
        date: formData.date,
        notes: formData.notes.trim() || undefined,
        referenceNumber: formData.referenceNumber.trim() || undefined,
        isTaxDeductible: formData.isTaxDeductible,
      }

      if (editingExpense) {
        await window.api.expenses.update(editingExpense.id, payload)
        success(t('expenseUpdated') || 'Expense record updated')
      } else {
        await window.api.expenses.create(payload)
        success(t('expenseAdded') || 'Expense logged successfully')
      }
      closeModal()
      loadExpenses()
    } catch (err) {
      logger.error('Error saving expense:', err)
      error(t('failedToSaveExpense') || 'Failed to save expense')
    }
  }

  const handleDelete = async (id: string) => {
    if (!apiAvailable) return
    if (!confirm(t('confirmDeleteExpense') || 'Are you sure you want to remove this expense record?')) return
    try {
      await window.api.expenses.delete(id)
      success(t('expenseDeleted') || 'Expense deleted')
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      loadExpenses()
    } catch (err) {
      logger.error('Error deleting expense:', err)
      error(t('failedToDeleteExpense') || 'Failed to delete expense')
    }
  }

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (!selectedIds.size || !apiAvailable) return
    if (!confirm(t('confirmBulkDeleteExpenses') || `Delete ${selectedIds.size} selected expenses?`)) return
    try {
      for (const id of Array.from(selectedIds)) {
        await window.api.expenses.delete(id)
      }
      success(t('bulkDeleteSuccess') || 'Selected expenses deleted successfully')
      setSelectedIds(new Set())
      loadExpenses()
    } catch (err) {
      logger.error('Failed bulk delete:', err)
      error(t('failedToDeleteExpense') || 'Failed to delete some records')
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredExpenses.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredExpenses.map((e) => e.id)))
    }
  }

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleExport = () => {
    try {
      exportExpensesToExcel(filteredExpenses, getCategoryName, `expenses-${dateRange}`)
      success(t('expensesExported') || 'Expenses exported to Excel')
    } catch (err) {
      logger.error('Export error:', err)
      error(t('failedToExportExpenses') || 'Failed to export Excel file')
    }
  }

  return {
    // states
    loading,
    showModal,
    editingExpense,
    viewingReceipt,
    setViewingReceipt,
    searchTerm,
    setSearchTerm,
    filterCategory,
    setFilterCategory,
    filterPaymentMethod,
    setFilterPaymentMethod,
    dateRange,
    setDateRange,
    viewMode,
    setViewMode,
    selectedIds,
    formData,
    setFormData,
    includeCOGS,
    includeSalaries,
    setIncludeCOGS,
    setIncludeSalaries,
    apiAvailable,
    language,

    // aggregates
    filteredExpenses,
    operationalExpenses,
    taxDeductibleTotal,
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
    getCategoryConfig,

    // operations
    openAdd,
    openEdit,
    closeModal,
    handleSave,
    handleDelete,
    handleBulkDelete,
    toggleSelectAll,
    toggleSelectRow,
    handleExport,
    loadExpenses,
    t,
  }
}