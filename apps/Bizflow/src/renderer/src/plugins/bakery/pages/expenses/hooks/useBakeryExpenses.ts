import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import {
  BakeryExpense,
  ExpenseSummary,
  DateRangeKey,
  SortField,
  SortOrder,
  ExpenseFormData,
} from '../types'
import { buildDateBounds } from '../utils'

export function useBakeryExpenses() {
  const { showToast } = useToast()

  const [expenses, setExpenses] = useState<BakeryExpense[]>([])
  const [summary, setSummary] = useState<ExpenseSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<DateRangeKey>('30days')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<BakeryExpense | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    try {
      const { start, end } = buildDateBounds(range)
      const queryParams = {
        startDate: start,
        endDate: end,
        ...(categoryFilter ? { category: categoryFilter } : {}),
        pageSize: 300,
      }

      const [res, sum] = await Promise.all([
        window.api.bakery.expenses.getAll(queryParams),
        window.api.bakery.expenses.getSummary({ startDate: start, endDate: end }),
      ])

      setExpenses(res.data || [])
      setSummary(sum || { totalAmount: 0, byCategory: [] })
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to load bakery expenses')
    } finally {
      setLoading(false)
    }
  }, [range, categoryFilter, showToast])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const handleSaveExpense = async (data: ExpenseFormData, id?: string) => {
    const payload = {
      ...data,
      amount: parseFloat(data.amount),
      date: new Date(data.date).toISOString(),
      vendor: data.vendor.trim() || null,
      notes: data.notes.trim() || null,
    }

    if (id) {
      await window.api.bakery.expenses.update(id, payload)
      showToast('success', 'Expense updated successfully')
    } else {
      await window.api.bakery.expenses.create(payload)
      showToast('success', 'New expense created')
    }

    setFormModalOpen(false)
    setEditingExpense(null)
    fetchExpenses()
  }

  const handleDeleteExpense = async (id: string) => {
    try {
      await window.api.bakery.expenses.delete(id)
      showToast('success', 'Expense deleted successfully')
      setDeletingId(null)
      fetchExpenses()
    } catch {
      showToast('error', 'Failed to delete expense')
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const filteredAndSortedExpenses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    const result = expenses.filter(exp => {
      const matchDesc = exp.description.toLowerCase().includes(q)
      const matchVendor = (exp.vendor ?? '').toLowerCase().includes(q)
      return !q || matchDesc || matchVendor
    })

    return result.sort((a, b) => {
      let cmp = 0
      if (sortField === 'date') {
        cmp = new Date(a.date).getTime() - new Date(b.date).getTime()
      } else if (sortField === 'amount') {
        cmp = a.amount - b.amount
      } else if (sortField === 'description') {
        cmp = a.description.localeCompare(b.description)
      }
      return sortOrder === 'asc' ? cmp : -cmp
    })
  }, [expenses, searchQuery, sortField, sortOrder])

  const totalVisibleAmount = useMemo(() => {
    return filteredAndSortedExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  }, [filteredAndSortedExpenses])

  const openCreateModal = () => {
    setEditingExpense(null)
    setFormModalOpen(true)
  }

  const openEditModal = (expense: BakeryExpense) => {
    setEditingExpense(expense)
    setFormModalOpen(true)
  }

  return {
    expenses: filteredAndSortedExpenses,
    rawCount: expenses.length,
    summary,
    loading,
    range,
    setRange,
    categoryFilter,
    setCategoryFilter,
    searchQuery,
    setSearchQuery,
    sortField,
    sortOrder,
    handleSort,
    totalVisibleAmount,
    // Modals
    formModalOpen,
    setFormModalOpen,
    editingExpense,
    openCreateModal,
    openEditModal,
    deletingId,
    setDeletingId,
    // Operations
    handleSaveExpense,
    handleDeleteExpense,
    refresh: fetchExpenses,
  }
}