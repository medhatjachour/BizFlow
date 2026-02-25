import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import log from 'electron-log/preload'

// Custom APIs for renderer
const api = {
  auth: {
    login: (username: string, password: string) =>
      ipcRenderer.invoke('auth:login', { username, password }),
    // create a new user account (username, password, role)
    create: (username: string, password: string, role: string = 'sales') =>
      ipcRenderer.invoke('auth:create', { username, password, role })
  },
  dashboard: {
    getMetrics: () => ipcRenderer.invoke('dashboard:getMetrics')
  },
  sales: {
    getAll: () => ipcRenderer.invoke('sales:getAll'),
    create: (data: {
      productId: string
      variantId?: string
      userId: string
      quantity: number
      price: number
      total: number
      paymentMethod?: string
      customerName?: string
    }) => ipcRenderer.invoke('sales:create', data),
    refund: (saleId: string) => ipcRenderer.invoke('sales:refund', saleId)
  },
  saleTransactions: {
    create: (data: {
      items: Array<{
        productId: string
        variantId?: string
        quantity: number
        price: number
      }>
      transactionData: {
        userId: string
        paymentMethod: string
        customerName?: string
        subtotal: number
        tax: number
        total: number
      }
    }) => ipcRenderer.invoke('saleTransactions:create', data),
    getAll: () => ipcRenderer.invoke('saleTransactions:getAll'),
    getById: (id: string) => ipcRenderer.invoke('saleTransactions:getById', id),
    refund: (id: string) => ipcRenderer.invoke('saleTransactions:refund', id),
    refundItems: (data: { 
      transactionId: string
      items: Array<{
        saleItemId: string
        quantityToRefund: number
      }>
    }) => ipcRenderer.invoke('saleTransactions:refundItems', data),
    getByDateRange: (data: { startDate: string; endDate: string }) =>
      ipcRenderer.invoke('saleTransactions:getByDateRange', data)
  },
  customers: {
    getAll: () => ipcRenderer.invoke('customers:getAll'),
    getProfile: (customerId: string) => ipcRenderer.invoke('customers:getProfile', customerId)
  },
  inventory: {
    getProducts: () => ipcRenderer.invoke('inventory:getProducts'),
    addProduct: (data: {
      name: string
      sku: string
      price: number
      stock: number
    }) => ipcRenderer.invoke('inventory:addProduct', data),
    // New inventory management APIs
    getAll: (options?: {
      includeImages?: boolean
      category?: string
      searchTerm?: string
    }) => ipcRenderer.invoke('inventory:getAll', options),
    getMetrics: () => ipcRenderer.invoke('inventory:getMetrics'),
    getTopStocked: (limit?: number) => ipcRenderer.invoke('inventory:getTopStocked', limit),
    getLowStock: (threshold?: number) => ipcRenderer.invoke('inventory:getLowStock', threshold),
    getOutOfStock: () => ipcRenderer.invoke('inventory:getOutOfStock'),
    search: (query: string) => ipcRenderer.invoke('inventory:search', query),
    searchByBarcode: (barcode: string) => ipcRenderer.invoke('inventory:searchByBarcode', barcode),
    getStockHistory: (productId: string) => ipcRenderer.invoke('inventory:getStockHistory', productId),
    updateStock: (data: { variantId: string; stock: number }) => 
      ipcRenderer.invoke('inventory:updateStock', data)
  },
  finance: {
    addTransaction: (data: {
      type: 'income' | 'expense'
      amount: number
      description: string
      userId: string
    }) => ipcRenderer.invoke('finance:addTransaction', data),
    getTransactions: (data: { startDate: string; endDate: string }) =>
      ipcRenderer.invoke('finance:getTransactions', data),
    getStats: () => ipcRenderer.invoke('finance:getStats'),
    updateTransaction: (id: string, data: {
      type?: 'income' | 'expense'
      amount?: number
      description?: string
    }) => ipcRenderer.invoke('finance:updateTransaction', { id, data }),
    deleteTransaction: (id: string) => ipcRenderer.invoke('finance:deleteTransaction', id)
  },
  products: {
    getAll: (options?: { 
      includeImages?: boolean
      limit?: number
      offset?: number
      searchTerm?: string
      category?: string
    }) => ipcRenderer.invoke('products:getAll', options),
    getById: (id: string) => ipcRenderer.invoke('products:getById', id),
    getVariantById: (id: string) => ipcRenderer.invoke('products:getVariantById', id),
    getStats: () => ipcRenderer.invoke('products:getStats'),
    search: (term: string) => ipcRenderer.invoke('products:search', term),
    create: (productData: any) => ipcRenderer.invoke('products:create', productData),
    update: (data: { id: string; productData: any }) => ipcRenderer.invoke('products:update', data),
    delete: (id: string) => ipcRenderer.invoke('products:delete', id),
    // Batch operations
    batchCreate: (products: any[]) => ipcRenderer.invoke('products:batchCreate', products),
    batchUpdate: (updates: Array<{ id: string; data: any }>) => ipcRenderer.invoke('products:batchUpdate', updates),
    batchDelete: (ids: string[]) => ipcRenderer.invoke('products:batchDelete', ids)
  },
  categories: {
    getAll: () => ipcRenderer.invoke('categories:getAll'),
    getById: (id: string) => ipcRenderer.invoke('categories:getById', id),
    create: (categoryData: { name: string; description?: string; icon?: string; color?: string }) => 
      ipcRenderer.invoke('categories:create', categoryData),
    update: (data: { id: string; categoryData: { name: string; description?: string; icon?: string; color?: string } }) => 
      ipcRenderer.invoke('categories:update', data),
    delete: (id: string) => ipcRenderer.invoke('categories:delete', id)
  },
  suppliers: {
    getAll: (options?: {
      page?: number
      pageSize?: number
      search?: string
      isActive?: boolean
      sortBy?: string
      sortOrder?: string
    }) => ipcRenderer.invoke('suppliers:getAll', options),
    getById: (id: string) => ipcRenderer.invoke('suppliers:getById', id),
    create: (supplierData: any) => ipcRenderer.invoke('suppliers:create', supplierData),
    update: (id: string, updateData: any) => ipcRenderer.invoke('suppliers:update', id, updateData),
    delete: (id: string) => ipcRenderer.invoke('suppliers:delete', id),
    getProducts: (supplierId: string) => ipcRenderer.invoke('suppliers:getProducts', supplierId),
    addProduct: (supplierProductData: any) => ipcRenderer.invoke('suppliers:addProduct', supplierProductData),
    updateProduct: (id: string, updateData: any) => ipcRenderer.invoke('suppliers:updateProduct', id, updateData),
    removeProduct: (id: string) => ipcRenderer.invoke('suppliers:removeProduct', id),
    getPreferredForProduct: (productId: string) => ipcRenderer.invoke('suppliers:getPreferredForProduct', productId),
    search: (query: string) => ipcRenderer.invoke('suppliers:search', query)
  },
  employees: {
    getAll: () => ipcRenderer.invoke('employees:getAll'),
    getById: (id: string) => ipcRenderer.invoke('employees:getById', id),
    create: (employeeData: {
      name: string
      role: string
      email: string
      phone: string
      salary: number
    }) => ipcRenderer.invoke('employees:create', employeeData),
    update: (id: string, employeeData: {
      name?: string
      role?: string
      email?: string
      phone?: string
      salary?: number
      performance?: number
    }) => ipcRenderer.invoke('employees:update', { id, employeeData }),
    delete: (id: string) => ipcRenderer.invoke('employees:delete', id)
  },
  users: {
    getAll: () => ipcRenderer.invoke('users:getAll'),
    getById: (id: string) => ipcRenderer.invoke('users:getById', id),
    create: (userData: {
      username: string
      password: string
      fullName?: string | null
      email?: string | null
      phone?: string | null
      role: string
    }) => ipcRenderer.invoke('users:create', userData),
    update: (id: string, updateData: {
      fullName?: string | null
      email?: string | null
      phone?: string | null
      role?: string
      isActive?: boolean
    }) => ipcRenderer.invoke('users:update', id, updateData),
    changePassword: (id: string, newPassword: string) => 
      ipcRenderer.invoke('users:changePassword', id, newPassword),
    delete: (id: string) => ipcRenderer.invoke('users:delete', id),
    updateLastLogin: (id: string) => ipcRenderer.invoke('users:updateLastLogin', id)
  },
  reports: {
    getSalesData: (options: { startDate: string; endDate: string; filters?: any }) =>
      ipcRenderer.invoke('reports:getSalesData', options),
    getInventoryData: (options: { filters?: any }) =>
      ipcRenderer.invoke('reports:getInventoryData', options),
    getFinancialData: (options: { startDate: string; endDate: string }) =>
      ipcRenderer.invoke('reports:getFinancialData', options),
    getCustomerData: (options: { startDate: string; endDate: string }) =>
      ipcRenderer.invoke('reports:getCustomerData', options),
    getQuickInsights: () =>
      ipcRenderer.invoke('reports:getQuickInsights')
  },
  // Universal backend search
  'search:products': (options: any) => ipcRenderer.invoke('search:products', options),
  'search:inventory': (options: any) => ipcRenderer.invoke('search:inventory', options),
  'search:getFilterMetadata': () => ipcRenderer.invoke('search:getFilterMetadata'),
  'search:sales': (options: any) => ipcRenderer.invoke('search:sales', options),
  'search:finance': (options: any) => ipcRenderer.invoke('search:finance', options),
  // Prediction & Analytics
  'forecast:revenue': (options: { days?: number; historicalDays?: number }) => 
    ipcRenderer.invoke('forecast:revenue', options),
  'forecast:cashflow': (options: { days?: number }) => 
    ipcRenderer.invoke('forecast:cashflow', options),
  'insights:products': (options: { limit?: number }) => 
    ipcRenderer.invoke('insights:products', options),
  'health:financial': () => 
    ipcRenderer.invoke('health:financial'),
  // Stock Movement & Product Analytics
  analytics: {
    recordStockMovement: (data: {
      variantId: string
      type: 'RESTOCK' | 'SALE' | 'ADJUSTMENT' | 'SHRINKAGE' | 'RETURN'
      quantity: number
      reason?: string
      referenceId?: string
      userId?: string
      notes?: string
    }) => ipcRenderer.invoke('analytics:recordStockMovement', data),
    getStockMovementHistory: (variantId: string, options?: {
      limit?: number
      type?: string
      startDate?: string
      endDate?: string
    }) => ipcRenderer.invoke('analytics:getStockMovementHistory', variantId, options),
    getStockoutHistory: (variantId: string) => 
      ipcRenderer.invoke('analytics:getStockoutHistory', variantId),
    getRestockHistory: (variantId: string, limit?: number) => 
      ipcRenderer.invoke('analytics:getRestockHistory', variantId, limit),
    getProductSalesStats: (productId: string, options?: {
      startDate?: string
      endDate?: string
    }) => ipcRenderer.invoke('analytics:getProductSalesStats', productId, options),
    getProductSalesTrend: (productId: string, options?: {
      period: 'daily' | 'weekly' | 'monthly' | 'yearly'
      startDate?: string
      endDate?: string
    }) => ipcRenderer.invoke('analytics:getProductSalesTrend', productId, options),
    getTopSellingProducts: (options?: {
      limit?: number
      startDate?: string
      endDate?: string
      categoryId?: string
    }) => ipcRenderer.invoke('analytics:getTopSellingProducts', options),
    getOverallStats: (options?: {
      startDate?: string
      endDate?: string
    }) => ipcRenderer.invoke('analytics:getOverallStats', options),
    getAllStockMovements: (options?: {
      limit?: number
      type?: 'RESTOCK' | 'SALE' | 'ADJUSTMENT' | 'SHRINKAGE' | 'RETURN'
      startDate?: string
      endDate?: string
      search?: string
    }) => ipcRenderer.invoke('analytics:getAllStockMovements', options),
    // Store Comparison & Analytics
    compareStores: (options?: {
      storeIds?: string[]
      startDate?: string
      endDate?: string
    }) => ipcRenderer.invoke('analytics:compareStores', options),
    getStoreMetrics: (options: {
      storeId: string
      storeName: string
      startDate?: string
      endDate?: string
    }) => ipcRenderer.invoke('analytics:getStoreMetrics', options),
    getTopStores: (options?: {
      limit?: number
      startDate?: string
      endDate?: string
    }) => ipcRenderer.invoke('analytics:getTopStores', options),
    getStoreTrends: (options: {
      storeId: string
      interval?: 'day' | 'week' | 'month'
      days?: number
    }) => ipcRenderer.invoke('analytics:getStoreTrends', options)
  },
  // Stock Movement Management (New System)
  stockMovements: {
    record: (data: {
      variantId: string
      mode: 'add' | 'set' | 'remove'
      value: number
      reason: string
      notes?: string
      userId?: string
    }) => ipcRenderer.invoke('stockMovements:record', data),
    getHistory: (variantId: string, limit?: number) => 
      ipcRenderer.invoke('stockMovements:getHistory', { variantId, limit }),
    getProductHistory: (productId: string, limit?: number) =>
      ipcRenderer.invoke('stockMovements:getProductHistory', { productId, limit }),
    getRecent: (limit?: number, type?: string) =>
      ipcRenderer.invoke('stockMovements:getRecent', { limit, type }),
    bulkRecord: (data: {
      movements: Array<{
        variantId: string
        mode: 'add' | 'set' | 'remove'
        value: number
        reason: string
        notes?: string
      }>
      userId?: string
    }) => ipcRenderer.invoke('stockMovements:bulkRecord', data)
  },
  // Deposits and Installments
  deposits: {
    create: (data: {
      amount: number
      date?: Date
      method: string
      status?: string
      note?: string
      customerId?: string
      saleId?: string
    }) => ipcRenderer.invoke('deposits:create', data),
    list: () => ipcRenderer.invoke('deposits:list'),
    getByCustomer: (customerId: string) => ipcRenderer.invoke('deposits:getByCustomer', customerId),
    getBySale: (saleId: string) => ipcRenderer.invoke('deposits:getBySale', saleId),
    linkToSale: (data: { depositIds: string[]; saleId: string }) => ipcRenderer.invoke('deposits:linkToSale', data)
  },
  installments: {
    create: (data: {
      amount: number
      dueDate: Date
      paidDate?: Date
      status?: string
      note?: string
      customerId?: string
      saleId?: string
    }) => ipcRenderer.invoke('installments:create', data),
    list: () => ipcRenderer.invoke('installments:list'),
    getByCustomer: (customerId: string) => ipcRenderer.invoke('installments:getByCustomer', customerId),
    getBySale: (saleId: string) => ipcRenderer.invoke('installments:getBySale', saleId),
    getUpcomingReminders: (daysAhead?: number) => ipcRenderer.invoke('installments:getUpcomingReminders', daysAhead),
    getOverdue: () => ipcRenderer.invoke('installments:getOverdue'),
    markAsPaid: (data: { installmentId: string; paidDate?: string }) => ipcRenderer.invoke('installments:markAsPaid', data),
    markAsOverdue: (installmentId: string) => ipcRenderer.invoke('installments:markAsOverdue', installmentId),
    linkToSale: (data: { installmentIds: string[]; saleId: string }) => ipcRenderer.invoke('installments:linkToSale', data),
    calculateLateFees: (data: { installmentId: string; dailyLateFeePercent?: number }) => ipcRenderer.invoke('installments:calculateLateFees', data),
    markOverdueBatch: () => ipcRenderer.invoke('installments:markOverdueBatch')
  },
  // Installment Plans
  installmentPlans: {
    getAll: () => ipcRenderer.invoke('installment-plans:getAll'),
    getActive: () => ipcRenderer.invoke('installment-plans:getActive'),
    create: (data: any) => ipcRenderer.invoke('installment-plans:create', data),
    update: (data: { id: string; data: any }) => ipcRenderer.invoke('installment-plans:update', data),
    delete: (id: string) => ipcRenderer.invoke('installment-plans:delete', id),
    calculateSchedule: (data: { saleTotal: number; planId: string; customDownPayment?: number }) => 
      ipcRenderer.invoke('installment-plans:calculateSchedule', data),
    createInstallmentsForSale: (data: { saleId: string; customerId: string | null; schedule: any }) => 
      ipcRenderer.invoke('installment-plans:createInstallmentsForSale', data),
    seedDefaults: () => ipcRenderer.invoke('installment-plans:seedDefaults')
  },
  // Receipt generation
  receipts: {
    generateDeposit: (depositId: string) => ipcRenderer.invoke('receipts:generateDeposit', depositId),
    generateInstallment: (installmentId: string) => ipcRenderer.invoke('receipts:generateInstallment', installmentId),
    generateThermal: (receipt: any) => ipcRenderer.invoke('receipts:generateThermal', receipt)
  },
  thermalReceipts: {
    print: (data: {
      receiptData: any
      settings: any
    }) => ipcRenderer.invoke('receipt:print', data),
    detectPrinters: () => ipcRenderer.invoke('receipt:detectPrinters'),
    testPrint: (settings: any) => ipcRenderer.invoke('receipt:testPrint', settings)
  },
  // Delete operations
  delete: {
    checkCustomer: (customerId: string) => ipcRenderer.invoke('delete:check-customer', { customerId }),
    checkProduct: (productId: string) => ipcRenderer.invoke('delete:check-product', { productId }),
    checkUser: (userId: string) => ipcRenderer.invoke('delete:check-user', { userId }),
    archiveCustomer: (customerId: string) => ipcRenderer.invoke('delete:archive-customer', { customerId }),
    archiveProduct: (productId: string) => ipcRenderer.invoke('delete:archive-product', { productId }),
    deactivateUser: (userId: string) => ipcRenderer.invoke('delete:deactivate-user', { userId }),
    hardDeleteCustomer: (customerId: string) => ipcRenderer.invoke('delete:hard-delete-customer', { customerId }),
    hardDeleteProduct: (productId: string) => ipcRenderer.invoke('delete:hard-delete-product', { productId }),
    hardDeleteUser: (userId: string) => ipcRenderer.invoke('delete:hard-delete-user', { userId }),
    getArchivedCustomers: () => ipcRenderer.invoke('delete:get-archived-customers'),
    getArchivedProducts: () => ipcRenderer.invoke('delete:get-archived-products'),
    getDeactivatedUsers: () => ipcRenderer.invoke('delete:get-deactivated-users'),
    cleanupUnlinkedDeposits: (customerId: string) => ipcRenderer.invoke('delete:cleanup-unlinked-deposits', customerId),
    cleanupUnlinkedInstallments: (customerId: string) => ipcRenderer.invoke('delete:cleanup-unlinked-installments', customerId)
  },
  // Migration event listeners
  migration: {
    onStarting: (callback: () => void) => {
      ipcRenderer.on('migration:starting', callback)
      return () => ipcRenderer.removeListener('migration:starting', callback)
    },
    onRunning: (callback: () => void) => {
      ipcRenderer.on('migration:running', callback)
      return () => ipcRenderer.removeListener('migration:running', callback)
    },
    onValidating: (callback: () => void) => {
      ipcRenderer.on('migration:validating', callback)
      return () => ipcRenderer.removeListener('migration:validating', callback)
    },
    onCompleted: (callback: () => void) => {
      ipcRenderer.on('migration:completed', callback)
      return () => ipcRenderer.removeListener('migration:completed', callback)
    },
    onFailed: (callback: (_event: any, error: string) => void) => {
      ipcRenderer.on('migration:failed', callback)
      return () => ipcRenderer.removeListener('migration:failed', callback)
    }
  },
  // Log bridge: renderer → main process log file
  log: {
    info:  (message: string, data?: unknown) => ipcRenderer.invoke('log:fromRenderer', { level: 'info',  message, data }),
    warn:  (message: string, data?: unknown) => ipcRenderer.invoke('log:fromRenderer', { level: 'warn',  message, data }),
    error: (message: string, data?: unknown) => ipcRenderer.invoke('log:fromRenderer', { level: 'error', message, data }),
    debug: (message: string, data?: unknown) => ipcRenderer.invoke('log:fromRenderer', { level: 'debug', message, data })
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    log.error('contextBridge setup failed:', error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
