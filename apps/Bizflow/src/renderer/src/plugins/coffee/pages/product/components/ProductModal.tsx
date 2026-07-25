import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { X, Upload, Trash2, ImageIcon, Plus } from 'lucide-react'
import CustomSelect, { SelectOption } from '@renderer/components/ui/CustomSelect'
import { PRODUCT_UNITS, EMPTY_PRODUCT_FORM } from '../constants'
import { calcMargin, getUnitConfig, hexToRgba } from '../utils'
import type { Category, ProductForm, ProductSubmitData } from '../types'

interface ProductModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: ProductSubmitData) => void
  initialForm?: ProductForm
  initialImage?: string | null
  editMode?: boolean
  saving?: boolean
  categories: Category[]
  onNewCategory?: () => void
}

export default function ProductModal({
  open,
  onClose,
  onSubmit,
  initialForm = EMPTY_PRODUCT_FORM,
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

  // ── Unit Options ──
  const unitOptions: SelectOption[] = PRODUCT_UNITS.map((u) => ({
    value: u.value,
    label: `${u.label} (${u.symbol})`
  }))

  // ── Category Options ──
  const categoryOptions: SelectOption[] = [
    { value: '', label: '— None —' },
    ...categories.map((c) => ({
      value: c.id,
      label: `${c.icon ? `${c.icon} ` : ''}${c.name}`
    }))
  ]

  const selectedCat = categories.find((c) => c.id === form.categoryId)
  const { margin, pct: marginPct } = calcMargin(Number(form.price), Number(form.cost))
  const unitConfig = getUnitConfig(form.unit)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* ── Header ── */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xl">
              {selectedCat?.icon ?? '☕'}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editMode ? 'Edit Product' : 'Add Product'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedCat ? selectedCat.name : 'Uncategorized'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col flex-1 overflow-hidden">
          {/* ── Body ── */}
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5 overflow-y-auto">
            {/* ═══ LEFT: Image picker ═══ */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('cfProductImage') || 'Product Image'}
              </label>

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
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-4">
                    <ImageIcon className="mx-auto h-10 w-10 text-slate-400" />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
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
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
                className="hidden"
              />

              {imagePreview && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-3 py-2 text-xs font-medium border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center justify-center gap-1.5"
                >
                  <Upload size={14} /> Change Image
                </button>
              )}

              <p className="text-[10px] text-slate-400 text-center">JPG, PNG, WEBP · max 5MB</p>

              {/* Availability toggle */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
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
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        form.isAvailable ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* ═══ RIGHT: Form fields ═══ */}
            <div className="md:col-span-2 space-y-4">
              {/* Name */}
              <Field label="Name" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="e.g. Cappuccino, Chocolate Cake…"
                  autoFocus
                  className={inputCls}
                />
              </Field>

              {/* Category + Unit */}
              <div className="grid grid-cols-1 gap-3">
                <Field label="Category">
                  <div className="flex gap-2">
                    <CustomSelect
                      value={form.categoryId}
                      onChange={(val) => update({ categoryId: val as string })}
                      options={categoryOptions}
                      placeholder="— None —"
                    />
                    {onNewCategory && (
                      <button
                        type="button"
                        onClick={onNewCategory}
                        className="px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1 whitespace-nowrap"
                      >
                        <Plus size={12} /> New
                      </button>
                    )}
                  </div>
                  {/* Selected category chip */}
                  {selectedCat && (
                    <div
                      className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                      style={{
                        backgroundColor: hexToRgba(selectedCat.color ?? '#f59e0b', 0.15),
                        color: selectedCat.color ?? '#f59e0b'
                      }}
                    >
                      {selectedCat.icon && <span>{selectedCat.icon}</span>}
                      {selectedCat.name}
                    </div>
                  )}
                </Field>
              </div>

              {/* unit */}
              <div className="grid grid-cols-1 gap-3">
                <Field label="Unit">
                  <CustomSelect
                    value={form.unit}
                    onChange={(val) => update({ unit: val as string })}
                    options={unitOptions}
                  />
                </Field>
              </div>

              {/* Price + Cost */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Price" required>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
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
                <Field label="Cost">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
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
                <div className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
                  Margin:{' '}
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    ${margin.toFixed(2)}
                  </span>{' '}
                  ({marginPct}%)
                </div>
              )}

              {/* Description */}
              <Field label="Description">
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

          {/* ── Footer ── */}
          <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {t('cfTableCancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50"
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
    </div>
  )
}

// ── Reusable bits ──
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
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
