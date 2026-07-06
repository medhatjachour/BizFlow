import { FileText, Plus, Trash2, ExternalLink } from 'lucide-react'
import type { EmployeeDocument } from '../types'
import { useLanguage } from '../../../contexts/LanguageContext'

interface Props {
  documents: EmployeeDocument[]
  onAdd: () => void
  onOpen: (id: string) => void
  onDelete: (id: string) => void
  disabled?: boolean
}

export default function DocumentsTab({ documents, onAdd, onOpen, onDelete, disabled }: Props) {
  const { t } = useLanguage()
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white">{t('tabDocuments')}</h3>
        {!disabled && (
          <button onClick={onAdd} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 transition-colors">
            <Plus size={14} /> {t('empUploadDocument') ?? 'Upload document'}
          </button>
        )}
      </div>
      {documents.length === 0 ? (
        <p className="text-slate-500 text-center py-12">{t('empNoDocumentsYet')}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {documents.map(doc => (
            <div key={doc.id} className="group flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 hover:border-primary/40 transition-colors">
              <button
                onClick={() => onOpen(doc.id)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
                title={t('empOpenDocument') ?? 'Open document'}
              >
                <FileText size={24} className="text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                    {doc.title}
                    <ExternalLink size={12} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </p>
                  <p className="text-xs text-slate-500 capitalize">{doc.type.replace(/_/g, ' ')} · {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                </div>
              </button>
              {!disabled && (
                <button
                  onClick={() => onDelete(doc.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                  title={t('delete') ?? 'Delete'}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
