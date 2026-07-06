import { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { X, Printer, Copy } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'

interface Props {
  isOpen: boolean
  onClose: () => void
  type: 'gym_trainee' | 'gym_coach'
  id: string
  name: string
}

export default function QRModal({ isOpen, onClose, type, id, name }: Props) {
  const toast = useToast()
  const printRef = useRef<HTMLDivElement>(null)

  if (!isOpen) return null

  const qrData = JSON.stringify({ type, id, name })
  const label = type === 'gym_trainee' ? 'Trainee' : 'Coach'

  function handlePrint() {
    if (!printRef.current) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>QR — ${name}</title>
      <style>
        body { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; margin:0; font-family:sans-serif; }
        .box { border: 3px solid #f97316; border-radius: 16px; padding: 32px; text-align:center; }
        h2 { margin: 0 0 8px; font-size:20px; }
        p  { margin: 0; color:#64748b; font-size:13px; }
        svg { display:block; margin: 16px auto; }
      </style></head>
      <body>
        <div class="box">
          ${printRef.current.innerHTML}
          <h2>${name}</h2>
          <p>${label} · ${id.slice(0, 8)}…</p>
        </div>
      </body></html>
    `)
    win.document.close()
    win.focus()
    win.print()
    win.close()
  }

  function handleCopy() {
    navigator.clipboard.writeText(id)
    toast.success('ID copied to clipboard')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
        >
          <X size={18} />
        </button>

        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 rounded-full mb-2">
            <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">{label} QR Code</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{name}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">ID: {id.slice(0, 16)}…</p>
        </div>

        {/* QR Code */}
        <div
          ref={printRef}
          className="flex justify-center p-4 bg-white rounded-xl border-2 border-orange-200 dark:border-orange-700 mx-auto w-fit mb-5"
        >
          <QRCodeSVG
            value={qrData}
            size={200}
            level="M"
            includeMargin={false}
            fgColor="#1e293b"
            bgColor="#ffffff"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Copy size={14} /> Copy ID
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-[color:var(--accent-contrast)] text-sm font-medium transition-colors"
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>
    </div>
  )
}
