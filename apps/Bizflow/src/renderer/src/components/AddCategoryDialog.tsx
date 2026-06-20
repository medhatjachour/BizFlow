import { useState } from 'react'
import Modal from './ui/Modal'
import { useLanguage } from '../contexts/LanguageContext'
import logger from '../../../shared/utils/logger'

export interface NewCategory {
  id: string
  name: string
  description?: string | null
}

interface AddCategoryDialogProps {
  isOpen: boolean
  onClose: () => void
  /** Called with the newly created category so the parent can refresh/select it */
  onCreated: (category: NewCategory) => void
}

export default function AddCategoryDialog({ isOpen, onClose, onCreated }: Readonly<AddCategoryDialogProps>) {
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setName('')
    setDescription('')
    setError(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError(t('categoryNameRequired') || 'Category name is required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const result = await window.electron.ipcRenderer.invoke('categories:create', {
        name: name.trim(),
        description: description.trim() || undefined
      })

      if (result.success) {
        onCreated(result.category)
        reset()
        onClose()
      } else {
        setError(result.message || 'Failed to add category')
      }
    } catch (err: any) {
      logger.error('Failed to create category from product form:', err)
      setError(err.message || 'Failed to add category')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('addNewCategory')} size="sm">
      <div className="space-y-4">
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg">
            {error}
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('categoryName')} *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="input-field w-full"
            placeholder={t('enterCategoryName') || 'e.g. Electronics'}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('description')} <span className="text-slate-400 font-normal">({t('optional') || 'optional'})</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field w-full"
            placeholder={t('categoryDescription') || 'Short description'}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={handleClose} className="btn-secondary flex-1" disabled={loading}>
            {t('cancel')}
          </button>
          <button
            onClick={handleSubmit}
            className="btn-primary flex-1"
            disabled={loading || !name.trim()}
          >
            {loading ? t('adding') || 'Adding…' : t('addCategory') || t('add')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
