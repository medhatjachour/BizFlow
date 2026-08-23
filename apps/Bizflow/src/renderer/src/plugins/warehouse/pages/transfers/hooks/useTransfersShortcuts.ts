import { useEffect } from 'react'

interface ShortcutOptions {
  onNewTransfer: () => void
  onFocusSearch: () => void
  onEscape: () => void
  isModalActive: boolean
}

export function useTransfersShortcuts({
  onNewTransfer,
  onFocusSearch,
  onEscape,
  isModalActive
}: ShortcutOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isTyping =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        onNewTransfer()
        return
      }

      if (!isTyping && e.key === '/') {
        e.preventDefault()
        onFocusSearch()
        return
      }

      if (e.key === 'Escape' && isModalActive) {
        onEscape()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNewTransfer, onFocusSearch, onEscape, isModalActive])
}