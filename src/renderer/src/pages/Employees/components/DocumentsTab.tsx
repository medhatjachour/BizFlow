import { FileText } from 'lucide-react'
import type { EmployeeDocument } from '../types'

interface Props {
  documents: EmployeeDocument[]
}

export default function DocumentsTab({ documents }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-slate-900 dark:text-white">Documents</h3>
      {documents.length === 0 ? (
        <p className="text-slate-500 text-center py-12">No documents uploaded yet</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
              <FileText size={24} className="text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 dark:text-white truncate">{doc.title}</p>
                <p className="text-xs text-slate-500 capitalize">{doc.type.replace(/_/g, ' ')} · {new Date(doc.uploadedAt).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
