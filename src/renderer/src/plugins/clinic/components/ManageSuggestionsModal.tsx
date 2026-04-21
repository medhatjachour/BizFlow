import { useState, useRef, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'

interface Props {
  title: string
  items: string[]
  onAdd: (item: string) => void
  onRemove: (item: string) => void
  onClose: () => void
  placeholder?: string
}

export default function ManageSuggestionsModal({ title, items, onAdd, onRemove, onClose, placeholder }: Props) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleAdd = () => {
    const v = input.trim()
    if (!v) return
    onAdd(v)
    setInput('')
    inputRef.current?.focus()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Add input */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
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

        {/* Custom list */}
        <div className="px-5 py-3 max-h-72 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No custom entries yet. Add one above.</p>
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

        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
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
