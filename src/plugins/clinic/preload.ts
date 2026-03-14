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
    getAll: (params?: { search?: string }) =>
      ipcRenderer.invoke('clinic:patients:getAll', params),
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
    getRecent: (params?: { patientId?: string; filter?: 'today' | 'week' | 'month' | 'all' }) =>
      ipcRenderer.invoke('clinic:sessions:getRecent', params),
    create: (data: any) =>
      ipcRenderer.invoke('clinic:sessions:create', data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke('clinic:sessions:update', { id, data }),
    delete: (id: string) =>
      ipcRenderer.invoke('clinic:sessions:delete', id)
  },

  // ─── Stats ─────────────────────────────────────────────────────────────
  stats: {
    overview: () =>
      ipcRenderer.invoke('clinic:stats:overview'),
    topDiagnoses: (limit?: number) =>
      ipcRenderer.invoke('clinic:stats:topDiagnoses', limit),
    visitTrend: (days?: number) =>
      ipcRenderer.invoke('clinic:stats:visitTrend', days),
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
  }
}
