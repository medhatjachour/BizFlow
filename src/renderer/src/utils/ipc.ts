// IPC utility functions for renderer process

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>
      }
    }
  }
}

// Check if we're in Electron environment
const isElectron = typeof window !== 'undefined' && window.electron?.ipcRenderer

// Fallback mock implementation for development
const mockIPC = {
  products: {
    getAll: async () => {
      const stored = localStorage.getItem('products')
      return stored ? JSON.parse(stored) : []
    },
    getById: async (id: string) => {
      const products = JSON.parse(localStorage.getItem('products') || '[]')
      return products.find((p: any) => p.id === id) || null
    },
    search: async (searchTerm: string) => {
      const products = JSON.parse(localStorage.getItem('products') || '[]')
      return products.filter((p: any) => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.baseSKU.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 20)
    },
    getStats: async () => ({
      totalProducts: JSON.parse(localStorage.getItem('products') || '[]').length,
      totalVariants: 0,
      lowStockCount: 0
    }),
    create: async (data: any) => {
      const products = JSON.parse(localStorage.getItem('products') || '[]')
      const newProduct = {
        id: Date.now().toString(),
        ...data,
        images: data.images.map((img: string) => ({ imageData: img })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      products.push(newProduct)
      localStorage.setItem('products', JSON.stringify(products))
      return { success: true, product: newProduct }
    },
    update: async ({ id, productData }: any) => {
      const products = JSON.parse(localStorage.getItem('products') || '[]')
      const index = products.findIndex((p: any) => p.id === id)
      if (index !== -1) {
        products[index] = {
          ...products[index],
          ...productData,
          images: productData.images.map((img: string) => 
            typeof img === 'string' ? { imageData: img } : img
          ),
          updatedAt: new Date().toISOString()
        }
        localStorage.setItem('products', JSON.stringify(products))
        return { success: true, product: products[index] }
      }
      return { success: false, message: 'Product not found' }
    },
    delete: async (id: string) => {
      const products = JSON.parse(localStorage.getItem('products') || '[]')
      const filtered = products.filter((p: any) => p.id !== id)
      localStorage.setItem('products', JSON.stringify(filtered))
      return { success: true }
    }
  },
  stores: {
    getAll: async () => JSON.parse(localStorage.getItem('stores') || '[]'),
    create: async (data: any) => {
      const stores = JSON.parse(localStorage.getItem('stores') || '[]')
      const newStore = { id: Date.now().toString(), ...data }
      stores.push(newStore)
      localStorage.setItem('stores', JSON.stringify(stores))
      return { success: true, store: newStore }
    },
    update: async ({ id, storeData }: any) => {
      const stores = JSON.parse(localStorage.getItem('stores') || '[]')
      const index = stores.findIndex((s: any) => s.id === id)
      if (index !== -1) {
        stores[index] = { ...stores[index], ...storeData }
        localStorage.setItem('stores', JSON.stringify(stores))
        return { success: true, store: stores[index] }
      }
      return { success: false, message: 'Store not found' }
    },
    delete: async (id: string) => {
      const stores = JSON.parse(localStorage.getItem('stores') || '[]')
      const filtered = stores.filter((s: any) => s.id !== id)
      localStorage.setItem('stores', JSON.stringify(filtered))
      return { success: true }
    }
  },
  employees: {
    getAll: async () => JSON.parse(localStorage.getItem('employees') || '[]'),
    getById: async (_id: string) => null,
    search: async (_params: any) => [],
    stats: async () => ({ total: 0, active: 0, onLeave: 0, terminated: 0, presentToday: 0, attendanceRate: 0, payrollThisMonth: 0 }),
    create: async (data: any) => {
      const employees = JSON.parse(localStorage.getItem('employees') || '[]')
      const newEmployee = { id: Date.now().toString(), ...data }
      employees.push(newEmployee)
      localStorage.setItem('employees', JSON.stringify(employees))
      return { success: true, employee: newEmployee }
    },
    update: async ({ id, employeeData }: any) => {
      const employees = JSON.parse(localStorage.getItem('employees') || '[]')
      const index = employees.findIndex((e: any) => e.id === id)
      if (index !== -1) {
        employees[index] = { ...employees[index], ...employeeData, updatedAt: new Date().toISOString() }
        localStorage.setItem('employees', JSON.stringify(employees))
        return { success: true, employee: employees[index] }
      }
      return { success: false, message: 'Employee not found' }
    },
    delete: async (id: string) => {
      const employees = JSON.parse(localStorage.getItem('employees') || '[]')
      const filtered = employees.filter((e: any) => e.id !== id)
      localStorage.setItem('employees', JSON.stringify(filtered))
      return { success: true }
    },
    attendance: {
      upsert: async (_data: any) => ({ success: true }),
      getRange: async (_params: any) => [],
      checkIn: async (_id: string) => ({ success: true }),
      checkOut: async (_id: string) => ({ success: true })
    },
    payroll: {
      upsert: async (_data: any) => ({ success: true }),
      getAll: async (_year: number) => []
    },
    activity: {
      add: async (_data: any) => ({ success: true })
    },
    shifts: {
      add: async (_data: any) => ({ success: true }),
      getAll: async (_id: string) => [],
      delete: async (_id: string) => ({ success: true })
    },
    overtime: {
      add: async (_data: any) => ({ success: true }),
      approve: async (_id: string, _by?: string) => ({ success: true }),
      delete: async (_id: string) => ({ success: true })
    }
  },
  customers: {
    getAll: async (options?: { limit?: number; offset?: number; searchTerm?: string }) => {
      const allCustomers = JSON.parse(localStorage.getItem('customers') || '[]')
      const { limit = 100, offset = 0, searchTerm = '' } = options || {}
      
      let filtered = allCustomers
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        filtered = allCustomers.filter((c: any) => 
          c.name?.toLowerCase().includes(term) ||
          c.email?.toLowerCase().includes(term) ||
          c.phone?.includes(term)
        )
      }
      
      const customers = filtered.slice(offset, offset + limit)
      return {
        customers,
        totalCount: filtered.length,
        hasMore: offset + limit < filtered.length
      }
    },
    getProfile: async (id: string) => {
      const customers = JSON.parse(localStorage.getItem('customers') || '[]')
      return customers.find((c: any) => c.id === id) || null
    },
    create: async (data: any) => {
      const customers = JSON.parse(localStorage.getItem('customers') || '[]')
      const newCustomer = { id: Date.now().toString(), ...data, totalSpent: 0 }
      customers.push(newCustomer)
      localStorage.setItem('customers', JSON.stringify(customers))
      return { success: true, customer: newCustomer }
    },
    update: async (id: string, customerData: any) => {
      const customers = JSON.parse(localStorage.getItem('customers') || '[]')
      const index = customers.findIndex((c: any) => c.id === id)
      if (index !== -1) {
        customers[index] = { ...customers[index], ...customerData, updatedAt: new Date().toISOString() }
        localStorage.setItem('customers', JSON.stringify(customers))
        return { success: true, customer: customers[index] }
      }
      return { success: false, message: 'Customer not found' }
    },
    delete: async (id: string) => {
      const customers = JSON.parse(localStorage.getItem('customers') || '[]')
      const filtered = customers.filter((c: any) => c.id !== id)
      localStorage.setItem('customers', JSON.stringify(filtered))
      return { success: true }
    },
    getPurchaseHistory: async (customerId: string) => {
      const sales = JSON.parse(localStorage.getItem('sales') || '[]')
      return sales.filter((s: any) => s.customerId === customerId)
    },
    recalculateTotalSpent: async (_customerId: string) => {
      return { success: true }
    }
  },
  sales: {
    getAll: async () => JSON.parse(localStorage.getItem('sales') || '[]'),
    create: async (data: any) => {
      const sales = JSON.parse(localStorage.getItem('sales') || '[]')
      const newSale = {
        id: `S-${Date.now().toString().slice(-6)}`,
        ...data,
        createdAt: new Date().toISOString(),
        product: { name: 'Mock Product' },
        user: { username: 'Demo User' }
      }
      sales.unshift(newSale)
      localStorage.setItem('sales', JSON.stringify(sales))
      return { success: true, sale: newSale }
    },
    refund: async (saleId: string) => {
      const sales = JSON.parse(localStorage.getItem('sales') || '[]')
      const sale = sales.find((s: any) => s.id === saleId)
      if (sale) {
        sale.status = 'refunded'
        localStorage.setItem('sales', JSON.stringify(sales))
        return { success: true, sale }
      }
      return { success: false, message: 'Sale not found' }
    }
  },
  saleTransactions: {
    getAll: async () => JSON.parse(localStorage.getItem('saleTransactions') || '[]'),
    getById: async (id: string) => {
      const transactions = JSON.parse(localStorage.getItem('saleTransactions') || '[]')
      return transactions.find((t: any) => t.id === id) || null
    },
    create: async (data: any) => {
      const transactions = JSON.parse(localStorage.getItem('saleTransactions') || '[]')
      const newTransaction = {
        id: `TXN-${Date.now().toString().slice(-6)}`,
        ...data.transactionData,
        items: data.items,
        createdAt: new Date().toISOString(),
        user: { username: 'Demo User' }
      }
      transactions.unshift(newTransaction)
      localStorage.setItem('saleTransactions', JSON.stringify(transactions))
      return { success: true, transaction: newTransaction }
    },
    refund: async (id: string) => {
      const transactions = JSON.parse(localStorage.getItem('saleTransactions') || '[]')
      const transaction = transactions.find((t: any) => t.id === id)
      if (transaction) {
        transaction.status = 'refunded'
        localStorage.setItem('saleTransactions', JSON.stringify(transactions))
        return { success: true, transaction }
      }
      return { success: false, message: 'Transaction not found' }
    },
    refundItems: async (_data: any) => ({ success: false, error: 'Mock implementation' }),
    getByDateRange: async (data: any) => {
      const transactions = JSON.parse(localStorage.getItem('saleTransactions') || '[]')
      const start = new Date(data.startDate)
      const end = new Date(data.endDate)
      return transactions.filter((t: any) => {
        const date = new Date(t.createdAt)
        return date >= start && date <= end
      })
    }
  },
  suppliers: {
    getAll: async (options?: any) => {
      const allSuppliers = JSON.parse(localStorage.getItem('suppliers') || '[]')
      const { search, pageSize = 20 } = options || {}
      
      let filtered = allSuppliers
      if (search) {
        const term = search.toLowerCase()
        filtered = allSuppliers.filter((s: any) => 
          s.name?.toLowerCase().includes(term) ||
          s.contactName?.toLowerCase().includes(term) ||
          s.email?.toLowerCase().includes(term)
        )
      }
      
      const suppliers = filtered.slice(0, pageSize)
      return {
        success: true,
        data: {
          data: suppliers,
          total: filtered.length,
          page: 1,
          pageSize,
          totalPages: Math.ceil(filtered.length / pageSize)
        }
      }
    },
    getById: async (id: string) => {
      const suppliers = JSON.parse(localStorage.getItem('suppliers') || '[]')
      return suppliers.find((s: any) => s.id === id) || null
    },
    create: async (data: any) => {
      const suppliers = JSON.parse(localStorage.getItem('suppliers') || '[]')
      const newSupplier = { id: Date.now().toString(), ...data, createdAt: new Date().toISOString() }
      suppliers.push(newSupplier)
      localStorage.setItem('suppliers', JSON.stringify(suppliers))
      return { success: true, supplier: newSupplier }
    },
    update: async (id: string, data: any) => {
      const suppliers = JSON.parse(localStorage.getItem('suppliers') || '[]')
      const index = suppliers.findIndex((s: any) => s.id === id)
      if (index !== -1) {
        suppliers[index] = { ...suppliers[index], ...data, updatedAt: new Date().toISOString() }
        localStorage.setItem('suppliers', JSON.stringify(suppliers))
        return { success: true, supplier: suppliers[index] }
      }
      return { success: false, message: 'Supplier not found' }
    },
    delete: async (id: string) => {
      const suppliers = JSON.parse(localStorage.getItem('suppliers') || '[]')
      const filtered = suppliers.filter((s: any) => s.id !== id)
      localStorage.setItem('suppliers', JSON.stringify(filtered))
      return { success: true }
    },
    addSupplierProduct: async (supplierId: string, productData: any) => {
      const suppliers = JSON.parse(localStorage.getItem('suppliers') || '[]')
      const supplier = suppliers.find((s: any) => s.id === supplierId)
      if (supplier) {
        if (!supplier.products) supplier.products = []
        supplier.products.push({ id: Date.now().toString(), ...productData })
        localStorage.setItem('suppliers', JSON.stringify(suppliers))
        return { success: true }
      }
      return { success: false, message: 'Supplier not found' }
    },
    getSupplierProducts: async (supplierId: string) => {
      const suppliers = JSON.parse(localStorage.getItem('suppliers') || '[]')
      const supplier = suppliers.find((s: any) => s.id === supplierId)
      return supplier?.products || []
    },
    removeSupplierProduct: async (supplierProductId: string) => {
      const suppliers = JSON.parse(localStorage.getItem('suppliers') || '[]')
      for (const supplier of suppliers) {
        if (supplier.products) {
          supplier.products = supplier.products.filter((p: any) => p.id !== supplierProductId)
        }
      }
      localStorage.setItem('suppliers', JSON.stringify(suppliers))
      return { success: true }
    }
  },
  purchaseOrders: {
    getAll: async (filters?: any) => {
      const purchaseOrders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]')
      let filtered = purchaseOrders
      
      if (filters) {
        if (filters.supplierId) {
          filtered = filtered.filter((po: any) => po.supplierId === filters.supplierId)
        }
        if (filters.status) {
          filtered = filtered.filter((po: any) => po.status === filters.status)
        }
        if (filters.startDate) {
          filtered = filtered.filter((po: any) => new Date(po.orderDate) >= new Date(filters.startDate))
        }
        if (filters.endDate) {
          filtered = filtered.filter((po: any) => new Date(po.orderDate) <= new Date(filters.endDate))
        }
      }
      
      return filtered
    },
    getById: async (id: string) => {
      const purchaseOrders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]')
      return purchaseOrders.find((po: any) => po.id === id) || null
    },
    getByPoNumber: async (poNumber: string) => {
      const purchaseOrders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]')
      return purchaseOrders.find((po: any) => po.poNumber === poNumber) || null
    },
    create: async (data: any) => {
      const purchaseOrders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]')
      const newPO = {
        id: Date.now().toString(),
        poNumber: `PO-${Date.now()}`,
        ...data,
        status: 'draft',
        orderDate: new Date().toISOString(),
        totalAmount: data.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitCost), 0),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      purchaseOrders.push(newPO)
      localStorage.setItem('purchaseOrders', JSON.stringify(purchaseOrders))
      return newPO
    },
    update: async (id: string, data: any) => {
      const purchaseOrders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]')
      const index = purchaseOrders.findIndex((po: any) => po.id === id)
      if (index !== -1) {
        purchaseOrders[index] = { ...purchaseOrders[index], ...data, updatedAt: new Date().toISOString() }
        localStorage.setItem('purchaseOrders', JSON.stringify(purchaseOrders))
        return purchaseOrders[index]
      }
      throw new Error('Purchase order not found')
    },
    delete: async (id: string) => {
      const purchaseOrders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]')
      const filtered = purchaseOrders.filter((po: any) => po.id !== id)
      localStorage.setItem('purchaseOrders', JSON.stringify(filtered))
      return { success: true }
    },
    receive: async (id: string, receivedDate?: Date) => {
      const purchaseOrders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]')
      const index = purchaseOrders.findIndex((po: any) => po.id === id)
      if (index !== -1) {
        purchaseOrders[index].status = 'received'
        purchaseOrders[index].receivedDate = (receivedDate || new Date()).toISOString()
        localStorage.setItem('purchaseOrders', JSON.stringify(purchaseOrders))
        return purchaseOrders[index]
      }
      throw new Error('Purchase order not found')
    },
    getSummary: async () => {
      const purchaseOrders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]')
      return {
        total: purchaseOrders.length,
        draft: purchaseOrders.filter((po: any) => po.status === 'draft').length,
        ordered: purchaseOrders.filter((po: any) => po.status === 'ordered').length,
        received: purchaseOrders.filter((po: any) => po.status === 'received').length,
        cancelled: purchaseOrders.filter((po: any) => po.status === 'cancelled').length,
        totalValue: purchaseOrders.reduce((sum: number, po: any) => sum + po.totalAmount, 0),
        pendingValue: purchaseOrders.filter((po: any) => ['draft', 'ordered'].includes(po.status)).reduce((sum: number, po: any) => sum + po.totalAmount, 0)
      }
    },
    getOverdue: async () => {
      const purchaseOrders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]')
      const now = new Date()
      return purchaseOrders.filter((po: any) => 
        po.status === 'ordered' && 
        po.expectedDate && 
        new Date(po.expectedDate) < now
      )
    },
    getPending: async () => {
      const purchaseOrders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]')
      return purchaseOrders.filter((po: any) => po.status === 'ordered')
    }
  },
  installments: {
    list: async () => [],
    getByCustomer: async (_customerId: string) => [],
    getBySale: async (_saleId: string) => [],
    markAsPaid: async (_data: any) => ({ success: false, error: 'Mock implementation' }),
    create: async (_data: any) => ({ success: false, error: 'Mock implementation' })
  },
  inventory: {
    searchByBarcode: async (barcode: string) => {
      const products = JSON.parse(localStorage.getItem('products') || '[]')
      // Search through products and their variants
      for (const product of products) {
        // Check product baseBarcode
        if (product.baseBarcode === barcode) {
          return {
            ...product,
            selectedVariant: null
          }
        }
        // Check variant barcodes
        if (product.variants && product.variants.length > 0) {
          const variant = product.variants.find((v: any) => v.barcode === barcode)
          if (variant) {
            return {
              ...product,
              selectedVariant: variant
            }
          }
        }
      }
      return null
    }
  }
}

