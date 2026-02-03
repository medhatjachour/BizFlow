import { ElectronAPI } from '@electron-toolkit/preload'

interface API {
  auth: {
    login: (username: string, password: string) => Promise<any>
  }
  dashboard: {
    getMetrics: () => Promise<any>
  }
  sales: {
    getAll: () => Promise<any>
    create: (data: {
      productId: string
      userId: string
      quantity: number
      total: number
    }) => Promise<any>
  }
  customers: {
    getAll: () => Promise<any>
  }
  saleTransactions: {
    create: (data: any) => Promise<any>
    getAll: () => Promise<any>
    getById: (id: string) => Promise<any>
    refund: (id: string) => Promise<any>
    refundItems: (data: { transactionId: string; items: Array<{ saleItemId: string; quantityToRefund: number }> }) => Promise<any>
    getByDateRange: (data: { startDate: string; endDate: string }) => Promise<any>
  }
  inventory: {
    getProducts: () => Promise<any>
    addProduct: (data: {
      name: string
      sku: string
      price: number
      stock: number
    }) => Promise<any>
    getAll: () => Promise<any>
    getMetrics: () => Promise<any>
    getTopStocked: (limit?: number) => Promise<any>
    getLowStock: (threshold?: number) => Promise<any>
    getOutOfStock: () => Promise<any>
    search: (query: string) => Promise<any>
    searchByBarcode: (barcode: string) => Promise<any>
    getStockHistory: (productId: string) => Promise<any>
    updateStock: (data: { variantId: string; stock: number }) => Promise<any>
  }
  finance: {
    addTransaction: (data: {
      type: 'income' | 'expense'
      amount: number
      description: string
      userId: string
    }) => Promise<any>
    getTransactions: (data: { startDate: Date; endDate: Date }) => Promise<any>
    getStats: () => Promise<any>
    updateTransaction: (id: string, data: {
      type?: 'income' | 'expense'
      amount?: number
      description?: string
    }) => Promise<any>
    deleteTransaction: (id: string) => Promise<any>
  }
  products: {
    getAll: () => Promise<any>
    create: (productData: any) => Promise<any>
    update: (data: { id: string; productData: any }) => Promise<any>
    delete: (id: string) => Promise<any>
    getById: (id: string) => Promise<any>
    getVariantById: (id: string) => Promise<any>
  }
  categories: {
    getAll: () => Promise<any>
    getById: (id: string) => Promise<any>
    create: (categoryData: { name: string; description?: string; icon?: string; color?: string }) => Promise<any>
    update: (data: { id: string; categoryData: { name: string; description?: string; icon?: string; color?: string } }) => Promise<any>
    delete: (id: string) => Promise<any>
  }
  suppliers: {
    getAll: (options?: {
      page?: number
      pageSize?: number
      search?: string
      isActive?: boolean
      sortBy?: string
      sortOrder?: string
    }) => Promise<any>
    getById: (id: string) => Promise<any>
    create: (supplierData: any) => Promise<any>
    update: (id: string, updateData: any) => Promise<any>
    delete: (id: string) => Promise<any>
    getProducts: (supplierId: string) => Promise<any>
    addProduct: (supplierProductData: any) => Promise<any>
    updateProduct: (id: string, updateData: any) => Promise<any>
    removeProduct: (id: string) => Promise<any>
    getPreferredForProduct: (productId: string) => Promise<any>
    search: (query: string) => Promise<any>
  }
  users: {
    getAll: () => Promise<any>
    getById: (id: string) => Promise<any>
    create: (userData: {
      username: string
      password: string
      fullName?: string | null
      email?: string | null
      phone?: string | null
      role: string
    }) => Promise<any>
    update: (id: string, updateData: {
      fullName?: string | null
      email?: string | null
      phone?: string | null
      role?: string
      isActive?: boolean
    }) => Promise<any>
    changePassword: (id: string, newPassword: string) => Promise<any>
    delete: (id: string) => Promise<any>
    updateLastLogin: (id: string) => Promise<any>
  }
  employees: {
    getAll: () => Promise<any>
    getById: (id: string) => Promise<any>
    create: (employeeData: {
      name: string
      role: string
      email: string
      phone: string
      salary: number
    }) => Promise<any>
    update: (id: string, employeeData: {
      name?: string
      role?: string
      email?: string
      phone?: string
      salary?: number
      performance?: number
    }) => Promise<any>
    delete: (id: string) => Promise<any>
  }
  reports: {
    getSalesData: (options: { startDate: Date; endDate: Date }) => Promise<any>
    getInventoryData: (options: { startDate: Date; endDate: Date }) => Promise<any>
    getFinancialData: (options: { startDate: Date; endDate: Date }) => Promise<any>
    getCustomerData: (options: { startDate: Date; endDate: Date }) => Promise<any>
    getQuickInsights: () => Promise<any>
  }
  analytics: {
    recordStockMovement: (data: {
      variantId: string
      type: 'RESTOCK' | 'SALE' | 'ADJUSTMENT' | 'SHRINKAGE' | 'RETURN'
      quantity: number
      reason?: string
      referenceId?: string
      userId?: string
      notes?: string
    }) => Promise<any>
    getStockMovementHistory: (variantId: string, options?: {
      limit?: number
      type?: string
      startDate?: string
      endDate?: string
    }) => Promise<any>
    getStockoutHistory: (variantId: string) => Promise<any>
    getRestockHistory: (variantId: string, limit?: number) => Promise<any>
    getProductSalesStats: (productId: string, options?: {
      startDate?: string
      endDate?: string
    }) => Promise<any>
    getProductSalesTrend: (productId: string, options?: {
      period: 'daily' | 'weekly' | 'monthly' | 'yearly'
      startDate?: string
      endDate?: string
    }) => Promise<any>
    getTopSellingProducts: (options?: {
      limit?: number
      startDate?: string
      endDate?: string
      categoryId?: string
    }) => Promise<any>
    getAllStockMovements: (options?: {
      limit?: number
      type?: 'RESTOCK' | 'SALE' | 'ADJUSTMENT' | 'SHRINKAGE' | 'RETURN'
      startDate?: string
      endDate?: string
      search?: string
    }) => Promise<any>
    // Store Comparison & Analytics
    compareStores: (options?: {
      storeIds?: string[]
      startDate?: string
      endDate?: string
    }) => Promise<any>
    getStoreMetrics: (options: {
      storeId: string
      storeName: string
      startDate?: string
      endDate?: string
    }) => Promise<any>
    getTopStores: (options?: {
      limit?: number
      startDate?: string
      endDate?: string
    }) => Promise<any>
    getStoreTrends: (options: {
      storeId: string
      interval?: 'day' | 'week' | 'month'
      days?: number
    }) => Promise<any>
  }
  stockMovements: {
    record: (data: {
      variantId: string
      mode: 'add' | 'set' | 'remove'
      value: number
      reason: string
      notes?: string
      userId?: string
    }) => Promise<any>
    getHistory: (variantId: string, limit?: number) => Promise<any>
    getProductHistory: (productId: string, limit?: number) => Promise<any>
    getRecent: (limit?: number, type?: string) => Promise<any>
    bulkRecord: (data: Array<{
      variantId: string
      type: 'RESTOCK' | 'SALE' | 'ADJUSTMENT' | 'SHRINKAGE' | 'RETURN'
      quantity: number
      previousStock: number
      newStock: number
      reason?: string
      referenceId?: string
      userId?: string
      notes?: string
    }>) => Promise<any>
  }
  deposits: {
    create: (data: {
      customerId: string
      amount: number
      date: string
      method: string
      status: string
      note?: string
    }) => Promise<any>
    list: () => Promise<Array<{
      id: string
      customerId: string
      amount: number
      date: string
      method: string
      status?: string
      note?: string
    }>>
    getByCustomer: (customerId: string) => Promise<Array<{
      id: string
      customerId: string
      amount: number
      date: string
      method: string
      status?: string
      note?: string
    }>>
    getBySale: (saleId: string) => Promise<any>
    linkToSale: (data: { depositIds: string[]; saleId: string }) => Promise<any>
  }
  installments: {
    create: (data: {
      customerId: string
      amount: number
      dueDate: string
      status: string
      note?: string
    }) => Promise<any>
    list: () => Promise<any>
    getByCustomer: (customerId: string) => Promise<any>
    getBySale: (saleId: string) => Promise<any>
    linkToSale: (data: { installmentIds: string[]; saleId: string }) => Promise<any>
    markAsPaid: (data: { installmentId: string; paidDate?: string }) => Promise<any>
    markAsOverdue: (installmentId: string) => Promise<any>
    getUpcomingReminders: (days: number) => Promise<any>
    getOverdue: () => Promise<any>
    calculateLateFees: (data: { installmentId: string; dailyLateFeePercent?: number }) => Promise<any>
    markOverdueBatch: () => Promise<any>
  }
  installmentPlans: {
    getAll: () => Promise<any>
    getActive: () => Promise<any>
    create: (data: any) => Promise<any>
    update: (data: { id: string; data: any }) => Promise<any>
    delete: (id: string) => Promise<any>
    calculateSchedule: (data: { saleTotal: number; planId: string; customDownPayment?: number }) => Promise<any>
    createInstallmentsForSale: (data: { saleId: string; customerId: string | null; schedule: any }) => Promise<any>
    seedDefaults: () => Promise<any>
  }
  receipts: {
    generateDeposit: (depositId: string) => Promise<any>
    generateInstallment: (installmentId: string) => Promise<any>
    generateThermal: (receipt: any) => Promise<any>
  }
  thermalReceipts: {
    print: (data: {
      receiptData: any
      settings: any
    }) => Promise<{ success: boolean; error?: string; buffer?: string; detectedPrinter?: string; message?: string }>
    detectPrinters: () => Promise<{ success: boolean; printers: any[]; error?: string }>
    testPrint: (settings: any) => Promise<{ success: boolean; message: string }>
  }
  migration: {
    onStarting: (callback: () => void) => () => void
    onRunning: (callback: () => void) => () => void
    onValidating: (callback: () => void) => () => void
    onCompleted: (callback: () => void) => () => void
    onFailed: (callback: (event: any, error: string) => void) => () => void
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}