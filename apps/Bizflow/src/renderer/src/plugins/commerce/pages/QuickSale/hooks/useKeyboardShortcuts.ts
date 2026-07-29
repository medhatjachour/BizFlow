import { useEffect, type RefObject } from 'react'

type UseKeyboardShortcutsOptions = {
  searchInputRef: RefObject<HTMLInputElement | null>
  showDropdown: boolean
  onCloseDropdown: () => void
  onClearSearch: () => void
}

export function useKeyboardShortcuts({
  searchInputRef,
  showDropdown,
  onCloseDropdown,
  onClearSearch,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search with '/'
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }

      // Escape handling
      if (e.key === 'Escape') {
        if (showDropdown) {
          onCloseDropdown()
          onClearSearch()
        } else if (document.activeElement === searchInputRef.current) {
          searchInputRef.current?.blur()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchInputRef, showDropdown, onCloseDropdown, onClearSearch])
}