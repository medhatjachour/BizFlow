import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { PAGE_SIZE } from '../constants'
import type { Customer, CustomerDetail, CustomerFilters, CustomerListResponse } from '../types'

export function useCustomers(filters: CustomerFilters) {
  const toast = useToast()
  const { t } = useLanguage()
  
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await window.api.coffee.customers.getAll({
        search: filters.search || undefined,
        sort: filters.sort,
        page,
        pageSize: PAGE_SIZE
      }) as CustomerListResponse
      
      setCustomers(res?.items ?? [])
      setTotal(res?.total ?? 0)
    } catch {
      toast.error(t('cfFailedToLoadCustomers'))
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => { setPage(1) }, [filters])
  useEffect(() => { load() }, [load])

  const createCustomer = async (data: any) => {
    await window.api.coffee.customers.create(data)
    load()
    toast.success(t('cfCustomerAdded'))
  }

  const updateCustomer = async (id: string, data: any) => {
    await window.api.coffee.customers.update({ id, ...data })
    load()
    toast.success(t('cfCustomerUpdated'))
  }

  const deleteCustomer = async (id: string) => {
    await window.api.coffee.customers.delete(id)
    load()
    toast.success(t('cfTableRemoved'))
  }

  return { 
    customers, loading, page, totalPages, total, 
    setPage, reload: load, 
    createCustomer, updateCustomer, deleteCustomer 
  }
}

export function useCustomerProfile() {
  const toast = useToast()
  const { t } = useLanguage()
  const [profile, setProfile] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(false)

  const loadProfile = useCallback(async (id: string) => {
    setLoading(true)
    setProfile(null)
    try {
      const res = await window.api.coffee.customers.getById(id)
      setProfile(res as CustomerDetail)
    } catch {
      toast.error(t('FailedToLoadProfile'))
    } finally {
      setLoading(false)
    }
  }, [])

  const clearProfile = () => setProfile(null)

  return { profile, loading, loadProfile, clearProfile }
}
