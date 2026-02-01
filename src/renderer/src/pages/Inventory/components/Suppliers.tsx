/**
 * Suppliers Management Component
 *
 * Features:
 * - Supplier CRUD operations
 * - Product-supplier relationships
 * - Purchase order tracking
 * - Supplier performance metrics
 */

import { useState, useEffect, useMemo } from 'react'
import { Search, Plus, Edit, Trash2, Package, DollarSign, ShoppingCart, Users, Eye, X } from 'lucide-react'
import { useToast } from '../../../contexts/ToastContext'
import { ipc } from '../../../utils/ipc'
import Button from '../../../components/ui/Button'
import Modal from '../../../components/ui/Modal'
import type { SupplierResponseDTO, CreateSupplierDTO, UpdateSupplierDTO, CreateSupplierProductDTO, SupplierProductResponseDTO } from '../../../../../shared/dtos/supplier.dto'
import type { ProductResponseDTO } from '../../../../../shared/dtos/product.dto'

interface SupplierFormData {
  name: string
  contactName: string
  email: string
  phone: string
  address: string
  paymentTerms: string
  notes: string
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<SupplierResponseDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<SupplierResponseDTO | null>(null)
  const [formData, setFormData] = useState<SupplierFormData>({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    paymentTerms: '',
    notes: ''
  })
  
  // Product-supplier relationship management
  const [showProductsModal, setShowProductsModal] = useState(false)
  const [viewingSupplier, setViewingSupplier] = useState<SupplierResponseDTO | null>(null)
  const [supplierProducts, setSupplierProducts] = useState<SupplierProductResponseDTO[]>([])
  const [products, setProducts] = useState<ProductResponseDTO[]>([])
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [productSearchQuery, setProductSearchQuery] = useState('')
  const [addProductForm, setAddProductForm] = useState({
    productId: '',
    cost: '',
    leadTime: '',
    minOrderQty: '1',
    isPreferred: false
  })

  const toast = useToast()

