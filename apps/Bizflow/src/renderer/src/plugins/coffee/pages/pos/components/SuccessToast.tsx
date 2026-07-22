import { CheckCircle, X, Receipt } from 'lucide-react'

interface Props {
  message: string | null
  onDismiss: () => void
  onViewReceipt?: () => void
}

export function SuccessToast({ message, onDismiss, onViewReceipt }: Props) {
  if (!message) return null

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-down"
      onClick={onDismiss}
    >
      <div className="bg-emerald-500 text-white rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3 max-w-md">
        <CheckCircle size={20} className="shrink-0" />
        <span className="text-sm font-medium">{message}</span>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          {onViewReceipt && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onViewReceipt()
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-colors"
            >
              <Receipt size={14} />
              Receipt
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDismiss()
            }}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
