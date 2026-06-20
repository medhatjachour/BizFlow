/**
 * AddStoreDialog
 *
 * Reusable dialog for creating a new store.
 * Used from both the Stores management page and the Product form.
 */
import { useState } from 'react'
import Modal from './ui/Modal'
import { ipc } from '../utils/ipc'
import { useLanguage } from '../contexts/LanguageContext'
import logger from '../../../shared/utils/logger'

export interface NewStore {
  id: string
  name: string
  location: string
  phone: string
  hours: string
  manager: string
  status: string
}

interface AddStoreDialogProps {
  isOpen: boolean
  onClose: () => void
  /** Called with the newly created store so the parent can refresh/select it */
  onCreated: (store: NewStore) => void
}

const EMPTY: Omit<NewStore, 'id'> = {
  name: '',
  location: '',
  phone: '',
  hours: '',
  manager: '',
  status: 'active'
}

export default function AddStoreDialog({ isOpen, onClose, onCreated }: Readonly<AddStoreDialogProps>) {
  const { t } = useLanguage()
  const [formData, setFormData] = useState({ ...EMPTY })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (field: keyof typeof EMPTY, value: string) =>
    setFormData((f) => ({ ...f, [field]: value }))

  const reset = () => {
    setFormData({ ...EMPTY })
    setError(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError(t('storeNameRequired') || 'Store name is required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const result = await ipc.stores.create(formData)

      if (result.success) {
        onCreated(result.store as NewStore)
        reset()
        onClose()
      } else {
        setError(result.message || 'Failed to add store')
      }
    } catch (err: any) {
      logger.error('Failed to create store from product form:', err)
      setError(err.message || 'Failed to add store')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('addNewStore')} size="sm">
      <div className="space-y-4">
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg">
            {error}
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('storeName')} *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => update('name', e.target.value)}
            className="input-field w-full"
            placeholder={t('enterStoreName')}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('storeLocation')}
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => update('location', e.target.value)}
            className="input-field w-full"
            placeholder={t('enterAddress')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('phone')}
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => update('phone', e.target.value)}
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
              onChange={(e) => update('hours', e.target.value)}
              className="input-field w-full"
              placeholder="9 AM – 9 PM"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('manager')}
          </label>
          <input
            type="text"
            value={formData.manager}
            onChange={(e) => update('manager', e.target.value)}
            className="input-field w-full"
            placeholder={t('managerName')}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={handleClose} className="btn-secondary flex-1" disabled={loading}>
            {t('cancel')}
          </button>
          <button
            onClick={handleSubmit}
            className="btn-primary flex-1"
            disabled={loading || !formData.name.trim()}
          >
            {loading ? t('adding') || 'Adding…' : t('addStore') || t('add')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
