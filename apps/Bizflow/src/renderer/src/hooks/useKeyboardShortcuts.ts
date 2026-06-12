/**
 * useKeyboardShortcuts Hook
 * Global keyboard shortcuts handler
 */

import { useEffect } from 'react'
import logger from '../../../shared/utils/logger'

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  action: () => void
  description: string
  preventDefault?: boolean
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs/textareas
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow specific shortcuts even in input fields (like Ctrl+S to save)
        const allowedInInputs = shortcuts.filter(s => 
          s.key.toLowerCase() === 's' && s.ctrlKey
        )
        
        const matchedShortcut = allowedInInputs.find(shortcut =>
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          !!event.ctrlKey === !!shortcut.ctrlKey &&
          !!event.shiftKey === !!shortcut.shiftKey &&
          !!event.altKey === !!shortcut.altKey &&
          !!event.metaKey === !!shortcut.metaKey
        )

        if (!matchedShortcut) return
      }

      // Check each shortcut
      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatches = !!event.ctrlKey === !!shortcut.ctrlKey
        const shiftMatches = !!event.shiftKey === !!shortcut.shiftKey
        const altMatches = !!event.altKey === !!shortcut.altKey
        const metaMatches = !!event.metaKey === !!shortcut.metaKey

        if (keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault()
          }
          
          logger.debug(`Keyboard shortcut triggered: ${shortcut.description}`)
          shortcut.action()
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [shortcuts, enabled])
}

export default useKeyboardShortcuts
