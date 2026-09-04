/**
 * Category Settings Component
 * Enterprise-grade category management with search, inline editing, and modal confirmations
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Tag,
  Loader2,
  AlertCircle,
  Search,
  CheckCircle2,
  Info,
  Layers
} from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import logger from '../../../../shared/utils/logger'

interface Category {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
  productCount?: number
  createdAt?: string
}


export default function CategorySettings() {
  const { t } = useLanguage()

  // State Management
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Create form state
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')

  // Delete modal state
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)

  // Notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showFeedback = useCallback((type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
  }, [])

  // Auto-dismiss notification after 4s with cleanup
  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(timer)
  }, [feedback])

  // Fetch categories from Electron DB
  const loadCategories = useCallback(async () => {
    try {
      setIsLoading(true)
      const api = window.api?.categories
      if (!api) {
        throw new Error('Categories API bridge is not available')
      }

      const result = await api.getAll()
      if (result.success) {
        setCategories(result.categories || [])
      } else {
        showFeedback('error', result.message || t('failedToLoadCategories'))
      }
    } catch (err: any) {
      logger.error('Error loading categories:', err)
      showFeedback('error', err?.message || t('failedToLoadCategories'))
    } finally {
      setIsLoading(false)
    }
  }, [t, showFeedback])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  // Filtered categories
  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return categories
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.description && c.description.toLowerCase().includes(query))
    )
  }, [categories, searchQuery])

  // Handle Add Category
  const handleAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmedName = formName.trim()
    if (!trimmedName || isSubmitting) return

    try {
      setIsSubmitting(true)
      const api = window.api?.categories
      if (!api) throw new Error('API not available')

      const result = await api.create({
        name: trimmedName,
        description: formDesc.trim() || undefined
      })

      if (result.success) {
        showFeedback('success', t('categoryAddedSuccess'))
        setFormName('')
        setFormDesc('')
        await loadCategories()
      } else {
        showFeedback('error', result.message || t('failedToAddCategory'))
      }
    } catch (err: any) {
      logger.error('Error adding category:', err)
      showFeedback('error', err?.message || t('failedToAddCategory'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Inline Edit Start
  const startEdit = (category: Category) => {
    setEditingId(category.id)
    setEditName(category.name)
    setEditDesc(category.description || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditDesc('')
  }

  // Handle Inline Edit Save
  const handleSaveEdit = async () => {
    const trimmedName = editName.trim()
    if (!trimmedName || !editingId || isSubmitting) return

    try {
      setIsSubmitting(true)
      const api = window.api?.categories
      if (!api) throw new Error('API not available')

      const result = await api.update({
        id: editingId,
        categoryData: {
          name: trimmedName,
          description: editDesc.trim() || undefined
        }
      })

      if (result.success) {
        showFeedback('success', t('categoryUpdatedSuccess'))
        cancelEdit()
        await loadCategories()
      } else {
        showFeedback('error', result.message || t('failedToUpdateCategory'))
      }
    } catch (err: any) {
      logger.error('Error updating category:', err)
      showFeedback('error', err?.message || t('failedToUpdateCategory'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Delete Confirmation
  const confirmDelete = async () => {
    if (!deletingCategory || isSubmitting) return

    if ((deletingCategory.productCount || 0) > 0) {
      showFeedback(
        'error',
        `${t('cannotDeleteCategory')} "${deletingCategory.name}" - ${deletingCategory.productCount} ${t('productsCount')}. ${t('reassignProductsFirst')}`
      )
      setDeletingCategory(null)
      return
    }

    try {
      setIsSubmitting(true)
      const api = window.api?.categories
      if (!api) throw new Error('API not available')

      const result = await api.delete(deletingCategory.id)
      if (result.success) {
        showFeedback('success', `${t('categoryDeletedSuccess')} "${deletingCategory.name}"`)
        setDeletingCategory(null)
        await loadCategories()
      } else {
        showFeedback('error', result.message || t('failedToDeleteCategory'))
      }
    } catch (err: any) {
      logger.error('Error deleting category:', err)
      showFeedback('error', err?.message || t('failedToDeleteCategory'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-primary" />
            {t('productCategories')}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('productCategoriesDesc')}
          </p>
        </div>
      </div>

      {/* Feedback Alert Toast */}
      {feedback && (
        <div
          role="alert"
          className={`flex items-start gap-3 p-4 rounded-xl border transition-all animate-in fade-in slide-in-from-top-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          )}
          <p className="text-sm font-medium flex-1">{feedback.message}</p>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add New Category Panel */}
      <form
        onSubmit={handleAdd}
        className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 space-y-4"
      >
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" />
          {t('addNewCategory')}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('categoryName')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder={t('categoryNamePlaceholder')}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('categoryDescription')}
            </label>
            <input
              type="text"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder={t('categoryDescPlaceholder')}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={!formName.trim() || isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {t('addCategory')}
          </button>
        </div>
      </form>

      {/* Categories List Section */}
      <div className="space-y-4">
        {/* Search and Counts Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <Tag className="w-4 h-4 text-primary" />
            <span>{t('categories')}</span>
            <span className="px-2 py-0.5 text-xs rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {categories.length}
            </span>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`${t('search')}…`}
              className="w-full ps-9 pe-4 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Category Rows */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm">{t('loadingCategories')}…</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-8">
            <Tag className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">
              {searchQuery ? t('noResultsFound') : t('noCategoriesYet')}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {searchQuery ? t('tryDifferentSearch') : t('addFirstCategory')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {filteredCategories.map((category) => {
              const isEditing = editingId === category.id
              const hasProducts = (category.productCount || 0) > 0

              return (
                <div
                  key={category.id}
                  className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-4 rounded-xl border transition-all ${
                    isEditing
                      ? 'border-primary/50 bg-primary/[0.02] shadow-sm'
                      : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {isEditing ? (
                    /* Inline Edit Mode */
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 me-0 sm:me-4 mb-3 sm:mb-0">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit()
                          if (e.key === 'Escape') cancelEdit()
                        }}
                        autoFocus
                        placeholder={t('categoryName')}
                        className="px-3 py-1.5 text-sm rounded-lg border border-primary dark:border-primary bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none"
                      />
                      <input
                        type="text"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit()
                          if (e.key === 'Escape') cancelEdit()
                        }}
                        placeholder={t('categoryDescription')}
                        className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  ) : (
                    /* View Mode */
                    <div className="flex-1 min-w-0 me-4">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-semibold text-slate-900 dark:text-white text-sm">
                          {category.name}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {category.productCount || 0} {t('productsCount')}
                        </span>
                      </div>
                      {category.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                          {category.description}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 self-end sm:self-center">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          disabled={!editName.trim() || isSubmitting}
                          aria-label={t('save')}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          aria-label={t('cancel')}
                          className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(category)}
                          aria-label={t('edit')}
                          className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCategory(category)}
                          aria-label={t('delete')}
                          className={`p-2 rounded-lg transition-colors ${
                            hasProducts
                              ? 'text-slate-300 dark:text-slate-600 hover:bg-transparent cursor-not-allowed'
                              : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                          }`}
                          title={hasProducts ? t('reassignProductsFirst') : t('delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/80">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed space-y-1">
          <p className="font-semibold text-blue-900 dark:text-blue-200">
            {t('aboutCategories') || 'About Categories'}
          </p>
          <p>
            {t('aboutCategoriesDesc') ||
              'Categories are synced directly with your database and automatically available in POS filters, product management, and reporting. Categories associated with active products cannot be removed until their products are reassigned.'}
          </p>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t('confirmDeleteCategory')}
              </h3>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t('confirmDeleteCategoryDesc') || 'Are you sure you want to delete the category'}{' '}
              <strong className="text-slate-900 dark:text-white font-semibold">
                "{deletingCategory.name}"
              </strong>
              ? {t('thisActionCannotBeUndone')}.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}