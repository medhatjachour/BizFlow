// ─── Personal Work: Change requests (scope-creep guard) ──────────────────────
// Every "small extra request" is priced, quoted and approved before any work
// starts, so unpaid scope never slips through unnoticed.
//
// IPC channels:
//   personal:requests:getAll / getById / create / update / delete
//   personal:requests:quote / decide / markInvoiced
// ─────────────────────────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { num, paginate } from './utils'
import { buildChangeRequestQuote, priceChangeRequest } from './domain'

const log = createLogger('Personal:Requests')

const REQUEST_INCLUDE = {
  project: {
    select: {
      id: true, code: true, title: true, currency: true, hourlyRate: true, agreedAmount: true,
      client: { select: { id: true, name: true, company: true } }
    }
  }
}

export function registerRequestHandlers(prisma: any) {
  ipcMain.handle('personal:requests:getAll', async (_e, opts?: {
    projectId?: string; status?: string; page?: number; pageSize?: number
  }) => {
    try {
      const page = opts?.page ?? 1
      const pageSize = opts?.pageSize ?? 50
      const where: any = {}
      if (opts?.projectId) where.projectId = opts.projectId
      if (opts?.status) where.status = opts.status
      const [total, items] = await Promise.all([
        prisma.personalChangeRequest.count({ where }),
        prisma.personalChangeRequest.findMany({
          where,
          include: REQUEST_INCLUDE,
          orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ])
      return paginate(items, total, page, pageSize)
    } catch (err) { log.error('requests:getAll', err); throw err }
  })

  ipcMain.handle('personal:requests:getById', async (_e, id: string) => {
    try {
      return await prisma.personalChangeRequest.findUnique({ where: { id }, include: REQUEST_INCLUDE })
    } catch (err) { log.error('requests:getById', err); throw err }
  })

  /** Logs a request and immediately prices the extra cost + delivery days. */
  ipcMain.handle('personal:requests:create', async (_e, data: any) => {
    try {
      const project = await prisma.personalProject.findUnique({
        where: { id: data?.projectId },
        include: { client: { select: { defaultHourlyRate: true } } }
      })
      if (!project) throw new Error('Project not found')

      const hourlyRate = data?.hourlyRate === '' || data?.hourlyRate == null
        ? num(project.hourlyRate ?? project.client?.defaultHourlyRate, 0)
        : num(data.hourlyRate)
      const pricing = priceChangeRequest({
        estimatedHours: num(data?.estimatedHours),
        hourlyRate,
        extraDays: data?.extraDays === '' || data?.extraDays == null ? undefined : num(data.extraDays),
        hoursPerDay: num(data?.hoursPerDay, 6)
      })

      return await prisma.personalChangeRequest.create({
        data: {
          projectId: project.id,
          title: String(data?.title ?? '').trim(),
          description: data?.description || null,
          estimatedHours: num(data?.estimatedHours),
          hourlyRate,
          extraCost: pricing.extraCost,
          extraDays: pricing.extraDays,
          status: 'draft'
        },
        include: REQUEST_INCLUDE
      })
    } catch (err) { log.error('requests:create', err); throw err }
  })

  ipcMain.handle('personal:requests:update', async (_e, data: any) => {
    try {
      const { id, ...rest } = data ?? {}
      const existing = await prisma.personalChangeRequest.findUnique({ where: { id } })
      if (!existing) throw new Error('Change request not found')

      const patch: any = { ...rest }
      if ('estimatedHours' in patch || 'hourlyRate' in patch || 'extraDays' in patch) {
        const pricing = priceChangeRequest({
          estimatedHours: 'estimatedHours' in patch ? num(patch.estimatedHours) : existing.estimatedHours,
          hourlyRate: 'hourlyRate' in patch ? num(patch.hourlyRate) : existing.hourlyRate,
          extraDays: 'extraDays' in patch ? num(patch.extraDays) : existing.extraDays
        })
        patch.estimatedHours = 'estimatedHours' in patch ? num(patch.estimatedHours) : existing.estimatedHours
        patch.hourlyRate = 'hourlyRate' in patch ? num(patch.hourlyRate) : existing.hourlyRate
        patch.extraCost = pricing.extraCost
        patch.extraDays = pricing.extraDays
      }
      return await prisma.personalChangeRequest.update({ where: { id }, data: patch, include: REQUEST_INCLUDE })
    } catch (err) { log.error('requests:update', err); throw err }
  })

  ipcMain.handle('personal:requests:delete', async (_e, id: string) => {
    try {
      return await prisma.personalChangeRequest.delete({ where: { id } })
    } catch (err) { log.error('requests:delete', err); throw err }
  })

  /** Generates the one-click client quote from the stored numbers. */
  ipcMain.handle('personal:requests:quote', async (_e, id: string) => {
    try {
      const request = await prisma.personalChangeRequest.findUnique({ where: { id }, include: REQUEST_INCLUDE })
      if (!request) throw new Error('Change request not found')

      const quoteText = buildChangeRequestQuote({
        clientName: request.project?.client?.name ?? 'there',
        projectTitle: request.project?.title ?? 'the project',
        title: request.title,
        description: request.description,
        estimatedHours: request.estimatedHours,
        hourlyRate: request.hourlyRate,
        extraCost: request.extraCost,
        extraDays: request.extraDays,
        currency: request.project?.currency ?? 'USD'
      })

      return await prisma.personalChangeRequest.update({
        where: { id },
        data: { quoteText, quotedAt: new Date(), status: request.status === 'draft' ? 'quoted' : request.status },
        include: REQUEST_INCLUDE
      })
    } catch (err) { log.error('requests:quote', err); throw err }
  })

  /** Client answer. Approving also pushes the delivery deadline by extraDays. */
  ipcMain.handle('personal:requests:decide', async (_e, data: { id: string; status: string; note?: string; shiftDeadline?: boolean }) => {
    try {
      const request = await prisma.personalChangeRequest.findUnique({ where: { id: data.id } })
      if (!request) throw new Error('Change request not found')

      const updated = await prisma.personalChangeRequest.update({
        where: { id: data.id },
        data: {
          status: data.status,
          decisionNote: data.note || null,
          decidedAt: new Date()
        },
        include: REQUEST_INCLUDE
      })

      if (data.status === 'approved' && data.shiftDeadline !== false && request.extraDays > 0) {
        const project = await prisma.personalProject.findUnique({ where: { id: request.projectId } })
        if (project) {
          const base = project.adjustedDueDate ?? project.dueDate
          if (base) {
            const shifted = new Date(base)
            shifted.setDate(shifted.getDate() + request.extraDays)
            await prisma.personalProject.update({
              where: { id: request.projectId },
              data: { adjustedDueDate: shifted }
            })
          }
        }
      }
      return updated
    } catch (err) { log.error('requests:decide', err); throw err }
  })

  ipcMain.handle('personal:requests:markInvoiced', async (_e, data: { id: string; invoiceId?: string }) => {
    try {
      return await prisma.personalChangeRequest.update({
        where: { id: data.id },
        data: { status: 'invoiced' },
        include: REQUEST_INCLUDE
      })
    } catch (err) { log.error('requests:markInvoiced', err); throw err }
  })
}
