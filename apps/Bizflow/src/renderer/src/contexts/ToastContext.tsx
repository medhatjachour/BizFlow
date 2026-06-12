import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import Toast, { ToastType } from '../components/ui/Toast'

type ToastItem = {
  id: string
  type: ToastType
  message: string
  duration?: number
}

type ToastContextType = {
  showToast: (type: ToastType, message: string, duration?: number) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const showToast = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = Date.now().toString() + Math.random().toString(36)
    setToasts(prev => [...prev, { id, type, message, duration }])
  }, [])

  const success = useCallback((message: string, duration?: number) => showToast('success', message, duration), [showToast])
  const error = useCallback((message: string, duration?: number) => showToast('error', message, duration), [showToast])
  const warning = useCallback((message: string, duration?: number) => showToast('warning', message, duration), [showToast])
  const info = useCallback((message: string, duration?: number) => showToast('info', message, duration), [showToast])

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      
      {/* Toast Container - z-[9999] ensures it's above all modals */}
      <div className="fixed top-4 right-4 z-[9999] space-y-3 max-w-md pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              id={toast.id}
              type={toast.type}
              message={toast.message}
              duration={toast.duration}
              onClose={removeToast}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
