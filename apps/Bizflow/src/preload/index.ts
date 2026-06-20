import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import log from 'electron-log/preload'
import { commercePreload } from '../plugins/commerce/preload'
import { bakeryPreload } from '../plugins/bakery/preload'
import { restaurantPreload } from '../plugins/restaurant/preload'
import { warehousePreload } from '../plugins/warehouse/preload'
import { clinicPreload } from '../plugins/clinic/preload'
import { vetPreload } from '../plugins/vet/preload'
import { gymPreload } from '../plugins/gym/preload'
import { pharmacyPreload } from '../plugins/pharmacy/preload'

// Custom APIs for renderer
const api = {
  // ── Spread commerce APIs (flat, e.g. window.api.products / window.api.sales)
  // Build-time tree-shaking removes this entire branch when commerce is excluded.
  ...(typeof __PLUGIN_COMMERCE__ !== 'undefined' && __PLUGIN_COMMERCE__ ? commercePreload : {}),

  auth: {
    login: (username: string, password: string) =>
      ipcRenderer.invoke('auth:login', { username, password }),
    // create a new user account (username, password, role)
    create: (username: string, password: string, role: string = 'sales') =>
      ipcRenderer.invoke('auth:create', { username, password, role }),
    logout: () => ipcRenderer.invoke('auth:logout'),
    // bind the acting user in the main process and return resolved capabilities
    bindSession: (user: { id: string; username: string; role: string } | null) =>
      ipcRenderer.invoke('permissions:bindSession', user)
  },
  permissions: {
    getRoles: () => ipcRenderer.invoke('permissions:getRoles'),
    setRole: (role: string, caps: string[]) => ipcRenderer.invoke('permissions:setRole', role, caps),
    bindSession: (user: { id: string; username: string; role: string } | null) =>
      ipcRenderer.invoke('permissions:bindSession', user)
  },
  dashboard: {
    getMetrics: () => ipcRenderer.invoke('dashboard:getMetrics'),
    getSalesChart: (opts: { startDate: string; endDate: string }) => ipcRenderer.invoke('dashboard:getSalesChart', opts),
    getTopProducts: (opts: { startDate: string; endDate: string; limit?: number }) => ipcRenderer.invoke('dashboard:getTopProducts', opts),
    getRecentActivity: (opts?: { limit?: number }) => ipcRenderer.invoke('dashboard:getRecentActivity', opts),
    getDayStats: (opts: { startDate: string; endDate: string }) => ipcRenderer.invoke('dashboard:getDayStats', opts),
  },
  customers: {
    getAll: () => ipcRenderer.invoke('customers:getAll'),
    getCount: () => ipcRenderer.invoke('customers:getCount'),
    getProfile: (customerId: string) => ipcRenderer.invoke('customers:getProfile', customerId)
  },
  employees: {
    getAll: () => ipcRenderer.invoke('employees:getAll'),
    getById: (id: string) => ipcRenderer.invoke('employees:getById', id),
    search: (params: { query?: string; status?: string; department?: string; role?: string }) =>
      ipcRenderer.invoke('employees:search', params),
    stats: () => ipcRenderer.invoke('employees:stats'),
    create: (employeeData: any) => ipcRenderer.invoke('employees:create', employeeData),
    update: (id: string, employeeData: any) => ipcRenderer.invoke('employees:update', { id, employeeData }),
    delete: (id: string) => ipcRenderer.invoke('employees:delete', id),
    attendance: {
      upsert: (data: any) => ipcRenderer.invoke('employees:attendance:upsert', data),
      getRange: (params: { employeeId: string; from: string; to: string }) =>
        ipcRenderer.invoke('employees:attendance:getRange', params),
      checkIn: (employeeId: string) => ipcRenderer.invoke('employees:attendance:checkIn', { employeeId }),
      checkOut: (employeeId: string) => ipcRenderer.invoke('employees:attendance:checkOut', { employeeId })
    },
    payroll: {
      upsert: (data: any) => ipcRenderer.invoke('employees:payroll:upsert', data),
      getAll: (year: number) => ipcRenderer.invoke('employees:payroll:getAll', { year }),
      markPaid: (id: string) => ipcRenderer.invoke('employees:payroll:markPaid', id),
      compute: (params: any) => ipcRenderer.invoke('employees:payroll:compute', params),
      getSummary: (params: any) => ipcRenderer.invoke('employees:payroll:getSummary', params)
    },
    activity: {
      add: (data: { employeeId: string; action: string; details?: string; performedBy?: string }) =>
        ipcRenderer.invoke('employees:activity:add', data)
    },
    shifts: {
      add: (data: any) => ipcRenderer.invoke('employees:shifts:add', data),
      getAll: (employeeId: string) => ipcRenderer.invoke('employees:shifts:getAll', { employeeId }),
      delete: (id: string) => ipcRenderer.invoke('employees:shifts:delete', id)
    },
    overtime: {
      add: (data: any) => ipcRenderer.invoke('employees:overtime:add', data),
      approve: (id: string, approvedBy?: string) => ipcRenderer.invoke('employees:overtime:approve', { id, approvedBy }),
      delete: (id: string) => ipcRenderer.invoke('employees:overtime:delete', id)
    }
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
  },
  // Module feature flags
  modules: {
    getEnabled: (): Promise<string[]> => ipcRenderer.invoke('module:getEnabled'),
    setEnabled: (moduleId: string, enabled: boolean): Promise<void> =>
      ipcRenderer.invoke('module:setEnabled', { moduleId, enabled }),
    relaunch: (): Promise<void> => ipcRenderer.invoke('module:relaunch'),
  },
  finance: {
    addTransaction: (data: { type: string; amount: number; description?: string; userId?: string }) =>
      ipcRenderer.invoke('finance:addTransaction', data),
    getTransactions: (data: { startDate: Date | string; endDate: Date | string }) =>
      ipcRenderer.invoke('finance:getTransactions', data),
    getStats: () =>
      ipcRenderer.invoke('finance:getStats'),
  },
  // ─── Plugin APIs ──────────────────────────────────────────────────────────
  // Each plugin exposes its IPC bindings under its own namespace.
  // Adding a plugin: import its preload and add it here.
  bakery: bakeryPreload,
  restaurant: restaurantPreload,
  warehouse: warehousePreload,
  clinic: clinicPreload,
  vet: vetPreload,
  gym: typeof __PLUGIN_GYM__ !== 'undefined' && __PLUGIN_GYM__ ? gymPreload : undefined,
  pharmacy: typeof __PLUGIN_PHARMACY__ !== 'undefined' && __PLUGIN_PHARMACY__ ? pharmacyPreload : undefined
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
