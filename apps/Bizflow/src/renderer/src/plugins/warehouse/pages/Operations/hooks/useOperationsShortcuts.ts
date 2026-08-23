import { useEffect } from 'react'

interface ShortcutOptions {
  onNewOrder: () => void
  onFocusSearch: () => void
  onEscapeModal: () => void
  isModalOpen: boolean
}

export function useOperationsShortcuts({
  onNewOrder,
  onFocusSearch,
  onEscapeModal,
  isModalOpen
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
        onNewOrder()
        return
      }

      if (!isTyping && e.key === '/') {
        e.preventDefault()
        onFocusSearch()
        return
      }

      if (e.key === 'Escape' && isModalOpen) {
        onEscapeModal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNewOrder, onFocusSearch, onEscapeModal, isModalOpen])
}