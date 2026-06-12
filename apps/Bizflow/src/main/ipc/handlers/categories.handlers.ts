/**
 * Category IPC Handlers
 * Handles all category-related operations (CRUD)
 */

import { ipcMain } from 'electron'
import { createLogger } from '../../utils/logger'

const log = createLogger('Categories')

export function registerCategoriesHandlers(prisma: any) {
  /**
   * Get all categories with product counts
   */
  ipcMain.handle('categories:getAll', async () => {
    try {
      if (!prisma) {
        return { success: false, message: 'Database not available' }
      }

      const categories = await prisma.category.findMany({
        include: {
          _count: {
            select: { products: true }
          }
        },
        orderBy: {
          name: 'asc'
        }
      })

      // Transform to include productCount at top level
      const categoriesWithCount = categories.map((cat: any) => ({
        ...cat,
        productCount: cat._count.products,
        _count: undefined
      }))

      return { success: true, categories: categoriesWithCount }
    } catch (error: any) {
      log.error('Error fetching categories:', error)
      return { success: false, message: error.message }
    }
  })

  /**
   * Get category by ID
   */
  ipcMain.handle('categories:getById', async (_, id: string) => {
    try {
      if (!prisma) {
        return { success: false, message: 'Database not available' }
      }

      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          _count: {
            select: { products: true }
          }
        }
      })

      if (!category) {
        return { success: false, message: 'Category not found' }
      }

      return {
        success: true,
        category: {
          ...category,
          productCount: category._count.products
        }
      }
    } catch (error: any) {
      log.error('Error fetching category:', error)
      return { success: false, message: error.message }
    }
  })

  /**
   * Create new category
   */
  ipcMain.handle('categories:create', async (_, categoryData) => {
    try {
      if (!prisma) {
        return { success: false, message: 'Database not available' }
      }

      const newCategory = await prisma.category.create({
        data: {
          name: categoryData.name,
          description: categoryData.description || null,
          icon: categoryData.icon || null,
          color: categoryData.color || null
        }
      })

      return { success: true, category: newCategory }
    } catch (error: any) {
      log.error('Error creating category:', error)
      
      // Handle unique constraint violation
      if (error.code === 'P2002') {
        return { success: false, message: 'A category with this name already exists' }
      }
      
      return { success: false, message: error.message }
    }
  })

  /**
   * Update category
   */
  ipcMain.handle('categories:update', async (_, { id, categoryData }) => {
    try {
      if (!prisma) {
        return { success: false, message: 'Database not available' }
      }

      const updated = await prisma.category.update({
        where: { id },
        data: {
          name: categoryData.name,
          description: categoryData.description || null,
          icon: categoryData.icon || null,
          color: categoryData.color || null
        }
      })

      return { success: true, category: updated }
    } catch (error: any) {
      log.error('Error updating category:', error)
      
      if (error.code === 'P2002') {
        return { success: false, message: 'A category with this name already exists' }
      }
      
      if (error.code === 'P2025') {
        return { success: false, message: 'Category not found' }
      }
      
      return { success: false, message: error.message }
    }
  })

  /**
   * Delete category
   * Only allows deletion if no products are using it
   */
  ipcMain.handle('categories:delete', async (_, id: string) => {
    try {
      if (!prisma) {
        return { success: false, message: 'Database not available' }
      }

      // Check if category has products
      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          _count: {
            select: { products: true }
          }
        }
      })

      if (!category) {
        return { success: false, message: 'Category not found' }
      }

      if (category._count.products > 0) {
        return { 
          success: false, 
          message: `Cannot delete category with ${category._count.products} products. Please reassign or delete the products first.` 
        }
      }

      await prisma.category.delete({
        where: { id }
      })

      return { success: true, message: 'Category deleted successfully' }
    } catch (error: any) {
      log.error('Error deleting category:', error)
      return { success: false, message: error.message }
    }
  })
}
