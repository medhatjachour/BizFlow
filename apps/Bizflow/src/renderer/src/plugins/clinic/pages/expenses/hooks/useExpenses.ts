import { useState, useCallback, useEffect } from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'
import type { Expense, ExpenseSummary, PeriodFilter } from '../types'

export function useExpenses() {
  const { t } = useLanguage()
  const { showToast } = useToast()

  const [period, setPeriod] = useState<PeriodFilter>('month')
  const [category, setCategory] = useState<string>('')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [summary, setSummary] = useState<ExpenseSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [expData, sumData] = await Promise.all([
        window.api.clinic.expenses.getAll({ period, category: category || undefined }),
        window.api.clinic.expenses.summary(period)
      ])
      setExpenses(expData ?? [])
      setSummary(sumData ?? null)
    } catch {
      showToast('error', t('errorLoadingData') || 'Failed to load expense records')
    } finally {
      setLoading(false)
    }
  }, [period, category, showToast, t])

  useEffect(() => {
    loadData()
  }, [loadData])

  const deleteExpense = async (id: string) => {
    try {
      await window.api.clinic.expenses.delete(id)
      showToast('success', t('deletedSuccessfully') || 'Expense record deleted')
      await loadData()
    } catch {
      showToast('error', t('errorDeletingRecord') || 'Error deleting expense')
    }
  }

  return {
    expenses,
    summary,
    loading,
    period,
    category,
    setPeriod,
    setCategory,
    reload: loadData,
    deleteExpense
  }
}