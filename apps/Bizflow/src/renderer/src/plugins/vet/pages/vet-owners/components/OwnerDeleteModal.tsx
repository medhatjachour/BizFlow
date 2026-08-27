import { AlertCircle, Loader2, Trash2, X } from 'lucide-react'
import { VetOwnerWithPets } from '../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  owner: VetOwnerWithPets | null
  isDeleting: boolean
  onConfirm: () => void
  onClose: () => void
}

export function OwnerDeleteModal({ owner, isDeleting, onConfirm, onClose }: Props) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  if (!owner) return null
  const petCount = owner._count?.patients ?? owner.patients.length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 w-full max-w-sm border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400">
              <AlertCircle size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                {isAr ? 'حذف سجل المالك' : 'Delete Pet Owner'}
              </h3>
              <p className="text-xs text-slate-400">{isAr ? 'إزالة نهائية مع الحيوانات' : 'Permanent registry removal'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
          {isAr ? (
            <>
              هل أنت متأكد من حذف المالك <strong>{owner.name}</strong>؟ سيؤدي ذلك أيضاً إلى إزالة{' '}
              <strong>{petCount} حيوان أليف</strong> مرتبط به.
            </>
          ) : (
            <>
              Are you sure you want to delete <strong>{owner.name}</strong>? This will also remove all{' '}
              <strong>{petCount} pet(s)</strong> registered under this owner.
            </>
          )}
        </p>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 transition-colors"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 active:scale-95"
          >
            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            <span>{isDeleting ? (isAr ? 'جاري الحذف...' : 'Deleting…') : (isAr ? 'تأكيد الحذف' : 'Delete')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}