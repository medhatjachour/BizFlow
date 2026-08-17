import React from 'react'
import { FileText, FilePlus, Eye, Trash2 } from 'lucide-react'
import { formatFileSize } from '../utils'
import type { CheckResult } from '../types'

interface Props {
  results: CheckResult[]
  onUpload: () => void
  onView: (result: CheckResult) => void
  onDelete: (id: string) => void
}

export const CheckResultsPanel: React.FC<Props> = ({ results, onUpload, onView, onDelete }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-rose-100 dark:border-rose-900/30 shadow-sm overflow-hidden animate-in fade-in-50 duration-200">
      <div className="flex items-center justify-between px-5 py-3 border-b border-rose-100/60 dark:border-rose-900/20 bg-rose-50/50 dark:bg-rose-950/10">
        <div className="flex items-center gap-2.5">
          <FileText className="h-4 w-4 text-rose-500" />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Check Results & Reports</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-semibold">
            {results.length}
          </span>
        </div>
        <button
          onClick={onUpload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition-all"
        >
          <FilePlus className="h-3.5 w-3.5" /> Upload PDF
        </button>
      </div>

      {results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <FileText className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-400">No check results uploaded yet</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
          {results.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3.5 px-5 py-3 hover:bg-slate-50/70 dark:hover:bg-slate-700/20 transition-colors"
            >
              <div className="h-9 w-9 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 flex items-center justify-center flex-shrink-0 text-rose-500">
                <FileText className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{r.title}</p>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <span>{new Date(r.resultDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  {r.fileSize && <span>• {formatFileSize(r.fileSize)}</span>}
                </p>
                {r.description && <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{r.description}</p>}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => onView(r)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200/80 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs font-semibold hover:bg-rose-100 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" /> View
                </button>
                <button
                  onClick={() => onDelete(r.id)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  title="Delete Result"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}