import { ipcRenderer } from 'electron'

export const restaurantPreload = {
  // ─── Real-Time Event Bus Subscription ──────────────────────────────────────
  onEvent: (event: string, callback: (payload: any) => void) => {
    const channel = `restaurant:event:${event}`
    const handler = (_: any, payload: any) => callback(payload)
    ipcRenderer.on(channel, handler)
    return () => {
      ipcRenderer.removeListener(channel, handler)
    }
  },

  // ─── Floor & Tables ──────────────────────────────────────────────────────────
  getTables: () => ipcRenderer.invoke('restaurant:getTables'),
  createTable: (data: any) => ipcRenderer.invoke('restaurant:createTable', data),
  updateTable: (data: any) => ipcRenderer.invoke('restaurant:updateTable', data),
  updateTablePosition: (data: any) => ipcRenderer.invoke('restaurant:updateTablePosition', data),
  transferTable: (data: any) => ipcRenderer.invoke('restaurant:transferTable', data),
  mergeTables: (data: any) => ipcRenderer.invoke('restaurant:mergeTables', data),
  deleteTable: (id: string) => ipcRenderer.invoke('restaurant:deleteTable', id),

  // ─── Menu & Modifiers ────────────────────────────────────────────────────────
  getMenuItems: () => ipcRenderer.invoke('restaurant:getMenuItems'),
  createMenuItem: (data: any) => ipcRenderer.invoke('restaurant:createMenuItem', data),
  updateMenuItem: (data: any) => ipcRenderer.invoke('restaurant:updateMenuItem', data),
  toggleItem86: (id: string) => ipcRenderer.invoke('restaurant:toggleItem86', id),
  saveModifierGroup: (data: any) => ipcRenderer.invoke('restaurant:saveModifierGroup', data),
  deleteModifierGroup: (id: string) => ipcRenderer.invoke('restaurant:deleteModifierGroup', id),
  deleteMenuItem: (id: string) => ipcRenderer.invoke('restaurant:deleteMenuItem', id),

  // ─── Orders, Checks & POS ────────────────────────────────────────────────────
  getOrders: (opts?: any) => ipcRenderer.invoke('restaurant:getOrders', opts),
  getOrder: (id: string) => ipcRenderer.invoke('restaurant:getOrder', id),
  openOrder: (data: any) => ipcRenderer.invoke('restaurant:openOrder', data),
  addOrderItem: (data: any) => ipcRenderer.invoke('restaurant:addOrderItem', data),
  updateOrderItem: (data: any) => ipcRenderer.invoke('restaurant:updateOrderItem', data),
  removeOrderItem: (data: { itemId: string; voidReason?: string }) =>
    ipcRenderer.invoke('restaurant:removeOrderItem', data),
  fireCourse: (data: { orderId: string; course: string }) =>
    ipcRenderer.invoke('restaurant:fireCourse', data),
  splitCheckBySeat: (data: { sourceOrderId: string; seatNumbers: number[] }) =>
    ipcRenderer.invoke('restaurant:splitCheckBySeat', data),
  applyDiscount: (data: any) => ipcRenderer.invoke('restaurant:applyDiscount', data),
  processPayment: (data: any) => ipcRenderer.invoke('restaurant:processPayment', data),
  closeOrder: (data: any) => ipcRenderer.invoke('restaurant:closeOrder', data),

  // ─── Kitchen Display System (KDS) ────────────────────────────────────────────
  getKdsActiveTickets: (station?: string) => ipcRenderer.invoke('restaurant:getKdsActiveTickets', station),
  bumpKdsItem: (itemId: string) => ipcRenderer.invoke('restaurant:bumpKdsItem', itemId),
  bumpKdsTicket: (orderId: string) => ipcRenderer.invoke('restaurant:bumpKdsTicket', orderId),

  // ─── Shifts & Drawer Reconciliation ──────────────────────────────────────────
  getActiveShift: (serverId?: string) => ipcRenderer.invoke('restaurant:getActiveShift', serverId),
  openShift: (data: any) => ipcRenderer.invoke('restaurant:openShift', data),
  closeShift: (data: any) => ipcRenderer.invoke('restaurant:closeShift', data),
  getZReportData: (shiftId: string) => ipcRenderer.invoke('restaurant:getZReportData', shiftId),

  // ─── Inventory, Pantry & BOM ─────────────────────────────────────────────────
  getIngredients: () => ipcRenderer.invoke('restaurant:getIngredients'),
  createIngredient: (data: any) => ipcRenderer.invoke('restaurant:createIngredient', data),
  adjustStock: (data: any) => ipcRenderer.invoke('restaurant:adjustStock', data),
  getStockMovements: (ingredientId?: string) => ipcRenderer.invoke('restaurant:getStockMovements', ingredientId),
  deleteIngredient: (id: string) => ipcRenderer.invoke('restaurant:deleteIngredient', id),

  // ─── Recipes & Food Costing ──────────────────────────────────────────────────
  getRecipes: () => ipcRenderer.invoke('restaurant:getRecipes'),
  saveRecipe: (data: any) => ipcRenderer.invoke('restaurant:saveRecipe', data),
  deleteRecipe: (id: string) => ipcRenderer.invoke('restaurant:deleteRecipe', id),

  // ─── Waste & Spoilage ────────────────────────────────────────────────────────
  getWasteLogs: (opts?: any) => ipcRenderer.invoke('restaurant:getWasteLogs', opts),
  logWaste: (data: any) => ipcRenderer.invoke('restaurant:logWaste', data),
  deleteWasteLog: (id: string) => ipcRenderer.invoke('restaurant:deleteWasteLog', id),

  // ─── Reservations ────────────────────────────────────────────────────────────
  getReservations: (opts?: any) => ipcRenderer.invoke('restaurant:getReservations', opts),
  createReservation: (data: any) => ipcRenderer.invoke('restaurant:createReservation', data),
  updateReservation: (data: any) => ipcRenderer.invoke('restaurant:updateReservation', data),
  seatReservation: (data: any) => ipcRenderer.invoke('restaurant:seatReservation', data),
  deleteReservation: (id: string) => ipcRenderer.invoke('restaurant:deleteReservation', id),

  // ─── Overview & Reports ──────────────────────────────────────────────────────
  getOverview: () => ipcRenderer.invoke('restaurant:getOverview'),
  getReportsData: (opts?: any) => ipcRenderer.invoke('restaurant:getReportsData', opts)
}