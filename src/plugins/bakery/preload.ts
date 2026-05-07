/**
 * Bakery Plugin – Preload API Bindings
 *
 * Exported as `bakeryPreload` and merged into window.api.bakery by the
 * root preload/index.ts.  Every function maps 1-to-1 to an ipcMain.handle
 * channel registered in handlers.ts.
 */

import { ipcRenderer } from 'electron'

export const bakeryPreload = {
  // ─── Recipes ───────────────────────────────────────────────────────────
  getRecipes: () =>
    ipcRenderer.invoke('bakery:getRecipes'),
  createRecipe: (data: any) =>
    ipcRenderer.invoke('bakery:createRecipe', data),
  updateRecipe: (data: any) =>
    ipcRenderer.invoke('bakery:updateRecipe', data),
  deleteRecipe: (id: string) =>
    ipcRenderer.invoke('bakery:deleteRecipe', id),

  // ─── Production ──────────────────────────────────────────────────
  // getProductionBatches returns { data, total, page, pageSize, totalPages }
  getProductionBatches: (options?: any) =>
    ipcRenderer.invoke('bakery:getProductionBatches', options),
  createProductionBatch: (data: any) =>
    ipcRenderer.invoke('bakery:createProductionBatch', data),
  deleteProductionBatch: (id: string) =>
    ipcRenderer.invoke('bakery:deleteProductionBatch', id),
  getAvailableBatches: () =>
    ipcRenderer.invoke('bakery:getAvailableBatches'),
  getSellableBatches: () =>
    ipcRenderer.invoke('bakery:getSellableBatches'),

  // ─── Sales ─────────────────────────────────────────────────────
  // getSales returns { data, total, page, pageSize, totalPages }
  getSales: (options?: any) =>
    ipcRenderer.invoke('bakery:getSales', options),
  createSale: (data: any) =>
    ipcRenderer.invoke('bakery:createSale', data),
  deleteSale: (id: string) =>
    ipcRenderer.invoke('bakery:deleteSale', id),
  getSalesSummary: (options?: any) =>
    ipcRenderer.invoke('bakery:getSalesSummary', options),
  getInventoryStatus: (options?: any) =>
    ipcRenderer.invoke('bakery:getInventoryStatus', options),
  getPantry: () =>
    ipcRenderer.invoke('bakery:getPantry'),
  upsertPantryIngredient: (data: any) =>
    ipcRenderer.invoke('bakery:upsertPantryIngredient', data),
  adjustPantryStock: (data: any) =>
    ipcRenderer.invoke('bakery:adjustPantryStock', data),
  deletePantryIngredient: (id: string) =>
    ipcRenderer.invoke('bakery:deletePantryIngredient', id),
  markPantryReordered: (data: any) =>
    ipcRenderer.invoke('bakery:markPantryReordered', data),

  // ─── Waste ─────────────────────────────────────────────────────────────
  getWasteLogs: (options?: any) =>
    ipcRenderer.invoke('bakery:getWasteLogs', options),
  createWasteLog: (data: any) =>
    ipcRenderer.invoke('bakery:createWasteLog', data),
  deleteWasteLog: (id: string) =>
    ipcRenderer.invoke('bakery:deleteWasteLog', id),
  getWasteSummary: (options?: any) =>
    ipcRenderer.invoke('bakery:getWasteSummary', options),

  // ─── Schedule ──────────────────────────────────────────────────────────
  getSchedule: (options?: any) =>
    ipcRenderer.invoke('bakery:getSchedule', options),
  createScheduleItem: (data: any) =>
    ipcRenderer.invoke('bakery:createScheduleItem', data),
  updateScheduleItem: (data: any) =>
    ipcRenderer.invoke('bakery:updateScheduleItem', data),
  deleteScheduleItem: (id: string) =>
    ipcRenderer.invoke('bakery:deleteScheduleItem', id),

  // ─── Analytics & Overview ──────────────────────────────────────────────
  getDailyOverview: () =>
    ipcRenderer.invoke('bakery:getDailyOverview'),
  getProfitLoss: (options: any) =>
    ipcRenderer.invoke('bakery:getProfitLoss', options),
  getProfitLossTrend: (options?: any) =>
    ipcRenderer.invoke('bakery:getProfitLossTrend', options),
  getExpiringBatches: (daysAhead?: number) =>
    ipcRenderer.invoke('bakery:getExpiringBatches', daysAhead),
  getProductionRequirements: (data: any) =>
    ipcRenderer.invoke('bakery:getProductionRequirements', data),
  getEndOfDaySuggestion: () =>
    ipcRenderer.invoke('bakery:getEndOfDaySuggestion'),

  // ─── Expenses ──────────────────────────────────────────────────────────
  expenses: {
    getAll: (options?: any) =>
      ipcRenderer.invoke('bakery:expenses:getAll', options),
    create: (data: any) =>
      ipcRenderer.invoke('bakery:expenses:create', data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke('bakery:expenses:update', id, data),
    delete: (id: string) =>
      ipcRenderer.invoke('bakery:expenses:delete', id),
    getSummary: (options?: any) =>
      ipcRenderer.invoke('bakery:expenses:getSummary', options),
  }
}
