import { useState, useEffect, useCallback, useRef } from 'react'
import { ipc } from '@renderer/utils/ipc'
import { useToast } from '@renderer/contexts/ToastContext'
import logger from '@/shared/utils/logger'
import type {
  Installment,
  InstallmentStatusFilter,
  InstallmentDateFilter
} from '../types'
import {
  buildInstallmentsCsv,
  downloadCsv
} from '../utils'
import {
  INSTALLMENT_ITEMS_PER_PAGE,
  SEARCH_DEBOUNCE_MS,
  EXPORT_INSTALLMENTS_LIMIT
} from '../constants'

export function useInstallments(active: boolean) {
  const { showToast } = useToast()
  const [installments, setInstallments] = useState<Installment[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] =
    useState<InstallmentStatusFilter>('all')
  const [dateFilter, setDateFilter] = useState<InstallmentDateFilter>('all')

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const loadInstallments = useCallback(
    async (page = 1) => {
      try {
        setLoading(true)
        const result = await ipc.installments.list({
          page,
          limit: INSTALLMENT_ITEMS_PER_PAGE,
          status: statusFilter,
          search: searchQuery,
          dateFilter
        })

        setInstallments(result.installments || [])
        setTotalItems(result.total || 0)
        setTotalPages(result.totalPages || 1)
        setCurrentPage(page)
      } catch (error) {
        logger.error('Failed to load installments:', error)
        setInstallments([])
        setTotalItems(0)
        setTotalPages(1)
      } finally {
        setLoading(false)
      }
    },
    [statusFilter, searchQuery, dateFilter]
  )

  const debouncedLoad = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      loadInstallments(1)
    }, SEARCH_DEBOUNCE_MS)
  }, [loadInstallments])

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (active) {
      loadInstallments(1)
    }
  }, [active, statusFilter, dateFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const setSearchQueryDebounced = useCallback(
    (value: string) => {
      setSearchQuery(value)
      setCurrentPage(1)
      debouncedLoad()
    },
    [debouncedLoad]
  )

  const setStatusFilterAndReload = useCallback(
    (value: InstallmentStatusFilter) => {
      setStatusFilter(value)
      setCurrentPage(1)
      // load triggered by effect
    },
    []
  )

  const setDateFilterAndReload = useCallback(
    (value: InstallmentDateFilter) => {
      setDateFilter(value)
      setCurrentPage(1)
      // load triggered by effect
    },
    []
  )

  const handleMarkAsPaid = useCallback(
    async (installmentId: string) => {
      try {
        await ipc.installments.markAsPaid({ installmentId })
        showToast('success', 'Installment marked as paid successfully')
        loadInstallments(currentPage)
      } catch (error) {
        logger.error('Error marking installment as paid:', error)
        showToast('error', 'Failed to mark installment as paid')
      }
    },
    [showToast, loadInstallments, currentPage]
  )

  const handleExport = useCallback(async () => {
    try {
      const result = await ipc.installments.list({
        page: 1,
        limit: EXPORT_INSTALLMENTS_LIMIT,
        status: statusFilter,
        search: searchQuery,
        dateFilter
      })

      const allInstallments = result.installments || []
      const csv = buildInstallmentsCsv(allInstallments)
      downloadCsv(
        csv,
        `installments-report-${new Date().toISOString().split('T')[0]}.csv`
      )
    } catch (error) {
      logger.error('Failed to export installments:', error)
      alert('Failed to export installments report')
    }
  }, [statusFilter, searchQuery, dateFilter])

  return {
    installments,
    loading,
    currentPage,
    totalPages,
    totalItems,
    searchQuery,
    statusFilter,
    dateFilter,
    loadInstallments,
    setSearchQuery: setSearchQueryDebounced,
    setStatusFilter: setStatusFilterAndReload,
    setDateFilter: setDateFilterAndReload,
    handleMarkAsPaid,
    handleExport
  }
}