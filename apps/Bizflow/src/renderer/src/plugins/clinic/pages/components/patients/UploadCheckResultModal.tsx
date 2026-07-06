import { useState } from 'react'
import { Loader2, XCircle, Upload, FilePlus } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'

export default function UploadCheckResultModal({
  patientId,
  onClose,
  onSaved
}: {
  patientId: string
  onClose: () => void
  onSaved: () => void
}) {
  const { showToast } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [resultDate, setResultDate] = useState(new Date().toISOString().slice(0, 10))
  const [uploading, setUploading] = useState(false)

  const handleUpload = async () => {
    if (!title.trim()) { showToast('error', 'Please enter a title'); return }
    setUploading(true)
    try {
      const result = await window.api.clinic.checkResults.upload({
        patientId,
        title: title.trim(),
        description: description.trim() || undefined,
        resultDate
      })
      if (result) {
        showToast('success', 'Check result uploaded successfully')
        onSaved()
      }
      // If result is null the user cancelled the file dialog — just close
      onClose()
    } catch {
      showToast('error', 'Failed to upload check result')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
              <FilePlus className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Upload Check Result</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Blood Test, X-Ray, MRI Scan"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Result Date</label>
            <input
              type="date"
              value={resultDate}
              onChange={(e) => setResultDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Notes (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Any notes about this result..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] resize-none"
            />
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2">
            <Upload className="h-3.5 w-3.5 flex-shrink-0" />
            After clicking Upload, a file picker will open — select a PDF file.
          </p>
        </div>

        <div className="flex items-center gap-3 px-6 pb-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || !title.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload PDF
          </button>
        </div>
      </div>
    </div>
  )
}
