import { useState, useCallback } from 'react'
import type { CoffeeCustomer, NewCustomerForm } from '../types'
import { EMPTY_NEW_CUSTOMER } from '../constants'

export function useCustomerSearch(toast: any) {
  const [search,       setSearch]       = useState('')
  const [results,      setResults]      = useState<CoffeeCustomer[]>([])
  const [showDrop,     setShowDrop]     = useState(false)
  const [selected,     setSelected]     = useState<CoffeeCustomer | null>(null)
  const [newCustModal, setNewCustModal] = useState(false)
  const [newCustForm,  setNewCustForm]  = useState<NewCustomerForm>({ ...EMPTY_NEW_CUSTOMER })
  const [saving,       setSaving]       = useState(false)

  const doSearch = useCallback(async (q: string) => {
    setSearch(q)
    setShowDrop(true)
    if (!q.trim()) { setResults([]); return }
    try {
      setResults(await window.api.coffee.customers.search(q) ?? [])
    } catch {
      setResults([])
    }
  }, [])

  const select = useCallback((c: CoffeeCustomer) => {
    setSelected(c)
    setSearch('')
    setShowDrop(false)
    setResults([])
  }, [])

  const clear = useCallback(() => {
    setSelected(null)
    setSearch('')
    setResults([])
  }, [])

  const patchNewCustForm = useCallback((patch: Partial<NewCustomerForm>) => {
    setNewCustForm(prev => ({ ...prev, ...patch }))
  }, [])

  const createNew = useCallback(async () => {
    if (!newCustForm.name.trim()) {
      toast.error('Customer name is required')
      return null
    }
    setSaving(true)
    try {
      const c = await window.api.coffee.customers.create({
        name: newCustForm.name.trim(),
        phone: newCustForm.phone || undefined,
        address: newCustForm.address || undefined,
      })
      select(c)
      setNewCustModal(false)
      setNewCustForm({ ...EMPTY_NEW_CUSTOMER })
      toast.success('Customer added')
      return c
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create customer')
      return null
    } finally {
      setSaving(false)
    }
  }, [newCustForm, select, toast])

  return {
    search, results, showDrop, selected, newCustModal, newCustForm, saving,
    doSearch, select, clear, setShowDrop,
    setNewCustModal, patchNewCustForm, createNew,
  }
}
