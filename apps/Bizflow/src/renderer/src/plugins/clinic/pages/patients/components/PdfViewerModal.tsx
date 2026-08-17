import { useState, useEffect } from 'react'
import { Loader2, AlertTriangle, FileText, X, Download } from 'lucide-react'
import { CheckResult } from '../types'

export default function PdfViewerModal({ result, onClose }: { result: CheckResult; onClose: () => void }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let url: string | null = null
    window.api.clinic.checkResults.getBuffer(result.filePath)
      .then((base64: string | null) => {
        if (!base64) {
          setError(true)
          setLoading(false)
          return
        }
        const binary = atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const blob = new Blob([bytes], { type: 'application/pdf' })
        url = URL.createObjectURL(blob)
        setBlobUrl(url)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })

    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [result.filePath])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm animate-in fade-in duration-150">
      {/* Top action toolbar */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 border-b border-slate-800 flex-shrink-0 text-white">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold truncate max-w-md">{result.title}</h2>
            <p className="text-xs text-slate-400">{result.fileName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {blobUrl && (
            <a
              href={blobUrl}
              download={result.fileName || 'document.pdf'}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl transition-colors text-slate-200"
            >
              <Download className="h-3.5 w-3.5" /> Download
            </a>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* PDF View Container */}
      <div className="flex-1 overflow-hidden relative bg-slate-950 flex items-center justify-center">
        {loading && (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
            <p className="text-xs font-medium">Loading PDF document...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center text-center p-6 max-w-sm">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <p className="text-white font-semibold text-base">Unable to display PDF</p>
            <p className="text-slate-400 text-xs mt-1">The file may have been relocated, renamed, or deleted from storage.</p>
          </div>
        )}

        {blobUrl && !error && (
          <iframe
            src={blobUrl}
            className="w-full h-full border-none"
            title={result.title}
          />
        )}
      </div>
    </div>
  )
}