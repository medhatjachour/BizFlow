import { useState, useEffect, useRef } from 'react'
import type { CustomerLite } from '../types'

export function useCustomerSearch() {
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerLite | null>(null)
  const [customerResults, setCustomerResults] = useState<CustomerLite[]>([])
  const [searching, setSearching] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    const q = customerSearch.trim()
    if (!q) {
      setCustomerResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await (window as any).api?.vet?.owners?.searchLite(q)
        setCustomerResults(res ?? [])
      } catch {
        setCustomerResults([])
      } finally {
        setSearching(false)
      }
    }, 250)
  }, [customerSearch])

  return {
    customerSearch,
    setCustomerSearch,
    selectedCustomer,
    setSelectedCustomer,
    customerResults,
    searching,
    dropdownOpen,
    setDropdownOpen,
    clearCustomer: () => {
      setSelectedCustomer(null)
      setCustomerSearch('')
      setCustomerResults([])
    }
  }
}