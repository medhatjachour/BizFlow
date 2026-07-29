import { useState, useCallback, useEffect } from 'react'
import type { Customer } from '../../POS/types'
import logger from '@/shared/utils/logger'

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerQuery, setCustomerQuery] = useState('')
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)

  const loadCustomers = useCallback(async () => {
    try {
      const result = await window.api.customers.getAll()

      if (result && Array.isArray(result.customers)) {
        setCustomers(result.customers)
      } else if (Array.isArray(result)) {
        setCustomers(result)
      } else {
        setCustomers([])
      }
    } catch (error) {
      logger.error('Error loading customers:', error)
      setCustomers([])
    }
  }, [])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  const handleCustomerAdded = useCallback(
    (newCustomer: Customer) => {
      loadCustomers()
      setSelectedCustomer(newCustomer)
      setShowAddCustomerModal(false)
    },
    [loadCustomers]
  )

  const resetCustomer = useCallback(() => {
    setSelectedCustomer(null)
    setCustomerQuery('')
  }, [])

  return {
    customers,
    selectedCustomer,
    setSelectedCustomer,
    customerQuery,
    setCustomerQuery,
    showAddCustomerModal,
    setShowAddCustomerModal,
    handleCustomerAdded,
    resetCustomer,
  }
}