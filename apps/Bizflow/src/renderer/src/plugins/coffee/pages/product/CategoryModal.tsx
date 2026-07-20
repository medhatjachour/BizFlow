import { useState, useEffect } from 'react'

const PRESET_COLORS = [
  '#f59e0b', '#f97316', '#ef4444', '#ec4899',
  '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6',
  '#06b6d4', '#14b8a6', '#10b981', '#84cc16',
  '#a16207', '#78716c', '#64748b', '#1e293b',
]

const CAFE_ICONS = [
  '🍰','🎂','🧁','🥧','🍮','🥮',
  '☕','🫖','🍵','🧋','🥤','🧃',
  '🍫','🍬','🍭','🍪','🍩','🥐',
  '🥖','🧇','🥞','🍞','🧀','🥪',
  '🍨','🍦','🍧','🥛','🍷','🍸',
  '🍹','🍺','🍯','🥥','🍓','🍒',
]

interface CategoryForm {
  name: string
  color: string
  icon: string
}

interface CategoryModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CategoryForm) => void
  initial?: CategoryForm
  editMode?: boolean
  saving?: boolean
}

export default function CategoryModal({
  open,
  onClose,
  onSubmit,
  initial = { name: '', color: '#f59e0b', icon: '🍰' },
  editMode = false,
  saving = false,
}: CategoryModalProps) {
  const [form, setForm] = useState<CategoryForm>(initial)
  const [showCustomColor, setShowCustomColor] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(initial)
      setShowCustomColor(false)
    }
  }, [open, initial])

  if (!open) return null

  const update = (patch: Partial<CategoryForm>) =>
    setForm((p) => ({ ...p, ...patch }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onSubmit(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <form
        onSubmit={submit}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {editMode ? 'Edit Category' : 'Add Category'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* ---------- Live preview ---------- */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div
              className="flex items-center justify-center w-12 h-12 rounded-xl text-2xl shrink-0"
              style={{ backgroundColor: form.color + '30' }}
            >
              {form.icon || '🍰'}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {form.name || 'Category name'}
              </div>
              <div className="text-xs text-slate-400">Preview</div>
            </div>
          </div>

          {/* ---------- Name ---------- */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Name *
            </label>
            <input
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="e.g. Cake, Espresso, Croissant…"
              autoFocus
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          {/* ---------- Color picker ---------- */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Color
            </label>

            {/* Swatch grid */}
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => update({ color: c })}
                  className="relative w-9 h-9 rounded-lg transition-transform hover:scale-110"
                  style={{ backgroundColor: c }}
                  title={c}
                >
                  {form.color.toLowerCase() === c.toLowerCase() && (
                    <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Custom color toggle */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowCustomColor((s) => !s)}
                className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
              >
                {showCustomColor ? 'Hide custom picker' : 'Pick a custom color…'}
              </button>

              {showCustomColor && (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => update({ color: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0"
                  />
                  <input
                    type="text"
                    value={form.color}
                    onChange={(e) => update({ color: e.target.value })}
                    className="w-24 px-2 py-1 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              )}
            </div>
          </div>

          {/* ---------- Icon picker ---------- */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Icon
            </label>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-lg">{form.icon}</span>
              <span>Selected: {form.icon}</span>
            </div>

            <div className="grid grid-cols-8 gap-1.5 p-2 rounded-lg border border-slate-200 dark:border-slate-700 max-h-40 overflow-y-auto">
              {CAFE_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => update({ icon: ic })}
                  className={
                    'flex items-center justify-center w-9 h-9 rounded-lg text-xl transition ' +
                    (form.icon === ic
                      ? 'ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-500/10'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800')
                  }
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ---------- Footer ---------- */}
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving…' : editMode ? 'Update' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
