import { FileText, Upload, Eye, Trash2, Loader2 } from 'lucide-react'
import { VetCheckResult } from '../hooks/useVetPatientProfile'
import { formatSessionDate } from '../../vet-sessions/utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  checkResults: VetCheckResult[]
  uploading: boolean
  onUpload: () => void
  onDelete: (id: string) => void
}

export function PatientCheckResults({ checkResults, uploading, onUpload, onDelete }: Props) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  return (
    <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileText size={16} className="text-violet-500" />
          {isAr ? 'نتائج التحاليل والأشعة والملفات' : 'Lab & Imaging Results'}
        </h3>

        <button
          type="button"
          onClick={onUpload}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 hover:bg-violet-100 rounded-xl transition-all disabled:opacity-50"
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          <span>{isAr ? 'رفع ملف' : 'Upload File'}</span>
        </button>
      </div>

      {checkResults.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">
          {isAr ? 'لا توجد ملفات أو نتائج تحاليل مرفقة' : 'No documents or lab results attached'}
        </p>
      ) : (
        <div className="space-y-2">
          {checkResults.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700 text-xs"
            >
              <div className="min-w-0 flex-1 pr-3 rtl:pr-0 rtl:pl-3">
                <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{r.title}</p>
                <p className="text-[11px] text-slate-400">
                  {formatSessionDate(r.resultDate, language)} • {r.fileName}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => window.api.vet?.checkResults.openFile(r.id)}
                  className="p-1.5 text-violet-600 dark:text-violet-400 hover:bg-violet-50 rounded-lg"
                  title="Open"
                >
                  <Eye size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(r.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}