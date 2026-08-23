import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'

const log = createLogger('Restaurant:Menu')

export function registerMenuHandlers(prisma: any) {
  ipcMain.handle('restaurant:getMenuItems', async () => {
    try {
      return await prisma.menuItem.findMany({
        include: {
          modifierGroups: {
            include: { options: true }
          }
        },
        orderBy: [{ category: 'asc' }, { displayOrder: 'asc' }, { name: 'asc' }]
      })
    } catch (err) {
      log.error('getMenuItems error', err)
      throw err
    }
  })

  ipcMain.handle('restaurant:createMenuItem', async (_e, data: {
    name: string
    category: string
    description?: string
    price: number
    cost?: number
    preparationTime?: number
    station?: string
    colorTag?: string
    notes?: string
    modifierGroups?: Array<{
      title: string
      minSelect: number
      maxSelect: number
      options: Array<{ name: string; priceDelta: number }>
    }>
  }) => {
    try {
      const { modifierGroups, ...rest } = data
      return await prisma.menuItem.create({
        data: {
          ...rest,
          price: Number(rest.price),
          cost: Number(rest.cost || 0),
          preparationTime: Number(rest.preparationTime || 15),
          station: rest.station || 'Kitchen',
          modifierGroups: modifierGroups?.length
            ? {
                create: modifierGroups.map((g) => ({
                  title: g.title,
                  minSelect: Number(g.minSelect || 0),
                  maxSelect: Number(g.maxSelect || 1),
                  options: {
                    create: g.options.map((o) => ({
                      name: o.name,
                      priceDelta: Number(o.priceDelta || 0)
                    }))
                  }
                }))
              }
            : undefined
        },
        include: { modifierGroups: { include: { options: true } } }
      })
    } catch (err) {
      log.error('createMenuItem error', err)
      throw err
    }
  })

  ipcMain.handle('restaurant:updateMenuItem', async (_e, data: { id: string; [key: string]: any }) => {
    try {
      const { id, modifierGroups, ...rest } = data
      if (rest.price !== undefined) rest.price = Number(rest.price)
      if (rest.cost !== undefined) rest.cost = Number(rest.cost)
      if (rest.preparationTime !== undefined) rest.preparationTime = Number(rest.preparationTime)

      return await prisma.menuItem.update({
        where: { id },
        data: rest,
        include: { modifierGroups: { include: { options: true } } }
      })
    } catch (err) {
      log.error('updateMenuItem error', err)
      throw err
    }
  })

  ipcMain.handle('restaurant:toggleItem86', async (_e, id: string) => {
    try {
      const item = await prisma.menuItem.findUnique({ where: { id } })
      if (!item) throw new Error('Menu item not found')
      return await prisma.menuItem.update({
        where: { id },
        data: { isAvailable: !item.isAvailable }
      })
    } catch (err) {
      log.error('toggleItem86 error', err)
      throw err
    }
  })

  ipcMain.handle('restaurant:saveModifierGroup', async (_e, data: {
    id?: string
    menuItemId: string
    title: string
    minSelect: number
    maxSelect: number
    options: Array<{ id?: string; name: string; priceDelta: number }>
  }) => {
    try {
      if (data.id) {
        // Delete old options and replace
        await prisma.modifierOption.deleteMany({ where: { groupId: data.id } })
        return await prisma.modifierGroup.update({
          where: { id: data.id },
          data: {
            title: data.title,
            minSelect: Number(data.minSelect || 0),
            maxSelect: Number(data.maxSelect || 1),
            options: {
              create: data.options.map((o) => ({
                name: o.name,
                priceDelta: Number(o.priceDelta || 0)
              }))
            }
          },
          include: { options: true }
        })
      } else {
        return await prisma.modifierGroup.create({
          data: {
            menuItemId: data.menuItemId,
            title: data.title,
            minSelect: Number(data.minSelect || 0),
            maxSelect: Number(data.maxSelect || 1),
            options: {
              create: data.options.map((o) => ({
                name: o.name,
                priceDelta: Number(o.priceDelta || 0)
              }))
            }
          },
          include: { options: true }
        })
      }
    } catch (err) {
      log.error('saveModifierGroup error', err)
      throw err
    }
  })

  ipcMain.handle('restaurant:deleteModifierGroup', async (_e, id: string) => {
    try {
      return await prisma.modifierGroup.delete({ where: { id } })
    } catch (err) {
      log.error('deleteModifierGroup error', err)
      throw err
    }
  })

  ipcMain.handle('restaurant:deleteMenuItem', async (_e, id: string) => {
    try {
      return await prisma.menuItem.delete({ where: { id } })
    } catch (err) {
      log.error('deleteMenuItem error', err)
      throw err
    }
  })
}