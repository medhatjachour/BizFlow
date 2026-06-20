import { ipcRenderer } from 'electron'

export const vetPreload = {
  // ── Owners ─────────────────────────────────────────────────────────────────
  owners: {
    getAll:     (params?: any)              => ipcRenderer.invoke('vet:owners:getAll', params),
    searchLite: (query: string)             => ipcRenderer.invoke('vet:owners:searchLite', query),
    getById:    (id: string)               => ipcRenderer.invoke('vet:owners:getById', id),
    create:     (data: any)                => ipcRenderer.invoke('vet:owners:create', data),
    update:     (id: string, data: any)    => ipcRenderer.invoke('vet:owners:update', id, data),
    delete:     (id: string)               => ipcRenderer.invoke('vet:owners:delete', id),
    getFinance: (ownerId: string)          => ipcRenderer.invoke('vet:owners:getFinance', ownerId)
  },

  // ── Patients ───────────────────────────────────────────────────────────────
  patients: {
    getAll:     (params?: any)              => ipcRenderer.invoke('vet:patients:getAll', params),
    getDebtors: (params?: any)              => ipcRenderer.invoke('vet:patients:getDebtors', params),
    getById:    (id: string)               => ipcRenderer.invoke('vet:patients:getById', id),
    create:     (data: any)                => ipcRenderer.invoke('vet:patients:create', data),
    update:     (id: string, data: any)    => ipcRenderer.invoke('vet:patients:update', id, data),
    delete:     (id: string)               => ipcRenderer.invoke('vet:patients:delete', id)
  },

  // ── Sessions ───────────────────────────────────────────────────────────────
  sessions: {
    getRecent:          (params?: any)              => ipcRenderer.invoke('vet:sessions:getRecent', params),
    create:             (data: any)                => ipcRenderer.invoke('vet:sessions:create', data),
    update:             (id: string, data: any)    => ipcRenderer.invoke('vet:sessions:update', id, data),
    delete:             (id: string)               => ipcRenderer.invoke('vet:sessions:delete', id),
    addPrescription:    (sessionId: string, data: any) => ipcRenderer.invoke('vet:sessions:addPrescription', sessionId, data),
    updatePrescription: (id: string, data: any)    => ipcRenderer.invoke('vet:sessions:updatePrescription', id, data),
    stopPrescription:   (id: string, reason: string) => ipcRenderer.invoke('vet:sessions:stopPrescription', id, reason),
    deletePrescription: (id: string)               => ipcRenderer.invoke('vet:sessions:deletePrescription', id),
    getFollowUps:       (params?: any)              => ipcRenderer.invoke('vet:sessions:getFollowUps', params),
    settlePayment:      (id: string, data?: any)    => ipcRenderer.invoke('vet:sessions:settlePayment', id, data),
    settleOwner:        (ownerId: string, data?: any) => ipcRenderer.invoke('vet:sessions:settleOwner', ownerId, data)
  },

  // ── Appointments ───────────────────────────────────────────────────────────
  appointments: {
    getAll:     (params?: any)              => ipcRenderer.invoke('vet:appointments:getAll', params),
    checkSlot:  (params: any)              => ipcRenderer.invoke('vet:appointments:checkSlot', params),
    create:     (data: any)                => ipcRenderer.invoke('vet:appointments:create', data),
    update:     (id: string, data: any)    => ipcRenderer.invoke('vet:appointments:update', id, data),
    delete:     (id: string)               => ipcRenderer.invoke('vet:appointments:delete', id)
  },

  // ── Check Results ──────────────────────────────────────────────────────────
  checkResults: {
    getAll:    (params?: any)   => ipcRenderer.invoke('vet:checkResults:getAll', params),
    create:    (params: any)   => ipcRenderer.invoke('vet:checkResults:create', params),
    delete:    (id: string)    => ipcRenderer.invoke('vet:checkResults:delete', id),
    openFile:  (id: string)    => ipcRenderer.invoke('vet:checkResults:openFile', id)
  },

  // ── Expenses ───────────────────────────────────────────────────────────────
  expenses: {
    getAll:   (params?: any)           => ipcRenderer.invoke('vet:expenses:getAll', params),
    summary:  (arg?: any)              => ipcRenderer.invoke('vet:expenses:summary', arg),
    create:   (data: any)             => ipcRenderer.invoke('vet:expenses:create', data),
    update:   (id: string, data: any) => ipcRenderer.invoke('vet:expenses:update', id, data),
    delete:   (id: string)            => ipcRenderer.invoke('vet:expenses:delete', id)
  },

  // ── Staff ──────────────────────────────────────────────────────────────────
  staff: {
    getAll:   (params?: any)           => ipcRenderer.invoke('vet:staff:getAll', params),
    getById:  (id: string)            => ipcRenderer.invoke('vet:staff:getById', id),
    create:   (data: any)             => ipcRenderer.invoke('vet:staff:create', data),
    update:   (id: string, data: any) => ipcRenderer.invoke('vet:staff:update', id, data),
    delete:   (id: string)            => ipcRenderer.invoke('vet:staff:delete', id),
    salary: {
      getRecords: (staffId: string)        => ipcRenderer.invoke('vet:staff:salary:getRecords', staffId),
      upsert:     (data: any)             => ipcRenderer.invoke('vet:staff:salary:upsert', data),
      delete:     (id: string)            => ipcRenderer.invoke('vet:staff:salary:delete', id)
    }
  },

  // ── Medicines ─────────────────────────────────────────────────────────────
  medicines: {
    getAll:       (params?: any)                       => ipcRenderer.invoke('vet:medicines:getAll', params),
    create:       (data: any)                          => ipcRenderer.invoke('vet:medicines:create', data),
    update:       (id: string, data: any)              => ipcRenderer.invoke('vet:medicines:update', id, data),
    delete:       (id: string)                         => ipcRenderer.invoke('vet:medicines:delete', id),
    getBatches:   (medicineId: string)                 => ipcRenderer.invoke('vet:medicines:getBatches', medicineId),
    addBatch:     (data: any)                          => ipcRenderer.invoke('vet:medicines:addBatch', data),
    updateBatch:  (id: string, data: any)              => ipcRenderer.invoke('vet:medicines:updateBatch', id, data),
    deleteBatch:  (id: string)                         => ipcRenderer.invoke('vet:medicines:deleteBatch', id),
    disposeBatch: (id: string, data?: any)             => ipcRenderer.invoke('vet:medicines:disposeBatch', id, data),
    sell:         (data: any)                          => ipcRenderer.invoke('vet:medicines:sell', data),
    sellCombo:          (data: any)                          => ipcRenderer.invoke('vet:medicines:sellCombo', data),
    getSales:           (params?: any)                       => ipcRenderer.invoke('vet:medicines:getSales', params),
    getSaleGroups:      (params?: any)                       => ipcRenderer.invoke('vet:medicines:getSaleGroups', params),
    getHistory:         (medicineId: string, params?: any)   => ipcRenderer.invoke('vet:medicines:getHistory', medicineId, params),
    getSummary:         (params?: any)                       => ipcRenderer.invoke('vet:medicines:getSummary', params),
    updateSalePayment:  (id: string, amountPaid: number)     => ipcRenderer.invoke('vet:medicines:updateSalePayment', id, amountPaid),
    updateSale:         (id: string, data: any)              => ipcRenderer.invoke('vet:medicines:updateSale', id, data),
    refundSale:         (id: string, data?: any)             => ipcRenderer.invoke('vet:medicines:refundSale', id, data),
    refundSaleGroup:    (groupKey: string, data?: any)       => ipcRenderer.invoke('vet:medicines:refundSaleGroup', groupKey, data),
    settleOwnerSales:   (ownerId: string, data?: any)        => ipcRenderer.invoke('vet:medicines:settleOwnerSales', ownerId, data)
  },

  // ── Medicine Categories & Units ───────────────────────────────────────────
  medicineCategories: {
    getAll:        ()                          => ipcRenderer.invoke('vet:medicineCategories:getAll'),
    create:        (data: any)                 => ipcRenderer.invoke('vet:medicineCategories:create', data),
    update:        (id: string, data: any)     => ipcRenderer.invoke('vet:medicineCategories:update', id, data),
    delete:        (id: string)                => ipcRenderer.invoke('vet:medicineCategories:delete', id),
    getUsageCount: (name: string)              => ipcRenderer.invoke('vet:medicineCategories:getUsageCount', name)
  },
  medicineUnits: {
    getAll: ()             => ipcRenderer.invoke('vet:medicineUnits:getAll'),
    create: (data: any)    => ipcRenderer.invoke('vet:medicineUnits:create', data),
    delete: (id: string)   => ipcRenderer.invoke('vet:medicineUnits:delete', id)
  },
  visitTypes: {
    getAll:        ()                       => ipcRenderer.invoke('vet:visitTypes:getAll'),
    create:        (data: any)              => ipcRenderer.invoke('vet:visitTypes:create', data),
    update:        (id: string, data: any)  => ipcRenderer.invoke('vet:visitTypes:update', id, data),
    delete:        (id: string)             => ipcRenderer.invoke('vet:visitTypes:delete', id),
    getUsageCount: (name: string)           => ipcRenderer.invoke('vet:visitTypes:getUsageCount', name)
  },


  // ── Stats ──────────────────────────────────────────────────────────────────
  stats: {
    overview:        (period?: string) => ipcRenderer.invoke('vet:stats:overview', period),
    topDiagnoses:    (params?: any)    => ipcRenderer.invoke('vet:stats:topDiagnoses', params),
    visitTrend:      (params?: any)    => ipcRenderer.invoke('vet:stats:visitTrend', params),
    speciesBreakdown: ()               => ipcRenderer.invoke('vet:stats:speciesBreakdown'),
    monthlyTrend:    (params?: any)    => ipcRenderer.invoke('vet:stats:monthlyTrend', params),
    profitAnalysis:  (params?: any)    => ipcRenderer.invoke('vet:stats:profitAnalysis', params),
    salesBreakdown:  (params?: any)    => ipcRenderer.invoke('vet:stats:salesBreakdown', params)
  }
}
