import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { RestaurantTableData, TableFormData } from '../../types'
import { SHAPE_OPTIONS, DEFAULT_SECTIONS } from '../../constants'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: (data: TableFormData, editingId?: string) => Promise<boolean>
  editingTable: RestaurantTableData | null
  existingSections: string[]
}

export const TableFormModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  editingTable,
  existingSections
}) => {
  const { t } = useLanguage()
  const [form, setForm] = useState<TableFormData>({
    number: '',
    name: '',
    capacity: '4',
    section: 'Main Hall',
    shape: 'square',
    status: 'available'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (editingTable) {
      setForm({
        number: String(editingTable.number),
        name: editingTable.name || '',
        capacity: String(editingTable.capacity),
        section: editingTable.section || 'Main Hall',
        shape: editingTable.shape || 'square',
        status: editingTable.status
      })
    } else {
      setForm({
        number: '',
        name: '',
        capacity: '4',
        section: existingSections[0] || 'Main Hall',
        shape: 'square',
        status: 'available'
      })
    }
  }, [editingTable, isOpen])

  if (!isOpen) return null

  const allSections = Array.from(new Set([...DEFAULT_SECTIONS, ...existingSections]))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const ok = await onSave(form, editingTable?.id)
    setIsSubmitting(false)
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-200 dark:border-slate-700"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
            {editingTable ? t('restTableModalEditTitle') : t('restTableModalAddTitle')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('restTableDrawerClose')}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('restTableFieldNumber')}
            </span>
            <input
              type="number"
              required
              min="1"
              value={form.number}
              onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
              placeholder={t('restTableFieldNumberPlaceholder')}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('restTableFieldCapacity')}
            </span>
            <input
              type="number"
              required
              min="1"
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {t('restTableFieldLabel')}
          </span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={t('restTableFieldLabelPlaceholder')}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {t('restTableFieldSection')}
          </span>
          <input
            type="text"
            list="section-options"
            required
            value={form.section}
            onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
            placeholder={t('restTableFieldSectionPlaceholder')}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
          <datalist id="section-options">
            {allSections.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>

        {/* Shape Picker */}
        <div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
            {t('restTableFieldShape')}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {SHAPE_OPTIONS.map((shp) => (
              <button
                type="button"
                key={shp.value}
                onClick={() => setForm((f) => ({ ...f, shape: shp.value }))}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  form.shape === shp.value
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-bold'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30 text-slate-600 dark:text-slate-300'
                }`}
              >
                {t(shp.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold shadow-md shadow-orange-500/20 disabled:opacity-60"
          >
            {isSubmitting ? t('restTableSaving') : t('restTableSave')}
          </button>
        </div>
      </form>
    </div>
  )
}
