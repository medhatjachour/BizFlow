// src/restaurant/utils/events.ts
import { BrowserWindow } from 'electron'

export type RestaurantEventType =
  | 'table:updated'
  | 'order:created'
  | 'order:updated'
  | 'order:settled'
  | 'kds:item_bumped'
  | 'kds:ticket_bumped'
  | 'inventory:low_stock'
  | 'shift:changed'

export function broadcastRestaurantEvent(event: RestaurantEventType, payload: any) {
  const windows = BrowserWindow.getAllWindows()
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send(`restaurant:event:${event}`, payload)
    }
  }
}