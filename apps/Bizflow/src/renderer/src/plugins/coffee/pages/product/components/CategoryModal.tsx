import { useState, useEffect } from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { PRESET_COLORS, CAFE_ICONS, EMPTY_CATEGORY_FORM } from '../constants'
import { hexToRgba } from '../utils'
import type { CategoryForm, CategorySubmitData } from '../types'

interface CategoryModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CategorySubmitData) => void
  initial?: CategoryForm
  editMode?: boolean
  saving?: boolean
}

export default function CategoryModal({
  open,
  onClose,
  onSubmit,
  initial = EMPTY_CATEGORY_FORM,
  editMode = false,
  saving = false
}: CategoryModalProps) {
  const { t } = useLanguage()
  const [form, setForm] = useState<CategoryForm>(initial)
  const [showCustomColor, setShowCustomColor] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(initial)
      setShowCustomColor(false)
    }
  }, [open, initial])

  if (!open) return null

  const update = (patch: Partial<CategoryForm>) =>
    setForm((p) => ({ ...p, ...patch }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onSubmit({
      name: form.name,
      color: form.color,
      icon: form.icon,
      description: form.description
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {editMode ? t('cfEditCategory') || 'Edit Category' : t('cfAddCategory') || 'Add Category'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 space-y-4 overflow-y-auto">
            {/* ---------- Live preview ---------- */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: hexToRgba(form.color, 0.2), color: form.color }}
              >
                {form.icon || '🍰'}
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-slate-900 dark:text-white">
                  {form.name || 'Category name'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {t('cfPreview') || 'Preview'}
                </span>
              </div>
            </div>

            {/* ---------- Name ---------- */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('cfName') || 'Name'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="e.g. Cake, Espresso, Croissant…"
                autoFocus
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            {/* ---------- Description ---------- */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('cfDescription') || 'Description'}{' '}
                <span className="text-slate-400">({t('cfOptional') || 'optional'})</span>
              </label>
              <input
                type="text"
                value={form.description ?? ''}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="Short description…"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            {/* ---------- Color picker ---------- */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('cfColor') || 'Color'}
              </label>

              {/* Swatch grid */}
              <div className="grid grid-cols-8 gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => update({ color: c })}
                    className="relative w-9 h-9 rounded-lg transition-transform hover:scale-110"
                    style={{ backgroundColor: c }}
                    title={c}
                  >
                    {form.color.toLowerCase() === c.toLowerCase() && (
                      <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold drop-shadow-md">
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Custom color toggle */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomColor((s) => !s)}
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
                >
                  {showCustomColor ? t('cfHideCustomPicker') || 'Hide custom picker' : t('cfPickCustomColor') || 'Pick a custom color…'}
                </button>

                {showCustomColor && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) => update({ color: e.target.value })}
                      className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0"
                    />
                    <input
                      type="text"
                      value={form.color}
                      onChange={(e) => update({ color: e.target.value })}
                      className="w-24 px-2 py-1 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ---------- Icon picker ---------- */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('cfIcon') || 'Icon'}
              </label>

              <div className="text-xs text-slate-500 mb-2">
                {t('cfSelected') || 'Selected'}: {form.icon}
              </div>

              <div className="grid grid-cols-8 gap-2 max-h-40 overflow-y-auto p-1 border border-slate-200 dark:border-slate-700 rounded-lg">
                {CAFE_ICONS.map((ic) => (
                  <button
                    type="button"
                    key={ic}
                    onClick={() => update({ icon: ic })}
                    className={
                      'flex items-center justify-center w-9 h-9 rounded-lg text-xl transition ' +
                      (form.icon === ic
                        ? 'ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-500/10'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800')
                    }
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ---------- Footer ---------- */}
          <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {t('cfCancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? t('cfSaving') || 'Saving…' : editMode ? t('cfUpdate') || 'Update' : t('cfSave') || 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
