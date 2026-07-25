import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { X, Upload, Trash2, ImageIcon, Plus } from 'lucide-react'
import CustomSelect, { SelectOption } from '@renderer/components/ui/CustomSelect'

// ── Types ──────────────────────────────────────────────────────────────────
interface Category {
  id: string
  name: string
  color?: string
  icon?: string
}

interface ProductForm {
  name: string
  description: string
  price: string
  cost: string
  stock: string
  reorderPoint: string
  isAvailable: boolean
  displayOrder: string
  notes: string
  categoryId: string
}

interface ProductModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: { form: ProductForm; imageFile: string | null; clearImage: boolean }) => void
  initialForm?: ProductForm
  initialImage?: string | null // base64 or URL for preview
  editMode?: boolean
  saving?: boolean
  categories: Category[]
  onNewCategory?: () => void // opens category modal from parent
}

const EMPTY_FORM: ProductForm = {
  name: '',
  description: '',
  price: '',
  cost: '0',
  stock: '0',
  reorderPoint: '5',
  isAvailable: true,
  displayOrder: '0',
  notes: '',
  categoryId: ''
}

// ── Helper ─────────────────────────────────────────────────────────────────
function hexToRgba(hex: string, alpha = 0.15): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// ── Component ──────────────────────────────────────────────────────────────
export default function ProductModal({
  open,
  onClose,
  onSubmit,
  initialForm = EMPTY_FORM,
  initialImage = null,
  editMode = false,
  saving = false,
  categories = [],
  onNewCategory
}: ProductModalProps) {
  const { t } = useLanguage()
  const [form, setForm] = useState<ProductForm>(initialForm)
  const [imagePreview, setImagePreview] = useState<string | null>(initialImage)
  const [imageFile, setImageFile] = useState<string | null>(null)
  const [clearImage, setClearImage] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setForm(initialForm)
      setImagePreview(initialImage)
      setImageFile(null)
      setClearImage(false)
    }
  }, [open, initialForm, initialImage])

  if (!open) return null

  const update = (patch: Partial<ProductForm>) => setForm((p) => ({ ...p, ...patch }))

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const b64 = reader.result as string
      setImagePreview(b64)
      setImageFile(b64)
      setClearImage(false)
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImagePreview(null)
    setImageFile(null)
    setClearImage(true)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onSubmit({ form, imageFile, clearImage })
  }
  // ── ADD THIS: Map categories to CustomSelect options ──
  const categoryOptions: SelectOption[] = [
    { value: '', label: '— None —' },
    ...categories.map((c) => ({
      value: c.id,
      label: `${c.icon ? `${c.icon} ` : ''}${c.name}`
    }))
  ]

  const selectedCat = categories.find((c) => c.id === form.categoryId)
  const margin =
    Number(form.price) > 0 && Number(form.cost) >= 0 ? Number(form.price) - Number(form.cost) : 0
  const marginPct = Number(form.price) > 0 ? Math.round((margin / Number(form.price)) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <form
        onSubmit={submit}
        className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700"
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-lg font-bold"
              style={{ backgroundColor: selectedCat?.color ?? '#f59e0b' }}
            >
              {selectedCat?.icon ?? '☕'}
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {editMode ? 'Edit Product' : 'Add Product'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedCat ? selectedCat.name : 'Uncategorized'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body (two-column on md+) ───────────────────────────── */}
        <div className="grid md:grid-cols-[200px_1fr] gap-5 p-5">
          {/* ═══ LEFT: Image picker ═══════════════════════════════ */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              {t('cfProductImage') || 'Product Image'}
            </label>

            {/* Drop zone / preview */}
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                const f = e.dataTransfer.files?.[0]
                if (f) handleFile(f)
              }}
              onClick={() => !imagePreview && fileInputRef.current?.click()}
              className={`relative aspect-square rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer transition ${
                dragOver
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                  : imagePreview
                    ? 'border-transparent'
                    : 'border-slate-300 dark:border-slate-600 hover:border-amber-400 bg-slate-50 dark:bg-slate-800'
              }`}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center px-3">
                  <ImageIcon size={28} className="mx-auto mb-2 text-slate-400" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('cfClickOrDragImageHere') || 'Click or drag image here'}
                  </p>
                </div>
              )}

              {imagePreview && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeImage()
                  }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />

            {imagePreview && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-3 py-2 text-xs font-medium border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center justify-center gap-1.5"
              >
                <Upload size={13} /> Change Image
              </button>
            )}

            <p className="text-[10px] text-slate-400 text-center">JPG, PNG, WEBP · max 5MB</p>

            {/* Availability toggle (nice switch) */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {t('cfAvailableINPos') || 'Available on POS'}
                </span>
                <button
                  type="button"
                  onClick={() => update({ isAvailable: !form.isAvailable })}
                  className={`relative w-10 h-5 rounded-full transition ${
                    form.isAvailable ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      form.isAvailable ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              </label>
            </div>
          </div>

          {/* ═══ RIGHT: Form fields ═══════════════════════════════ */}
          <div className="space-y-4">
            {/* Name */}
            <Field label={t('cfProductName') || 'Name'} required>
              <input
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="e.g. Cappuccino, Chocolate Cake…"
                autoFocus
                className={inputCls}
              />
            </Field>

            {/* Category */}
            <Field label={t('cfProductCategory') || 'Category'}>
              <div className="flex gap-2">
                <CustomSelect
                  value={form.categoryId}
                  onChange={(val) => update({ categoryId: val as string })}
                  options={categoryOptions}
                  placeholder="— None —"
                  // className={inputCls} // Passes your padding/border styles to the trigger button
                />
                {onNewCategory && (
                  <button
                    type="button"
                    onClick={onNewCategory}
                    className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 whitespace-nowrap"
                  >
                    + New
                  </button>
                )}
              </div>
              {/* Selected category chip (keep this exactly as it was) */}
              {selectedCat && (
                <div
                  className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium"
                  style={{
                    backgroundColor: hexToRgba(selectedCat.color || '#94a3b8', 0.15),
                    color: selectedCat.color || '#64748b'
                  }}
                >
                  {selectedCat.icon && <span>{selectedCat.icon}</span>}
                  {selectedCat.name}
                </div>
              )}
            </Field>

            {/* Price + Cost row */}
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('cfProductPrice') || 'Price'} required>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => update({ price: e.target.value })}
                    placeholder="0.00"
                    className={inputCls + ' pl-7'}
                  />
                </div>
              </Field>
              <Field label={t('cfProductCost') || 'Cost'}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.cost}
                    onChange={(e) => update({ cost: e.target.value })}
                    className={inputCls + ' pl-7'}
                  />
                </div>
              </Field>
            </div>

            {/* Margin hint */}
            {Number(form.price) > 0 && (
              <div className="-mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span>
                  Margin:{' '}
                  <strong className="text-slate-700 dark:text-slate-200">
                    ${margin.toFixed(2)}
                  </strong>{' '}
                  ({marginPct}%)
                </span>
              </div>
            )}

            {/* Stock + Reorder row */}
            <div className="grid  gap-3">
              <Field label={t('cfLowStock') || 'Low-stock Alert'}>
                <input
                  type="number"
                  min="0"
                  value={form.reorderPoint}
                  onChange={(e) => update({ reorderPoint: e.target.value })}
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Description */}
            <Field label={t('cfProductDescription') || 'Description'}>
              <textarea
                value={form.description}
                onChange={(e) => update({ description: e.target.value })}
                rows={2}
                placeholder="Short description shown on POS…"
                className={inputCls + ' resize-none'}
              />
            </Field>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="sticky bottom-0 flex gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {t('cfTableCancel') || 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition"
          >
            {saving
              ? t('cfSaving') || 'Saving…'
              : editMode
                ? t('cfUpdateProduct') || 'Update Product'
                : t('cfSaveProduct') || 'Save Product'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Reusable bits ──────────────────────────────────────────────────────────
const inputCls =
  'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none transition'

function Field({
  label,
  required,
  children
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