  // Load suppliers
  const loadSuppliers = async () => {
    try {
      setLoading(true)
      const result = await ipc.suppliers.getAll({
        search: searchQuery || undefined,
        pageSize: 100 // Load all for now
      })

      if (result.success) {
        setSuppliers(result.data.data)
      } else {
        toast.error(`Failed to load suppliers: ${result.message}`)
      }
    } catch (error) {
      console.error('Error loading suppliers:', error)
      toast.error('Failed to load suppliers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSuppliers()
  }, [searchQuery])

  // Load all products for adding to suppliers
  const loadProducts = async () => {
    try {
      const result = await ipc.products.getAll({})
      if (result?.products && Array.isArray(result.products)) {
        setProducts(result.products)
      }
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }

  // Load products for a specific supplier
  const loadSupplierProducts = async (supplierId: string) => {
    try {
      const result = await ipc.suppliers.getSupplierProducts(supplierId)
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
  }

  // Open products modal for a supplier
  const openProductsModal = async (supplier: SupplierResponseDTO) => {
    setViewingSupplier(supplier)
    setShowProductsModal(true)
    await loadSupplierProducts(supplier.id)
    await loadProducts()
  }

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    if (!searchQuery) return suppliers
    return suppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [suppliers, searchQuery])

  // Handle create supplier
  const handleCreateSupplier = async () => {
    try {
      const createData: CreateSupplierDTO = {
        name: formData.name.trim(),
        contactName: formData.contactName.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        paymentTerms: formData.paymentTerms.trim() || undefined,
        notes: formData.notes.trim() || undefined
      }

      const result = await ipc.suppliers.create(createData)

      if (result.success) {
        toast.success('Supplier created successfully')
        setShowCreateModal(false)
        resetForm()
        loadSuppliers()
      } else {
        toast.error(`Failed to create supplier: ${result.message}`)
      }
    } catch (error) {
      console.error('Error creating supplier:', error)
      toast.error('Failed to create supplier')
    }
  }

  // Handle update supplier
  const handleUpdateSupplier = async () => {
    if (!editingSupplier) return

    try {
      const updateData: UpdateSupplierDTO = {
        name: formData.name.trim(),
        contactName: formData.contactName.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        paymentTerms: formData.paymentTerms.trim() || undefined,
        notes: formData.notes.trim() || undefined
      }

      const result = await ipc.suppliers.update(editingSupplier.id, updateData)

      if (result.success) {
        toast.success('Supplier updated successfully')
        setShowEditModal(false)
        setEditingSupplier(null)
        resetForm()
        loadSuppliers()
      } else {
        toast.error(`Failed to update supplier: ${result.message}`)
      }
    } catch (error) {
      console.error('Error updating supplier:', error)
      toast.error('Failed to update supplier')
    }
  }

  // Handle delete supplier
  const handleDeleteSupplier = async (supplier: SupplierResponseDTO) => {
    if (!confirm(`Are you sure you want to deactivate ${supplier.name}? This will mark them as inactive.`)) {
      return
    }

    try {
      const result = await ipc.suppliers.update(supplier.id, { isActive: false })

      if (result.success) {
        toast.success('Supplier deactivated successfully')
        loadSuppliers()
      } else {
        toast.error(`Failed to deactivate supplier: ${result.message}`)
      }
    } catch (error) {
      console.error('Error deactivating supplier:', error)
      toast.error('Failed to deactivate supplier')
    }
  }

  // Open edit modal
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
    setShowEditModal(true)
  }

  // Handle add product to supplier
  const handleAddProductToSupplier = async () => {
    if (!viewingSupplier || !addProductForm.productId || !addProductForm.cost) {
      toast.error('Please select a product and enter a cost')
      return
    }

    try {
      const createData: CreateSupplierProductDTO = {
        supplierId: viewingSupplier.id,
        productId: addProductForm.productId,
        cost: parseFloat(addProductForm.cost),
        leadTime: addProductForm.leadTime ? parseInt(addProductForm.leadTime) : undefined,
        minOrderQty: addProductForm.minOrderQty ? parseInt(addProductForm.minOrderQty) : 1,
        isPreferred: addProductForm.isPreferred
      }

      const result = await ipc.suppliers.addSupplierProduct(viewingSupplier.id, createData)

      if (result?.success || result?.data) {
        toast.success('Product added to supplier successfully')
        setShowAddProductModal(false)
        setAddProductForm({
          productId: '',
          cost: '',
          leadTime: '',
          minOrderQty: '1',
          isPreferred: false
        })
        setProductSearchQuery('')
        await loadSupplierProducts(viewingSupplier.id)
        await loadSuppliers() // Refresh to update product count
      } else {
        toast.error(`Failed to add product: ${result?.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error adding product to supplier:', error)
      toast.error('Failed to add product to supplier')
    }
  }

  // Handle remove product from supplier
  const handleRemoveProductFromSupplier = async (supplierProductId: string) => {
    if (!confirm('Are you sure you want to remove this product from the supplier?')) {
      return
    }

    try {
      const result = await ipc.suppliers.removeSupplierProduct(supplierProductId)

      if (result?.success !== false) {
        toast.success('Product removed from supplier')
        if (viewingSupplier) {
          await loadSupplierProducts(viewingSupplier.id)
          await loadSuppliers() // Refresh to update product count
        }
      } else {
        toast.error(`Failed to remove product: ${result?.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error removing product from supplier:', error)
      toast.error('Failed to remove product from supplier')
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      contactName: '',
      email: '',
      phone: '',
      address: '',
      paymentTerms: '',
      notes: ''
    })
  }

  // Calculate metrics
  const metrics = useMemo(() => {
    const activeSuppliers = suppliers.filter(s => s.isActive)
    const totalPurchaseOrders = suppliers.reduce((sum, s) => sum + s.totalPurchaseOrders, 0)
    const totalPurchased = suppliers.reduce((sum, s) => sum + s.totalPurchased, 0)

    return {
      totalSuppliers: suppliers.length,
      activeSuppliers: activeSuppliers.length,
      totalPurchaseOrders,
      totalPurchased
    }
  }, [suppliers])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading suppliers...</p>
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
            <Users className="text-primary" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Supplier Management
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Manage suppliers and their product relationships
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 font-medium"
        >
          <Plus size={20} />
          Add Supplier
        </button>
      </div>

      {/* Metrics Cards - Enhanced with animations and gradients */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-blue-500 bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-blue-900/20">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl shadow-md">
              <Users className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Total Suppliers</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{metrics.totalSuppliers}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-green-500 bg-gradient-to-br from-white to-green-50 dark:from-slate-800 dark:to-green-900/20">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl shadow-md">
              <Users className="text-green-600 dark:text-green-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Active Suppliers</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{metrics.activeSuppliers}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-purple-500 bg-gradient-to-br from-white to-purple-50 dark:from-slate-800 dark:to-purple-900/20">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-xl shadow-md">
              <ShoppingCart className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Purchase Orders</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{metrics.totalPurchaseOrders}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-orange-500 bg-gradient-to-br from-white to-orange-50 dark:from-slate-800 dark:to-orange-900/20">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-xl shadow-md">
              <DollarSign className="text-orange-600 dark:text-orange-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Total Purchased</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                ${metrics.totalPurchased.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search with enhanced styling */}
      <div className="glass-card p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="search"
              placeholder="Search suppliers by name, contact, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-11"
            />
          </div>
        </div>
      </div>

      {/* Suppliers Table with modern styling */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">Contact</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">Products</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">Purchase Orders</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">Total Purchased</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {supplier.name}
                      </div>
                      {supplier.paymentTerms && (
                        <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                          💳 {supplier.paymentTerms}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm space-y-1">
                      {supplier.contactName && (
                        <div className="font-medium text-slate-700 dark:text-slate-300">👤 {supplier.contactName}</div>
                      )}
                      {supplier.email && (
                        <div className="text-slate-500 dark:text-slate-400">📧 {supplier.email}</div>
                      )}
                      {supplier.phone && (
                        <div className="text-slate-500 dark:text-slate-400">📞 {supplier.phone}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      📦 {supplier.productCount} products
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                      🛒 {supplier.totalPurchaseOrders} orders
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-green-600 dark:text-green-400">
                      ${supplier.totalPurchased.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      supplier.isActive 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                    }`}>
                      {supplier.isActive ? '✓ Active' : '○ Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openProductsModal(supplier)}
                        className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all hover:scale-110 active:scale-95"
                        title="View/Manage products"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => openEditModal(supplier)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all hover:scale-110 active:scale-95"
                        title="Edit supplier"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteSupplier(supplier)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all hover:scale-110 active:scale-95"
                        title="Deactivate supplier"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSuppliers.length === 0 && (
          <div className="text-center py-16">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                <Package className="h-16 w-16 text-slate-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No suppliers found</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {searchQuery ? 'Try adjusting your search terms.' : 'Get started by adding your first supplier.'}
                </p>
              </div>
              {!searchQuery && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 font-medium flex items-center gap-2"
                >
                  <Plus size={20} />
                  Add First Supplier
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Supplier Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          resetForm()
        }}
        title="Add New Supplier"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Supplier Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter supplier name"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Contact Name
            </label>
            <input
              type="text"
              value={formData.contactName}
              onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
              placeholder="Enter contact person name"
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="supplier@example.com"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Enter supplier address"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Payment Terms
            </label>
            <input
              type="text"
              value={formData.paymentTerms}
              onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
              placeholder="e.g., Net 30, Net 60"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes about this supplier"
              className="input-field"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSupplier}
              disabled={!formData.name.trim()}
            >
              Create Supplier
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Supplier Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingSupplier(null)
          resetForm()
        }}
        title="Edit Supplier"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Supplier Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter supplier name"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Contact Name
            </label>
            <input
              type="text"
              value={formData.contactName}
              onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
              placeholder="Enter contact person name"
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="supplier@example.com"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Enter supplier address"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Payment Terms
            </label>
            <input
              type="text"
              value={formData.paymentTerms}
              onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
              placeholder="e.g., Net 30, Net 60"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes about this supplier"
              className="input-field"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowEditModal(false)
                setEditingSupplier(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateSupplier}
              disabled={!formData.name.trim()}
            >
              Update Supplier
            </Button>
          </div>
        </div>
      </Modal>

      {/* Supplier Products Modal */}
      <Modal
        isOpen={showProductsModal}
        onClose={() => {
          setShowProductsModal(false)
          setViewingSupplier(null)
          setSupplierProducts([])
        }}
        title={`Products - ${viewingSupplier?.name || ''}`}
      >
        <div className="space-y-4">
          {/* Info Banner */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 <strong>Manage product relationships</strong> - Add products that this supplier provides, set costs and lead times.
            </p>
          </div>

          {/* Add Product Button */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddProductModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95 text-sm font-medium"
            >
              <Plus size={16} />
              Add Product
            </button>
          </div>

          {/* Products List */}
          <div className="glass-card overflow-hidden max-h-96 overflow-y-auto">
            {supplierProducts.length > 0 ? (
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Product</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">SKU</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Cost</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white">Lead Time</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {supplierProducts.map((sp) => (
                    <tr key={sp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-white">{sp.productName}</div>
                        {sp.isPreferred && (
                          <span className="text-xs text-green-600 dark:text-green-400">⭐ Preferred</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {sp.sku || sp.productSKU}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        ${sp.cost.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {sp.leadTime ? `${sp.leadTime} days` : 'Not set'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleRemoveProductFromSupplier(sp.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                          title="Remove product"
                        >
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full">
                    <Package className="h-12 w-12 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">No products yet</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Add products that this supplier provides
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddProductModal(true)}
                    className="mt-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all text-sm font-medium flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add First Product
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Add Product to Supplier Modal */}
      <Modal
        isOpen={showAddProductModal}
        onClose={() => {
          setShowAddProductModal(false)
          setAddProductForm({
            productId: '',
            cost: '',
            leadTime: '',
            minOrderQty: '1',
            isPreferred: false
          })
          setProductSearchQuery('')
        }}
        title="Add Product to Supplier"
      >
        <div className="space-y-4">
          {/* Product Search & Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Select Product *
            </label>
            <input
              type="text"
              value={productSearchQuery}
              onChange={(e) => setProductSearchQuery(e.target.value)}
              placeholder="Search products by name or SKU..."
              className="input-field mb-2"
            />
            <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
              {products
                .filter(p => 
                  !productSearchQuery || 
                  p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
                  p.baseSKU.toLowerCase().includes(productSearchQuery.toLowerCase())
                )
                .filter(p => !supplierProducts.some(sp => sp.productId === p.id))
                .map(product => (
                  <button
                    key={product.id}
                    onClick={() => {
                      setAddProductForm(prev => ({ ...prev, productId: product.id }))
                      setProductSearchQuery(product.name)
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 ${
                      addProductForm.productId === product.id ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="font-medium text-slate-900 dark:text-white">{product.name}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">SKU: {product.baseSKU}</div>
                  </button>
                ))}
            </div>
          </div>

          {/* Cost */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Cost per Unit *
            </label>
            <input
              type="number"
              value={addProductForm.cost}
              onChange={(e) => setAddProductForm(prev => ({ ...prev, cost: e.target.value }))}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="input-field"
              required
            />
          </div>

          {/* Lead Time & Min Order Qty */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Lead Time (days)
              </label>
              <input
                type="number"
                value={addProductForm.leadTime}
                onChange={(e) => setAddProductForm(prev => ({ ...prev, leadTime: e.target.value }))}
                placeholder="e.g., 7"
                min="0"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Min Order Qty
              </label>
              <input
                type="number"
                value={addProductForm.minOrderQty}
                onChange={(e) => setAddProductForm(prev => ({ ...prev, minOrderQty: e.target.value }))}
                placeholder="1"
                min="1"
                className="input-field"
              />
            </div>
          </div>

          {/* Preferred Supplier */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPreferred"
              checked={addProductForm.isPreferred}
              onChange={(e) => setAddProductForm(prev => ({ ...prev, isPreferred: e.target.checked }))}
              className="w-4 h-4 text-primary focus:ring-primary"
            />
            <label htmlFor="isPreferred" className="text-sm text-slate-700 dark:text-slate-300">
              ⭐ Mark as preferred supplier for this product
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddProductModal(false)
                setAddProductForm({
                  productId: '',
                  cost: '',
                  leadTime: '',
                  minOrderQty: '1',
                  isPreferred: false
                })
                setProductSearchQuery('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddProductToSupplier}
              disabled={!addProductForm.productId || !addProductForm.cost}
            >
              Add Product
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}