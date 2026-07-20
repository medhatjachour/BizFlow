/**
 * Coffee â€“ Products Tab
 * CRUD for coffee products (no SKU, no variants).
 * Supports: name, category, price, cost, stock, image, availability toggle.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Coffee,
  ToggleLeft,
  ToggleRight,
  Search,
  
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import CategoryModal from './CategoryModal'
import ProductModal from './ProductModat'

// types 
interface Category {
  id: string
  name: string
  color?: string
  icon?: string
}
interface Product {
  id: string
  name: string
  description?: string
  price: number
  cost: number
  stock: number
  reorderPoint: number
  image?: string
  isAvailable: boolean
  displayOrder: number
  notes?: string
  categoryId?: string
  category?: Category
}

// helpers
const EMPTY_FORM = {
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

function hexToRgba(hex: string, alpha: number = 0.15): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// components 
function ImageLoader({ filename, name }: { filename: string; name: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    window.api.coffee.products
      .loadImage(filename)
      .then(setSrc)
      .catch(() => setSrc(null))
  }, [filename])
  if (!src) return <Coffee className="w-8 h-8 text-amber-300" />
  return <img src={src} alt={name} className="w-full h-full object-cover" />
}

export default function ProductsTab() {
  const toast = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')

  // Form / modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Product | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [imagePreview, setImagePreview] = useState<string | null>(null) // base64 for display
  const [imageFile, setImageFile] = useState<string | null>(null) // base64 to upload
  const [saving, setSaving] = useState(false)
  const imgInputRef = useRef<HTMLInputElement>(null)

  // Category modal
  const [catModal, setCatModal] = useState(false)
  const [catForm, setCatForm] = useState({ name: '', color: '#f59e0b', icon: '🍰' })
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [savingCat, setSavingCat] = useState(false)

  // â”€â”€ Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [prods, cats] = await Promise.all([
        window.api.coffee.products.getAll(),
        window.api.coffee.categories.getAll()
      ])
      setProducts(prods ?? [])
      setCategories(cats ?? [])
    } catch {
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Load image preview when editing existing product
  useEffect(() => {
    if (editTarget?.image) {
      window.api.coffee.products
        .loadImage(editTarget.image)
        .then((url) => setImagePreview(url))
        .catch(() => setImagePreview(null))
    } else if (!editTarget) {
      setImagePreview(null)
    }
  }, [editTarget])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      const b64 = reader.result as string
      setImagePreview(b64)
      setImageFile(b64)
    }
    reader.readAsDataURL(file)
  }

  // â”€â”€ Filter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const visible = products.filter((p) => {
    if (catFilter !== 'all' && p.categoryId !== catFilter) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // â”€â”€ Modal helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function openCreate() {
    setEditTarget(null)
    setForm({ ...EMPTY_FORM })
    setImagePreview(null)
    setImageFile(null)
    setModalOpen(true)
  }

  function openEdit(p: Product) {
    setEditTarget(p)
    setForm({
      name: p.name,
      description: p.description ?? '',
      price: String(p.price),
      cost: String(p.cost),
      stock: String(p.stock),
      reorderPoint: String(p.reorderPoint),
      isAvailable: p.isAvailable,
      displayOrder: String(p.displayOrder),
      notes: p.notes ?? '',
      categoryId: p.categoryId ?? ''
    })
    setImageFile(null) // useEffect will load existing image preview
    setModalOpen(true)
  }

  async function handleSave({
    form: f,
    imageFile: imgFile,
    clearImage
  }: {
    form: typeof EMPTY_FORM
    imageFile: string | null
    clearImage: boolean
  }) {
    if (!f.name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!f.price || isNaN(Number(f.price))) {
      toast.error('Valid price required')
      return
    }
    setSaving(true)
    try {
      let imageFilename: string | undefined | null = editTarget?.image
      if (imgFile) {
        imageFilename = await window.api.coffee.products.saveImage(imgFile)
      } else if (clearImage) {
        imageFilename = null // or undefined, depending on your API
      }
      const data = {
        name: f.name.trim(),
        description: f.description || undefined,
        price: Number(f.price),
        cost: Number(f.cost),
        stock: Number(f.stock),
        reorderPoint: Number(f.reorderPoint),
        image: imageFilename ?? undefined,
        isAvailable: f.isAvailable,
        displayOrder: Number(f.displayOrder),
        notes: f.notes || undefined,
        categoryId: f.categoryId || undefined
      }
      if (editTarget) await window.api.coffee.products.update({ id: editTarget.id, ...data })
      else await window.api.coffee.products.create(data)
      setModalOpen(false)
      load()
      toast.success(editTarget ? 'Product updated' : 'Product created')
    } catch (err: any) {
      toast.error(err?.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }
  async function handleDelete(p: Product) {
    if (!confirm(`Delete "${p.name}"?`)) return
    try {
      await window.api.coffee.products.delete(p.id)
      load()
      toast.success('Product deleted')
    } catch (err: any) {
      toast.error(err?.message ?? 'Delete failed')
    }
  }

  async function toggleAvailability(p: Product) {
    try {
      await window.api.coffee.products.toggleAvailability(p.id, !p.isAvailable)
      load()
    } catch {
      toast.error('Update failed')
    }
  }

  // category modal helpers
  function openCatCreate() {
    setEditCat(null)
    setCatForm({ name: '', color: '#f59e0b', icon: '🍰' })
    setCatModal(true)
  }

  function openCatEdit(c: Category) {
    setEditCat(c)
    setCatForm({
      name: c.name,
      color: c.color ?? '#f59e0b',
      icon: c.icon ?? '🍰'
    })
    setCatModal(true)
  }
  async function handleSaveCat(data: { name: string; color: string; icon?: string }) {
    if (!data.name?.trim()) {
      toast.error('Category name required')
      return
    }
    setSavingCat(true)
    try {
      const payload = {
        name: data.name.trim(),
        color: data.color,
        icon: data.icon || undefined
      }
      if (editCat) await window.api.coffee.categories.update({ id: editCat.id, ...payload })
      else await window.api.coffee.categories.create(payload)
      setCatModal(false)
      load()
      toast.success('Category saved')
    } catch (err: any) {
      toast.error(err?.message ?? 'Save failed')
    } finally {
      setSavingCat(false)
    }
  }

  async function handleDeleteCat(c: Category) {
    if (!confirm(`Delete category "${c.name}"?`)) return
    try {
      await window.api.coffee.categories.delete(c.id)
      load()
      toast.success('Category deleted')
    } catch (err: any) {
      toast.error(err?.message ?? 'Cannot delete â€” may have products attached')
    }
  }

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="p-4 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search productsâ€¦"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={openCatCreate}
          className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          + Category
        </button>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium"
        >
          <Plus className="w-3.5 h-3.5" /> Add Product
        </button>
      </div>

      {/* Category filter chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setCatFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
            catFilter === 'all'
              ? 'bg-amber-500 text-white'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <div key={c.id} className="flex items-center gap-1">
            <button
              onClick={() => setCatFilter(c.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1 ${
                catFilter === c.id ? 'text-white' : 'border border-slate-200 dark:border-slate-700'
              }`}
              style={
                catFilter === c.id
                  ? { backgroundColor: c.color ?? '#f59e0b' }
                  : {
                      backgroundColor: hexToRgba(c.color ?? '#78716c', 0.12),
                      color: c.color ?? '#78716c'
                    }
              }
            >
              {c.icon && <span>{c.icon}</span>}
              {c.name}
            </button>
            <button
              onClick={() => openCatEdit(c)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
            >
              <Edit2 size={12} />
            </button>
            <button
              onClick={() => handleDeleteCat(c)}
              className="text-slate-400 hover:text-red-500 p-0.5"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Products grid */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400">
          <Coffee className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">{loading ? 'Loadingâ€¦' : 'No products found'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {visible.map((product) => (
            <div
              key={product.id}
              className={`bg-white dark:bg-slate-800 rounded-xl border ${product.isAvailable ? 'border-slate-200 dark:border-slate-700' : 'border-slate-200 dark:border-slate-700 opacity-60'} p-3`}
            >
              {/* Image */}
              <div className="aspect-square rounded-lg bg-amber-50 dark:bg-slate-700 mb-2 flex items-center justify-center overflow-hidden">
                {product.image ? (
                  <ImageLoader filename={product.image} name={product.name} />
                ) : (
                  <Coffee className="w-8 h-8 text-amber-300" />
                )}
              </div>
              {/* Info */}
              <p className="text-xs font-semibold text-slate-800 dark:text-white line-clamp-2 mb-1">
                {product.name}
              </p>
              {product.category && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: hexToRgba(product.category.color ?? '#78716c', 0.15),
                    color: product.category.color ?? '#78716c'
                  }}
                >
                  {product.category.icon && <span>{product.category.icon}</span>}
                  {product.category.name}
                </span>
              )}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {product.price.toFixed(2)}
                </span>
                <span
                  className={`text-[10px] font-medium ${product.stock <= product.reorderPoint ? 'text-orange-500' : 'text-slate-500'}`}
                >
                  Stock: {product.stock}
                </span>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-1 mt-2">
                <button
                  onClick={() => toggleAvailability(product)}
                  className={`p-1 rounded-lg transition-colors ${product.isAvailable ? 'text-green-500 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  title={product.isAvailable ? 'Mark unavailable' : 'Mark available'}
                >
                  {product.isAvailable ? (
                    <ToggleRight className="w-4 h-4" />
                  ) : (
                    <ToggleLeft className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => openEdit(product)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(product)}
                  className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* â”€â”€ Add/Edit Product Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {modalOpen && (
        <ProductModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSave}
          initialForm={form}
          initialImage={imagePreview}
          editMode={!!editTarget}
          saving={saving}
          categories={categories}
          onNewCategory={openCatCreate} // ← opens category modal from inside!
        />
      )}

      {/* â”€â”€ Category Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {catModal && (
        <CategoryModal
          open={catModal}
          onClose={() => setCatModal(false)}
          onSubmit={handleSaveCat}
          initial={catForm}
          editMode={!!editCat}
          saving={savingCat}
        />
      )}
    </div>
  )
}
