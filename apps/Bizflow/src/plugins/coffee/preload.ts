// ─── Coffee Plugin – Preload API ──────────────────────────────────────────────
// Exposes all coffee IPC channels to the renderer as `window.api.coffee.*`.
// Each method maps 1-to-1 to an ipcMain.handle() channel.
// ─────────────────────────────────────────────────────────────────────────────

import { ipcRenderer } from 'electron'

export const coffeePreload = {
  // ── Categories ──────────────────────────────────────────────────────────────
  categories: {
    getAll: ()         => ipcRenderer.invoke('coffee:categories:getAll'),
    create: (d: any)   => ipcRenderer.invoke('coffee:categories:create', d),
    update: (d: any)   => ipcRenderer.invoke('coffee:categories:update', d),
    delete: (id: string) => ipcRenderer.invoke('coffee:categories:delete', id)
  },

  // ── Products ─────────────────────────────────────────────────────────────────
  products: {
    getAll:   (opts?: any) => ipcRenderer.invoke('coffee:products:getAll', opts),
    getById:  (id: string) => ipcRenderer.invoke('coffee:products:getById', id),
    create:   (d: any)     => ipcRenderer.invoke('coffee:products:create', d),
    update:   (d: any)     => ipcRenderer.invoke('coffee:products:update', d),
    delete:   (id: string) => ipcRenderer.invoke('coffee:products:delete', id),
    toggleAvailability: (id: string, isAvailable: boolean) =>
      ipcRenderer.invoke('coffee:products:toggleAvailability', { id, isAvailable }),
    /** Save a base64 image, returns filename */
    saveImage: (base64: string) => ipcRenderer.invoke('coffee:products:saveImage', base64),
    /** Load a saved image as base64 data URL */
    loadImage: (filename: string) => ipcRenderer.invoke('coffee:products:loadImage', filename)
  },

  // ── Inventory / Stock ────────────────────────────────────────────────────────
  inventory: {
    getMovements: (productId: string) => ipcRenderer.invoke('coffee:inventory:getMovements', productId),
    adjust:       (d: any)            => ipcRenderer.invoke('coffee:inventory:adjust', d)
  },

  incomingReceipts: {
    getAll: (opts?: any) => ipcRenderer.invoke('coffee:incomingReceipts:getAll', opts),
    getSummary: (opts?: any) => ipcRenderer.invoke('coffee:incomingReceipts:getSummary', opts),
    create: (d: any) => ipcRenderer.invoke('coffee:incomingReceipts:create', d)
  },

  transitReceipts: {
    getAll: (opts?: any) => ipcRenderer.invoke('coffee:transitReceipts:getAll', opts),
    getSummary: (opts?: any) => ipcRenderer.invoke('coffee:transitReceipts:getSummary', opts),
    create: (d: any) => ipcRenderer.invoke('coffee:transitReceipts:create', d),
    updateStatus: (d: any) => ipcRenderer.invoke('coffee:transitReceipts:updateStatus', d),
    delete: (id: string) => ipcRenderer.invoke('coffee:transitReceipts:delete', id)
  },

  expenses: {
    getAll: (opts?: any) => ipcRenderer.invoke('coffee:expenses:getAll', opts),
    getSummary: (opts?: any) => ipcRenderer.invoke('coffee:expenses:getSummary', opts),
    create: (d: any) => ipcRenderer.invoke('coffee:expenses:create', d),
    update: (id: string, data: any) => ipcRenderer.invoke('coffee:expenses:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('coffee:expenses:delete', id)
  },

  // ── Tables ───────────────────────────────────────────────────────────────────
  tables: {
    getAll:       ()             => ipcRenderer.invoke('coffee:tables:getAll'),
    create:       (d: any)       => ipcRenderer.invoke('coffee:tables:create', d),
    update:       (d: any)       => ipcRenderer.invoke('coffee:tables:update', d),
    delete:       (id: string)   => ipcRenderer.invoke('coffee:tables:delete', id),
    getHistory:   (id: string)   => ipcRenderer.invoke('coffee:tables:getHistory', id)
  },

  // ── Orders ───────────────────────────────────────────────────────────────────
  orders: {
    getAll:           (opts?: any)  => ipcRenderer.invoke('coffee:orders:getAll', opts),
    getById:          (id: string)  => ipcRenderer.invoke('coffee:orders:getById', id),
    create:           (d: any)      => ipcRenderer.invoke('coffee:orders:create', d),
    addItem:          (d: any)      => ipcRenderer.invoke('coffee:orders:addItem', d),
    removeItem:       (id: string)  => ipcRenderer.invoke('coffee:orders:removeItem', id),
    updateItemStatus: (d: any)      => ipcRenderer.invoke('coffee:orders:updateItemStatus', d),
    close:            (d: any)      => ipcRenderer.invoke('coffee:orders:close', d),
    void:             (id: string)  => ipcRenderer.invoke('coffee:orders:void', id)
  },

  // ── Sales (completed orders history) ─────────────────────────────────────────
  sales: {
    getAll: (opts?: any) => ipcRenderer.invoke('coffee:sales:getAll', opts),
    getSummary: (opts?: any) => ipcRenderer.invoke('coffee:sales:getSummary', opts)
  },

  reports: {
    getOverview: (opts?: any) => ipcRenderer.invoke('coffee:reports:getOverview', opts),
    getDailyTrend: (opts?: any) => ipcRenderer.invoke('coffee:reports:getDailyTrend', opts),
    getTopProducts: (opts?: any) => ipcRenderer.invoke('coffee:reports:getTopProducts', opts),
    getCategoryPerformance: (opts?: any) => ipcRenderer.invoke('coffee:reports:getCategoryPerformance', opts),
    getCustomerInsights: (opts?: any) => ipcRenderer.invoke('coffee:reports:getCustomerInsights', opts)
  },

  finance: {
    getOverview: (opts?: any) => ipcRenderer.invoke('coffee:finance:getOverview', opts),
    getTransactions: (opts?: any) => ipcRenderer.invoke('coffee:finance:getTransactions', opts)
  },

  // ── Shifts ───────────────────────────────────────────────────────────────────
  shifts: {
    getActive:    ()       => ipcRenderer.invoke('coffee:shifts:getActive'),
    getHistory:   (opts?: any) => ipcRenderer.invoke('coffee:shifts:getHistory', opts),
    getSummary:   (opts?: any) => ipcRenderer.invoke('coffee:shifts:getSummary', opts),
    getDetails:   (shiftId: string) => ipcRenderer.invoke('coffee:shifts:getDetails', shiftId),
    open:         (d: any) => ipcRenderer.invoke('coffee:shifts:open', d),
    close:        (d: any) => ipcRenderer.invoke('coffee:shifts:close', d)
  },

  // ── Overview / Dashboard ──────────────────────────────────────────────────────
  getOverview: () => ipcRenderer.invoke('coffee:getOverview'),

  // ── Customers ─────────────────────────────────────────────────────────────────
  customers: {
    getAll:   (opts?: any)   => ipcRenderer.invoke('coffee:customers:getAll', opts),
    getById:  (id: string)   => ipcRenderer.invoke('coffee:customers:getById', id),
    create:   (d: any)       => ipcRenderer.invoke('coffee:customers:create', d),
    update:   (d: any)       => ipcRenderer.invoke('coffee:customers:update', d),
    delete:   (id: string)   => ipcRenderer.invoke('coffee:customers:delete', id),
    search:   (q: string)    => ipcRenderer.invoke('coffee:customers:search', q)
  }
}
