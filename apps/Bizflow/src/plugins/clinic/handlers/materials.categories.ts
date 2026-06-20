/**
 * Clinic material category handlers.
 *   clinic:materialCategories:getAll / create / update / delete
 * Split out of materials.ts (registered via the barrel there).
 */
import { ipcMain } from 'electron'

export function registerMaterialCategoryHandlers(prisma: any) {
  ipcMain.handle('clinic:materialCategories:getAll', async () => {
    return prisma.clinicMaterialCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
  })

  ipcMain.handle(
    'clinic:materialCategories:create',
    async (_e, data: { name: string; color?: string; sortOrder?: number }) => {
      return prisma.clinicMaterialCategory.create({ data })
    }
  )

  ipcMain.handle(
    'clinic:materialCategories:update',
    async (_e, { id, data }: { id: string; data: { name?: string; color?: string; sortOrder?: number } }) => {
      return prisma.clinicMaterialCategory.update({ where: { id }, data })
    }
  )

  ipcMain.handle('clinic:materialCategories:delete', async (_e, id: string) => {
    return prisma.clinicMaterialCategory.delete({ where: { id } })
  })
}