export const ipc = isElectron ? {
  // Product operations - OPTIMIZED
  products: {
    getAll: (options?: any) => window.electron.ipcRenderer.invoke('products:getAll', options),
    getById: (id: string) => window.electron.ipcRenderer.invoke('products:getById', id),
    getVariantById: (id: string) => window.electron.ipcRenderer.invoke('products:getVariantById', id),
    search: (searchTerm: string) => window.electron.ipcRenderer.invoke('products:search', searchTerm),
    getStats: () => window.electron.ipcRenderer.invoke('products:getStats'),
    create: (data: any) => window.electron.ipcRenderer.invoke('products:create', data),
    update: (id: string, data: any) => window.electron.ipcRenderer.invoke('products:update', { id, productData: data }),
    delete: (id: string) => window.electron.ipcRenderer.invoke('products:delete', id)
  },
  
  // Store operations
  stores: {
    getAll: () => window.electron.ipcRenderer.invoke('stores:getAll'),
    create: (data: any) => window.electron.ipcRenderer.invoke('stores:create', data),
    update: (id: string, data: any) => window.electron.ipcRenderer.invoke('stores:update', { id, storeData: data }),
    delete: (id: string) => window.electron.ipcRenderer.invoke('stores:delete', id)
  },
  
  // Employee operations
  employees: {
    getAll: () => window.electron.ipcRenderer.invoke('employees:getAll'),
    getById: (id: string) => window.electron.ipcRenderer.invoke('employees:getById', id),
    search: (params: any) => window.electron.ipcRenderer.invoke('employees:search', params),
    stats: () => window.electron.ipcRenderer.invoke('employees:stats'),
    create: (data: any) => window.electron.ipcRenderer.invoke('employees:create', data),
    update: (id: string, data: any) => window.electron.ipcRenderer.invoke('employees:update', { id, employeeData: data }),
    delete: (id: string) => window.electron.ipcRenderer.invoke('employees:delete', id),
    attendance: {
      upsert: (data: any) => window.electron.ipcRenderer.invoke('employees:attendance:upsert', data),
      getRange: (params: any) => window.electron.ipcRenderer.invoke('employees:attendance:getRange', params),
      checkIn: (employeeId: string) => window.electron.ipcRenderer.invoke('employees:attendance:checkIn', { employeeId }),
      checkOut: (employeeId: string) => window.electron.ipcRenderer.invoke('employees:attendance:checkOut', { employeeId })
    },
    payroll: {
      upsert: (data: any) => window.electron.ipcRenderer.invoke('employees:payroll:upsert', data),
      getAll: (year: number) => window.electron.ipcRenderer.invoke('employees:payroll:getAll', { year })
    },
    activity: {
      add: (data: any) => window.electron.ipcRenderer.invoke('employees:activity:add', data)
    },
    shifts: {
      add: (data: any) => window.electron.ipcRenderer.invoke('employees:shifts:add', data),
      getAll: (employeeId: string) => window.electron.ipcRenderer.invoke('employees:shifts:getAll', { employeeId }),
      delete: (id: string) => window.electron.ipcRenderer.invoke('employees:shifts:delete', id)
    },
    overtime: {
      add: (data: any) => window.electron.ipcRenderer.invoke('employees:overtime:add', data),
      approve: (id: string, approvedBy?: string) => window.electron.ipcRenderer.invoke('employees:overtime:approve', { id, approvedBy }),
      delete: (id: string) => window.electron.ipcRenderer.invoke('employees:overtime:delete', id)
    }
  },
  
  // Customer operations
  customers: {
    getAll: (options?: { limit?: number; offset?: number; searchTerm?: string }) => window.electron.ipcRenderer.invoke('customers:getAll', options),
    getProfile: (customerId: string) => window.electron.ipcRenderer.invoke('customers:getProfile', customerId),
    create: (data: any) => window.electron.ipcRenderer.invoke('customers:create', data),
    update: (id: string, customerData: any) => window.electron.ipcRenderer.invoke('customers:update', { id, customerData }),
    delete: (id: string) => window.electron.ipcRenderer.invoke('customers:delete', id),
    getPurchaseHistory: (customerId: string) => window.electron.ipcRenderer.invoke('customers:getPurchaseHistory', customerId),
    recalculateTotalSpent: (customerId: string) => window.electron.ipcRenderer.invoke('customers:recalculateTotalSpent', customerId)
  },
  
  // Sales operations
  sales: {
    getAll: () => window.electron.ipcRenderer.invoke('sales:getAll'),
    create: (data: any) => window.electron.ipcRenderer.invoke('sales:create', data),
    refund: (saleId: string) => window.electron.ipcRenderer.invoke('sales:refund', saleId)
  },

  // Sale Transaction operations (new transaction-based sales)
  saleTransactions: {
    create: (data: { items: any[], transactionData: any }) => window.electron.ipcRenderer.invoke('saleTransactions:create', data),
    getAll: () => window.electron.ipcRenderer.invoke('saleTransactions:getAll'),
    getById: (id: string) => window.electron.ipcRenderer.invoke('saleTransactions:getById', id),
    refund: (id: string) => window.electron.ipcRenderer.invoke('saleTransactions:refund', id),
    refundItems: (data: { 
      transactionId: string
      items: Array<{
        saleItemId: string
        quantityToRefund: number
      }>
    }) => window.electron.ipcRenderer.invoke('saleTransactions:refundItems', data),
    getByDateRange: (data: { startDate: Date, endDate: Date }) => window.electron.ipcRenderer.invoke('saleTransactions:getByDateRange', data)
  },

  // Supplier operations
  suppliers: {
    getAll: (options?: any) => window.electron.ipcRenderer.invoke('suppliers:getAll', options),
    getById: (id: string) => window.electron.ipcRenderer.invoke('suppliers:getById', id),
    create: (data: any) => window.electron.ipcRenderer.invoke('suppliers:create', data),
    update: (id: string, data: any) => window.electron.ipcRenderer.invoke('suppliers:update', id, data),
    delete: (id: string) => window.electron.ipcRenderer.invoke('suppliers:delete', id),
    addSupplierProduct: (supplierId: string, productData: any) => window.electron.ipcRenderer.invoke('suppliers:addSupplierProduct', supplierId, productData),
    getSupplierProducts: (supplierId: string) => window.electron.ipcRenderer.invoke('suppliers:getSupplierProducts', supplierId),
    removeSupplierProduct: (supplierProductId: string) => window.electron.ipcRenderer.invoke('suppliers:removeSupplierProduct', supplierProductId)
  },

  // Purchase order operations
  purchaseOrders: {
    getAll: (filters?: any) => window.electron.ipcRenderer.invoke('purchase-orders:get-all', filters),
    getById: (id: string) => window.electron.ipcRenderer.invoke('purchase-orders:get-by-id', id),
    getByPoNumber: (poNumber: string) => window.electron.ipcRenderer.invoke('purchase-orders:get-by-po-number', poNumber),
    create: (data: any) => window.electron.ipcRenderer.invoke('purchase-orders:create', data),
    update: (id: string, data: any) => window.electron.ipcRenderer.invoke('purchase-orders:update', id, data),
    delete: (id: string) => window.electron.ipcRenderer.invoke('purchase-orders:delete', id),
    receive: (id: string, receivedDate?: Date) => window.electron.ipcRenderer.invoke('purchase-orders:receive', id, receivedDate),
    getSummary: () => window.electron.ipcRenderer.invoke('purchase-orders:get-summary'),
    getOverdue: () => window.electron.ipcRenderer.invoke('purchase-orders:get-overdue'),
    getPending: () => window.electron.ipcRenderer.invoke('purchase-orders:get-pending')
  },

  // Installment operations
  installments: {
    list: (options?: any) => window.electron.ipcRenderer.invoke('installments:list', options),
    getByCustomer: (customerId: string) => window.electron.ipcRenderer.invoke('installments:getByCustomer', customerId),
    getBySale: (saleId: string) => window.electron.ipcRenderer.invoke('installments:getBySale', saleId),
    markAsPaid: (data: { installmentId: string, paidDate?: string }) => window.electron.ipcRenderer.invoke('installments:markAsPaid', data),
    create: (data: any) => window.electron.ipcRenderer.invoke('installments:create', data)
  },

  // Inventory/Barcode operations
  inventory: {
    searchByBarcode: (barcode: string) => window.electron.ipcRenderer.invoke('inventory:searchByBarcode', barcode)
  }
} : mockIPC
