import { ipcRenderer } from 'electron'

/**
 * Pharmacy plugin preload bindings.
 * Exposed on the renderer as `window.api.pharmacy.*`.
 */
export const pharmacyPreload = {
  products: {
    getAll: (params?: any) => ipcRenderer.invoke('pharmacy:products:getAll', params),
    getById: (id: string) => ipcRenderer.invoke('pharmacy:products:getById', id),
    create: (data: any) => ipcRenderer.invoke('pharmacy:products:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('pharmacy:products:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('pharmacy:products:delete', id),
    getCategories: () => ipcRenderer.invoke('pharmacy:products:getCategories'),
    getHistory: (id: string, params?: { from?: string; to?: string }) => ipcRenderer.invoke('pharmacy:products:getHistory', id, params),
  },
  batches: {
    getByProduct: (productId: string) => ipcRenderer.invoke('pharmacy:batches:getByProduct', productId),
    add: (data: any) => ipcRenderer.invoke('pharmacy:batches:add', data),
    update: (id: string, data: any) => ipcRenderer.invoke('pharmacy:batches:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('pharmacy:batches:delete', id),
    adjust: (id: string, data: { mode: 'add' | 'remove' | 'set'; amount: number; unit?: 'base' | 'sub'; reason?: string }) => ipcRenderer.invoke('pharmacy:batches:adjust', id, data),
    dispose: (id: string, data?: { quantity?: number; reason?: string }) => ipcRenderer.invoke('pharmacy:batches:dispose', id, data),
    getExpiring: (params?: { days?: number; includeExpired?: boolean }) => ipcRenderer.invoke('pharmacy:batches:getExpiring', params),
  },
  sales: {
    create: (data: any) => ipcRenderer.invoke('pharmacy:sales:create', data),
    getAll: (params?: any) => ipcRenderer.invoke('pharmacy:sales:getAll', params),
    getById: (id: string) => ipcRenderer.invoke('pharmacy:sales:getById', id),
    updatePayment: (id: string, data: { amount?: number; payFull?: boolean }) => ipcRenderer.invoke('pharmacy:sales:updatePayment', id, data),
    refund: (id: string, data?: { reason?: string }) => ipcRenderer.invoke('pharmacy:sales:refund', id, data),
    refundItem: (itemId: string, data?: { quantity?: number; reason?: string }) => ipcRenderer.invoke('pharmacy:sales:refundItem', itemId, data),
  },
  suppliers: {
    getAll: (params?: { search?: string }) => ipcRenderer.invoke('pharmacy:suppliers:getAll', params),
    getById: (id: string) => ipcRenderer.invoke('pharmacy:suppliers:getById', id),
    create: (data: any) => ipcRenderer.invoke('pharmacy:suppliers:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('pharmacy:suppliers:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('pharmacy:suppliers:delete', id),
  },
  purchaseOrders: {
    getAll: (params?: any) => ipcRenderer.invoke('pharmacy:purchaseOrders:getAll', params),
    getById: (id: string) => ipcRenderer.invoke('pharmacy:purchaseOrders:getById', id),
    create: (data: any) => ipcRenderer.invoke('pharmacy:purchaseOrders:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('pharmacy:purchaseOrders:update', id, data),
    receive: (id: string) => ipcRenderer.invoke('pharmacy:purchaseOrders:receive', id),
    delete: (id: string) => ipcRenderer.invoke('pharmacy:purchaseOrders:delete', id),
  },
  stats: {
    overview: (period?: string) => ipcRenderer.invoke('pharmacy:stats:overview', period),
    salesSummary: (params?: { from?: string; to?: string }) => ipcRenderer.invoke('pharmacy:stats:salesSummary', params),
    inventory: () => ipcRenderer.invoke('pharmacy:stats:inventory'),
    cashflow: () => ipcRenderer.invoke('pharmacy:stats:cashflow'),
  },
  customers: {
    getAll: (params?: { search?: string }) => ipcRenderer.invoke('pharmacy:customers:getAll', params),
    searchLite: (query: string) => ipcRenderer.invoke('pharmacy:customers:searchLite', query),
    profile: (id: string) => ipcRenderer.invoke('pharmacy:customers:profile', id),
    create: (data: any) => ipcRenderer.invoke('pharmacy:customers:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('pharmacy:customers:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('pharmacy:customers:delete', id),
    settle: (id: string, data?: { amount?: number }) => ipcRenderer.invoke('pharmacy:customers:settle', id, data),
  },
}
