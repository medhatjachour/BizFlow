/**
 * Vet Medicine Catalogue Settings IPC Handlers
 *
 * Manages the user-editable taxonomy used by the medicine catalogue:
 *   – VetMedicineCategory  (used for grouping + filtering medicines / sales)
 *   – VetMedicineUnit      (container units e.g. tablet, bottle, vial)
 *
 * Endpoints:
 *   vet:medicineCategories:getAll        – list (lazily seeds defaults if empty)
 *   vet:medicineCategories:create        – add a category
 *   vet:medicineCategories:update        – rename / recolour
 *   vet:medicineCategories:delete        – delete + reassign medicines to 'general'
 *   vet:medicineCategories:getUsageCount – how many medicines use a category
 *   vet:medicineUnits:getAll / create / delete
 */

import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Vet:Catalogue')

const DEFAULT_CATEGORIES: Array<{ name: string; color: string }> = [
  { name: 'general',       color: '#64748b' },
  { name: 'antibiotic',    color: '#8b5cf6' },
  { name: 'antiparasitic', color: '#0ea5e9' },
  { name: 'vaccine',       color: '#10b981' },
  { name: 'anesthetic',    color: '#f59e0b' },
  { name: 'analgesic',     color: '#ef4444' },
  { name: 'supplement',    color: '#ec4899' },
]

const DEFAULT_UNITS = ['tablet', 'capsule', 'ml', 'vial', 'tube', 'bottle', 'sachet', 'other']

export function registerVetCatalogueHandlers(prisma: any) {
  // Memoised seed guards so concurrent getAll calls don't each fire createMany
  // (which races and trips the unique constraint). The first call seeds; the
  // rest await the same promise. Reset to null on failure so a later call retries.
  let seedCategories: Promise<void> | null = null
  let seedUnits: Promise<void> | null = null

  async function ensureCategoriesSeeded() {
    if (!seedCategories) {
      seedCategories = (async () => {
        const count = await prisma.vetMedicineCategory.count()
        if (count > 0) return
        try {
          await prisma.vetMedicineCategory.createMany({
            data: DEFAULT_CATEGORIES.map(c => ({ ...c, isDefault: true })),
          })
        } catch (e: any) {
          if (e?.code !== 'P2002') throw e   // ignore "already seeded"
        }
      })().catch(err => { seedCategories = null; throw err })
    }
    return seedCategories
  }

  async function ensureUnitsSeeded() {
    if (!seedUnits) {
      seedUnits = (async () => {
        const count = await prisma.vetMedicineUnit.count()
        if (count > 0) return
        try {
          await prisma.vetMedicineUnit.createMany({
            data: DEFAULT_UNITS.map(name => ({ name, isDefault: true })),
          })
        } catch (e: any) {
          if (e?.code !== 'P2002') throw e
        }
      })().catch(err => { seedUnits = null; throw err })
    }
    return seedUnits
  }

  // ─── Categories ───────────────────────────────────────────────────────────
  ipcMain.handle('vet:medicineCategories:getAll', async () => {
    try {
      await ensureCategoriesSeeded()
      return await prisma.vetMedicineCategory.findMany({ orderBy: { name: 'asc' } })
    } catch (err) { log.error('categories:getAll', err); throw err }
  })

  ipcMain.handle('vet:medicineCategories:create', async (_e, data: { name: string; color?: string }) => {
    try {
      const name = (data?.name ?? '').trim().toLowerCase()
      if (!name) throw new Error('Category name is required')
      const exists = await prisma.vetMedicineCategory.findUnique({ where: { name } })
      if (exists) throw new Error('Category already exists')
      return await prisma.vetMedicineCategory.create({ data: { name, color: data.color ?? '#8b5cf6' } })
    } catch (err) { log.error('categories:create', err); throw err }
  })

  ipcMain.handle('vet:medicineCategories:update', async (_e, id: string, data: { name?: string; color?: string }) => {
    try {
      const cat = await prisma.vetMedicineCategory.findUnique({ where: { id } })
      if (!cat) throw new Error('Category not found')
      const patch: any = {}
      if (data.color) patch.color = data.color
      if (data.name) {
        const name = data.name.trim().toLowerCase()
        if (name !== cat.name) {
          const clash = await prisma.vetMedicineCategory.findUnique({ where: { name } })
          if (clash) throw new Error('Name already used')
          patch.name = name
          // Keep medicines pointing at the renamed category.
          await prisma.vetMedicine.updateMany({ where: { category: cat.name }, data: { category: name } })
        }
      }
      return await prisma.vetMedicineCategory.update({ where: { id }, data: patch })
    } catch (err) { log.error('categories:update', err); throw err }
  })

  ipcMain.handle('vet:medicineCategories:delete', async (_e, id: string) => {
    try {
      const cat = await prisma.vetMedicineCategory.findUnique({ where: { id } })
      if (!cat) throw new Error('Category not found')
      if (cat.name === 'general') throw new Error('The "general" category cannot be deleted')
      // Move any medicines on this category back to 'general'.
      const reassigned = await prisma.vetMedicine.updateMany({
        where: { category: cat.name }, data: { category: 'general' },
      })
      await prisma.vetMedicineCategory.delete({ where: { id } })
      return { success: true, reassigned: reassigned.count }
    } catch (err) { log.error('categories:delete', err); throw err }
  })

  ipcMain.handle('vet:medicineCategories:getUsageCount', async (_e, name: string) => {
    try {
      const count = await prisma.vetMedicine.count({ where: { category: name } })
      return { count }
    } catch (err) { log.error('categories:getUsageCount', err); throw err }
  })

  // ─── Units ────────────────────────────────────────────────────────────────
  ipcMain.handle('vet:medicineUnits:getAll', async () => {
    try {
      await ensureUnitsSeeded()
      return await prisma.vetMedicineUnit.findMany({ orderBy: { name: 'asc' } })
    } catch (err) { log.error('units:getAll', err); throw err }
  })

  ipcMain.handle('vet:medicineUnits:create', async (_e, data: { name: string }) => {
    try {
      const name = (data?.name ?? '').trim().toLowerCase()
      if (!name) throw new Error('Unit name is required')
      const exists = await prisma.vetMedicineUnit.findUnique({ where: { name } })
      if (exists) throw new Error('Unit already exists')
      return await prisma.vetMedicineUnit.create({ data: { name } })
    } catch (err) { log.error('units:create', err); throw err }
  })

  ipcMain.handle('vet:medicineUnits:delete', async (_e, id: string) => {
    try {
      await prisma.vetMedicineUnit.delete({ where: { id } })
      return { success: true }
    } catch (err) { log.error('units:delete', err); throw err }
  })
}
