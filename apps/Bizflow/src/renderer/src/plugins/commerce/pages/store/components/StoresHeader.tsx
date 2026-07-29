import { Plus } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

type StoresHeaderProps = {
  onAddStore: () => void
}

export function StoresHeader({ onAddStore }: StoresHeaderProps) {
  const { t } = useLanguage()

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          {t('storeManagement')}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          {t('storeManagementDesc')}
        </p>
      </div>
      <button onClick={onAddStore} className="btn-primary flex items-center gap-2">
        <Plus size={20} />
        {t('addNewStore')}
      </button>
    </div>
  )
}