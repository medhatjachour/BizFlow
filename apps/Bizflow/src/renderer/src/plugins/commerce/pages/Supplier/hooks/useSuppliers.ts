import { useState, useEffect, useCallback, useMemo } from 'react'
import { ipc } from '@renderer/utils/ipc'
import { useToast } from '@renderer/contexts/ToastContext'
import logger from '@/shared/utils/logger'
import type { 
  SupplierResponseDTO, 
  CreateSupplierDTO, 
  UpdateSupplierDTO,
  SupplierProductResponseDTO,
  CreateSupplierProductDTO,
  SupplierFilterState,
  SupplierFormData
} from '../types'
import { INITIAL_SUPPLIER_FORM } from '../constants'

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<SupplierResponseDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<SupplierFilterState>({ search: '', status: 'all' })
  
  // Modals state
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<SupplierResponseDTO | null>(null)
  const [formData, setFormData] = useState<SupplierFormData>(INITIAL_SUPPLIER_FORM)

  // Products linked state
  const [viewingSupplier, setViewingSupplier] = useState<SupplierResponseDTO | null>(null)
  const [supplierProducts, setSupplierProducts] = useState<SupplierProductResponseDTO[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  const toast = useToast()

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true)
      const result = await ipc.suppliers.getAll({ pageSize: 1000 })
      if (result?.success && Array.isArray(result.data?.data)) {
        setSuppliers(result.data.data)
      } else if (Array.isArray(result)) {
        setSuppliers(result)
      } else {
        setSuppliers([])
      }
    } catch (error) {
      logger.error('Failed to load suppliers:', error)
      toast.error('Failed to load suppliers data')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadSuppliers()
  }, [loadSuppliers])

  const loadSupplierProducts = useCallback(async (supplierId: string) => {
    try {
      setLoadingProducts(true)
      const result = await ipc.suppliers.getSupplierProducts(supplierId)
      if (Array.isArray(result)) {
        setSupplierProducts(result)
      } else if (result?.success && Array.isArray(result.data)) {
        setSupplierProducts(result.data)
      } else {
        setSupplierProducts([])
      }
    } catch (error) {
      logger.error('Failed to fetch supplier products:', error)
      setSupplierProducts([])
    } finally {
      setLoadingProducts(false)
    }
  }, [])

  const saveSupplier = async (): Promise<boolean> => {
    try {
      if (!formData.name.trim()) {
        toast.error('Supplier name is required')
        return false
      }

      if (editingSupplier) {
        const updateData: UpdateSupplierDTO = {
          name: formData.name.trim(),
          contactName: formData.contactName.trim() || undefined,
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          address: formData.address.trim() || undefined,
          paymentTerms: formData.paymentTerms.trim() || undefined,
          notes: formData.notes.trim() || undefined
        }
        const res = await ipc.suppliers.update(editingSupplier.id, updateData)
        if (res?.success) {
          toast.success('Supplier updated successfully')
          await loadSuppliers()
          return true
        }
        toast.error(res?.message || 'Failed to update supplier')
        return false
      } else {
        const createData: CreateSupplierDTO = {
          name: formData.name.trim(),
          contactName: formData.contactName.trim() || undefined,
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          address: formData.address.trim() || undefined,
          paymentTerms: formData.paymentTerms.trim() || undefined,
          notes: formData.notes.trim() || undefined
        }
        const res = await ipc.suppliers.create(createData)
        if (res?.success) {
          toast.success('Supplier registered successfully')
          await loadSuppliers()
          return true
        }
        toast.error(res?.message || 'Failed to create supplier')
        return false
      }
    } catch (err) {
      logger.error('Save supplier failed:', err)
      toast.error('Operation failed')
      return false
    }
  }

  const toggleSupplierStatus = async (supplier: SupplierResponseDTO) => {
    try {
      const nextStatus = !supplier.isActive
      const res = await ipc.suppliers.update(supplier.id, { isActive: nextStatus })
      if (res?.success) {
        toast.success(`Supplier marked as ${nextStatus ? 'active' : 'inactive'}`)
        loadSuppliers()
      } else {
        toast.error(res?.message || 'Status change failed')
      }
    } catch (error) {
      logger.error('Toggle status error:', error)
      toast.error('Failed to change status')
    }
  }

  const addProductToSupplier = async (supplierId: string, payload: CreateSupplierProductDTO): Promise<boolean> => {
    try {
      const res = await ipc.suppliers.addSupplierProduct(supplierId, payload)
      if (res?.success || res?.data) {
        toast.success('Product catalog link established')
        await loadSupplierProducts(supplierId)
        await loadSuppliers()
        return true
      }
      toast.error(res?.message || 'Failed to link product')
      return false
    } catch (error) {
      logger.error('Error linking product:', error)
      toast.error('An error occurred while linking product')
      return false
    }
  }

  const removeProductFromSupplier = async (supplierProductId: string, supplierId: string) => {
    try {
      const res = await ipc.suppliers.removeSupplierProduct(supplierProductId)
      if (res?.success !== false) {
        toast.success('Product unlinked from supplier')
        await loadSupplierProducts(supplierId)
        await loadSuppliers()
      } else {
        toast.error(res?.message || 'Failed to unlink product')
      }
    } catch (err) {
      logger.error('Remove supplier product error:', err)
      toast.error('Failed to unlink product')
    }
  }

  const openCreateModal = () => {
    setEditingSupplier(null)
    setFormData(INITIAL_SUPPLIER_FORM)
    setShowSupplierModal(true)
  }

  const openEditModal = (supplier: SupplierResponseDTO) => {
    setEditingSupplier(supplier)
    setFormData({
      name: supplier.name,
      contactName: supplier.contactName || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      paymentTerms: supplier.paymentTerms || '',
      notes: supplier.notes || ''
    })
    setShowSupplierModal(true)
  }

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const term = filters.search.toLowerCase().trim()
      const matchesSearch =
        !term ||
        s.name.toLowerCase().includes(term) ||
        (s.contactName && s.contactName.toLowerCase().includes(term)) ||
        (s.email && s.email.toLowerCase().includes(term)) ||
        (s.phone && s.phone.includes(term))

      const matchesStatus =
        filters.status === 'all'
          ? true
          : filters.status === 'active'
          ? s.isActive
          : !s.isActive

      return matchesSearch && matchesStatus
    })
  }, [suppliers, filters])

  const stats = useMemo(() => {
    const activeSuppliers = suppliers.filter((s) => s.isActive).length
    const totalOrders = suppliers.reduce((acc, s) => acc + (s.totalPurchaseOrders || 0), 0)
    const totalSpend = suppliers.reduce((acc, s) => acc + (s.totalPurchased || 0), 0)

    return {
      totalSuppliers: suppliers.length,
      activeSuppliers,
      inactiveSuppliers: suppliers.length - activeSuppliers,
      totalOrders,
      totalSpend
    }
  }, [suppliers])

  return {
    suppliers: filteredSuppliers,
    rawSuppliers: suppliers,
    loading,
    filters,
    setFilters,
    stats,
    showSupplierModal,
    setShowSupplierModal,
    editingSupplier,
    formData,
    setFormData,
    openCreateModal,
    openEditModal,
    saveSupplier,
    toggleSupplierStatus,
    viewingSupplier,
    setViewingSupplier,
    supplierProducts,
    loadingProducts,
    loadSupplierProducts,
    addProductToSupplier,
    removeProductFromSupplier,
    refetch: loadSuppliers
  }
}