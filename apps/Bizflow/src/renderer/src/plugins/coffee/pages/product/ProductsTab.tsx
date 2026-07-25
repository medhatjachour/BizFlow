/**
 * Coffee – Products Tab
 * CRUD for coffee products with unit support (no SKU, no variants).
 */
// Need to import Coffee icon for the empty state
import { Coffee } from 'lucide-react'
import { useState, useCallback } from 'react'
import { Plus, Search } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useProducts } from './hooks/useProducts'
import { useCategories } from './hooks/useCategories'
import { productToForm, filterProducts } from './utils'
import { EMPTY_PRODUCT_FORM, EMPTY_CATEGORY_FORM } from './constants'
import type { Product, Category, ProductForm, CategoryForm } from './types'
import ProductModal from './components/ProductModal'
import CategoryModal from './components/CategoryModal'
import CategoryChip from './components/CategoryChip'
import ProductCard from './components/ProductCard'

export default function ProductsTab() {
  const { t } = useLanguage()
  
  const {
    products,
    loading,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleAvailability,
    loadImage
  } = useProducts()

  const {
    categories,
    createCategory,
    updateCategory,
    deleteCategory
  } = useCategories()

  // Filter state
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')

  // Product modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductForm>({ ...EMPTY_PRODUCT_FORM })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Category modal state
  const [catModal, setCatModal] = useState(false)
  const [catForm, setCatForm] = useState<CategoryForm>({ ...EMPTY_CATEGORY_FORM })
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [savingCat, setSavingCat] = useState(false)

  // ── Filtered products ──
  const visible = filterProducts(products, { search, categoryId: catFilter })

  // ── Product Modal Helpers ──
  const openCreate = useCallback(() => {
    setEditTarget(null)
    setForm({ ...EMPTY_PRODUCT_FORM })
    setImagePreview(null)
    setModalOpen(true)
  }, [])

  const openEdit = useCallback(
    (p: Product) => {
      setEditTarget(p)
      setForm(productToForm(p))
      setImagePreview(null)
      if (p.image) {
        loadImage(p.image).then((url) => setImagePreview(url))
      }
      setModalOpen(true)
    },
    [loadImage]
  )

  const handleSaveProduct = useCallback(
    async ({ form: f, imageFile, clearImage }: { form: ProductForm; imageFile: string | null; clearImage: boolean }) => {
      if (!f.name.trim()) return
      if (!f.price || isNaN(Number(f.price))) return

      setSaving(true)
      try {
        if (editTarget) {
          await updateProduct(editTarget.id, f, imageFile, clearImage, editTarget.image)
        } else {
          await createProduct(f, imageFile, clearImage)
        }
        setModalOpen(false)
      } finally {
        setSaving(false)
      }
    },
    [editTarget, createProduct, updateProduct]
  )

  // ── Category Modal Helpers ──
  const openCatCreate = useCallback(() => {
    setEditCat(null)
    setCatForm({ ...EMPTY_CATEGORY_FORM })
    setCatModal(true)
  }, [])

  const openCatEdit = useCallback((c: Category) => {
    setEditCat(c)
    setCatForm({
      name: c.name,
      color: c.color ?? '#f59e0b',
      icon: c.icon ?? '🍰',
      description: c.description ?? ''
    })
    setCatModal(true)
  }, [])

  const handleSaveCategory = useCallback(
    async (data: { name: string; color: string; icon?: string; description?: string }) => {
      setSavingCat(true)
      try {
        const formData: CategoryForm = {
          name: data.name,
          color: data.color,
          icon: data.icon ?? '',
          description: data.description ?? ''
        }
        if (editCat) {
          await updateCategory(editCat.id, formData)
        } else {
          await createCategory(formData)
        }
        setCatModal(false)
      } finally {
        setSavingCat(false)
      }
    },
    [editCat, createCategory, updateCategory]
  )

  // ── Render ──
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={openCatCreate}
            className="px-3 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {t('cfAddCategory') || 'Add Category'}
          </button>
          
          <button
            onClick={openCreate}
            className="px-4 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('cfAddProduct') || 'Add Product'}
          </button>
        </div>
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCatFilter('all')}
          className={`px-6 py-2 rounded-full text-xs font-medium whitespace-nowrap ${
            catFilter === 'all'
              ? 'bg-amber-500 text-white'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
          }`}
        >
          All
        </button>
        
        {categories.map((c) => (
          <CategoryChip
            key={c.id}
            category={c}
            active={catFilter === c.id}
            onClick={() => setCatFilter(c.id)}
            onEdit={openCatEdit}
            onDelete={deleteCategory}
          />
        ))}
      </div>

      {/* Products grid */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
          <Coffee className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm">{loading ? 'Loading…' : 'No products found'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {visible.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={openEdit}
              onDelete={deleteProduct}
              onToggleAvailability={toggleAvailability}
            />
          ))}
        </div>
      )}

      {/* Product Modal */}
      {modalOpen && (
        <ProductModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSaveProduct}
          initialForm={form}
          initialImage={imagePreview}
          editMode={!!editTarget}
          saving={saving}
          categories={categories}
          onNewCategory={openCatCreate}
        />
      )}

      {/* Category Modal */}
      {catModal && (
        <CategoryModal
          open={catModal}
          onClose={() => setCatModal(false)}
          onSubmit={handleSaveCategory}
          initial={catForm}
          editMode={!!editCat}
          saving={savingCat}
        />
      )}
    </div>
  )
}
