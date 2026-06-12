import { ipcRenderer } from 'electron'

export const warehousePreload = {
  // Locations
  getLocations:    ()        => ipcRenderer.invoke('warehouse:getLocations'),
  createLocation:  (data: any) => ipcRenderer.invoke('warehouse:createLocation', data),
  updateLocation:  (data: any) => ipcRenderer.invoke('warehouse:updateLocation', data),
  deleteLocation:  (id: string) => ipcRenderer.invoke('warehouse:deleteLocation', id),

  // Stock
  getStock:        (options?: any) => ipcRenderer.invoke('warehouse:getStock', options),
  upsertStock:     (data: any)  => ipcRenderer.invoke('warehouse:upsertStock', data),
  adjustStock:     (data: any)  => ipcRenderer.invoke('warehouse:adjustStock', data),
  deleteStock:     (id: string, actedBy?: string) => ipcRenderer.invoke('warehouse:deleteStock', id, actedBy),
  getLowStock:     ()           => ipcRenderer.invoke('warehouse:getLowStock'),
  getMovements:    (params?: any) => ipcRenderer.invoke('warehouse:getMovements', params),
  getAuditLogs:    (params?: any) => ipcRenderer.invoke('warehouse:getAuditLogs', params),

  // Transfers
  getTransfers:         (opts?: any)  => ipcRenderer.invoke('warehouse:getTransfers', opts),
  createTransfer:       (data: any)   => ipcRenderer.invoke('warehouse:createTransfer', data),
  updateTransferStatus: (data: any)   => ipcRenderer.invoke('warehouse:updateTransferStatus', data),
  deleteTransfer:       (id: string)  => ipcRenderer.invoke('warehouse:deleteTransfer', id),

  // Orders (Inbound/Outbound)
  getOrders:        (params?: any) => ipcRenderer.invoke('warehouse:getOrders', params),
  getJourneyBoard:  ()            => ipcRenderer.invoke('warehouse:getJourneyBoard'),
  createOrder:      (data: any)    => ipcRenderer.invoke('warehouse:createOrder', data),
  updateOrderStatus:(data: any)    => ipcRenderer.invoke('warehouse:updateOrderStatus', data),
  advanceOrderStage:(data: any)    => ipcRenderer.invoke('warehouse:advanceOrderStage', data),
  processOrder:     (data: any)    => ipcRenderer.invoke('warehouse:processOrder', data),

  // Overview
  getOverview: () => ipcRenderer.invoke('warehouse:getOverview')
}
