/**
 * KeyboardShortcutsHelp Component
 * Shows available keyboard shortcuts
 */

import { useState, Fragment } from 'react'
import { Keyboard, X } from 'lucide-react'

interface Shortcut {
  keys: string[]
  description: string
  category: string
}

const shortcuts: Shortcut[] = [
  { keys: ['Ctrl', 'K'], description: 'Open command palette', category: 'Global' },
  { keys: ['Ctrl', 'N'], description: 'Create new item', category: 'Inventory' },
  { keys: ['Ctrl', 'E'], description: 'Export data', category: 'Inventory' },
  { keys: ['Ctrl', 'R'], description: 'Refresh data', category: 'Inventory' },
  { keys: ['Ctrl', 'F'], description: 'Toggle filters', category: 'Inventory' },
  { keys: ['Ctrl', 'S'], description: 'Save changes', category: 'Forms' },
  { keys: ['Esc'], description: 'Close modals/dialogs', category: 'Global' },
  { keys: ['Tab'], description: 'Navigate between fields', category: 'Forms' },
  { keys: ['↑', '↓'], description: 'Navigate command palette', category: 'Command Palette' },
  { keys: ['Enter'], description: 'Confirm/Select', category: 'Global' }
]

export default function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false)

  const categories = Array.from(new Set(shortcuts.map(s => s.category)))

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 z-40"
        aria-label="Show keyboard shortcuts"
        title="Keyboard Shortcuts (Ctrl+K for command palette)"
      >
        <Keyboard size={20} className="text-slate-600 dark:text-slate-400" aria-hidden="true" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-title"
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Keyboard className="text-primary" size={24} aria-hidden="true" />
                </div>
                <div>
                  <h2 id="shortcuts-title" className="text-xl font-bold text-slate-900 dark:text-white">
                    Keyboard Shortcuts
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Speed up your workflow with these shortcuts
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                aria-label="Close shortcuts help"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              {categories.map(category => (
                <div key={category} className="mb-6 last:mb-0">
                  <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {shortcuts
                      .filter(s => s.category === category)
                      .map((shortcut) => (
                        <div 
                          key={`${category}-${shortcut.description}`}
                          className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg"
                        >
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {shortcut.description}
                          </span>
                          <div className="flex items-center gap-1">
                            {shortcut.keys.map((key, i) => (
                              <Fragment key={`${shortcut.description}-${key}-${i}`}>
                                {i > 0 && <span className="text-slate-400 mx-1">+</span>}
                                <kbd className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs font-mono text-slate-700 dark:text-slate-300 shadow-sm">
                                  {key}
                                </kbd>
                              </Fragment>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/20">
              <p className="text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
                <span className="text-lg">💡</span>
                <span>
                  Press{' '}
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-xs mx-1">
                    Ctrl
                  </kbd>
                  {' '}+{' '}
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded text-xs mx-1">
                    K
                  </kbd>
                  {' '}to open the command palette for quick navigation
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
