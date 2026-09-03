import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { CustomerFormData } from '../types'

interface Props {
  formData: CustomerFormData
  onChange: (data: CustomerFormData) => void
  /** If true, footer buttons are Add/Cancel; otherwise Save/Cancel */
  mode: 'add' | 'edit'
  onSubmit: () => void
  onCancel: () => void
}

export function CustomerForm({ formData, onChange, mode, onSubmit, onCancel }: Props) {
  const { t } = useLanguage()

  const set = (key: keyof CustomerFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => onChange({ ...formData, [key]: e.target.value })

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {t('fullName')} *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={set('name')}
          className="input-field"
          placeholder={t('name')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('email')} <span className="text-slate-400 text-xs">({t('emailOptional')})</span>
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={set('email')}
            className="input-field"
            placeholder={t('email')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('phone')} *
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={set('phone')}
            className="input-field"
            placeholder={t('phone')}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {t('loyaltyTier')}
        </label>
        <select
          value={formData.loyaltyTier}
          onChange={set('loyaltyTier')}
          className="input-field"
        >
          <option value="Bronze">🥉 Bronze</option>
          <option value="Silver">⭐ Silver</option>
          <option value="Gold">👑 Gold</option>
          <option value="Platinum">💎 Platinum</option>
        </select>
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
          {mode === 'add' ? t('loyaltyTierUpgrade') : t('totalSpentAutoCalculated')}
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={onCancel}
          className="px-6 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
        >
          {t('cancel')}
        </button>
        <button onClick={onSubmit} className="btn-primary">
          {mode === 'add' ? t('add') : t('save')}
        </button>
      </div>
    </div>
  )
}
