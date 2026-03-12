import { ipcRenderer } from 'electron'

export const warehousePreload = {
  // Locations
  getLocations:    ()        => ipcRenderer.invoke('warehouse:getLocations'),
  createLocation:  (data: any) => ipcRenderer.invoke('warehouse:createLocation', data),
  updateLocation:  (data: any) => ipcRenderer.invoke('warehouse:updateLocation', data),
  deleteLocation:  (id: string) => ipcRenderer.invoke('warehouse:deleteLocation', id),

  // Stock
  getStock:        (locationId?: string) => ipcRenderer.invoke('warehouse:getStock', locationId),
  upsertStock:     (data: any)  => ipcRenderer.invoke('warehouse:upsertStock', data),
  adjustStock:     (data: any)  => ipcRenderer.invoke('warehouse:adjustStock', data),
  deleteStock:     (id: string) => ipcRenderer.invoke('warehouse:deleteStock', id),
  getLowStock:     ()           => ipcRenderer.invoke('warehouse:getLowStock'),

  // Transfers
  getTransfers:         (opts?: any)  => ipcRenderer.invoke('warehouse:getTransfers', opts),
  createTransfer:       (data: any)   => ipcRenderer.invoke('warehouse:createTransfer', data),
  updateTransferStatus: (data: any)   => ipcRenderer.invoke('warehouse:updateTransferStatus', data),
  deleteTransfer:       (id: string)  => ipcRenderer.invoke('warehouse:deleteTransfer', id),

  // Overview
  getOverview: () => ipcRenderer.invoke('warehouse:getOverview')
}
