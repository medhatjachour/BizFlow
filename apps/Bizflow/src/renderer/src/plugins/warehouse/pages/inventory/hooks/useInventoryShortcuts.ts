import { useEffect } from 'react'

interface ShortcutOptions {
  onNewStock: () => void
  onFocusSearch: () => void
  onEscapeModals: () => void
  isModalActive: boolean
}

export function useInventoryShortcuts({
  onNewStock,
  onFocusSearch,
  onEscapeModals,
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
        onNewStock()
        return
      }

      if (!isTyping && e.key === '/') {
        e.preventDefault()
        onFocusSearch()
        return
      }

      if (e.key === 'Escape' && isModalActive) {
        onEscapeModals()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNewStock, onFocusSearch, onEscapeModals, isModalActive])
}