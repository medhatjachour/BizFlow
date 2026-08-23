import React, { useState, useEffect } from 'react'
import { X, CheckCircle2 } from 'lucide-react'
import { LocationItem, LocationFormData, LocationType } from '../types'
import { LOCATION_TYPES } from '../constants'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  isOpen: boolean
  onClose: () => void
  editingLocation: LocationItem | null
  parentLocationCandidate: LocationItem | null
  locations: LocationItem[]
  onSave: (data: LocationFormData, editingId?: string) => Promise<boolean>
}

export const LocationFormModal: React.FC<Props> = ({
  isOpen,
  onClose,
  editingLocation,
  parentLocationCandidate,
  locations,
  onSave
}) => {
  const { t } = useLanguage()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<LocationFormData>({
    name: '',
    code: '',
    type: 'bin',
    parentId: '',
    notes: ''
  })

  useEffect(() => {
    if (editingLocation) {
      setForm({
        name: editingLocation.name,
        code: editingLocation.code,
        type: editingLocation.type,
        parentId: editingLocation.parentId || '',
        notes: editingLocation.notes || ''
      })
    } else {
      setForm({
        name: '',
        code: '',
        type: parentLocationCandidate ? 'bin' : 'zone',
        parentId: parentLocationCandidate ? parentLocationCandidate.id : '',
        notes: ''
      })
    }
  }, [editingLocation, parentLocationCandidate, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const success = await onSave(form, editingLocation?.id)
    setSubmitting(false)
    if (success) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {editingLocation
              ? t('warehouseEditLocation') || 'Edit Location'
              : t('warehouseNewLocation') || 'Add Location Node'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {t('warehouseLocationName') || 'Location Name'} *
          </label>
          <input
            required
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Zone A - Cold Storage, Bin #402"
            className="w-full rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('warehouseLocationCode') || 'Code / SKU'} *
            </label>
            <input
              required
              type="text"
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="e.g. ZN-A-01"
              className="w-full rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 font-mono uppercase text-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('warehouseLocationType') || 'Type'} *
            </label>
            <select
              required
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as LocationType }))}
              className="w-full rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 capitalize text-slate-800 dark:text-slate-100"
            >
              {LOCATION_TYPES.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {t('warehouseParentLocation') || 'Parent Node'}
          </label>
          <select
            value={form.parentId}
            onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}
            className="w-full rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-800 dark:text-slate-100"
          >
            <option value="">{t('warehouseNoParent') || '(Top Level Zone)'}</option>
            {locations
              .filter(l => l.id !== editingLocation?.id)
              .map(l => (
                <option key={l.id} value={l.id}>
                  [{l.type}] {l.name} ({l.code})
                </option>
              ))}
          </select>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t('warehouseCancel') || 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {submitting ? 'Saving...' : t('warehouseSave') || 'Save Location'}
          </button>
        </div>
      </form>
    </div>
  )
}