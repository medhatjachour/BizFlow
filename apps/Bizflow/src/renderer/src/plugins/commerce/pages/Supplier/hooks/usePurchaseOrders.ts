import { useState, useEffect, useCallback, useMemo } from 'react'
import { ipc } from '@renderer/utils/ipc'
import { useToast } from '@renderer/contexts/ToastContext'
import logger from '@/shared/utils/logger'
import type { 
  PurchaseOrderResponseDTO, 
  CreatePurchaseOrderDTO, 
  PurchaseOrderSummaryDTO,
  PurchaseOrderFilterState,
  PurchaseOrderFormData,
  POStatus,
  ProductResponseDTO,
  SupplierProductResponseDTO
} from '../types'
import { INITIAL_PO_FORM } from '../constants'

export function usePurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrderResponseDTO[]>([])
  const [products, setProducts] = useState<ProductResponseDTO[]>([])
  const [summary, setSummary] = useState<PurchaseOrderSummaryDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<PurchaseOrderFilterState>({
    search: '',
    status: 'all',
    supplierId: ''
  })

  // Modal controls
  const [showPOModal, setShowPOModal] = useState(false)
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderResponseDTO | null>(null)
  const [editingOrder, setEditingOrder] = useState<PurchaseOrderResponseDTO | null>(null)
  const [formData, setFormData] = useState<PurchaseOrderFormData>(INITIAL_PO_FORM)
  
  // Contextual supplier products
  const [activeSupplierProducts, setActiveSupplierProducts] = useState<SupplierProductResponseDTO[]>([])

  const toast = useToast()

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [poRes, prodRes, sumRes] = await Promise.all([
        ipc.purchaseOrders.getAll(),
        ipc.products.getAll({}),
        ipc.purchaseOrders.getSummary()
      ])

      setOrders(Array.isArray(poRes) ? poRes : [])
      setProducts(prodRes?.products || (Array.isArray(prodRes) ? prodRes : []))
      setSummary(sumRes || null)
    } catch (err) {
      logger.error('Failed to fetch Purchase Order data:', err)
      toast.error('Failed to load purchase orders')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Load supplier products when PO supplier changes
  useEffect(() => {
    if (!formData.supplierId) {
      setActiveSupplierProducts([])
      return
    }
    ipc.suppliers.getSupplierProducts(formData.supplierId)
      .then((res: any) => {
        if (Array.isArray(res)) setActiveSupplierProducts(res)
        else if (res?.success && Array.isArray(res.data)) setActiveSupplierProducts(res.data)
        else setActiveSupplierProducts([])
      })
      .catch(() => setActiveSupplierProducts([]))
  }, [formData.supplierId])

  const createOrder = async (): Promise<boolean> => {
    if (!formData.supplierId) {
      toast.error('Please specify a supplier')
      return false
    }
    if (formData.items.length === 0) {
      toast.error('Please add at least one line item to the order')
      return false
    }

    try {
      const payload: CreatePurchaseOrderDTO = {
        supplierId: formData.supplierId,
        expectedDate: formData.expectedDate ? new Date(formData.expectedDate) : undefined,
        taxAmount: Number(formData.taxAmount) || 0,
        shippingCost: Number(formData.shippingCost) || 0,
        notes: formData.notes.trim() || undefined,
        items: formData.items.map((it) => ({
          productId: it.productId,
          variantId: it.variantId || undefined,
          quantity: Number(it.quantity),
          unitCost: Number(it.unitCost)
        }))
      }

      const res = await ipc.purchaseOrders.create(payload)
      if (res) {
        toast.success('Purchase Order drafted successfully')
        setShowPOModal(false)
        setFormData(INITIAL_PO_FORM)
        loadData()
        return true
      }
      return false
    } catch (error: any) {
      logger.error('Create PO failed:', error)
      toast.error(error?.message || 'Failed to create purchase order')
      return false
    }
  }

  const updateOrderStatus = async (orderId: string, status: POStatus) => {
    try {
      const res = await ipc.purchaseOrders.update(orderId, { status })
      if (res) {
        toast.success(`Purchase order moved to ${status}`)
        loadData()
      }
    } catch (err) {
      logger.error('Update PO status error:', err)
      toast.error('Failed to change status')
    }
  }

  const receiveOrder = async (orderId: string): Promise<boolean> => {
    try {
      const res = await ipc.purchaseOrders.receive(orderId)
      if (res) {
        toast.success('Inventory stocks successfully reconciled & received')
        setShowReceiveModal(false)
        setSelectedOrder(null)
        loadData()
        return true
      }
      return false
    } catch (err: any) {
      logger.error('Receive order error:', err)
      toast.error(err?.message || 'Failed to receive purchase order')
      return false
    }
  }

  const deleteOrder = async (orderId: string) => {
    try {
      await ipc.purchaseOrders.delete(orderId)
      toast.success('Purchase order removed')
      loadData()
    } catch (err) {
      logger.error('Delete PO error:', err)
      toast.error('Failed to delete purchase order')
    }
  }

  const openCreatePO = (prefillSupplierId?: string) => {
    setEditingOrder(null)
    setFormData({
      ...INITIAL_PO_FORM,
      supplierId: prefillSupplierId || ''
    })
    setShowPOModal(true)
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const term = filters.search.toLowerCase().trim()
      const matchesSearch =
        !term ||
        o.poNumber.toLowerCase().includes(term) ||
        o.supplier?.name.toLowerCase().includes(term)

      const matchesStatus = filters.status === 'all' || o.status === filters.status
      const matchesSupplier = !filters.supplierId || o.supplierId === filters.supplierId

      return matchesSearch && matchesStatus && matchesSupplier
    })
  }, [orders, filters])

  return {
    orders: filteredOrders,
    rawOrders: orders,
    products,
    activeSupplierProducts,
    summary,
    loading,
    filters,
    setFilters,
    showPOModal,
    setShowPOModal,
    showReceiveModal,
    setShowReceiveModal,
    selectedOrder,
    setSelectedOrder,
    editingOrder,
    formData,
    setFormData,
    openCreatePO,
    createOrder,
    updateOrderStatus,
    receiveOrder,
    deleteOrder,
    refetch: loadData
  }
}