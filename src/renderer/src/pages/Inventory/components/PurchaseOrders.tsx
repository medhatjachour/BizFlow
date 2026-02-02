/**
 * Purchase Orders Management Component
 *
 * Features:
 * - Purchase order CRUD operations
 * - Order status management (draft, ordered, received, cancelled)
 * - Inventory integration on order receipt
 * - Supplier and product relationship management
 * - Order tracking and metrics
 */

import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit, Trash2, Package, DollarSign, Truck, CheckCircle, XCircle, Clock, RefreshCw, ShoppingCart, Search } from 'lucide-react'
import { useToast } from '../../../contexts/ToastContext'
import { ipc } from '../../../utils/ipc'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table'
import Badge from '../../../components/ui/Badge'
import type { PurchaseOrderResponseDTO, CreatePurchaseOrderDTO, UpdatePurchaseOrderDTO, PurchaseOrderSummaryDTO } from '../../../../../shared/dtos/purchase-order.dto'
import type { SupplierResponseDTO } from '../../../../../shared/dtos/supplier.dto'
import type { ProductResponseDTO } from '../../../../../shared/dtos/product.dto'

interface PurchaseOrderFormData {
  supplierId: string
  expectedDate: string
  taxAmount: number
  shippingCost: number
  notes: string
  items: {
    productId: string
    variantId?: string
    quantity: number
    unitCost: number
  }[]
}

interface PurchaseOrderItemForm {
  productId: string
  variantId?: string
  quantity: number
  unitCost: number
}

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'gray', icon: Edit },
  ordered: { label: 'Ordered', color: 'blue', icon: Clock },
  received: { label: 'Received', color: 'green', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'red', icon: XCircle }
} as const

interface PrefilledPurchaseOrder {
  productId: string
  variantId: string
  productName: string
  variantName: string
  suggestedQty: number
  supplierInfo?: {
    supplierId?: string
    supplierName: string
    cost: number
    leadTime: number
  }
}

interface PurchaseOrdersProps {
  prefilledData?: PrefilledPurchaseOrder | null
  onClearPrefilled?: () => void
}

