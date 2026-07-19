/**
 * Coffee â€“ Products Tab
 * CRUD for coffee products (no SKU, no variants).
 * Supports: name, category, price, cost, stock, image, availability toggle.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Edit2, Trash2, RefreshCw, Coffee,
  ToggleLeft, ToggleRight, Search, ImageIcon, X
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface Category { id: string; name: string; color?: string; icon?: string }
interface Product {
  id: string; name: string; description?: string; price: number; cost: number
  stock: number; reorderPoint: number; image?: string; isAvailable: boolean
  displayOrder: number; notes?: string
  categoryId?: string; category?: Category
}

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const EMPTY_FORM = {
  name: '', description: '', price: '', cost: '0', stock: '0',
  reorderPoint: '5', isAvailable: true,
  displayOrder: '0', notes: '', categoryId: ''
}

const CAT_COLORS: Record<string, string> = {
  amber:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  teal:   'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  green:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  default:'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
}

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ImageLoader({ filename, name }: { filename: string; name: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    window.api.coffee.products.loadImage(filename).then(setSrc).catch(() => setSrc(null))
  }, [filename])
  if (!src) return <Coffee className="w-8 h-8 text-amber-300" />
  return <img src={src} alt={name} className="w-full h-full object-cover" />
}

export default function ProductsTab() {
  const toast = useToast()

  const [products,   setProducts]   = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [catFilter,  setCatFilter]  = useState('all')

  // Form / modal state
  const [modalOpen,    setModalOpen]    = useState(false)
  const [editTarget,   setEditTarget]   = useState<Product | null>(null)
  const [form,         setForm]         = useState({ ...EMPTY_FORM })
  const [imagePreview, setImagePreview] = useState<string | null>(null) // base64 for display
  const [imageFile,    setImageFile]    = useState<string | null>(null) // base64 to upload
  const [saving,       setSaving]       = useState(false)
  const imgInputRef = useRef<HTMLInputElement>(null)

  // Category modal
  const [catModal,     setCatModal]     = useState(false)
  const [catForm,      setCatForm]      = useState({ name: '', color: 'amber', icon: '' })
  const [editCat,      setEditCat]      = useState<Category | null>(null)
  const [savingCat,    setSavingCat]    = useState(false)

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
    } catch { toast.error('Failed to load products') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // Load image preview when editing existing product
  useEffect(() => {
    if (editTarget?.image) {
      window.api.coffee.products.loadImage(editTarget.image)
        .then(url => setImagePreview(url)).catch(() => setImagePreview(null))
    } else if (!editTarget) { setImagePreview(null) }
  }, [editTarget])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => { const b64 = reader.result as string; setImagePreview(b64); setImageFile(b64) }
    reader.readAsDataURL(file)
  }

  // â”€â”€ Filter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const visible = products.filter(p => {
    if (catFilter !== 'all' && p.categoryId !== catFilter) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()))    return false
    return true
  })

  // â”€â”€ Modal helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function openCreate() {
    setEditTarget(null)
    setForm({ ...EMPTY_FORM })
    setImagePreview(null); setImageFile(null)
    setModalOpen(true)
  }

  function openEdit(p: Product) {
    setEditTarget(p)
    setForm({
      name: p.name, description: p.description ?? '', price: String(p.price),
      cost: String(p.cost), stock: String(p.stock), reorderPoint: String(p.reorderPoint),
      isAvailable: p.isAvailable, displayOrder: String(p.displayOrder),
      notes: p.notes ?? '', categoryId: p.categoryId ?? ''
    })
    setImageFile(null) // useEffect will load existing image preview
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    if (!form.price || isNaN(Number(form.price))) { toast.error('Valid price required'); return }
    setSaving(true)
    try {
      // Upload new image to disk if user selected one
      let imageFilename: string | undefined = editTarget?.image
      if (imageFile) imageFilename = await window.api.coffee.products.saveImage(imageFile)
      const data = {
        name: form.name.trim(), description: form.description || undefined,
        price: Number(form.price), cost: Number(form.cost),
        stock: Number(form.stock), reorderPoint: Number(form.reorderPoint),
        image: imageFilename, isAvailable: form.isAvailable,
        displayOrder: Number(form.displayOrder), notes: form.notes || undefined,
        categoryId: form.categoryId || undefined
      }
      if (editTarget) await window.api.coffee.products.update({ id: editTarget.id, ...data })
      else             await window.api.coffee.products.create(data)
      setModalOpen(false); load()
      toast.success(editTarget ? 'Product updated' : 'Product created')
    } catch (err: any) { toast.error(err?.message ?? 'Save failed') }
    finally { setSaving(false) }
  }

  async function handleDelete(p: Product) {
    if (!confirm(`Delete "${p.name}"?`)) return
    try { await window.api.coffee.products.delete(p.id); load(); toast.success('Product deleted') }
    catch (err: any) { toast.error(err?.message ?? 'Delete failed') }
  }

  async function toggleAvailability(p: Product) {
    try {
      await window.api.coffee.products.toggleAvailability(p.id, !p.isAvailable)
      load()
    } catch { toast.error('Update failed') }
  }

  // â”€â”€ Category CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function openCatCreate() { setEditCat(null); setCatForm({ name: '', color: 'amber', icon: '' }); setCatModal(true) }
  function openCatEdit(c: Category) { setEditCat(c); setCatForm({ name: c.name, color: c.color ?? 'amber', icon: c.icon ?? '' }); setCatModal(true) }

  async function handleSaveCat() {
    if (!catForm.name) { toast.error('Category name required'); return }
    setSavingCat(true)
    try {
      const data = { name: catForm.name, color: catForm.color, icon: catForm.icon || undefined }
      if (editCat) await window.api.coffee.categories.update({ id: editCat.id, ...data })
      else         await window.api.coffee.categories.create(data)
      setCatModal(false); load(); toast.success('Category saved')
    } catch (err: any) { toast.error(err?.message ?? 'Save failed') }
    finally { setSavingCat(false) }
  }

  async function handleDeleteCat(c: Category) {
    if (!confirm(`Delete category "${c.name}"?`)) return
    try { await window.api.coffee.categories.delete(c.id); load(); toast.success('Category deleted') }
    catch (err: any) { toast.error(err?.message ?? 'Cannot delete â€” may have products attached') }
  }

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="p-4 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" placeholder="Search productsâ€¦" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>
        <button onClick={load} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button onClick={openCatCreate} className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700">
          + Category
        </button>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium">
          <Plus className="w-3.5 h-3.5" /> Add Product
        </button>
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        <button
          onClick={() => setCatFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${catFilter === 'all' ? 'bg-amber-500 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
        >All</button>
        {categories.map(c => (
          <div key={c.id} className="flex items-center gap-1">
            <button
              onClick={() => setCatFilter(c.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1 ${catFilter === c.id ? 'bg-amber-500 text-white' : CAT_COLORS[c.color ?? 'default']}`}
            >
              {c.icon && <span>{c.icon}</span>}{c.name}
            </button>
            <button onClick={() => openCatEdit(c)} className="text-slate-400 hover:text-slate-600 p-0.5">
              <Edit2 className="w-3 h-3" />
            </button>
            <button onClick={() => handleDeleteCat(c)} className="text-slate-400 hover:text-red-500 p-0.5">
              <Trash2 className="w-3 h-3" />
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
          {visible.map(product => (
            <div
              key={product.id}
              className={`bg-white dark:bg-slate-800 rounded-xl border ${product.isAvailable ? 'border-slate-200 dark:border-slate-700' : 'border-slate-200 dark:border-slate-700 opacity-60'} p-3`}
            >
              {/* Image */}
              <div className="aspect-square rounded-lg bg-amber-50 dark:bg-slate-700 mb-2 flex items-center justify-center overflow-hidden">
                {product.image
                  ? <ImageLoader filename={product.image} name={product.name} />
                  : <Coffee className="w-8 h-8 text-amber-300" />
                }
              </div>
              {/* Info */}
              <p className="text-xs font-semibold text-slate-800 dark:text-white line-clamp-2 mb-1">{product.name}</p>
              {product.category && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${CAT_COLORS[product.category.color ?? 'default']}`}>
                  {product.category.name}
                </span>
              )}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{product.price.toFixed(2)}</span>
                <span className={`text-[10px] font-medium ${product.stock <= product.reorderPoint ? 'text-orange-500' : 'text-slate-500'}`}>
                  Stock: {product.stock}
                </span>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-1 mt-2">
                <button onClick={() => toggleAvailability(product)} className={`p-1 rounded-lg transition-colors ${product.isAvailable ? 'text-green-500 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`} title={product.isAvailable ? 'Mark unavailable' : 'Mark available'}>
                  {product.isAvailable ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                </button>
                <button onClick={() => openEdit(product)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(product)} className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* â”€â”€ Add/Edit Product Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {editTarget ? 'Edit Product' : 'Add Product'}
            </h3>

            {/* ── Image picker ──────────────────────────────────────────── */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Product Image</label>
              <div className="flex gap-3 items-start">
                <div className="w-20 h-20 rounded-xl bg-amber-50 dark:bg-slate-700 border-2 border-dashed border-amber-200 dark:border-amber-700 flex items-center justify-center overflow-hidden shrink-0 relative">
                  {imagePreview
                    ? <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                    : <Coffee className="w-8 h-8 text-amber-300" />
                  }
                  {imagePreview && (
                    <button onClick={() => { setImagePreview(null); setImageFile(null) }}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button type="button" onClick={() => imgInputRef.current?.click()}
                    className="px-3 py-2 text-xs font-medium border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    {imagePreview ? 'Change Image' : 'Choose Image'}
                  </button>
                  <p className="text-[10px] text-slate-400">JPG, PNG, WEBP</p>
                  <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-500">Category</label>
                  <button type="button" onClick={openCatCreate}
                    className="flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 hover:text-amber-700 font-medium">
                    <Plus className="w-3 h-3" /> New category
                  </button>
                </div>
                <select value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none">
                  <option value="">â€” None â€”</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Price *</label>
                <input type="number" min={0} step={0.01} value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Cost</label>
                <input type="number" min={0} step={0.01} value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Stock</label>
                <input type="number" min={0} value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Low-stock Alert</label>
                <input type="number" min={0} value={form.reorderPoint} onChange={e => setForm(p => ({ ...p, reorderPoint: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none resize-none" />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" id="avail" checked={form.isAvailable} onChange={e => setForm(p => ({ ...p, isAvailable: e.target.checked }))} className="w-4 h-4 accent-amber-500" />
                <label htmlFor="avail" className="text-xs text-slate-700 dark:text-slate-300">Available on POS</label>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium">
                {saving ? 'Savingâ€¦' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* â”€â”€ Category Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {catModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCatModal(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{editCat ? 'Edit Category' : 'Add Category'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Name *</label>
                <input type="text" value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Color</label>
                  <select value={catForm.color} onChange={e => setCatForm(p => ({ ...p, color: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none">
                    {['amber','orange','teal','green','violet','blue'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Icon (emoji)</label>
                  <input type="text" value={catForm.icon} maxLength={2} onChange={e => setCatForm(p => ({ ...p, icon: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none" />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCatModal(false)} className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400">Cancel</button>
              <button onClick={handleSaveCat} disabled={savingCat} className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium">
                {savingCat ? 'Savingâ€¦' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
