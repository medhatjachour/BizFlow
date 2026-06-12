import { ipcRenderer } from 'electron'

export const gymPreload = {
  coaches: {
    getAll: (params?: { search?: string; isActive?: boolean; skip?: number; take?: number }) =>
      ipcRenderer.invoke('gym:coaches:getAll', params),
    getById: (id: string) =>
      ipcRenderer.invoke('gym:coaches:getById', id),
    getStats: (id: string) =>
      ipcRenderer.invoke('gym:coaches:getStats', id),
    create: (data: any) =>
      ipcRenderer.invoke('gym:coaches:create', data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke('gym:coaches:update', { id, data }),
    delete: (id: string) =>
      ipcRenderer.invoke('gym:coaches:delete', id)
  },
  trainees: {
    getAll: (params?: { search?: string; skip?: number; take?: number }) =>
      ipcRenderer.invoke('gym:trainees:getAll', params),
    getById: (id: string) =>
      ipcRenderer.invoke('gym:trainees:getById', id),
    searchLite: (query: string) =>
      ipcRenderer.invoke('gym:trainees:searchLite', query),
    create: (data: any) =>
      ipcRenderer.invoke('gym:trainees:create', data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke('gym:trainees:update', { id, data }),
    delete: (id: string) =>
      ipcRenderer.invoke('gym:trainees:delete', id)
  },
  plans: {
    getAll: () =>
      ipcRenderer.invoke('gym:plans:getAll'),
    create: (data: any) =>
      ipcRenderer.invoke('gym:plans:create', data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke('gym:plans:update', { id, data }),
    delete: (id: string) =>
      ipcRenderer.invoke('gym:plans:delete', id)
  },
  subscriptions: {
    getAll: (params?: { status?: string; traineeId?: string; skip?: number; take?: number }) =>
      ipcRenderer.invoke('gym:subscriptions:getAll', params),
    getById: (id: string) =>
      ipcRenderer.invoke('gym:subscriptions:getById', id),
    create: (data: any) =>
      ipcRenderer.invoke('gym:subscriptions:create', data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke('gym:subscriptions:update', { id, data }),
    delete: (id: string) =>
      ipcRenderer.invoke('gym:subscriptions:delete', id),
    freeze: (id: string, data: { startDate: string; endDate: string; days: number; reason?: string }) =>
      ipcRenderer.invoke('gym:subscriptions:freeze', { id, data }),
    unfreeze: (id: string) =>
      ipcRenderer.invoke('gym:subscriptions:unfreeze', id)
  },
  sessions: {
    getAll: (params?: { date?: string; period?: string; type?: string; traineeId?: string; skip?: number; take?: number }) =>
      ipcRenderer.invoke('gym:sessions:getAll', params),
    create: (data: any) =>
      ipcRenderer.invoke('gym:sessions:create', data),
    delete: (id: string) =>
      ipcRenderer.invoke('gym:sessions:delete', id),
    getCalendar: (params: { year: number; month: number }) =>
      ipcRenderer.invoke('gym:sessions:getCalendar', params)
  },
  expenses: {
    getAll: (params?: { period?: string; category?: string; skip?: number; take?: number }) =>
      ipcRenderer.invoke('gym:expenses:getAll', params),
    summary: (period?: string) =>
      ipcRenderer.invoke('gym:expenses:summary', period),
    create: (data: any) =>
      ipcRenderer.invoke('gym:expenses:create', data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke('gym:expenses:update', { id, data }),
    delete: (id: string) =>
      ipcRenderer.invoke('gym:expenses:delete', id)
  },
  stats: {
    overview: (period?: string) =>
      ipcRenderer.invoke('gym:stats:overview', period)
  },
  alerts: {
    atRisk: (thresholdDays?: number) =>
      ipcRenderer.invoke('gym:alerts:atRisk', thresholdDays)
  },
  measurements: {
    getAll: (traineeId: string) =>
      ipcRenderer.invoke('gym:measurements:getAll', traineeId),
    create: (data: any) =>
      ipcRenderer.invoke('gym:measurements:create', data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke('gym:measurements:update', { id, data }),
    delete: (id: string) =>
      ipcRenderer.invoke('gym:measurements:delete', id)
  },
  goals: {
    getAll: (traineeId: string) =>
      ipcRenderer.invoke('gym:goals:getAll', traineeId),
    create: (data: any) =>
      ipcRenderer.invoke('gym:goals:create', data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke('gym:goals:update', { id, data }),
    delete: (id: string) =>
      ipcRenderer.invoke('gym:goals:delete', id),
    markAchieved: (id: string) =>
      ipcRenderer.invoke('gym:goals:markAchieved', id)
  },
  shifts: {
    getAll: (params?: { coachId?: string; weekStart?: string }) =>
      ipcRenderer.invoke('gym:shifts:getAll', params),
    create: (data: any) =>
      ipcRenderer.invoke('gym:shifts:create', data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke('gym:shifts:update', { id, data }),
    delete: (id: string) =>
      ipcRenderer.invoke('gym:shifts:delete', id)
  },
  lockers: {
    getAll: (params?: { zone?: string }) =>
      ipcRenderer.invoke('gym:lockers:getAll', params),
    create: (data: any) =>
      ipcRenderer.invoke('gym:lockers:create', data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke('gym:lockers:update', { id, data }),
    delete: (id: string) =>
      ipcRenderer.invoke('gym:lockers:delete', id),
    assign: (data: { lockerId: string; traineeId: string; endDate?: string; notes?: string }) =>
      ipcRenderer.invoke('gym:lockers:assign', data),
    unassign: (lockerId: string) =>
      ipcRenderer.invoke('gym:lockers:unassign', lockerId)
  },
  programs: {
    getAll: (params?: { coachId?: string; isActive?: boolean }) =>
      ipcRenderer.invoke('gym:programs:getAll', params),
    getById: (id: string) =>
      ipcRenderer.invoke('gym:programs:getById', id),
    create: (data: any) =>
      ipcRenderer.invoke('gym:programs:create', data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke('gym:programs:update', { id, data }),
    delete: (id: string) =>
      ipcRenderer.invoke('gym:programs:delete', id),
    addDay: (programId: string, data: any) =>
      ipcRenderer.invoke('gym:programs:addDay', { programId, data }),
    updateDay: (id: string, data: any) =>
      ipcRenderer.invoke('gym:programs:updateDay', { id, data }),
    deleteDay: (id: string) =>
      ipcRenderer.invoke('gym:programs:deleteDay', id),
    addExercise: (dayId: string, data: any) =>
      ipcRenderer.invoke('gym:programs:addExercise', { dayId, data }),
    updateExercise: (id: string, data: any) =>
      ipcRenderer.invoke('gym:programs:updateExercise', { id, data }),
    deleteExercise: (id: string) =>
      ipcRenderer.invoke('gym:programs:deleteExercise', id),
    assign: (data: { programId: string; traineeId: string; startDate?: string; notes?: string }) =>
      ipcRenderer.invoke('gym:programs:assign', data),
    unassign: (assignmentId: string) =>
      ipcRenderer.invoke('gym:programs:unassign', assignmentId),
    getAssignments: (traineeId: string) =>
      ipcRenderer.invoke('gym:programs:getAssignments', traineeId)
  }
}
