// ─── Personal Work Plugin – Preload API ──────────────────────────────────────
// Exposes every personal IPC channel to the renderer as `window.api.personal.*`.
// Each method maps 1-to-1 to an ipcMain.handle() channel.
// ─────────────────────────────────────────────────────────────────────────────

import { ipcRenderer } from 'electron'

export const personalPreload = {
  // ── Overview dashboard ──────────────────────────────────────────────────────
  overview: {
    getDashboard: () => ipcRenderer.invoke('personal:overview:getDashboard')
  },

  // ── Metadata & taxonomy ─────────────────────────────────────────────────────
  meta: {
    getConfig: () => ipcRenderer.invoke('personal:meta:getConfig'),
    getCounts: () => ipcRenderer.invoke('personal:meta:getCounts'),
    seedChecklists: (opts?: { force?: boolean }) => ipcRenderer.invoke('personal:meta:seedChecklists', opts)
  },

  // ── Clients ─────────────────────────────────────────────────────────────────
  clients: {
    getAll: (opts?: any) => ipcRenderer.invoke('personal:clients:getAll', opts),
    getById: (id: string) => ipcRenderer.invoke('personal:clients:getById', id),
    getHealth: (id: string) => ipcRenderer.invoke('personal:clients:getHealth', id),
    create: (d: any) => ipcRenderer.invoke('personal:clients:create', d),
    update: (d: any) => ipcRenderer.invoke('personal:clients:update', d),
    delete: (id: string) => ipcRenderer.invoke('personal:clients:delete', id),
    restore: (id: string) => ipcRenderer.invoke('personal:clients:restore', id)
  },

  // ── Projects, pipeline, deliverables & checklists ───────────────────────────
  projects: {
    getAll: (opts?: any) => ipcRenderer.invoke('personal:projects:getAll', opts),
    getById: (id: string) => ipcRenderer.invoke('personal:projects:getById', id),
    getBoard: () => ipcRenderer.invoke('personal:projects:getBoard'),
    getDeadlines: (opts?: { days?: number }) => ipcRenderer.invoke('personal:projects:getDeadlines', opts),
    create: (d: any) => ipcRenderer.invoke('personal:projects:create', d),
    update: (d: any) => ipcRenderer.invoke('personal:projects:update', d),
    delete: (id: string) => ipcRenderer.invoke('personal:projects:delete', id),
    advanceStage: (d: { id: string; stage: string; note?: string }) =>
      ipcRenderer.invoke('personal:projects:advanceStage', d),

    deliverables: {
      getAll: (projectId: string) => ipcRenderer.invoke('personal:projects:deliverables:getAll', projectId),
      create: (d: any) => ipcRenderer.invoke('personal:projects:deliverables:create', d),
      update: (d: any) => ipcRenderer.invoke('personal:projects:deliverables:update', d),
      delete: (id: string) => ipcRenderer.invoke('personal:projects:deliverables:delete', id)
    },

    checklist: {
      getAll: (projectId: string) => ipcRenderer.invoke('personal:projects:checklist:getAll', projectId),
      create: (d: any) => ipcRenderer.invoke('personal:projects:checklist:create', d),
      update: (d: any) => ipcRenderer.invoke('personal:projects:checklist:update', d),
      delete: (id: string) => ipcRenderer.invoke('personal:projects:checklist:delete', id),
      applyTemplate: (d: { projectId: string; templateId: string }) =>
        ipcRenderer.invoke('personal:projects:checklist:applyTemplate', d)
    },

    templates: {
      getAll: () => ipcRenderer.invoke('personal:projects:templates:getAll'),
      create: (d: any) => ipcRenderer.invoke('personal:projects:templates:create', d),
      update: (d: any) => ipcRenderer.invoke('personal:projects:templates:update', d),
      delete: (id: string) => ipcRenderer.invoke('personal:projects:templates:delete', id)
    }
  },

  // ── Change requests (scope-creep guard) ─────────────────────────────────────
  requests: {
    getAll: (opts?: any) => ipcRenderer.invoke('personal:requests:getAll', opts),
    getById: (id: string) => ipcRenderer.invoke('personal:requests:getById', id),
    create: (d: any) => ipcRenderer.invoke('personal:requests:create', d),
    update: (d: any) => ipcRenderer.invoke('personal:requests:update', d),
    delete: (id: string) => ipcRenderer.invoke('personal:requests:delete', id),
    quote: (id: string) => ipcRenderer.invoke('personal:requests:quote', id),
    decide: (d: { id: string; status: string; note?: string; shiftDeadline?: boolean }) =>
      ipcRenderer.invoke('personal:requests:decide', d),
    markInvoiced: (d: { id: string; invoiceId?: string }) => ipcRenderer.invoke('personal:requests:markInvoiced', d)
  },

  // ── Client bottleneck tracker ───────────────────────────────────────────────
  waits: {
    getAll: (opts?: any) => ipcRenderer.invoke('personal:waits:getAll', opts),
    getSummary: (opts?: { from?: string; to?: string }) => ipcRenderer.invoke('personal:waits:getSummary', opts),
    getClientImpact: () => ipcRenderer.invoke('personal:waits:getClientImpact'),
    start: (d: any) => ipcRenderer.invoke('personal:waits:start', d),
    update: (d: any) => ipcRenderer.invoke('personal:waits:update', d),
    end: (d: { id: string; note?: string; shiftDeadline?: boolean }) => ipcRenderer.invoke('personal:waits:end', d),
    delete: (id: string) => ipcRenderer.invoke('personal:waits:delete', id)
  },

  // ── Daily-3 task board ──────────────────────────────────────────────────────
  tasks: {
    getAll: (opts?: any) => ipcRenderer.invoke('personal:tasks:getAll', opts),
    getCounts: () => ipcRenderer.invoke('personal:tasks:getCounts'),
    getDailyThree: () => ipcRenderer.invoke('personal:tasks:getDailyThree'),
    create: (d: any) => ipcRenderer.invoke('personal:tasks:create', d),
    update: (d: any) => ipcRenderer.invoke('personal:tasks:update', d),
    delete: (id: string) => ipcRenderer.invoke('personal:tasks:delete', id),
    complete: (d: { id: string; note?: string }) => ipcRenderer.invoke('personal:tasks:complete', d),
    reopen: (id: string) => ipcRenderer.invoke('personal:tasks:reopen', id),
    setDailyThree: (d: { id: string; value: boolean }) => ipcRenderer.invoke('personal:tasks:setDailyThree', d),
    bulk: (d: { ids: string[]; action: 'complete' | 'reopen' | 'pin' | 'unpin' | 'delete' }) =>
      ipcRenderer.invoke('personal:tasks:bulk', d),
    rollDay: () => ipcRenderer.invoke('personal:tasks:rollDay')
  },

  // ── Focus timer, sessions & work log ────────────────────────────────────────
  focus: {
    getActive: () => ipcRenderer.invoke('personal:focus:getActive'),
    getSessions: (opts?: any) => ipcRenderer.invoke('personal:focus:getSessions', opts),
    getStats: (opts?: { from?: string; to?: string }) => ipcRenderer.invoke('personal:focus:getStats', opts),
    getProjectProfitability: (opts?: { from?: string; to?: string }) =>
      ipcRenderer.invoke('personal:focus:getProjectProfitability', opts),
    start: (d: any) => ipcRenderer.invoke('personal:focus:start', d),
    stop: (d?: { id?: string; actualMinutes?: number; interruptions?: number; note?: string; billable?: boolean }) =>
      ipcRenderer.invoke('personal:focus:stop', d),
    cancel: (id?: string) => ipcRenderer.invoke('personal:focus:cancel', id),
    addManual: (d: any) => ipcRenderer.invoke('personal:focus:addManual', d),
    update: (d: any) => ipcRenderer.invoke('personal:focus:update', d),
    delete: (id: string) => ipcRenderer.invoke('personal:focus:delete', id),
    // Do-not-disturb hook (spec section 3). Desktop-only: the channel is
    // registered by the Electron main process, and the main module refuses to
    // spawn anything outside a real Electron runtime.
    quietHook: (command: string) => ipcRenderer.invoke('personal:focus:quietHook', { command })
  },

  worklog: {
    getAll: (opts?: { from?: string; to?: string; limit?: number }) => ipcRenderer.invoke('personal:worklog:getAll', opts),
    getByDay: (day?: string) => ipcRenderer.invoke('personal:worklog:getByDay', day),
    save: (d: any) => ipcRenderer.invoke('personal:worklog:save', d),
    generate: (day?: string) => ipcRenderer.invoke('personal:worklog:generate', day),
    delete: (id: string) => ipcRenderer.invoke('personal:worklog:delete', id)
  },

  standup: {
    preview: (day?: string) => ipcRenderer.invoke('personal:standup:preview', day)
  },

  // ── Invoices, payments, escrow & tax vault ──────────────────────────────────
  billing: {
    getInvoices: (opts?: any) => ipcRenderer.invoke('personal:billing:getInvoices', opts),
    getInvoiceById: (id: string) => ipcRenderer.invoke('personal:billing:getInvoiceById', id),
    getSummary: (opts?: { from?: string; to?: string }) => ipcRenderer.invoke('personal:billing:getSummary', opts),
    getEscrow: () => ipcRenderer.invoke('personal:billing:getEscrow'),
    createInvoice: (d: any) => ipcRenderer.invoke('personal:billing:createInvoice', d),
    updateInvoice: (d: any) => ipcRenderer.invoke('personal:billing:updateInvoice', d),
    deleteInvoice: (id: string) => ipcRenderer.invoke('personal:billing:deleteInvoice', id),
    markStatus: (d: { id: string; status: string }) => ipcRenderer.invoke('personal:billing:markStatus', d),
    applyDiscount: (d: { id: string; discount: number; reason?: string }) =>
      ipcRenderer.invoke('personal:billing:applyDiscount', d),
    discountPreview: (d: { id: string; input?: any }) => ipcRenderer.invoke('personal:billing:discountPreview', d),
    lateFeeScan: (opts?: { policy?: any; asOf?: string }) => ipcRenderer.invoke('personal:billing:lateFeeScan', opts),
    voidInvoice: (d: { id: string; reason?: string }) => ipcRenderer.invoke('personal:billing:voidInvoice', d),
    writeOff: (d: { id: string; note?: string }) => ipcRenderer.invoke('personal:billing:writeOff', d),
    recomputeOverdue: () => ipcRenderer.invoke('personal:billing:recomputeOverdue'),
    exportInvoice: (d: {
      id: string
      issuer?: { name?: string; detail?: string; email?: string }
      labels: any
      direction?: 'ltr' | 'rtl'
      statusLabels?: Record<string, string>
      kindLabels?: Record<string, string>
    }) => ipcRenderer.invoke('personal:billing:exportInvoice', d),
    exportStatement: (d: {
      clientId: string
      from?: string
      to?: string
      issuer?: { name?: string; detail?: string; email?: string }
      labels: any
      direction?: 'ltr' | 'rtl'
      statusLabels?: Record<string, string>
    }) => ipcRenderer.invoke('personal:billing:exportStatement', d),
    recordPayment: (d: any) => ipcRenderer.invoke('personal:billing:recordPayment', d),
    deletePayment: (id: string) => ipcRenderer.invoke('personal:billing:deletePayment', id),
    refundPayment: (d: { id: string; amount?: number; note?: string }) =>
      ipcRenderer.invoke('personal:billing:refundPayment', d),

    taxVault: {
      getAll: (opts?: { from?: string; to?: string }) => ipcRenderer.invoke('personal:billing:taxVault:getAll', opts),
      getSummary: () => ipcRenderer.invoke('personal:billing:taxVault:getSummary'),
      reserve: (d: any) => ipcRenderer.invoke('personal:billing:taxVault:reserve', d),
      release: (d: { id: string; note?: string }) => ipcRenderer.invoke('personal:billing:taxVault:release', d),
      delete: (id: string) => ipcRenderer.invoke('personal:billing:taxVault:delete', id)
    }
  },

  // ── Rate engineering, expenses, subscriptions & retainers ───────────────────
  finance: {
    getRateProfile: () => ipcRenderer.invoke('personal:finance:getRateProfile'),
    saveRateProfile: (d: any) => ipcRenderer.invoke('personal:finance:saveRateProfile', d),
    getRateEngine: () => ipcRenderer.invoke('personal:finance:getRateEngine'),
    priceQuote: (d: { hours: number; price?: number }) => ipcRenderer.invoke('personal:finance:priceQuote', d),
    priceCard: (d: { services?: any[]; retainerDiscountPercent?: number; rushSurchargePercent?: number }) =>
      ipcRenderer.invoke('personal:finance:priceCard', d),
    getOverview: (opts?: { from?: string; to?: string }) => ipcRenderer.invoke('personal:finance:getOverview', opts),

    expenses: {
      getAll: (opts?: any) => ipcRenderer.invoke('personal:finance:expenses:getAll', opts),
      getSummary: (opts?: { from?: string; to?: string }) => ipcRenderer.invoke('personal:finance:expenses:getSummary', opts),
      create: (d: any) => ipcRenderer.invoke('personal:finance:expenses:create', d),
      update: (d: any) => ipcRenderer.invoke('personal:finance:expenses:update', d),
      delete: (id: string) => ipcRenderer.invoke('personal:finance:expenses:delete', id)
    },

    subscriptions: {
      getAll: (opts?: { activeOnly?: boolean; category?: string }) =>
        ipcRenderer.invoke('personal:finance:subscriptions:getAll', opts),
      getAudit: () => ipcRenderer.invoke('personal:finance:subscriptions:getAudit'),
      getRenewals: (opts?: { days?: number }) => ipcRenderer.invoke('personal:finance:subscriptions:getRenewals', opts),
      create: (d: any) => ipcRenderer.invoke('personal:finance:subscriptions:create', d),
      update: (d: any) => ipcRenderer.invoke('personal:finance:subscriptions:update', d),
      delete: (id: string) => ipcRenderer.invoke('personal:finance:subscriptions:delete', id)
    },

    retainers: {
      getAll: (opts?: { activeOnly?: boolean; clientId?: string }) =>
        ipcRenderer.invoke('personal:finance:retainers:getAll', opts),
      create: (d: any) => ipcRenderer.invoke('personal:finance:retainers:create', d),
      update: (d: any) => ipcRenderer.invoke('personal:finance:retainers:update', d),
      delete: (id: string) => ipcRenderer.invoke('personal:finance:retainers:delete', id),
      logUsage: (d: { retainerId: string; minutes: number; note?: string }) =>
        ipcRenderer.invoke('personal:finance:retainers:logUsage', d),
      resetUsage: (d: { id: string; carryOver?: boolean }) => ipcRenderer.invoke('personal:finance:retainers:resetUsage', d),
      renewalScan: (opts?: { asOf?: string }) =>
        ipcRenderer.invoke('personal:finance:retainers:renewalScan', opts),
      rollRenewals: (opts?: { asOf?: string; invoice?: boolean; dryRun?: boolean; retainerIds?: string[] }) =>
        ipcRenderer.invoke('personal:finance:retainers:rollRenewals', opts)
    }
  },

  // ── Capacity heatmap & blackout shield ──────────────────────────────────────
  capacity: {
    getHeatmap: (opts?: { from?: string; to?: string }) => ipcRenderer.invoke('personal:capacity:getHeatmap', opts),
    getStatus: () => ipcRenderer.invoke('personal:capacity:getStatus'),
    getWorkloads: (opts?: any) => ipcRenderer.invoke('personal:capacity:getWorkloads', opts),
    setWorkload: (d: any) => ipcRenderer.invoke('personal:capacity:setWorkload', d),
    deleteWorkload: (id: string) => ipcRenderer.invoke('personal:capacity:deleteWorkload', id),
    checkConflict: (d: { from?: string; to?: string; minutesPerDay?: number; totalMinutes?: number; projectId?: string }) =>
      ipcRenderer.invoke('personal:capacity:checkConflict', d),
    suggestStart: (d: { from?: string; neededMinutes?: number }) => ipcRenderer.invoke('personal:capacity:suggestStart', d),

    getBlackouts: (opts?: { from?: string; to?: string }) => ipcRenderer.invoke('personal:capacity:getBlackouts', opts),
    createBlackout: (d: any) => ipcRenderer.invoke('personal:capacity:createBlackout', d),
    updateBlackout: (d: any) => ipcRenderer.invoke('personal:capacity:updateBlackout', d),
    deleteBlackout: (id: string) => ipcRenderer.invoke('personal:capacity:deleteBlackout', id)
  },

  // ── Client communication playbook ───────────────────────────────────────────
  playbook: {
    getScripts: (opts?: { category?: string; language?: string; search?: string }) =>
      ipcRenderer.invoke('personal:playbook:getScripts', opts),
    getById: (id: string) => ipcRenderer.invoke('personal:playbook:getById', id),
    getCategories: () => ipcRenderer.invoke('personal:playbook:getCategories'),
    create: (d: any) => ipcRenderer.invoke('personal:playbook:create', d),
    update: (d: any) => ipcRenderer.invoke('personal:playbook:update', d),
    delete: (id: string) => ipcRenderer.invoke('personal:playbook:delete', id),
    render: (d: { id: string; values?: Record<string, string> }) => ipcRenderer.invoke('personal:playbook:render', d),
    seedDefaults: (opts?: { force?: boolean }) => ipcRenderer.invoke('personal:playbook:seedDefaults', opts)
  },

  // ── Scratchpad notes ────────────────────────────────────────────────────────
  notes: {
    getAll: (opts?: any) => ipcRenderer.invoke('personal:notes:getAll', opts),
    getById: (id: string) => ipcRenderer.invoke('personal:notes:getById', id),
    create: (d: any) => ipcRenderer.invoke('personal:notes:create', d),
    update: (d: any) => ipcRenderer.invoke('personal:notes:update', d),
    togglePin: (id: string) => ipcRenderer.invoke('personal:notes:togglePin', id),
    delete: (id: string) => ipcRenderer.invoke('personal:notes:delete', id)
  }
}

export type PersonalPreload = typeof personalPreload
