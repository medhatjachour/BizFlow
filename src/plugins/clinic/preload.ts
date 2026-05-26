/**
 * Clinic Plugin – Preload API Bindings
 *
 * Exported as `clinicPreload` and merged into window.api.clinic by the
 * root preload/index.ts.
 */

import { ipcRenderer } from 'electron'

export const clinicPreload = {
  // ─── Patients ──────────────────────────────────────────────────────────
  patients: {
    getAll: (params?: { search?: string; skip?: number; take?: number }) =>
      ipcRenderer.invoke('clinic:patients:getAll', params),
    getDebtors: (params?: { search?: string; skip?: number; take?: number }) =>
      ipcRenderer.invoke('clinic:patients:getDebtors', params),
    searchLite: (query: string) =>
      ipcRenderer.invoke('clinic:patients:searchLite', query),
    getById: (id: string) =>
      ipcRenderer.invoke('clinic:patients:getById', id),
    create: (data: any) =>
      ipcRenderer.invoke('clinic:patients:create', data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke('clinic:patients:update', { id, data }),
    delete: (id: string) =>
      ipcRenderer.invoke('clinic:patients:delete', id)
  },

  // ─── Sessions ──────────────────────────────────────────────────────────
  sessions: {
    getRecent: (params?: { patientId?: string; filter?: 'today' | 'week' | 'month' | 'all'; skip?: number; take?: number }) =>
      ipcRenderer.invoke('clinic:sessions:getRecent', params),
    create: (data: any) =>
      ipcRenderer.invoke('clinic:sessions:create', data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke('clinic:sessions:update', { id, data }),
    delete: (id: string) =>
      ipcRenderer.invoke('clinic:sessions:delete', id)
  },

  prescriptions: {
    update: (id: string, data: any) =>
      ipcRenderer.invoke('clinic:prescriptions:update', { id, data }),
    setActive: (id: string, isActive: boolean) =>
      ipcRenderer.invoke('clinic:prescriptions:setActive', { id, isActive })
  },

  // ─── Stats ─────────────────────────────────────────────────────────────
  stats: {
    overview: () =>
      ipcRenderer.invoke('clinic:stats:overview'),
    topDiagnoses: (limit?: number) =>
      ipcRenderer.invoke('clinic:stats:topDiagnoses', limit),
    visitTrend: (days?: number) =>
      ipcRenderer.invoke('clinic:stats:visitTrend', days),
    fullTrend: (days?: number) =>
      ipcRenderer.invoke('clinic:stats:fullTrend', days),
    monthlyTrend: (months?: number) =>
      ipcRenderer.invoke('clinic:stats:monthlyTrend', months),
    breakdowns: () =>
      ipcRenderer.invoke('clinic:stats:breakdowns'),
    patientStats: (patientId: string) =>
      ipcRenderer.invoke('clinic:stats:patientStats', patientId)
  },

  // ─── Check Results ─────────────────────────────────────────────────────
  checkResults: {
    getByPatient: (patientId: string) =>
      ipcRenderer.invoke('clinic:checkResults:getByPatient', patientId),
    upload: (data: { patientId: string; title: string; description?: string; resultDate?: string }) =>
      ipcRenderer.invoke('clinic:checkResults:upload', data),
    getBuffer: (filePath: string) =>
      ipcRenderer.invoke('clinic:checkResults:getBuffer', filePath),
    open: (id: string) =>
      ipcRenderer.invoke('clinic:checkResults:open', id),
    delete: (id: string) =>
      ipcRenderer.invoke('clinic:checkResults:delete', id)
  },

  // ─── Appointments ──────────────────────────────────────────────────────────
  appointments: {
    getAll: (params?: { date?: string; from?: string; to?: string; status?: string; patientId?: string; type?: string; skip?: number; take?: number }) =>
      ipcRenderer.invoke('clinic:appointments:getAll', params),
    getToday: () =>
      ipcRenderer.invoke('clinic:appointments:getToday'),
    getUpcoming: (days?: number) =>
      ipcRenderer.invoke('clinic:appointments:getUpcoming', days),
    getFollowUpReminders: () =>
      ipcRenderer.invoke('clinic:appointments:getFollowUpReminders'),
    getAllFollowUps: (params?: { filter?: 'all' | 'today' | 'overdue' | 'upcoming' }) =>
      ipcRenderer.invoke('clinic:appointments:getAllFollowUps', params),
    clearFollowUp: (sessionId: string) =>
      ipcRenderer.invoke('clinic:sessions:clearFollowUp', sessionId),
    create: (data: any) =>
      ipcRenderer.invoke('clinic:appointments:create', data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke('clinic:appointments:update', { id, data }),
    delete: (id: string) =>
      ipcRenderer.invoke('clinic:appointments:delete', id)
  },

  // ─── PDF Export ────────────────────────────────────────────────────────────
  patients_exportPdf: (data: { patient: any; sessions: any[]; stats: any; checkResults: any[] }) =>
    ipcRenderer.invoke('clinic:patients:exportPdf', data),

  // ─── Expenses ──────────────────────────────────────────────────────────────
  expenses: {
    getAll: (params?: { period?: string; category?: string }) =>
      ipcRenderer.invoke('clinic:expenses:getAll', params),
    summary: (period?: string) =>
      ipcRenderer.invoke('clinic:expenses:summary', period),
    breakdown: (params?: { period?: string; category?: string }) =>
      ipcRenderer.invoke('clinic:expenses:breakdown', params),
    create: (data: any) =>
      ipcRenderer.invoke('clinic:expenses:create', data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke('clinic:expenses:update', { id, data }),
    delete: (id: string) =>
      ipcRenderer.invoke('clinic:expenses:delete', id)
  },

  // ─── Staff & Salaries ──────────────────────────────────────────────────────
  staff: {
    getAll: () =>
      ipcRenderer.invoke('clinic:staff:getAll'),
    create: (data: any) =>
      ipcRenderer.invoke('clinic:staff:create', data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke('clinic:staff:update', { id, data }),
    delete: (id: string) =>
      ipcRenderer.invoke('clinic:staff:delete', id),
    salary: {
      getAll: (params?: { staffId?: string; year?: number }) =>
        ipcRenderer.invoke('clinic:staff:salary:getAll', params),
      compute: (staffId: string, params: any) =>
        ipcRenderer.invoke('clinic:staff:salary:compute', { staffId, params }),
      summary: (year?: number) =>
        ipcRenderer.invoke('clinic:staff:salary:summary', year),
      upsert: (data: any) =>
        ipcRenderer.invoke('clinic:staff:salary:upsert', data),
      markPaid: (id: string) =>
        ipcRenderer.invoke('clinic:staff:salary:markPaid', id),
      delete: (id: string) =>
        ipcRenderer.invoke('clinic:staff:salary:delete', id)
    }
  },

  // ─── Material Categories ────────────────────────────────────────────────
  materialCategories: {
    getAll: () =>
      ipcRenderer.invoke('clinic:materialCategories:getAll'),
    create: (data: { name: string; color?: string; sortOrder?: number }) =>
      ipcRenderer.invoke('clinic:materialCategories:create', data),
    update: (id: string, data: { name?: string; color?: string; sortOrder?: number }) =>
      ipcRenderer.invoke('clinic:materialCategories:update', { id, data }),
    delete: (id: string) =>
      ipcRenderer.invoke('clinic:materialCategories:delete', id),
  },

  // ─── Material Batches ───────────────────────────────────────────────────
  materialBatches: {
    getByMaterial: (materialId: string) =>
      ipcRenderer.invoke('clinic:materialBatches:getByMaterial', materialId),
    create: (materialId: string, data: {
      batchNumber?: string; quantity?: number; expiryDate?: string
      costPerUnit?: number; supplier?: string; notes?: string
    }) =>
      ipcRenderer.invoke('clinic:materialBatches:create', { materialId, data }),
    update: (id: string, data: {
      batchNumber?: string; quantity?: number; expiryDate?: string
      costPerUnit?: number; supplier?: string; notes?: string; isActive?: boolean
    }) =>
      ipcRenderer.invoke('clinic:materialBatches:update', { id, data }),
    delete: (id: string) =>
      ipcRenderer.invoke('clinic:materialBatches:delete', id),    logLoss: (data: {
      batchId: string; materialId: string; quantityLost: number
      reason?: string; description?: string | null; recordedBy?: string | null
    }) =>
      ipcRenderer.invoke('clinic:batches:logLoss', data),
    logExpiry: (data: {
      batchId: string; materialId: string; quantityExpired: number; expiryDate: string
      disposalMethod?: string | null; recordedBy?: string | null; notes?: string | null
    }) =>
      ipcRenderer.invoke('clinic:batches:logExpiry', data),
    logAdjustment: (data: {
      batchId: string; materialId: string; quantityBefore: number; quantityAfter: number
      reason?: string; description?: string | null; adjustedBy?: string | null
    }) =>
      ipcRenderer.invoke('clinic:batches:logAdjustment', data),  },

  // ─── Materials ─────────────────────────────────────────────────────────────
  materials: {
    getAll: (params?: {
      search?: string
      category?: string
      isActive?: boolean
      stockStatus?: 'all' | 'in_stock' | 'out_of_stock' | 'low_stock'
      expiryStatus?: 'all' | 'expired' | 'expiring_soon' | 'valid' | 'no_expiry'
      skip?: number
      take?: number
      sortBy?: 'name' | 'quantity' | 'expiryDate' | 'updatedAt'
      sortDir?: 'asc' | 'desc'
    }) =>
      ipcRenderer.invoke('clinic:materials:getAll', params),
    getById: (id: string) =>
      ipcRenderer.invoke('clinic:materials:getById', id),
    create: (data: any) =>
      ipcRenderer.invoke('clinic:materials:create', data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke('clinic:materials:update', { id, data }),
    delete: (id: string) =>
      ipcRenderer.invoke('clinic:materials:delete', id),
    adjustStock: (id: string, delta: number) =>
      ipcRenderer.invoke('clinic:materials:adjustStock', { id, delta }),
    getBySession: (sessionId: string) =>
      ipcRenderer.invoke('clinic:materials:getBySession', sessionId),
    setSessionMaterials: (sessionId: string, items: Array<{ materialId: string; quantityUsed: number; notes?: string; batchId?: string }>) =>
      ipcRenderer.invoke('clinic:materials:setSessionMaterials', { sessionId, items }),
    stats: () =>
      ipcRenderer.invoke('clinic:materials:stats'),
    financeSummary: (period?: string) =>
      ipcRenderer.invoke('clinic:materials:financeSummary', period),
  }
}
