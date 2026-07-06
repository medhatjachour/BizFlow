import { useState, useRef, useEffect } from 'react'
import { X, Plus, Trash2, EyeOff, Eye } from 'lucide-react'

interface Props {
  title: string
  // Custom (user-added) items
  items: string[]
  onAdd: (item: string) => void
  onRemove: (item: string) => void
  onClose: () => void
  placeholder?: string
  // Built-in defaults support (optional)
  defaultItems?: string[]
  hiddenDefaults?: string[]
  onHideDefault?: (item: string) => void
  onShowDefault?: (item: string) => void
}

export default function ManageSuggestionsModal({
  title, items, onAdd, onRemove, onClose, placeholder,
  defaultItems, hiddenDefaults, onHideDefault, onShowDefault
}: Props) {
  const [input, setInput] = useState('')
  const [showHidden, setShowHidden] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleAdd = () => {
    const v = input.trim()
    if (!v) return
    onAdd(v)
    setInput('')
    inputRef.current?.focus()
  }

  const visibleDefaults = defaultItems?.filter(d => !hiddenDefaults?.includes(d)) ?? []
  const hiddenDefaultsList = defaultItems?.filter(d => hiddenDefaults?.includes(d)) ?? []

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Add input */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)]"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
              placeholder={placeholder ?? 'Type and press Enter or Add…'}
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!input.trim()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>

        {/* Lists */}
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-4">

          {/* Built-in defaults */}
          {defaultItems && defaultItems.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Built-in defaults</p>
              <ul className="space-y-1">
                {visibleDefaults.map(item => (
                  <li key={item} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 group">
                    <span className="text-sm text-slate-700 dark:text-slate-200 truncate">{item}</span>
                    <button
                      type="button"
                      title="Hide from suggestions"
                      onClick={() => onHideDefault?.(item)}
                      className="p-1 rounded text-slate-300 group-hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors shrink-0"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>

              {hiddenDefaultsList.length > 0 && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setShowHidden(v => !v)}
                    className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                  >
                    <Eye className="h-3 w-3" />
                    {showHidden ? 'Hide' : `Show ${hiddenDefaultsList.length} hidden`}
                  </button>
                  {showHidden && (
                    <ul className="mt-2 space-y-1">
                      {hiddenDefaultsList.map(item => (
                        <li key={item} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 group opacity-60 hover:opacity-100">
                          <span className="text-sm text-slate-500 dark:text-slate-400 truncate line-through">{item}</span>
                          <button
                            type="button"
                            title="Restore to suggestions"
                            onClick={() => onShowDefault?.(item)}
                            className="p-1 rounded text-slate-300 group-hover:text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors shrink-0"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Custom items */}
          <div>
            {defaultItems && defaultItems.length > 0 && (
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Your custom entries</p>
            )}
            {items.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No custom entries yet. Add one above.</p>
            ) : (
              <ul className="space-y-1">
                {items.map(item => (
                  <li key={item} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 group">
                    <span className="text-sm text-slate-700 dark:text-slate-200 truncate">{item}</span>
                    <button
                      type="button"
                      onClick={() => onRemove(item)}
                      className="p-1 rounded text-slate-300 group-hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

