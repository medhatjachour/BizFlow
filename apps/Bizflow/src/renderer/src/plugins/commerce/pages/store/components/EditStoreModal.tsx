import React from 'react'
import { X, Store, MapPin, Phone, Clock, User, ShieldCheck } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { StoreFormData } from '../types'
import { STORE_HOURS_PRESETS } from '../constants'

interface EditStoreModalProps {
  isOpen: boolean
  isEditMode: boolean
  formData: StoreFormData
  onClose: () => void
  onSave: () => Promise<void>
  onFieldChange: <K extends keyof StoreFormData>(field: K, value: StoreFormData[K]) => void
}

export const EditStoreModal: React.FC<EditStoreModalProps> = ({
  isOpen,
  isEditMode,
  formData,
  onClose,
  onSave,
  onFieldChange
}) => {
  const { t } = useLanguage()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        role="dialog"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isEditMode ? (t('editStore') || 'Update Branch Information') : (t('addNewStore') || 'Add Store Location')}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Setup branch addresses, lead managers, and register operating hours.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 overflow-y-auto max-h-[75vh]">
          {/* Store Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('storeName') || 'Branch / Store Name'} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => onFieldChange('name', e.target.value)}
              placeholder="e.g., Downtown Flagship Store"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('storeLocation') || 'Address / Location'} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => onFieldChange('location', e.target.value)}
                placeholder="e.g., Building 12, Main Commercial Avenue, Cairo"
                className="w-full ps-8 pe-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Contact & Manager */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('phone') || 'Contact Phone / Landline'}
              </label>
              <div className="relative">
                <Phone className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  dir="ltr"
                  value={formData.phone}
                  onChange={(e) => onFieldChange('phone', e.target.value)}
                  placeholder="+20 (2) 2345-6789"
                  className="w-full ps-8 pe-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('manager') || 'Branch Supervisor'}
              </label>
              <div className="relative">
                <User className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={formData.manager}
                  onChange={(e) => onFieldChange('manager', e.target.value)}
                  placeholder="e.g., Mahmoud Hassan"
                  className="w-full ps-8 pe-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Operating Hours */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('hours') || 'Operating Schedule / Shift Times'}
            </label>
            <div className="relative mb-1.5">
              <Clock className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                dir="ltr"
                value={formData.hours}
                onChange={(e) => onFieldChange('hours', e.target.value)}
                placeholder="09:00 AM - 10:00 PM"
                className="w-full ps-8 pe-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {/* Quick preset pills */}
            <div className="flex flex-wrap gap-1">
              {STORE_HOURS_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onFieldChange('hours', preset)}
                  className="px-2 py-0.5 text-[10px] rounded-md font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50 transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('initialStatus') || 'Operational Status'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onFieldChange('status', 'active')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                  formData.status === 'active'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Active Branch</span>
              </button>
              <button
                type="button"
                onClick={() => onFieldChange('status', 'inactive')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                  formData.status === 'inactive'
                    ? 'bg-slate-200 dark:bg-slate-800 border-slate-400 text-slate-800 dark:text-slate-200'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Inactive / Closed</span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {t('cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold shadow-xs shadow-emerald-600/20 transition-all"
            >
              {isEditMode ? (t('saveChanges') || 'Update Branch') : (t('createStore') || 'Register Location')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}