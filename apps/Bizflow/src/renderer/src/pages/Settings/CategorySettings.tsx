/**
 * Category Settings Component
 * Manage product categories for the application
 * Now connected to database via IPC
 */

import { useState, useEffect } from 'react'
import { Plus, X, Edit2, Check, Tag, Loader2, AlertCircle } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import logger from '../../../../shared/utils/logger'

interface Category {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
  productCount?: number
}

export default function CategorySettings() {
  const { t } = useLanguage()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [newCategory, setNewCategory] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Load categories from database
  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      setError(null)
      const ipc = (window as any).api
      const result = await ipc.categories.getAll()
      
      if (result.success) {
        setCategories(result.categories || [])
      } else {
        setError(result.message || t('failedToLoadCategories'))
      }
    } catch (err: any) {
      setError(err.message || t('failedToLoadCategories'))
      logger.error('Error loading categories:', err)
    } finally {
      setLoading(false)
    }
  }

  const showSuccess = (message: string) => {
    setSuccess(message)
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleAdd = async () => {
    if (!newCategory.trim()) return

    try {
      setError(null)
      const ipc = (window as any).api
      const result = await ipc.categories.create({
        name: newCategory.trim(),
        description: newDescription.trim() || undefined
      })

      if (result.success) {
        showSuccess(t('categoryAddedSuccess'))
        setNewCategory('')
        setNewDescription('')
        await loadCategories()
      } else {
        setError(result.message || t('failedToAddCategory'))
      }
    } catch (err: any) {
      setError(err.message || t('failedToAddCategory'))
      logger.error('Error adding category:', err)
    }
  }

  const handleDelete = async (id: string, name: string, productCount: number) => {
    if (productCount > 0) {
      setError(`${t('cannotDeleteCategory')} "${name}" - ${productCount} ${t('productsCount')}. ${t('reassignProductsFirst')}`)
      setTimeout(() => setError(null), 5000)
      return
    }

    if (!confirm(`⚠️ ${t('confirmDeleteCategory')} "${name}" ${t('category')}?\n\n${t('thisActionCannotBeUndone')}`)) return

    try {
      setError(null)
      const ipc = (window as any).api
      const result = await ipc.categories.delete(id)

      if (result.success) {
        showSuccess(`${t('categoryDeletedSuccess')} "${name}"`)
        await loadCategories()
      } else {
        setError(result.message || t('failedToDeleteCategory'))
      }
    } catch (err: any) {
      setError(err.message || t('failedToDeleteCategory'))
      logger.error('Error deleting category:', err)
    }
  }

  const handleEdit = (category: Category) => {
    setEditingId(category.id)
    setEditName(category.name)
    setEditDescription(category.description || '')
  }

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editingId) return

    try {
      setError(null)
      const ipc = (window as any).api
      const result = await ipc.categories.update({
        id: editingId,
        categoryData: {
          name: editName.trim(),
          description: editDescription.trim() || undefined
        }
      })

      if (result.success) {
        showSuccess(t('categoryUpdatedSuccess'))
        setEditingId(null)
        setEditName('')
        setEditDescription('')
        await loadCategories()
      } else {
        setError(result.message || t('failedToUpdateCategory'))
      }
    } catch (err: any) {
      setError(err.message || t('failedToUpdateCategory'))
      logger.error('Error updating category:', err)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditDescription('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-slate-600 dark:text-slate-400">{t('loadingCategories')}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
          {t('productCategories')}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t('productCategoriesDesc')}
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
          <div className="flex gap-3">
            <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <p className="text-sm text-emerald-700 dark:text-emerald-300">{success}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Add New Category */}
      <div className="glass-card p-6 space-y-4">
        <h4 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" />
          {t('addNewCategory')}
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('categoryName')} *
            </label>
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
              placeholder={t('categoryNamePlaceholder')}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('categoryDescription')}
            </label>
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
              placeholder={t('categoryDescPlaceholder')}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <button
          onClick={handleAdd}
          disabled={!newCategory.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('addCategory')}
        </button>
      </div>

      {/* Categories List */}
      <div className="glass-card p-6">
        <h4 className="font-medium text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Tag className="w-5 h-5 text-primary" />
          {t('categories')} ({categories.length})
        </h4>

        {categories.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{t('noCategoriesYet')}. {t('addFirstCategory')}.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {editingId === category.id ? (
                  // Edit Mode
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 mr-4">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      placeholder="Category name"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      placeholder={t('categoryDescription')}
                    />
                  </div>
                ) : (
                  // View Mode
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-semibold text-slate-900 dark:text-white">
                        {category.name}
                      </h5>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                        {category.productCount || 0} {t('productsCount')}
                      </span>
                    </div>
                    {category.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {category.description}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {editingId === category.id ? (
                    <>
                      <button
                        onClick={handleSaveEdit}
                        className="p-2 text-emerald-600 hover:bg-emerald-500/10 rounded-lg transition-colors"
                        title={t('save')}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-2 text-slate-600 hover:bg-slate-500/10 rounded-lg transition-colors"
                        title={t('cancel')}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEdit(category)}
                        className="p-2 text-blue-600 hover:bg-blue-500/10 rounded-lg transition-colors"
                        title={t('edit')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id, category.name, category.productCount || 0)}
                        className="p-2 text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
                        title={t('delete')}
                        disabled={(category.productCount || 0) > 0}
                      >
                        <X className={`w-4 h-4 ${(category.productCount || 0) > 0 ? 'opacity-50' : ''}`} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-3">
          <Tag className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-200 mb-1">
              About Categories
            </p>
            <p className="text-blue-700 dark:text-blue-300">
              Categories are stored in the database and available throughout the app. 
              They appear in dropdowns when adding/editing products, in filter menus, and in reports.
              Categories with products cannot be deleted until the products are reassigned.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
