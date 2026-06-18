/**
 * Vet Visit Type IPC Handlers
 *
 * Manages the user-editable list of session/visit types (e.g. Sonar, Visit,
 * Surgery) used by the session form and statistics comparison.
 *
 * Endpoints:
 *   vet:visitTypes:getAll        – list (lazily seeds defaults if empty)
 *   vet:visitTypes:create        – add a type { name, color? }
 *   vet:visitTypes:update        – rename / recolour / reorder
 *   vet:visitTypes:delete        – delete (sessions keep their stored label)
 *   vet:visitTypes:getUsageCount – how many sessions use a type
 */

import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Vet:VisitTypes')

// Default presets — names are lowercase keys; labels/colors mirror the built-in
// renderer palette so existing seeded sessions render consistently.
const DEFAULT_VISIT_TYPES: Array<{ name: string; color: string }> = [
  { name: 'wellness_exam', color: '#14b8a6' },
  { name: 'visit',         color: '#06b6d4' },
  { name: 'consultation',  color: '#0ea5e9' },
  { name: 'vaccination',   color: '#3b82f6' },
  { name: 'sonar',         color: '#6366f1' },
  { name: 'lab_test',      color: '#84cc16' },
  { name: 'dental',        color: '#f59e0b' },
  { name: 'surgery',       color: '#ef4444' },
  { name: 'emergency',     color: '#f97316' },
  { name: 'follow_up',     color: '#a855f7' },
  { name: 'deworming',     color: '#10b981' },
  { name: 'grooming',      color: '#ec4899' },
]

export function registerVetVisitTypeHandlers(prisma: any) {
  // Memoised seed guard so concurrent getAll calls don't each fire createMany.
  let seedTypes: Promise<void> | null = null

  async function ensureSeeded() {
    if (!seedTypes) {
      seedTypes = (async () => {
        const count = await prisma.vetVisitType.count()
        if (count > 0) return
        try {
          await prisma.vetVisitType.createMany({
            data: DEFAULT_VISIT_TYPES.map((v, i) => ({ ...v, isDefault: true, sortOrder: i })),
          })
        } catch (e: any) {
          if (e?.code !== 'P2002') throw e   // ignore "already seeded"
        }
      })().catch(err => { seedTypes = null; throw err })
    }
    return seedTypes
  }

  ipcMain.handle('vet:visitTypes:getAll', async () => {
    try {
      await ensureSeeded()
      return await prisma.vetVisitType.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] })
    } catch (err) { log.error('visitTypes:getAll', err); throw err }
  })

  ipcMain.handle('vet:visitTypes:create', async (_e, data: { name: string; color?: string }) => {
    try {
      const name = (data?.name ?? '').trim().toLowerCase().replace(/\s+/g, '_')
      if (!name) throw new Error('Visit type name is required')
      const exists = await prisma.vetVisitType.findUnique({ where: { name } })
      if (exists) throw new Error('Visit type already exists')
      const max = await prisma.vetVisitType.aggregate({ _max: { sortOrder: true } })
      return await prisma.vetVisitType.create({
        data: { name, color: data.color ?? '#6366f1', sortOrder: (max._max.sortOrder ?? -1) + 1 },
      })
    } catch (err) { log.error('visitTypes:create', err); throw err }
  })

  ipcMain.handle('vet:visitTypes:update', async (_e, id: string, data: { name?: string; color?: string; sortOrder?: number }) => {
    try {
      const vt = await prisma.vetVisitType.findUnique({ where: { id } })
      if (!vt) throw new Error('Visit type not found')
      const patch: any = {}
      if (data.color) patch.color = data.color
      if (typeof data.sortOrder === 'number') patch.sortOrder = data.sortOrder
      if (data.name) {
        const name = data.name.trim().toLowerCase().replace(/\s+/g, '_')
        if (name && name !== vt.name) {
          const clash = await prisma.vetVisitType.findUnique({ where: { name } })
          if (clash) throw new Error('Name already used')
          patch.name = name
          // Keep existing sessions pointing at the renamed type.
          await prisma.vetSession.updateMany({ where: { visitType: vt.name }, data: { visitType: name } })
        }
      }
      return await prisma.vetVisitType.update({ where: { id }, data: patch })
    } catch (err) { log.error('visitTypes:update', err); throw err }
  })

  ipcMain.handle('vet:visitTypes:delete', async (_e, id: string) => {
    try {
      const vt = await prisma.vetVisitType.findUnique({ where: { id } })
      if (!vt) throw new Error('Visit type not found')
      const count = await prisma.vetSession.count({ where: { visitType: vt.name } })
      // Sessions keep their stored visitType string (still renders via label
      // fallback) — we only remove it from the managed picker list.
      await prisma.vetVisitType.delete({ where: { id } })
      return { success: true, affectedSessions: count }
    } catch (err) { log.error('visitTypes:delete', err); throw err }
  })

  ipcMain.handle('vet:visitTypes:getUsageCount', async (_e, name: string) => {
    try {
      const count = await prisma.vetSession.count({ where: { visitType: name } })
      return { count }
    } catch (err) { log.error('visitTypes:getUsageCount', err); throw err }
  })
}
