import { useEffect } from 'react'
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export type ToastProps = {
  id: string
  type: ToastType
  message: string
  duration?: number
  onClose: (id: string) => void
}

export default function Toast({ id, type, message, duration = 5000, onClose }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onClose(id), duration)
      return () => clearTimeout(timer)
    }
    return () => {} // No-op cleanup when duration <= 0
  }, [id, duration, onClose])

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle size={20} />
      case 'error': return <XCircle size={20} />
      case 'warning': return <AlertCircle size={20} />
      case 'info': return <Info size={20} />
    }
  }

  const getStyles = () => {
    switch (type) {
      case 'success': return 'bg-success/10 border-success/30 text-success'
      case 'error': return 'bg-error/10 border-error/30 text-error'
      case 'warning': return 'bg-accent/10 border-accent/30 text-accent'
      case 'info': return 'bg-primary/10 border-primary/30 text-primary'
    }
  }

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-sm shadow-lg ${getStyles()} animate-slide-in-right`}>
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      <p className="flex-1 text-sm font-medium text-white">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
      >
        <X size={18} />
      </button>
    </div>
  )
}
