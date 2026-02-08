/**
 * Category IPC Handlers - better-sqlite3 Version
 * ~5x faster than Prisma version
 */

import { ipcMain } from 'electron'
import { db } from '../../database/sqlite'

export function registerCategoriesHandlers() {
  /**
   * Get all categories with product counts
   */
  ipcMain.handle('categories:getAll', async () => {
    try {
      const categories = db.query(`
        SELECT 
          c.*,
          COUNT(p.id) as productCount
        FROM Category c
        LEFT JOIN Product p ON c.id = p.categoryId AND p.isArchived = 0
        GROUP BY c.id
        ORDER BY c.name ASC
      `)

      return { success: true, categories }
    } catch (error: any) {
      console.error('Error fetching categories:', error)
      return { success: false, message: error.message }
    }
  })

  /**
   * Get category by ID
   */
  ipcMain.handle('categories:getById', async (_, id: string) => {
    try {
      const category = db.queryOne('SELECT * FROM Category WHERE id = ?', [id])
      
      if (!category) {
        return { success: false, message: 'Category not found' }
      }

      // Get product count
      const count = db.count('Product', 'categoryId = ? AND isArchived = 0', [id])
      category.productCount = count

      return { success: true, category }
    } catch (error: any) {
      console.error('Error fetching category:', error)
      return { success: false, message: error.message }
    }
  })

  /**
   * Create new category
   */
  ipcMain.handle('categories:create', async (_, categoryData) => {
    try {
      const categoryId = categoryData.id || `cat_${Date.now()}`
      
      db.execute(`
        INSERT INTO Category (id, name, description, icon, color, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        categoryId,
        categoryData.name,
        categoryData.description || null,
        categoryData.icon || null,
        categoryData.color || null,
        new Date().toISOString(),
        new Date().toISOString()
      ])

      const category = db.queryOne('SELECT * FROM Category WHERE id = ?', [categoryId])
      
      return { success: true, category }
    } catch (error: any) {
      console.error('Error creating category:', error)
      
      if (error.message?.includes('UNIQUE constraint failed')) {
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
      const sets: string[] = []
      const params: any[] = []

      if (categoryData.name !== undefined) {
        sets.push('name = ?')
        params.push(categoryData.name)
      }
      if (categoryData.description !== undefined) {
        sets.push('description = ?')
        params.push(categoryData.description)
      }
      if (categoryData.icon !== undefined) {
        sets.push('icon = ?')
        params.push(categoryData.icon)
      }
      if (categoryData.color !== undefined) {
        sets.push('color = ?')
        params.push(categoryData.color)
      }

      sets.push('updatedAt = ?')
      params.push(new Date().toISOString())
      params.push(id)

      if (sets.length > 0) {
        db.execute(`UPDATE Category SET ${sets.join(', ')} WHERE id = ?`, params)
      }

      const category = db.queryOne('SELECT * FROM Category WHERE id = ?', [id])
      
      if (!category) {
        return { success: false, message: 'Category not found' }
      }

      return { success: true, category }
    } catch (error: any) {
      console.error('Error updating category:', error)
      
      if (error.message?.includes('UNIQUE constraint failed')) {
        return { success: false, message: 'A category with this name already exists' }
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
      // Check if category exists and has products
      const category = db.queryOne('SELECT * FROM Category WHERE id = ?', [id])
      
      if (!category) {
        return { success: false, message: 'Category not found' }
      }

      const productCount = db.count('Product', 'categoryId = ?', [id])

      if (productCount > 0) {
        return { 
          success: false, 
          message: `Cannot delete category with ${productCount} products. Please reassign or delete the products first.` 
        }
      }

      db.execute('DELETE FROM Category WHERE id = ?', [id])

      return { success: true, message: 'Category deleted successfully' }
    } catch (error: any) {
      console.error('Error deleting category:', error)
      return { success: false, message: error.message }
    }
  })
}
