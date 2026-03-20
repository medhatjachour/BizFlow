/**
 * Commerce Plugin – Preload API Bindings
 *
 * Exported as `commercePreload` and spread (flat) into window.api by the
 * root preload/index.ts.  Every function maps 1-to-1 to an ipcMain.handle
 * channel registered by registerCommerceHandlers().
 *
 * Spread pattern keeps the existing call sites unchanged:
 *   window.api.products.getAll()   ← unchanged
 *   window.api.sales.create(...)   ← unchanged
 *
 * Compare with plugin-namespaced APIs:
 *   window.api.bakery.getRecipes() ← namespaced because bakery is additive
 */

import { ipcRenderer } from 'electron'

export const commercePreload = {
  // ─── Products ──────────────────────────────────────────────────────────
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
    batchCreate: (products: any[]) => ipcRenderer.invoke('products:batchCreate', products),
    batchUpdate: (updates: Array<{ id: string; data: any }>) => ipcRenderer.invoke('products:batchUpdate', updates),
    batchDelete: (ids: string[]) => ipcRenderer.invoke('products:batchDelete', ids),
  },

  // ─── Categories ────────────────────────────────────────────────────────
  categories: {
    getAll: () => ipcRenderer.invoke('categories:getAll'),
    getById: (id: string) => ipcRenderer.invoke('categories:getById', id),
    create: (categoryData: { name: string; description?: string; icon?: string; color?: string }) =>
      ipcRenderer.invoke('categories:create', categoryData),
    update: (data: { id: string; categoryData: { name: string; description?: string; icon?: string; color?: string } }) =>
      ipcRenderer.invoke('categories:update', data),
    delete: (id: string) => ipcRenderer.invoke('categories:delete', id),
  },

  // ─── Inventory ─────────────────────────────────────────────────────────
  inventory: {
    getProducts: () => ipcRenderer.invoke('inventory:getProducts'),
    getAll: (options?: { includeImages?: boolean; category?: string; searchTerm?: string }) =>
      ipcRenderer.invoke('inventory:getAll', options),
    getMetrics: () => ipcRenderer.invoke('inventory:getMetrics'),
    getTopStocked: (limit?: number) => ipcRenderer.invoke('inventory:getTopStocked', limit),
    getLowStock: (threshold?: number) => ipcRenderer.invoke('inventory:getLowStock', threshold),
    getOutOfStock: () => ipcRenderer.invoke('inventory:getOutOfStock'),
    search: (query: string) => ipcRenderer.invoke('inventory:search', query),
    searchByBarcode: (barcode: string) => ipcRenderer.invoke('inventory:searchByBarcode', barcode),
    getStockHistory: (productId: string) => ipcRenderer.invoke('inventory:getStockHistory', productId),
    updateStock: (data: { variantId: string; stock: number }) =>
      ipcRenderer.invoke('inventory:updateStock', data),
  },

  // ─── Sales ─────────────────────────────────────────────────────────────
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
    refund: (saleId: string) => ipcRenderer.invoke('sales:refund', saleId),
  },

  // ─── Sale Transactions ─────────────────────────────────────────────────
  saleTransactions: {
    create: (data: {
      items: Array<{ productId: string; variantId?: string; quantity: number; price: number }>
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
      items: Array<{ saleItemId: string; quantityToRefund: number }>
    }) => ipcRenderer.invoke('saleTransactions:refundItems', data),
    getByDateRange: (data: { startDate: string; endDate: string }) =>
      ipcRenderer.invoke('saleTransactions:getByDateRange', data),
  },

  // ─── Stores ────────────────────────────────────────────────────────────
  stores: {
    getAll: () => ipcRenderer.invoke('stores:getAll'),
    create: (storeData: any) => ipcRenderer.invoke('stores:create', storeData),
    update: (data: { id: string; storeData: any }) => ipcRenderer.invoke('stores:update', data),
    delete: (id: string) => ipcRenderer.invoke('stores:delete', id),
    getWarehouseLocations: () => ipcRenderer.invoke('stores:getWarehouseLocations'),
  },

  // ─── Suppliers ─────────────────────────────────────────────────────────
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
    search: (query: string) => ipcRenderer.invoke('suppliers:search', query),
  },

  // ─── Stock Movements ───────────────────────────────────────────────────
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
      movements: Array<{ variantId: string; mode: 'add' | 'set' | 'remove'; value: number; reason: string; notes?: string }>
      userId?: string
    }) => ipcRenderer.invoke('stockMovements:bulkRecord', data),
  },

  // ─── Deposits ──────────────────────────────────────────────────────────
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
    linkToSale: (data: { depositIds: string[]; saleId: string }) => ipcRenderer.invoke('deposits:linkToSale', data),
  },

  // ─── Installments ──────────────────────────────────────────────────────
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
    markOverdueBatch: () => ipcRenderer.invoke('installments:markOverdueBatch'),
  },

  // ─── Installment Plans ─────────────────────────────────────────────────
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
    seedDefaults: () => ipcRenderer.invoke('installment-plans:seedDefaults'),
  },

  // ─── Receipts ──────────────────────────────────────────────────────────
  receipts: {
    generateDeposit: (depositId: string) => ipcRenderer.invoke('receipts:generateDeposit', depositId),
    generateInstallment: (installmentId: string) => ipcRenderer.invoke('receipts:generateInstallment', installmentId),
    generateThermal: (receipt: any) => ipcRenderer.invoke('receipts:generateThermal', receipt),
  },
  thermalReceipts: {
    print: (data: { receiptData: any; settings: any }) => ipcRenderer.invoke('receipt:print', data),
    detectPrinters: () => ipcRenderer.invoke('receipt:detectPrinters'),
    testPrint: (settings: any) => ipcRenderer.invoke('receipt:testPrint', settings),
  },

  // ─── Purchase Orders & Reorder ─────────────────────────────────────────
  purchaseOrders: {
    getAll: (options?: any) => ipcRenderer.invoke('purchase-orders:getAll', options),
    getById: (id: string) => ipcRenderer.invoke('purchase-orders:getById', id),
    create: (data: any) => ipcRenderer.invoke('purchase-orders:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('purchase-orders:update', { id, data }),
    delete: (id: string) => ipcRenderer.invoke('purchase-orders:delete', id),
    receive: (id: string, items: any[]) => ipcRenderer.invoke('purchase-orders:receive', { id, items }),
  },
  reorder: {
    getAlerts: (threshold?: number) => ipcRenderer.invoke('reorder:getAlerts', threshold),
    dismissAlert: (variantId: string) => ipcRenderer.invoke('reorder:dismissAlert', variantId),
    generatePurchaseOrder: (data: any) => ipcRenderer.invoke('reorder:generatePurchaseOrder', data),
  },
}
