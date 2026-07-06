import { useState, useEffect } from 'react'
import { Loader2, AlertTriangle, FileText, XCircle } from 'lucide-react'
import type { CheckResult } from '../../patientProfile.types'

export default function PdfViewerModal({ result, onClose }: { result: CheckResult; onClose: () => void }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let url: string | null = null
    window.api.clinic.checkResults.getBuffer(result.filePath)
      .then((base64) => {
        if (!base64) { setError(true); setLoading(false); return }
        const binary = atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const blob = new Blob([bytes], { type: 'application/pdf' })
        url = URL.createObjectURL(blob)
        setBlobUrl(url)
        setLoading(false)
      })
      .catch(() => { setError(true); setLoading(false) })
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [result.filePath])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
            <FileText className="h-4 w-4 text-red-500 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">{result.title}</h2>
            <p className="text-xs text-slate-400">{result.fileName}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <XCircle className="h-4 w-4" /> Close
        </button>
      </div>
      {/* PDF content */}
      <div className="flex-1 overflow-hidden bg-slate-700">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-10 w-10 animate-spin text-teal-400" />
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <AlertTriangle className="h-12 w-12 text-amber-400" />
            <p className="text-white font-medium">Could not load PDF</p>
            <p className="text-slate-400 text-sm">The file may have been moved or deleted.</p>
          </div>
        )}
        {blobUrl && !error && (
          <iframe src={blobUrl} className="w-full h-full border-none" title={result.title} />
        )}
      </div>
    </div>
  )
}
