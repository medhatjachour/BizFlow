import { useState, useEffect, useMemo, useCallback } from 'react'
import { ipc } from '@renderer/utils/ipc'
import { useToast } from '@renderer/contexts/ToastContext'
import logger from '@/shared/utils/logger'
import type { SaleTransaction, DateFilter } from '../types'
import {
  filterTransactionsByDate,
  filterTransactionsBySearch,
  computeSalesStats,
  buildSalesCsv,
  downloadCsv
} from '../utils'
import { ITEMS_PER_PAGE, TRANSACTIONS_LOOKBACK_DAYS } from '../constants'

export function useSalesTransactions() {
  const { showToast } = useToast()
  const [transactions, setTransactions] = useState<SaleTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedTransactions, setExpandedTransactions] = useState<Set<string>>(
    new Set()
  )

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - TRANSACTIONS_LOOKBACK_DAYS)

      const data = await ipc.saleTransactions.getByDateRange({
        startDate,
        endDate
      })
      setTransactions(data)
    } catch (error) {
      logger.error('Failed to load transactions:', error)
      showToast('error', 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  const dateFilteredTransactions = useMemo(
    () => filterTransactionsByDate(transactions, dateFilter),
    [transactions, dateFilter]
  )

  const filteredTransactions = useMemo(
    () => filterTransactionsBySearch(dateFilteredTransactions, searchQuery),
    [dateFilteredTransactions, searchQuery]
  )

  const stats = useMemo(
    () => computeSalesStats(dateFilteredTransactions),
    [dateFilteredTransactions]
  )

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredTransactions, currentPage])

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE)

  const toggleExpanded = useCallback((transactionId: string) => {
    setExpandedTransactions((prev) => {
      const next = new Set(prev)
      if (next.has(transactionId)) {
        next.delete(transactionId)
      } else {
        next.add(transactionId)
      }
      return next
    })
  }, [])

  const handleExport = useCallback(() => {
    try {
      const csv = buildSalesCsv(filteredTransactions)
      downloadCsv(
        csv,
        `sales-report-${new Date().toISOString().split('T')[0]}.csv`
      )
    } catch (error) {
      logger.error('Failed to export:', error)
      alert('Failed to export sales report')
    }
  }, [filteredTransactions])

  const setDateFilterAndResetPage = useCallback((value: DateFilter) => {
    setDateFilter(value)
    setCurrentPage(1)
  }, [])

  const setSearchQueryAndResetPage = useCallback((value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }, [])

  return {
    transactions,
    loading,
    dateFilter,
    searchQuery,
    currentPage,
    expandedTransactions,
    dateFilteredTransactions,
    filteredTransactions,
    paginatedTransactions,
    totalPages,
    stats,
    loadTransactions,
    setDateFilter: setDateFilterAndResetPage,
    setSearchQuery: setSearchQueryAndResetPage,
    setCurrentPage,
    toggleExpanded,
    handleExport
  }
}