// ─── Personal Work: Projects handler ─────────────────────────────────────────
// Projects, the stage-gated delivery pipeline, baseline deliverables and the
// pre-flight delivery checklist.
//
// IPC channels:
//   personal:projects:getAll / getById / create / update / delete
//   personal:projects:advanceStage / getBoard / getDeadlines
//   personal:projects:deliverables:* / checklist:* / templates:*
// ─────────────────────────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { num, paginate, round2, parseJsonArray, toDate, daysBetween } from './utils'
import { PIPELINE_STAGES, evaluateStageGate, paymentContext, stageIndex } from './domain'

const log = createLogger('Personal:Projects')

const PROJECT_INCLUDE = {
  client: { select: { id: true, name: true, company: true, currency: true, defaultHourlyRate: true } },
  deliverables: { orderBy: { createdAt: 'asc' } },
  _count: { select: { changeRequests: true, tasks: true, checklistItems: true, waits: true } }
}

export function registerProjectHandlers(prisma: any) {
  // ── Projects ──────────────────────────────────────────────────────────────
  ipcMain.handle('personal:projects:getAll', async (_e, opts?: {
    search?: string; status?: string; stage?: string; clientId?: string
    page?: number; pageSize?: number
  }) => {
    try {
      const page = opts?.page ?? 1
      const pageSize = opts?.pageSize ?? 50
      const where: any = {}
      if (opts?.status) where.status = opts.status
      if (opts?.stage) where.stage = opts.stage
      if (opts?.clientId) where.clientId = opts.clientId
      if (opts?.search) {
        where.OR = [
          { title: { contains: opts.search } },
          { code: { contains: opts.search } },
          { summary: { contains: opts.search } }
        ]
      }
      const [total, items] = await Promise.all([
        prisma.personalProject.count({ where }),
        prisma.personalProject.findMany({
          where,
          include: PROJECT_INCLUDE,
          orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ])
      return paginate(items, total, page, pageSize)
    } catch (err) { log.error('projects:getAll', err); throw err }
  })

  ipcMain.handle('personal:projects:getById', async (_e, id: string) => {
    try {
      const project = await prisma.personalProject.findUnique({
        where: { id },
        include: {
          client: true,
          deliverables: { orderBy: { createdAt: 'asc' } },
          changeRequests: { orderBy: { createdAt: 'desc' } },
          waits: { orderBy: { startedAt: 'desc' } },
          stageEvents: { orderBy: { enteredAt: 'asc' } },
          checklistItems: { orderBy: { displayOrder: 'asc' } },
          invoices: { include: { payments: true }, orderBy: { issuedAt: 'desc' } },
          tasks: { orderBy: [{ isDailyThree: 'desc' }, { dueDate: 'asc' }], take: 100 },
          workloads: { orderBy: { day: 'asc' } }
        }
      })
      if (!project) return null

      const sessions = await prisma.personalFocusSession.findMany({
        where: { projectId: id, endedAt: { not: null } },
        select: { actualMinutes: true, billable: true }
      })
      const focusMinutes = sessions.reduce((sum: number, s: any) => sum + num(s.actualMinutes), 0)
      const billableMinutes = sessions
        .filter((s: any) => s.billable)
        .reduce((sum: number, s: any) => sum + num(s.actualMinutes), 0)

      const payments = project.invoices.flatMap((inv: any) => inv.payments)
      const ctx = paymentContext(project.invoices.map((inv: any) => inv.amount), payments)
      const nextStage = PIPELINE_STAGES[Math.min(PIPELINE_STAGES.length - 1, stageIndex(project.stage) + 1)]
      const gate = evaluateStageGate(nextStage.id, ctx)

      const waitingDays = project.waits.reduce((sum: number, w: any) => sum + num(w.days), 0)
      const estimated = num(project.estimatedHours)

      return {
        ...project,
        metrics: {
          focusMinutes,
          billableMinutes,
          realHourlyRate: focusMinutes > 0 ? round2(ctx.paid / (focusMinutes / 60)) : 0,
          estimatedHours: estimated,
          hoursBurnPercent: estimated > 0 ? round2((focusMinutes / 60 / estimated) * 100) : 0,
          waitingDays,
          openWait: project.waits.some((w: any) => !w.endedAt),
          scopeCreepValue: round2(
            project.changeRequests
              .filter((c: any) => c.status === 'approved' || c.status === 'invoiced')
              .reduce((sum: number, c: any) => sum + num(c.extraCost), 0)
          ),
          checklistDone: project.checklistItems.filter((c: any) => c.isDone).length,
          checklistTotal: project.checklistItems.length,
          canHandOver: project.checklistItems.filter((c: any) => c.isBlocking).every((c: any) => c.isDone)
        },
        payments: ctx,
        nextStage,
        gate
      }
    } catch (err) { log.error('projects:getById', err); throw err }
  })

  ipcMain.handle('personal:projects:create', async (_e, data: any) => {
    try {
      const code = (data?.code || '').trim() || await nextProjectCode(prisma)
      const client = data?.clientId ? await prisma.personalClient.findUnique({ where: { id: data.clientId } }) : null
      const project = await prisma.personalProject.create({
        data: {
          code,
          clientId: data?.clientId || null,
          title: String(data?.title ?? '').trim(),
          summary: data?.summary || null,
          status: data?.status || 'lead',
          stage: data?.stage || 'brief_approved',
          pricingType: data?.pricingType || 'fixed',
          currency: data?.currency || client?.currency || 'USD',
          agreedAmount: num(data?.agreedAmount),
          hourlyRate: data?.hourlyRate === '' || data?.hourlyRate == null
            ? client?.defaultHourlyRate ?? null
            : num(data.hourlyRate),
          depositPercent: num(data?.depositPercent, client?.defaultDepositPercent ?? 50),
          startDate: toDate(data?.startDate),
          dueDate: toDate(data?.dueDate),
          adjustedDueDate: toDate(data?.dueDate),
          estimatedHours: num(data?.estimatedHours),
          maxHoursPerWeek: data?.maxHoursPerWeek === '' || data?.maxHoursPerWeek == null ? null : num(data.maxHoursPerWeek),
          notes: data?.notes || null
        },
        include: PROJECT_INCLUDE
      })
      await prisma.personalStageEvent.create({
        data: { projectId: project.id, stage: project.stage, note: 'Project created' }
      })
      return project
    } catch (err) { log.error('projects:create', err); throw err }
  })

  ipcMain.handle('personal:projects:update', async (_e, data: any) => {
    try {
      const { id, ...rest } = data ?? {}
      const patch: any = { ...rest }
      for (const key of ['startDate', 'dueDate']) {
        if (key in patch) patch[key] = toDate(patch[key])
      }
      if ('agreedAmount' in patch) patch.agreedAmount = num(patch.agreedAmount)
      if ('depositPercent' in patch) patch.depositPercent = num(patch.depositPercent, 50)
      if ('estimatedHours' in patch) patch.estimatedHours = num(patch.estimatedHours)
      if ('hourlyRate' in patch) {
        patch.hourlyRate = patch.hourlyRate === '' || patch.hourlyRate == null ? null : num(patch.hourlyRate)
      }
      if ('maxHoursPerWeek' in patch) {
        patch.maxHoursPerWeek = patch.maxHoursPerWeek === '' || patch.maxHoursPerWeek == null ? null : num(patch.maxHoursPerWeek)
      }
      if ('dueDate' in patch) {
        // Re-baseline the adjusted deadline, then replay the logged client delays.
        patch.adjustedDueDate = patch.dueDate
        const waits = await prisma.personalWaitLog.findMany({
          where: { projectId: id, shiftDeadline: true, endedAt: { not: null } }
        })
        const totalDays = waits.reduce((sum: number, w: any) => sum + num(w.appliedDays || w.days), 0)
        if (patch.dueDate && totalDays > 0) {
          const shifted = new Date(patch.dueDate)
          shifted.setDate(shifted.getDate() + totalDays)
          patch.adjustedDueDate = shifted
        }
      }
      return await prisma.personalProject.update({ where: { id }, data: patch, include: PROJECT_INCLUDE })
    } catch (err) { log.error('projects:update', err); throw err }
  })

  ipcMain.handle('personal:projects:delete', async (_e, id: string) => {
    try {
      return await prisma.personalProject.delete({ where: { id } })
    } catch (err) { log.error('projects:delete', err); throw err }
  })

  /**
   * Stage-gated transition. Refuses to unlock production without a paid
   * deposit, or hand-over without the balance settled.
   */
  ipcMain.handle('personal:projects:advanceStage', async (_e, data: { id: string; stage: string; note?: string }) => {
    try {
      const project = await prisma.personalProject.findUnique({
        where: { id: data.id },
        include: { invoices: { include: { payments: true } } }
      })
      if (!project) throw new Error('Project not found')

      const payments = project.invoices.flatMap((inv: any) => inv.payments)
      const ctx = paymentContext(project.invoices.map((inv: any) => inv.amount), payments)
      const gate = evaluateStageGate(data.stage, ctx)
      if (gate.blocked) {
        return { ok: false, blocked: true, requires: gate.requires, reason: gate.reason, payments: ctx }
      }

      const patch: any = { stage: data.stage }
      if (data.stage === 'assets_handed_over') {
        patch.deliveredAt = new Date()
        patch.status = 'delivered'
      } else if (stageIndex(data.stage) >= stageIndex('draft_staging')) {
        if (project.status === 'lead') patch.status = 'active'
      }

      const updated = await prisma.personalProject.update({ where: { id: data.id }, data: patch, include: PROJECT_INCLUDE })
      await prisma.personalStageEvent.create({
        data: { projectId: data.id, stage: data.stage, note: data.note || null }
      })
      return { ok: true, blocked: false, project: updated }
    } catch (err) { log.error('projects:advanceStage', err); throw err }
  })

  ipcMain.handle('personal:projects:getBoard', async () => {
    try {
      const projects = await prisma.personalProject.findMany({
        where: { status: { in: ['lead', 'active', 'paused'] } },
        include: PROJECT_INCLUDE,
        orderBy: { dueDate: 'asc' }
      })
      const columns = PIPELINE_STAGES.map((stage) => ({
        stage: stage.id,
        label: stage.label,
        requires: stage.requires,
        projects: projects.filter((p: any) => p.stage === stage.id)
      }))
      return { columns, total: projects.length }
    } catch (err) { log.error('projects:getBoard', err); throw err }
  })

  /** Upcoming deliveries with a live countdown, plus overdue and blocked items. */
  ipcMain.handle('personal:projects:getDeadlines', async (_e, opts?: { days?: number }) => {
    try {
      const horizon = opts?.days ?? 21
      const now = new Date()
      const projects = await prisma.personalProject.findMany({
        where: { status: { in: ['lead', 'active', 'paused'] } },
        include: { client: { select: { id: true, name: true } } }
      })
      const rows = projects.map((p: any) => {
        const deadline = p.adjustedDueDate ?? p.dueDate
        const overdue = deadline ? new Date(deadline).getTime() < now.getTime() : false
        const daysLeft = deadline ? Math.round((new Date(deadline).getTime() - now.getTime()) / 86_400_000) : null
        return {
          id: p.id,
          code: p.code,
          title: p.title,
          clientName: p.client?.name ?? null,
          stage: p.stage,
          status: p.status,
          deadline,
          daysLeft,
          overdue,
          hasOpenWait: false
        }
      })
      const waits = await prisma.personalWaitLog.findMany({ where: { endedAt: null }, select: { projectId: true } })
      const waiting = new Set(waits.map((w: any) => w.projectId))

      const rowsWithWait = rows
        .map((r) => ({ ...r, hasOpenWait: waiting.has(r.id) }))
        .sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999))

      return {
        upcoming: rowsWithWait.filter((r) => r.deadline && !r.overdue && (r.daysLeft ?? 0) <= horizon),
        overdue: rowsWithWait.filter((r) => r.overdue),
        noDeadline: rowsWithWait.filter((r) => !r.deadline),
        waitingOnClient: rowsWithWait.filter((r) => r.hasOpenWait)
      }
    } catch (err) { log.error('projects:getDeadlines', err); throw err }
  })

  // ── Baseline deliverables ────────────────────────────────────────────────
  ipcMain.handle('personal:projects:deliverables:getAll', async (_e, projectId: string) => {
    try {
      return await prisma.personalDeliverable.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' }
      })
    } catch (err) { log.error('deliverables:getAll', err); throw err }
  })

  ipcMain.handle('personal:projects:deliverables:create', async (_e, data: any) => {
    try {
      return await prisma.personalDeliverable.create({
        data: {
          projectId: data.projectId,
          title: String(data?.title ?? '').trim(),
          quantity: num(data?.quantity, 1),
          unit: data?.unit || 'item',
          isIncluded: data?.isIncluded ?? true,
          notes: data?.notes || null
        }
      })
    } catch (err) { log.error('deliverables:create', err); throw err }
  })

  ipcMain.handle('personal:projects:deliverables:update', async (_e, data: any) => {
    try {
      const { id, ...rest } = data ?? {}
      const patch: any = { ...rest }
      if ('quantity' in patch) patch.quantity = num(patch.quantity, 1)
      return await prisma.personalDeliverable.update({ where: { id }, data: patch })
    } catch (err) { log.error('deliverables:update', err); throw err }
  })

  ipcMain.handle('personal:projects:deliverables:delete', async (_e, id: string) => {
    try {
      return await prisma.personalDeliverable.delete({ where: { id } })
    } catch (err) { log.error('deliverables:delete', err); throw err }
  })

  // ── Pre-flight delivery checklist ────────────────────────────────────────
  ipcMain.handle('personal:projects:checklist:getAll', async (_e, projectId: string) => {
    try {
      return await prisma.personalChecklistItem.findMany({
        where: { projectId },
        orderBy: { displayOrder: 'asc' }
      })
    } catch (err) { log.error('checklist:getAll', err); throw err }
  })

  ipcMain.handle('personal:projects:checklist:create', async (_e, data: any) => {
    try {
      return await prisma.personalChecklistItem.create({
        data: {
          projectId: data.projectId,
          label: String(data?.label ?? '').trim(),
          category: data?.category || 'general',
          isBlocking: data?.isBlocking ?? true,
          displayOrder: Math.round(num(data?.displayOrder, 0)),
          notes: data?.notes || null
        }
      })
    } catch (err) { log.error('checklist:create', err); throw err }
  })

  ipcMain.handle('personal:projects:checklist:update', async (_e, data: any) => {
    try {
      const { id, ...rest } = data ?? {}
      const patch: any = { ...rest }
      if ('isDone' in patch) patch.doneAt = patch.isDone ? new Date() : null
      return await prisma.personalChecklistItem.update({ where: { id }, data: patch })
    } catch (err) { log.error('checklist:update', err); throw err }
  })

  ipcMain.handle('personal:projects:checklist:delete', async (_e, id: string) => {
    try {
      return await prisma.personalChecklistItem.delete({ where: { id } })
    } catch (err) { log.error('checklist:delete', err); throw err }
  })

  /** Apply a profession template — merges without duplicating existing labels. */
  ipcMain.handle('personal:projects:checklist:applyTemplate', async (_e, data: { projectId: string; templateId: string }) => {
    try {
      const template = await prisma.personalChecklistTemplate.findUnique({ where: { id: data.templateId } })
      if (!template) throw new Error('Checklist template not found')
      const labels = parseJsonArray<string>(template.itemsJson).filter((l) => typeof l === 'string' && l.trim())
      const existing = await prisma.personalChecklistItem.findMany({
        where: { projectId: data.projectId },
        select: { label: true, displayOrder: true }
      })
      const known = new Set(existing.map((i: any) => i.label.toLowerCase()))
      let order = existing.reduce((max: number, i: any) => Math.max(max, num(i.displayOrder)), 0)

      const created: any[] = []
      for (const label of labels) {
        if (known.has(label.toLowerCase())) continue
        order += 1
        created.push(await prisma.personalChecklistItem.create({
          data: { projectId: data.projectId, label, category: template.profession, displayOrder: order }
        }))
      }
      return { template: template.name, created: created.length, skipped: labels.length - created.length }
    } catch (err) { log.error('checklist:applyTemplate', err); throw err }
  })

  ipcMain.handle('personal:projects:templates:getAll', async () => {
    try {
      return await prisma.personalChecklistTemplate.findMany({ orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] })
    } catch (err) { log.error('templates:getAll', err); throw err }
  })

  ipcMain.handle('personal:projects:templates:create', async (_e, data: any) => {
    try {
      const items = Array.isArray(data?.items)
        ? data.items
        : String(data?.itemsText ?? '')
          .split('\n')
          .map((line: string) => line.trim())
          .filter(Boolean)
      return await prisma.personalChecklistTemplate.create({
        data: {
          name: String(data?.name ?? '').trim(),
          profession: data?.profession || 'general',
          isDefault: Boolean(data?.isDefault),
          itemsJson: JSON.stringify(items)
        }
      })
    } catch (err) { log.error('templates:create', err); throw err }
  })

  ipcMain.handle('personal:projects:templates:update', async (_e, data: any) => {
    try {
      const { id, items, itemsText, ...rest } = data ?? {}
      const patch: any = { ...rest }
      if (items || itemsText !== undefined) {
        const list = Array.isArray(items)
          ? items
          : String(itemsText ?? '').split('\n').map((line: string) => line.trim()).filter(Boolean)
        patch.itemsJson = JSON.stringify(list)
      }
      return await prisma.personalChecklistTemplate.update({ where: { id }, data: patch })
    } catch (err) { log.error('templates:update', err); throw err }
  })

  ipcMain.handle('personal:projects:templates:delete', async (_e, id: string) => {
    try {
      return await prisma.personalChecklistTemplate.delete({ where: { id } })
    } catch (err) { log.error('templates:delete', err); throw err }
  })
}

async function nextProjectCode(prisma: any): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.personalProject.count()
  return `PW-${year}-${String(count + 1).padStart(3, '0')}`
}

/** Days a project has been blocked by the client so far. */
export async function waitingSummary(prisma: any, projectId: string) {
  const waits = await prisma.personalWaitLog.findMany({ where: { projectId } })
  return {
    totalDays: waits.reduce((sum: number, w: any) => sum + num(w.days), 0),
    openDays: waits.filter((w: any) => !w.endedAt)
      .reduce((sum: number, w: any) => sum + daysBetween(w.startedAt, new Date()), 0),
    entries: waits.length
  }
}
