import { useState } from 'react'
import { Loader2, X, Upload, FilePlus, Calendar } from 'lucide-react'
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
    if (!title.trim()) {
      showToast('error', 'Please enter a test or document title')
      return
    }
    setUploading(true)
    try {
      const result = await window.api.clinic.checkResults.upload({
        patientId,
        title: title.trim(),
        description: description.trim() || undefined,
        resultDate
      })
      if (result) {
        showToast('success', 'Lab report/document attached successfully')
        onSaved()
      }
      onClose()
    } catch {
      showToast('error', 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const QUICK_TITLES = ['Blood Test (CBC)', 'X-Ray Scan', 'MRI Report', 'Urine Analysis', 'Biopsy Report']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <FilePlus className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Upload Lab / Check Result</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Document Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Blood Profile, Chest X-Ray"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
              autoFocus
            />
            {/* Quick title suggestions */}
            <div className="flex gap-1.5 flex-wrap mt-2">
              {QUICK_TITLES.map(qt => (
                <button
                  key={qt}
                  type="button"
                  onClick={() => setTitle(qt)}
                  className="text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-600 dark:text-slate-400 hover:text-teal-600 rounded-lg px-2 py-0.5 transition-colors"
                >
                  {qt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Date of Result</label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={resultDate}
                onChange={e => setResultDate(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Lab Notes & Findings</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Summary of findings or normal range flags..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none resize-none"
            />
          </div>

          <div className="p-3 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-900/40 rounded-xl text-xs text-teal-800 dark:text-teal-300 flex items-center gap-2">
            <Upload className="h-4 w-4 flex-shrink-0 text-teal-600" />
            <span>Clicking <strong>Choose File</strong> will launch your system file selector for PDF files.</span>
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || !title.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-all shadow-md shadow-teal-600/20 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Choose File & Upload
          </button>
        </div>
      </div>
    </div>
  )
}