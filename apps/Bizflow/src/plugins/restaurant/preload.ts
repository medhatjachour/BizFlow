import { ipcRenderer } from 'electron'

export const restaurantPreload = {
  // Tables
  getTables:         ()        => ipcRenderer.invoke('restaurant:getTables'),
  createTable:       (data: any) => ipcRenderer.invoke('restaurant:createTable', data),
  updateTable:       (data: any) => ipcRenderer.invoke('restaurant:updateTable', data),
  deleteTable:       (id: string) => ipcRenderer.invoke('restaurant:deleteTable', id),

  // Reservations
  getReservations:   (opts?: any) => ipcRenderer.invoke('restaurant:getReservations', opts),
  createReservation: (data: any) => ipcRenderer.invoke('restaurant:createReservation', data),
  updateReservation: (data: any) => ipcRenderer.invoke('restaurant:updateReservation', data),
  deleteReservation: (id: string) => ipcRenderer.invoke('restaurant:deleteReservation', id),

  // Menu
  getMenuItems:      ()        => ipcRenderer.invoke('restaurant:getMenuItems'),
  createMenuItem:    (data: any) => ipcRenderer.invoke('restaurant:createMenuItem', data),
  updateMenuItem:    (data: any) => ipcRenderer.invoke('restaurant:updateMenuItem', data),
  deleteMenuItem:    (id: string) => ipcRenderer.invoke('restaurant:deleteMenuItem', id),

  // Orders
  getOrders:              (opts?: any)  => ipcRenderer.invoke('restaurant:getOrders', opts),
  getOrder:               (id: string)  => ipcRenderer.invoke('restaurant:getOrder', id),
  openOrder:              (data: any)   => ipcRenderer.invoke('restaurant:openOrder', data),
  addOrderItem:           (data: any)   => ipcRenderer.invoke('restaurant:addOrderItem', data),
  removeOrderItem:        (id: string)  => ipcRenderer.invoke('restaurant:removeOrderItem', id),
  updateOrderItemStatus:  (data: any)   => ipcRenderer.invoke('restaurant:updateOrderItemStatus', data),
  closeOrder:             (data: any)   => ipcRenderer.invoke('restaurant:closeOrder', data),

  // Overview
  getOverview: () => ipcRenderer.invoke('restaurant:getOverview')
}