export default function PurchaseOrders({ prefilledData, onClearPrefilled }: PurchaseOrdersProps = {}) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderResponseDTO[]>([])
  const [suppliers, setSuppliers] = useState<SupplierResponseDTO[]>([])
  const [products, setProducts] = useState<ProductResponseDTO[]>([])
  const [supplierProducts, setSupplierProducts] = useState<any[]>([])
  const [summary, setSummary] = useState<PurchaseOrderSummaryDTO | null>(null)
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderResponseDTO | null>(null)

  // Form states
  const [formData, setFormData] = useState<PurchaseOrderFormData>({
    supplierId: '',
    expectedDate: '',
    taxAmount: 0,
    shippingCost: 0,
    notes: '',
    items: []
  })

  const [itemForm, setItemForm] = useState<PurchaseOrderItemForm>({
    productId: '',
    variantId: '',
    quantity: 1,
    unitCost: 0
  })

  const [productSearch, setProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)

  const { showToast } = useToast()

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  // Load supplier products when supplier is selected
  useEffect(() => {
    const loadSupplierProducts = async () => {
      if (formData.supplierId) {
        try {
          const result = await ipc.suppliers.getSupplierProducts(formData.supplierId)
          if (Array.isArray(result)) {
            setSupplierProducts(result)
          } else if (result?.success && Array.isArray(result.data)) {
            setSupplierProducts(result.data)
          } else {
            setSupplierProducts([])
          }
        } catch (error) {
          console.error('Error loading supplier products:', error)
          setSupplierProducts([])
        }
      } else {
        setSupplierProducts([])
      }
    }
    
    loadSupplierProducts()
  }, [formData.supplierId])

  // Handle prefilled data from reorder alerts
  useEffect(() => {
    if (prefilledData && products.length > 0) {
      // Find the product/variant
      const product = products.find(p => p.id === prefilledData.productId)
      
      if (product) {
        // Find supplier if provided
        let supplierId = prefilledData.supplierInfo?.supplierId || ''
        
        // If no supplier ID but we have supplier name, try to find it
        if (!supplierId && prefilledData.supplierInfo?.supplierName) {
          const supplier = suppliers.find(s => 
            s.name.toLowerCase() === prefilledData.supplierInfo!.supplierName.toLowerCase()
          )
          if (supplier) {
            supplierId = supplier.id
          }
        }

        // Pre-fill the form
        setFormData({
          supplierId,
          expectedDate: '',
          taxAmount: 0,
          shippingCost: 0,
          notes: `Reorder for ${prefilledData.productName}${prefilledData.variantName !== 'Default' ? ` (${prefilledData.variantName})` : ''} - Low stock alert`,
          items: [{
            productId: prefilledData.productId,
            variantId: prefilledData.variantId,
            quantity: prefilledData.suggestedQty,
            unitCost: prefilledData.supplierInfo?.cost || 0
          }]
        })
        
        // Open the create modal
        setShowCreateModal(true)
        
        // Show success message
        showToast('info', `Pre-filled order for ${prefilledData.productName}`)
        
        // Clear the prefilled data
        if (onClearPrefilled) {
          onClearPrefilled()
        }
      }
    }
  }, [prefilledData, products, suppliers])
  const loadData = async () => {
    try {
      setLoading(true)
      setDataError(null)
      const [ordersResult, suppliersResult, productsResult, summaryResult] = await Promise.all([
        ipc.purchaseOrders.getAll(),
        ipc.suppliers.getAll(),
        ipc.products.getAll(),
        ipc.purchaseOrders.getSummary()
      ])

      // Handle purchase orders
      setPurchaseOrders(Array.isArray(ordersResult) ? ordersResult : [])
      
      // Handle suppliers - paginated response
      if (suppliersResult?.success && suppliersResult.data?.data) {
        setSuppliers(Array.isArray(suppliersResult.data.data) ? suppliersResult.data.data : [])
      } else if (Array.isArray(suppliersResult)) {
        setSuppliers(suppliersResult)
      } else {
        console.warn('Unexpected suppliers format:', suppliersResult)
        setSuppliers([])
      }
      
      // Handle products - API returns { products: [] } or just []
      if (productsResult?.products && Array.isArray(productsResult.products)) {
        setProducts(productsResult.products)
      } else if (Array.isArray(productsResult)) {
        setProducts(productsResult)
      } else {
        console.warn('Unexpected products format:', productsResult)
        setProducts([])
      }
      
      setSummary(summaryResult)
    } catch (error) {
      console.error('Error loading purchase orders data:', error)
      setDataError('Failed to load purchase orders data')
      showToast('error', 'Failed to load purchase orders data')
    } finally {
      setLoading(false)
    }
  }

  // Filter purchase orders
  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter(order => {
      const matchesSearch = !searchQuery ||
        order.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.supplier.name.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = !statusFilter || order.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [purchaseOrders, searchQuery, statusFilter])

  // Calculate form totals
  const calculateTotal = (items: PurchaseOrderItemForm[], tax: number, shipping: number) => {
    const itemsTotal = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0)
    return itemsTotal + tax + shipping
  }

  // Handle create purchase order
  const handleCreateOrder = async () => {
    try {
      if (!formData.supplierId || formData.items.length === 0) {
        showToast('error', 'Please select a supplier and add at least one item')
        return
      }

      const orderData: CreatePurchaseOrderDTO = {
        supplierId: formData.supplierId,
        expectedDate: formData.expectedDate ? new Date(formData.expectedDate) : undefined,
        taxAmount: formData.taxAmount,
        shippingCost: formData.shippingCost,
        notes: formData.notes,
        items: formData.items
      }

      const newOrder = await ipc.purchaseOrders.create(orderData)
      setPurchaseOrders(prev => [newOrder, ...prev])
      setSummary(prev => prev ? { ...prev, total: prev.total + 1, draft: prev.draft + 1 } : null)

      setShowCreateModal(false)
      resetForm()
      showToast('success', 'Purchase order created successfully')
    } catch (error) {
      console.error('Error creating purchase order:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create purchase order'
      
      // Check if it's a supplier-product relationship error
      if (errorMessage.includes('not supplied by')) {
        showToast('error', `${errorMessage}. Please add this product to the supplier in the Products tab first.`)
      } else {
        showToast('error', errorMessage)
      }
    }
  }

  // Handle update purchase order
  const handleUpdateOrder = async () => {
    if (!selectedOrder) return

    try {
      const updateData: UpdatePurchaseOrderDTO = {
        expectedDate: formData.expectedDate ? new Date(formData.expectedDate) : undefined,
        taxAmount: formData.taxAmount,
        shippingCost: formData.shippingCost,
        notes: formData.notes
      }

      const updatedOrder = await ipc.purchaseOrders.update(selectedOrder.id, updateData)
      setPurchaseOrders(prev => prev.map(order =>
        order.id === selectedOrder.id ? updatedOrder : order
      ))

      setShowEditModal(false)
      resetForm()
      showToast('success', 'Purchase order updated successfully')
    } catch (error) {
      console.error('Error updating purchase order:', error)
      showToast('error', 'Failed to update purchase order')
    }
  }

  // Handle receive purchase order
  const handleReceiveOrder = async () => {
    if (!selectedOrder) return

    try {
      const updatedOrder = await ipc.purchaseOrders.receive(selectedOrder.id)
      setPurchaseOrders(prev => prev.map(order =>
        order.id === selectedOrder.id ? updatedOrder : order
      ))

      // Update summary
      setSummary(prev => prev ? {
        ...prev,
        ordered: prev.ordered - 1,
        received: prev.received + 1,
        pendingValue: prev.pendingValue - updatedOrder.totalAmount
      } : null)

      setShowReceiveModal(false)
      setSelectedOrder(null)
      showToast('success', 'Purchase order received and inventory updated')
    } catch (error) {
      console.error('Error receiving purchase order:', error)
      showToast('error', 'Failed to receive purchase order')
    }
  }

  // Handle delete purchase order
  const handleDeleteOrder = async (order: PurchaseOrderResponseDTO) => {
    if (!confirm(`Are you sure you want to delete purchase order ${order.poNumber}?`)) {
      return
    }

    try {
      await ipc.purchaseOrders.delete(order.id)
      setPurchaseOrders(prev => prev.filter(o => o.id !== order.id))

      // Update summary
      setSummary(prev => prev ? {
        ...prev,
        total: prev.total - 1,
        [order.status]: prev[order.status as keyof PurchaseOrderSummaryDTO] as number - 1,
        totalValue: prev.totalValue - order.totalAmount,
        pendingValue: order.status === 'ordered' ? prev.pendingValue - order.totalAmount : prev.pendingValue
      } : null)

      showToast('success', 'Purchase order deleted successfully')
    } catch (error) {
      console.error('Error deleting purchase order:', error)
      showToast('error', 'Failed to delete purchase order')
    }
  }

  // Handle status change
  const handleStatusChange = async (order: PurchaseOrderResponseDTO, newStatus: string) => {
    try {
      const updatedOrder = await ipc.purchaseOrders.update(order.id, { status: newStatus as any })
      setPurchaseOrders(prev => prev.map(o =>
        o.id === order.id ? updatedOrder : o
      ))

      // Update summary
      setSummary(prev => prev ? {
        ...prev,
        [order.status]: prev[order.status as keyof PurchaseOrderSummaryDTO] as number - 1,
        [newStatus]: prev[newStatus as keyof PurchaseOrderSummaryDTO] as number + 1,
        pendingValue: (order.status === 'ordered' && newStatus !== 'ordered') ? prev.pendingValue - order.totalAmount :
                     (order.status !== 'ordered' && newStatus === 'ordered') ? prev.pendingValue + order.totalAmount : prev.pendingValue
      } : null)

      showToast('success', `Purchase order status updated to ${newStatus}`)
    } catch (error) {
      console.error('Error updating purchase order status:', error)
      showToast('error', 'Failed to update purchase order status')
    }
  }

  // Add item to form
  const addItemToForm = () => {
    if (!itemForm.productId || itemForm.quantity <= 0 || itemForm.unitCost <= 0) {
      showToast('error', 'Please fill in all item details')
      return
    }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...itemForm }]
    }))

    setItemForm({ productId: '', variantId: '', quantity: 1, unitCost: 0 })
    setProductSearch('')
    setShowProductDropdown(false)
  }

  // Filter products based on search and selected supplier
  const filteredProducts = useMemo(() => {
    // First filter by supplier if one is selected
    let availableProducts = products
    if (formData.supplierId && supplierProducts.length > 0) {
      // Only show products that are supplied by the selected supplier
      const supplierProductIds = supplierProducts.map(sp => sp.productId)
      availableProducts = products.filter(p => supplierProductIds.includes(p.id))
    }
    
    if (!productSearch.trim()) return availableProducts
    return availableProducts.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.baseSKU?.toLowerCase().includes(productSearch.toLowerCase())
    )
  }, [products, supplierProducts, productSearch, formData.supplierId])

  // Remove item from form
  const removeItemFromForm = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      supplierId: '',
      expectedDate: '',
      taxAmount: 0,
      shippingCost: 0,
      notes: '',
      items: []
    })
    setItemForm({ productId: '', variantId: '', quantity: 1, unitCost: 0 })
    setSelectedOrder(null)
    setProductSearch('')
    setShowProductDropdown(false)
  }

  // Open edit modal
  const openEditModal = (order: PurchaseOrderResponseDTO) => {
    setSelectedOrder(order)
    setFormData({
      supplierId: order.supplierId,
      expectedDate: order.expectedDate ? order.expectedDate.toISOString().split('T')[0] : '',
      taxAmount: order.taxAmount,
      shippingCost: order.shippingCost,
      notes: order.notes || '',
      items: order.items.map(item => ({
        productId: item.productId,
        variantId: item.variantId || '',
        quantity: item.quantity,
        unitCost: item.unitCost
      }))
    })
    setShowEditModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading Purchase Orders...</p>
        </div>
      </div>
    )
  }

  if (dataError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 font-semibold mb-2">{dataError}</p>
          <Button onClick={loadData} variant="primary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with gradient background */}
      <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 p-6 rounded-xl border border-primary/20">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 dark:bg-primary/20 rounded-xl">
            <ShoppingCart className="text-primary" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Purchase Orders</h1>
            <p className="text-slate-600 dark:text-slate-400">Manage supplier orders and inventory procurement</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 font-medium"
        >
          <Plus size={20} />
          Create Order
        </button>
      </div>

      {/* Summary Cards - Enhanced */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-5 hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-blue-500 bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-blue-900/20">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl shadow-md">
                <Package className="text-blue-600 dark:text-blue-400" size={28} />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Total Orders</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{summary.total}</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-5 hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-yellow-500 bg-gradient-to-br from-white to-yellow-50 dark:from-slate-800 dark:to-yellow-900/20">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-xl shadow-md">
                <Clock className="text-yellow-600 dark:text-yellow-400" size={28} />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Pending</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{summary.ordered}</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-5 hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-green-500 bg-gradient-to-br from-white to-green-50 dark:from-slate-800 dark:to-green-900/20">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl shadow-md">
                <CheckCircle className="text-green-600 dark:text-green-400" size={28} />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Received</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{summary.received}</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-5 hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-purple-500 bg-gradient-to-br from-white to-purple-50 dark:from-slate-800 dark:to-purple-900/20">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-xl shadow-md">
                <DollarSign className="text-purple-600 dark:text-purple-400" size={28} />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Pending Value</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">${summary.pendingValue.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters with enhanced styling */}
      <div className="glass-card p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              placeholder="Search by PO number or supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-11"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field min-w-[150px]"
          >
            <option value="">All Statuses</option>
            <option value="draft">📝 Draft</option>
            <option value="ordered">📦 Ordered</option>
            <option value="received">✓ Received</option>
            <option value="cancelled">✗ Cancelled</option>
          </select>
        </div>
      </div>

      {/* Purchase Orders Table with modern styling */}
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
            <TableRow>
              <TableHead className="font-semibold">PO Number</TableHead>
              <TableHead className="font-semibold">Supplier</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Order Date</TableHead>
              <TableHead className="font-semibold">Expected Date</TableHead>
              <TableHead className="font-semibold">Total Amount</TableHead>
              <TableHead className="w-36 font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => {
              const statusConfig = STATUS_CONFIG[order.status]
              const StatusIcon = statusConfig.icon

              return (
                <TableRow key={order.id}>
                  <TableCell className="font-bold text-primary">{order.poNumber}</TableCell>
                  <TableCell className="font-medium">{order.supplier.name}</TableCell>
                  <TableCell>
                    <Badge variant={statusConfig.color as any} className="flex items-center gap-1.5 w-fit font-medium">
                      <StatusIcon size={16} />
                      {statusConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {order.expectedDate ? new Date(order.expectedDate).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell className="font-bold text-green-600 dark:text-green-400">
                    ${order.totalAmount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {order.status === 'draft' && (
                        <>
                          <button
                            onClick={() => openEditModal(order)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all hover:scale-110 active:scale-95"
                            title="Edit order"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleStatusChange(order, 'ordered')}
                            className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all hover:scale-110 active:scale-95"
                            title="Mark as ordered"
                          >
                            <Truck size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all hover:scale-110 active:scale-95"
                            title="Delete order"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                      {order.status === 'ordered' && (
                        <button
                          onClick={() => {
                            setSelectedOrder(order)
                            setShowReceiveModal(true)
                          }}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all hover:scale-110 active:scale-95"
                          title="Receive order"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {filteredOrders.length === 0 && (
          <div className="text-center py-16">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                <ShoppingCart className="h-16 w-16 text-slate-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No purchase orders found</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {searchQuery || statusFilter ? 'Try adjusting your filters.' : 'Get started by creating your first purchase order.'}
                </p>
              </div>
              {!searchQuery && !statusFilter && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 font-medium flex items-center gap-2"
                >
                  <Plus size={20} />
                  Create First Order
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          resetForm()
        }}
        title="Create Purchase Order"
        size="lg"
      >
        <div className="space-y-4">
          {/* Info Banner */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  What is a Purchase Order?
                </h4>
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  A purchase order is used to <strong>restock existing product variants</strong> in your inventory. 
                  Select specific variants (SKUs) you want to order from your supplier - for example, "Red T-Shirt Size M" not just "T-Shirt".
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-200 mt-2 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                  ⚠️ <strong>Important:</strong> You can only order products that are supplied by the selected supplier. Set up supplier relationships in the <strong>Products</strong> tab first.
                </p>
              </div>
            </div>
          </div>

          {/* Supplier Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Supplier</label>
            <select
              value={formData.supplierId}
              onChange={(e) => setFormData(prev => ({ ...prev, supplierId: e.target.value }))}
              className="input-field"
              required
            >
              <option value="">Select Supplier</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </div>

          {/* Expected Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Expected Delivery Date</label>
            <input
              type="date"
              value={formData.expectedDate}
              onChange={(e) => setFormData(prev => ({ ...prev, expectedDate: e.target.value }))}
              className="input-field"
            />
          </div>

          {/* Items Section */}
          <div>
            {/* Items List */}
            {formData.items.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Order Items</label>
                <div className="border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-900 dark:text-white">Product</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-900 dark:text-white">Qty</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-900 dark:text-white">Unit Cost</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-900 dark:text-white">Total</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-slate-900 dark:text-white w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {formData.items.map((item, index) => {
                        const product = products.find(p => p.id === item.productId)
                        const variant = product?.variants?.find(v => v.id === item.variantId)
                        return (
                          <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-3 py-2 text-sm text-slate-900 dark:text-white">
                              <div>
                                <div>{product?.name || 'Unknown Product'}</div>
                                {variant && (variant.size || variant.color) && (
                                  <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {variant.size || ''}{variant.size && variant.color ? ' / ' : ''}{variant.color || ''} - SKU: {variant.sku}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-sm text-right text-slate-900 dark:text-white">
                              {item.quantity}
                            </td>
                            <td className="px-3 py-2 text-sm text-right text-slate-900 dark:text-white">
                              ${item.unitCost.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-sm text-right font-semibold text-slate-900 dark:text-white">
                              ${(item.quantity * item.unitCost).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <button
                                onClick={() => removeItemFromForm(index)}
                                type="button"
                                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                title="Remove item"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-800/50">
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-sm font-semibold text-right text-slate-900 dark:text-white">
                          Subtotal:
                        </td>
                        <td className="px-3 py-2 text-sm font-bold text-right text-slate-900 dark:text-white">
                          ${formData.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0).toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Add Item Form */}
            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600">
              <div className="space-y-1 mb-3">
                <div className="flex items-center gap-2">
                  <Plus size={18} className="text-primary" />
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Add Items to Order</h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 pl-7">
                  💡 Select <strong>specific variants (SKUs)</strong> from your inventory to restock. Choose the exact size/color/variant you need from the supplier.
                </p>
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Product Variant / SKU *</label>
                {!formData.supplierId && (
                  <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-200">
                    ⚠️ Select a supplier first to see their products
                  </div>
                )}
                {formData.supplierId && supplierProducts.length === 0 && (
                  <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-200">
                    ⚠️ This supplier has no products. Go to <strong>Suppliers</strong> tab → Click <strong>👁️ Eye icon</strong> → Add products with costs.
                  </div>
                )}
                <input
                  type="text"
                  placeholder={formData.supplierId ? (supplierProducts.length > 0 ? "Search by product name, variant, or SKU..." : "No products available for this supplier") : "Select a supplier first..."}
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value)
                    setShowProductDropdown(true)
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  className="input-field"
                  disabled={!formData.supplierId || supplierProducts.length === 0}
                />
                {showProductDropdown && products.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredProducts.map(product => (
                      <div key={product.id}>
                        {product.variants && product.variants.length > 0 ? (
                          product.variants.map(variant => (
                            <button
                              key={variant.id}
                              type="button"
                              onClick={() => {
                                setItemForm(prev => ({ 
                                  ...prev, 
                                  productId: product.id,
                                  variantId: variant.id,
                                  unitCost: variant.price
                                }))
                                setProductSearch(`${product.name} - ${variant.size || ''}${variant.size && variant.color ? ' / ' : ''}${variant.color || ''}`)
                                setShowProductDropdown(false)
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0"
                            >
                              <div className="font-medium text-slate-900 dark:text-white">
                                {product.name}
                                {(variant.size || variant.color) && (
                                  <span className="text-primary ml-2">
                                    ({variant.size || ''}{variant.size && variant.color ? ' / ' : ''}{variant.color || ''})
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-slate-500 dark:text-slate-400 flex justify-between">
                                <span>SKU: {variant.sku}</span>
                                <span className="font-semibold">Stock: {variant.stock}</span>
                              </div>
                            </button>
                          ))
                        ) : (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => {
                              setItemForm(prev => ({ 
                                ...prev, 
                                productId: product.id,
                                variantId: '', // No variant for simple products
                                unitCost: product.baseCost
                              }))
                              setProductSearch(product.name)
                              setShowProductDropdown(false)
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0"
                          >
                            <div className="font-medium text-slate-900 dark:text-white">{product.name}</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400 flex justify-between">
                              <span>SKU: {product.baseSKU}</span>
                              <span className="font-semibold">Stock: {product.totalStock}</span>
                            </div>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {products.length === 0 && (
                  <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">⚠️ No products found</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                      You need to create products first in the <strong>Products</strong> tab before you can order them from suppliers.
                    </p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Unit Cost *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={itemForm.unitCost}
                    onChange={(e) => setItemForm(prev => ({ ...prev, unitCost: Number(e.target.value) }))}
                    className="input-field"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={addItemToForm}
                    type="button"
                    disabled={!itemForm.productId}
                    className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    Add Item
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tax and Shipping */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Tax Amount</label>
              <input
                type="number"
                step="0.01"
                value={formData.taxAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, taxAmount: Number(e.target.value) }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Shipping Cost</label>
              <input
                type="number"
                step="0.01"
                value={formData.shippingCost}
                onChange={(e) => setFormData(prev => ({ ...prev, shippingCost: Number(e.target.value) }))}
                className="input-field"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="input-field"
              rows={3}
            />
          </div>

          {/* Total Summary */}
          {formData.items.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Items Subtotal:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  ${formData.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Tax:</span>
                <span className="font-semibold text-slate-900 dark:text-white">${formData.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Shipping:</span>
                <span className="font-semibold text-slate-900 dark:text-white">${formData.shippingCost.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-300 dark:border-slate-600 pt-2 mt-2"></div>
              <div className="flex justify-between">
                <span className="text-lg font-bold text-slate-900 dark:text-white">Total:</span>
                <span className="text-lg font-bold text-primary">
                  ${calculateTotal(formData.items, formData.taxAmount, formData.shippingCost).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateOrder}>
              Create Order
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Order Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          resetForm()
        }}
        title="Edit Purchase Order"
        size="lg"
      >
        {/* Similar content to create modal but for editing */}
        <div className="space-y-4">
          <p>Edit modal content would be similar to create modal</p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowEditModal(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateOrder}>
              Update Order
            </Button>
          </div>
        </div>
      </Modal>

      {/* Receive Order Modal */}
      <Modal
        isOpen={showReceiveModal}
        onClose={() => {
          setShowReceiveModal(false)
          setSelectedOrder(null)
        }}
        title="Receive Purchase Order"
      >
        <div className="space-y-4">
          <p>Are you sure you want to mark this purchase order as received? This will update the inventory.</p>
          {selectedOrder && (
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded">
              <p><strong>PO Number:</strong> {selectedOrder.poNumber}</p>
              <p><strong>Supplier:</strong> {selectedOrder.supplier.name}</p>
              <p><strong>Total Amount:</strong> ${selectedOrder.totalAmount.toFixed(2)}</p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowReceiveModal(false)
                setSelectedOrder(null)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleReceiveOrder}>
              Receive Order
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}