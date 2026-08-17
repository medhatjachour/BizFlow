import React, { useState } from 'react'
import { Tag, X, Loader2, Save, Pencil, Trash2, Plus } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useCategories } from '../hooks/useCategories'
import { CATEGORY_COLOR_OPTIONS } from '../constants'
import { categoryBadgeCls } from '../utils'

interface Props {
  onClose: () => void
}

export const CategoryManagementModal: React.FC<Props> = ({ onClose }) => {
  const { t } = useLanguage()
  const { categories, loading, saving, createCategory, updateCategory, deleteCategory } = useCategories()

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('teal')
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('teal')

  const inputCls =
    'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500'

  const handleAdd = async () => {
    if (!newName.trim()) return
    await createCategory(newName, newColor)
    setNewName('')
    setNewColor('teal')
    setAdding(false)
  }

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return
    await updateCategory(id, editName, editColor)
    setEditingId(null)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-50 duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 flex items-center justify-center">
              <Tag className="h-4 w-4" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              {t('manageCategories') || 'Manage Material Categories'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-4 max-h-[55vh] overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
            </div>
          ) : categories.length === 0 && !adding ? (
            <p className="text-center text-xs text-slate-400 py-6 font-semibold">
              {t('noCategories') || 'No custom categories created yet.'}
            </p>
          ) : (
            categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
              >
                {editingId === cat.id ? (
                  <>
                    <input
                      className={`${inputCls} flex-1`}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdate(cat.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                    />
                    <select
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs px-2 py-1.5 focus:outline-none"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                    >
                      {CATEGORY_COLOR_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleUpdate(cat.id)}
                      disabled={saving}
                      className="p-1.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700"
                    >
                      <Save className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-200"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${categoryBadgeCls(
                        cat.color
                      )}`}
                    >
                      {cat.name}
                    </span>
                    <span className="flex-1" />
                    <button
                      onClick={() => {
                        setEditingId(cat.id)
                        setEditName(cat.name)
                        setEditColor(cat.color)
                      }}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))
          )}

          {adding && (
            <div className="flex items-center gap-2 p-2.5 rounded-2xl border-2 border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20">
              <input
                className={`${inputCls} flex-1`}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('categoryName') || 'Category name...'}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd()
                  if (e.key === 'Escape') {
                    setAdding(false)
                    setNewName('')
                  }
                }}
              />
              <select
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs px-2 py-1.5 focus:outline-none"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
              >
                {CATEGORY_COLOR_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAdd}
                disabled={saving || !newName.trim()}
                className="p-1.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => {
                  setAdding(false)
                  setNewName('')
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
          <button
            onClick={() => {
              setAdding(true)
              setNewName('')
              setNewColor('teal')
            }}
            disabled={adding}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>{t('addCategory') || 'Add Category'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}