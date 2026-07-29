import Modal from '@renderer/components/ui/Modal'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { StoreFormData } from '../types'

type EditStoreModalProps = {
  isOpen: boolean
  formData: StoreFormData
  onClose: () => void
  onSave: () => void
  onFieldChange: <K extends keyof StoreFormData>(field: K, value: StoreFormData[K]) => void
}

export function EditStoreModal({
  isOpen,
  formData,
  onClose,
  onSave,
  onFieldChange,
}: EditStoreModalProps) {
  const { t } = useLanguage()

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('editStore')}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('storeName')}
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => onFieldChange('name', e.target.value)}
            className="input-field w-full"
            placeholder={t('enterStoreName')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('storeLocation')}
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => onFieldChange('location', e.target.value)}
            className="input-field w-full"
            placeholder={t('enterAddress')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('phone')}
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => onFieldChange('phone', e.target.value)}
            className="input-field w-full"
            placeholder="(555) 123-4567"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('hours')}
          </label>
          <input
            type="text"
            value={formData.hours}
            onChange={(e) => onFieldChange('hours', e.target.value)}
            className="input-field w-full"
            placeholder="9 AM - 9 PM"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('manager')}
          </label>
          <input
            type="text"
            value={formData.manager}
            onChange={(e) => onFieldChange('manager', e.target.value)}
            className="input-field w-full"
            placeholder={t('managerName')}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button onClick={onSave} className="btn-primary flex-1">
            {t('save')}
          </button>
          <button onClick={onClose} className="btn-secondary flex-1">
            {t('cancel')}
          </button>
        </div>
      </div>
    </Modal>
  )
}