import { useState } from 'react'
import { X, Plus, Trash2, Package } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import AddCategoryDialog from './AddCategoryDialog'
import AddStoreDialog from './AddStoreDialog'
import type { NewCategory } from './AddCategoryDialog'
import type { NewStore } from './AddStoreDialog'

type ProductVariant = {
  id: string
  attributes: { name: string; value: string }[]
  sku: string
  barcode?: string
  price: number
  stock: number
}

type FormData = {
  name: string
  baseSKU: string
  baseBarcode: string
  categoryId: string
  description: string
  basePrice: number
  baseCost: number
  baseStock: number
  storeId: string
  images: string[]
  hasVariants: boolean
  variants: ProductVariant[]
}

type FormErrors = {
  name?: string
  baseSKU?: string
  categoryId?: string
  basePrice?: string
  baseCost?: string
  images?: string
}

type Store = {
  id: string
  name: string
  location: string
}

type Category = {
  id: string
  name: string
  description?: string | null
}

type ProductFormProps = {
  formData: FormData
  setFormData: (data: FormData) => void
  errors: FormErrors
  stores: Store[]
  categories: Category[]
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveImage: (index: number) => void
  newVariant: { attributes: { name: string; value: string }[]; sku: string; barcode: string; price: number; stock: number }
  setNewVariant: (v: any) => void
  onAddVariant: () => void
  onRemoveVariant: (id: string) => void
  // Batch variant props
  batchMode: boolean
  setBatchMode: (mode: boolean) => void
  batchVariant: {
    attributes: { name: string; values: string[] }[]
    baseSKU: string
    baseBarcode: string
    price: number
    stock: number
  }
  setBatchVariant: (v: any) => void
  onAddBatchAttribute: (name: string) => void
  onAddAttributeValue: (attrName: string, value: string) => void
  onRemoveAttributeValue: (attrName: string, value: string) => void
  onRemoveBatchAttribute: (name: string) => void
  onGenerateBatchVariants: () => void
  // New props for inline variant editing
  isEditMode?: boolean
  onVariantPriceChange?: (index: number, newPrice: number) => void
  onVariantStockChange?: (index: number, newStock: number) => void
  onOpenStockDialog?: (index: number, variant: any) => void
  /** Called after a new category is created inline so the parent refreshes its list */
  onCategoryCreated?: (category: NewCategory) => void
  /** Called after a new store is created inline so the parent refreshes its list */
  onStoreCreated?: (store: NewStore) => void
}

/** Small inline input for adding values to a batch attribute */
function AttrValueInput({ attrName, onAdd }: { attrName: string; onAdd: (name: string, value: string) => void }) {
  const [val, setVal] = useState('')
  return (
    <div className="flex gap-2 mt-1">
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && val.trim()) {
            onAdd(attrName, val.trim())
            setVal('')
          }
        }}
        className="input-field flex-1 text-sm py-1"
        placeholder={`Add value for ${attrName}`}
      />
      <button
        type="button"
        onClick={() => {
          if (val.trim()) {
            onAdd(attrName, val.trim())
            setVal('')
          }
        }}
        className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

export default function ProductForm({
  formData,
  setFormData,
  errors,
  stores,
  categories,
  onImageUpload,
  onRemoveImage,
  newVariant,
  setNewVariant,
  onAddVariant,
  onRemoveVariant,
  batchMode,
  setBatchMode,
  batchVariant,
  setBatchVariant,
  onAddBatchAttribute,
  onAddAttributeValue,
  onRemoveAttributeValue,
  onRemoveBatchAttribute,
  onGenerateBatchVariants,
  isEditMode = false,
  onVariantPriceChange,
  onVariantStockChange,
  onOpenStockDialog,
  onCategoryCreated,
  onStoreCreated
}: Readonly<ProductFormProps>): JSX.Element {
  const { t } = useLanguage()
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [showAddStore, setShowAddStore] = useState(false)
  // Local state for inline attribute input (single variant mode)
  const [attrNameInput, setAttrNameInput] = useState('')
  const [attrValueInput, setAttrValueInput] = useState('')
  // Local state for batch attribute input
  const [batchAttrNameInput, setBatchAttrNameInput] = useState('')

  const handleCategoryCreated = (category: NewCategory) => {
    setFormData({ ...formData, categoryId: category.id })
    onCategoryCreated?.(category)
  }

  const handleStoreCreated = (store: NewStore) => {
    setFormData({ ...formData, storeId: store.id })
    onStoreCreated?.(store)
  }
  
  return (
    <div className="space-y-6">
      {/* Product Images */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          {t('productImages')}
        </label>
        <div className="grid grid-cols-4 gap-3">
          {formData.images.map((img, idx) => (
            <div key={idx} className="relative group">
              <img src={img} alt={`Product ${idx + 1}`} className="w-full h-24 object-cover rounded-lg" />
              <button
                onClick={() => onRemoveImage(idx)}
                className="absolute -top-2 -right-2 p-1 bg-error text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {formData.images.length < 4 && (
            <label className="w-full h-24 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
              <Plus size={24} className="text-slate-400" />
              <span className="text-xs text-slate-500 mt-1">{t('addImage')}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={onImageUpload}
              />
            </label>
          )}
        </div>
        {errors.images && <p className="text-error text-sm mt-1">{errors.images}</p>}
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('productNameRequired')}
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={`input-field w-full ${errors.name ? 'border-error' : ''}`}
            placeholder={t('productNamePlaceholder')}
          />
          {errors.name && <p className="text-error text-sm mt-1">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('baseSKURequired')}
          </label>
          <input
            type="text"
            value={formData.baseSKU}
            onChange={(e) => setFormData({ ...formData, baseSKU: e.target.value.toUpperCase() })}
            className={`input-field w-full ${errors.baseSKU ? 'border-error' : ''}`}
            placeholder={t('baseSKUPlaceholder')}
          />
          {errors.baseSKU && <p className="text-error text-sm mt-1">{errors.baseSKU}</p>}
        </div>
      </div>

      {!formData.hasVariants && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Base Barcode (optional)
          </label>
          <input
            type="text"
            value={formData.baseBarcode}
            onChange={(e) => setFormData({ ...formData, baseBarcode: e.target.value.toUpperCase() })}
            onFocus={(e) => e.target.select()}
            className="input-field w-full"
            placeholder="Enter barcode or leave empty to auto-generate"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Will auto-generate BAR{formData.baseSKU || 'SKU'} if left empty
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {t('description')}
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="input-field w-full"
          rows={3}
          placeholder={t('productDescription')}
        />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('categoryRequired')}
            </label>
            <button
              type="button"
              onClick={() => setShowAddCategory(true)}
              title={t('addNewCategory') || 'Add new category'}
              className="p-1 rounded-md text-primary hover:bg-primary/10 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
          <select
            value={formData.categoryId}
            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            className={`input-field w-full ${errors.categoryId ? 'border-error' : ''}`}
          >
            <option value="">{t('selectCategory')}</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.categoryId && <p className="text-error text-sm mt-1">{errors.categoryId}</p>}
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('storeAssignment')}
            </label>
            <button
              type="button"
              onClick={() => setShowAddStore(true)}
              title={t('addNewStore') || 'Add new store'}
              className="p-1 rounded-md text-primary hover:bg-primary/10 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
          <select
            value={formData.storeId}
            onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
            className="input-field w-full"
          >
            <option value="">{t('noStore')}</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>
                {store.name} - {store.location}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('assignToStore')}
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('basePriceRequired')}
          </label>
          <input
            type="number"
            value={formData.basePrice}
            onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
            className={`input-field w-full ${errors.basePrice ? 'border-error' : ''}`}
            placeholder="0.00"
            step="1"
            min="0"
          />
          {errors.basePrice && <p className="text-error text-sm mt-1">{errors.basePrice}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('baseCostRequired')}
          </label>
          <input
            type="number"
            value={formData.baseCost}
            onChange={(e) => setFormData({ ...formData, baseCost: parseFloat(e.target.value) || 0 })}
            className={`input-field w-full ${errors.baseCost ? 'border-error' : ''}`}
            placeholder="0.00"
            step="1"
            min="0"
          />
          {errors.baseCost && <p className="text-error text-sm mt-1">{errors.baseCost}</p>}
        </div>
        {!formData.hasVariants && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('stockRequired')} {isEditMode && <span className="text-xs text-blue-600 dark:text-blue-400">({t('tracked')})</span>}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={formData.baseStock}
                onChange={(e) => setFormData({ ...formData, baseStock: parseInt(e.target.value) || 0 })}
                disabled={isEditMode}
                className="input-field flex-1"
                placeholder="0"
                min="0"
                title={isEditMode ? t('useAdjustStockButton') : t('setInitialStock')}
              />
              {isEditMode && onOpenStockDialog && formData.variants.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const defaultVariant = formData.variants[0]
                    if (defaultVariant && defaultVariant.id && !defaultVariant.id.startsWith('temp-')) {
                      onOpenStockDialog(0, defaultVariant)
                    }
                  }}
                  className="px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 
                           bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 
                           rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5"
                  title={t('adjustStockWithReason')}
                >
                  <Package size={16} />
                  {t('adjustStock')}
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isEditMode 
                ? t('stockChangesTracked')
                : t('initialStockQuantity')}
            </p>
          </div>
        )}
      </div>

      {/* Variants Toggle */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{t('productVariants')}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">{t('addVariantOptions')}</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.hasVariants}
              onChange={(e) => setFormData({ ...formData, hasVariants: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary"></div>
          </label>
        </div>

        {formData.hasVariants && (
          <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
            {/* Mode Toggle */}
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => setBatchMode(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  !batchMode
                    ? 'bg-primary text-white'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600'
                }`}
              >
                {t('singleVariant')}
              </button>
              <button
                onClick={() => setBatchMode(true)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  batchMode
                    ? 'bg-primary text-white'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600'
                }`}
              >
                {t('batchVariants')}
              </button>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {batchMode ? t('createMultipleVariants') : t('addOneVariant')}
              </span>
            </div>

            {/* Single Variant Mode */}
            {!batchMode && (
              <div className="space-y-3">
                {/* Current attributes list */}
                {newVariant.attributes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {newVariant.attributes.map((attr, i) => (
                      <span key={i} className="px-2 py-1 bg-primary/10 text-primary rounded text-sm flex items-center gap-1.5">
                        <span className="font-medium">{attr.name}:</span> {attr.value}
                        <button
                          type="button"
                          onClick={() => setNewVariant({ ...newVariant, attributes: newVariant.attributes.filter((_, j) => j !== i) })}
                          className="hover:text-primary/60"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {/* Add attribute row */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={attrNameInput}
                    onChange={(e) => setAttrNameInput(e.target.value)}
                    className="input-field flex-1"
                    placeholder="Attribute name (e.g. Color, RAM)"
                  />
                  <input
                    type="text"
                    value={attrValueInput}
                    onChange={(e) => setAttrValueInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && attrNameInput.trim() && attrValueInput.trim()) {
                        if (newVariant.attributes.some(a => a.name.toLowerCase() === attrNameInput.trim().toLowerCase())) {
                          return
                        }
                        setNewVariant({ ...newVariant, attributes: [...newVariant.attributes, { name: attrNameInput.trim(), value: attrValueInput.trim() }] })
                        setAttrNameInput('')
                        setAttrValueInput('')
                      }
                    }}
                    className="input-field flex-1"
                    placeholder="Value (e.g. Red, 8GB)"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (attrNameInput.trim() && attrValueInput.trim()) {
                        if (newVariant.attributes.some(a => a.name.toLowerCase() === attrNameInput.trim().toLowerCase())) {
                          return
                        }
                        setNewVariant({ ...newVariant, attributes: [...newVariant.attributes, { name: attrNameInput.trim(), value: attrValueInput.trim() }] })
                        setAttrNameInput('')
                        setAttrValueInput('')
                      }
                    }}
                    className="px-3 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
                    title="Add attribute"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                {/* SKU, barcode, price, stock + add button */}
                <div className="grid grid-cols-5 gap-3">
                  <input
                    type="text"
                    value={newVariant.sku}
                    onChange={(e) => setNewVariant({ ...newVariant, sku: e.target.value.toUpperCase() })}
                    className="input-field"
                    placeholder={t('sku')}
                  />
                  <input
                    type="text"
                    value={newVariant.barcode}
                    onChange={(e) => setNewVariant({ ...newVariant, barcode: e.target.value.toUpperCase() })}
                    onFocus={(e) => e.target.select()}
                    className="input-field"
                    placeholder="Barcode (optional)"
                  />
                  <input
                    type="number"
                    value={newVariant.price || ''}
                    onChange={(e) => setNewVariant({ ...newVariant, price: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                    placeholder={t('price')}
                    step="1"
                  />
                  <input
                    type="number"
                    value={newVariant.stock || ''}
                    onChange={(e) => setNewVariant({ ...newVariant, stock: parseInt(e.target.value) || 0 })}
                    className="input-field"
                    placeholder={t('stock')}
                  />
                  <button
                    onClick={onAddVariant}
                    className="btn-primary flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    {t('add')}
                  </button>
                </div>
              </div>
            )}

            {/* Batch Variant Mode */}
            {batchMode && (
              <div className="space-y-4">
                {/* Dynamic Attributes Section */}
                <div className="bg-white dark:bg-slate-700 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Attributes
                  </label>

                  {/* Existing attribute definitions */}
                  {batchVariant.attributes.map((attr) => (
                    <div key={attr.name} className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{attr.name}</span>
                        <button
                          type="button"
                          onClick={() => onRemoveBatchAttribute(attr.name)}
                          className="p-1 hover:bg-error/10 text-error rounded transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      {/* Values */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {attr.values.map(val => (
                          <span key={val} className="px-2 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-1.5">
                            {val}
                            <button type="button" onClick={() => onRemoveAttributeValue(attr.name, val)} className="hover:text-primary/60">
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                      {/* Add value inline */}
                      <AttrValueInput attrName={attr.name} onAdd={onAddAttributeValue} />
                    </div>
                  ))}

                  {/* Add new attribute */}
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={batchAttrNameInput}
                      onChange={(e) => setBatchAttrNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && batchAttrNameInput.trim()) {
                          onAddBatchAttribute(batchAttrNameInput)
                          setBatchAttrNameInput('')
                        }
                      }}
                      className="input-field flex-1"
                      placeholder="New attribute name (e.g. Color, RAM, Storage)"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (batchAttrNameInput.trim()) {
                          onAddBatchAttribute(batchAttrNameInput)
                          setBatchAttrNameInput('')
                        }
                      }}
                      className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                {/* Common Fields */}
                <div className="bg-white dark:bg-slate-700 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t('commonSettings')}
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                        {t('baseSKURequired')}
                      </label>
                      <input
                        type="text"
                        value={batchVariant.baseSKU}
                        onChange={(e) => setBatchVariant({ ...batchVariant, baseSKU: e.target.value.toUpperCase() })}
                        className="input-field w-full"
                        placeholder="SKU-BASE"
                      />
                      <p className="text-xs text-slate-500 mt-1">{t('willBe')} {batchVariant.baseSKU || 'SKU'}-1, {batchVariant.baseSKU || 'SKU'}-2, etc.</p>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                        Base Barcode (optional)
                      </label>
                      <input
                        type="text"
                        value={batchVariant.baseBarcode}
                        onChange={(e) => setBatchVariant({ ...batchVariant, baseBarcode: e.target.value.toUpperCase() })}
                        className="input-field w-full"
                        placeholder="BARCODE-BASE"
                      />
                      <p className="text-xs text-slate-500 mt-1">Will be {batchVariant.baseBarcode || 'BAR'}-1, {batchVariant.baseBarcode || 'BAR'}-2, etc.</p>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                        {t('price')} * ($)
                      </label>
                      <input
                        type="number"
                        value={batchVariant.price || ''}
                        onChange={(e) => setBatchVariant({ ...batchVariant, price: parseFloat(e.target.value) || 0 })}
                        className="input-field w-full"
                        placeholder="0.00"
                        step="1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                        {t('stock')} ({t('units')})
                      </label>
                      <input
                        type="number"
                        value={batchVariant.stock || ''}
                        onChange={(e) => setBatchVariant({ ...batchVariant, stock: parseInt(e.target.value) || 0 })}
                        className="input-field w-full"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                {batchVariant.attributes.length > 0 && batchVariant.attributes.every(a => a.values.length > 0) && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                      {t('willCreateVariants', {
                        count: batchVariant.attributes.reduce((acc, a) => acc * a.values.length, 1)
                      })} variants
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      {batchVariant.attributes.map(a => `${a.name}: [${a.values.join(', ')}]`).join(' × ')}
                    </p>
                  </div>
                )}

                {/* Generate Button */}
                <button
                  onClick={onGenerateBatchVariants}
                  className="w-full btn-primary flex items-center justify-center gap-2 py-3"
                >
                  <Plus size={18} />
                  {t('generateAllVariants')}
                </button>
              </div>
            )}

            {/* Variant List */}
            {formData.variants.length > 0 && (
              <div className="space-y-2">
                {formData.variants.map((variant, index) => {
                  const isExistingVariant: boolean = isEditMode && !!variant.id && !variant.id.startsWith('temp-')
                  
                  return (
                    <div key={variant.id} className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary/30 transition-all">
                      {/* Compact Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(variant.attributes || []).map((attr, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                              {attr.name}: {attr.value}
                            </span>
                          ))}
                          <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs font-mono">
                            {variant.sku}
                          </span>
                          {variant.barcode && (
                            <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-mono">
                              {variant.barcode}
                            </span>
                          )}
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            • ${(variant.price * variant.stock).toFixed(2)}
                          </span>
                        </div>
                        <button
                          onClick={() => onRemoveVariant(variant.id)}
                          className="p-1 hover:bg-error/10 text-error rounded transition-colors"
                          title={t('removeVariant')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Compact Editable Fields */}
                      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                        {/* Barcode Field */}
                        <div>
                          <label className="block text-xs text-slate-600 dark:text-slate-400 mb-0.5">
                            Barcode
                          </label>
                          <input
                            type="text"
                            value={variant.barcode || ''}
                            onChange={(e) => {
                              const newVariants = [...formData.variants]
                              newVariants[index] = { ...newVariants[index], barcode: e.target.value.toUpperCase() || undefined }
                              setFormData({ ...formData, variants: newVariants })
                            }}
                            onFocus={(e) => e.target.select()}
                            className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded
                                     focus:ring-1 focus:ring-primary focus:border-primary transition-shadow
                                     bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                            placeholder="BAR..."
                          />
                        </div>
                        {/* Price Field */}
                        <div>
                          <label className="block text-xs text-slate-600 dark:text-slate-400 mb-0.5">
                            {t('price')}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={variant.price}
                            onChange={(e) => onVariantPriceChange?.(index, parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded
                                     focus:ring-1 focus:ring-primary focus:border-primary transition-shadow
                                     bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                        </div>

                        {/* Stock Field */}
                        <div>
                          <label className="block text-xs text-slate-600 dark:text-slate-400 mb-0.5">
                            {t('stock')} {isExistingVariant && <span className="text-blue-500 dark:text-blue-400">•</span>}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={variant.stock}
                            onChange={(e) => onVariantStockChange?.(index, parseInt(e.target.value) || 0)}
                            disabled={isExistingVariant}
                            className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded
                                     focus:ring-1 focus:ring-primary focus:border-primary transition-shadow
                                     bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                                     disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                            title={isExistingVariant ? t('useAdjustButton') : t('setInitialStock')}
                          />
                        </div>

                        {/* Adjust Button */}
                        {isExistingVariant && onOpenStockDialog ? (
                          <button
                            type="button"
                            onClick={() => onOpenStockDialog(index, variant)}
                            className="px-2.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 
                                     bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 
                                     rounded transition-all flex items-center gap-1 whitespace-nowrap h-[32px]"
                            title={t('adjustStockLower')}
                          >
                            <Package size={13} />
                            {t('adjust')}
                          </button>
                        ) : (
                          <div className="w-[68px]"></div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inline quick-add dialogs */}
      <AddCategoryDialog
        isOpen={showAddCategory}
        onClose={() => setShowAddCategory(false)}
        onCreated={handleCategoryCreated}
      />
      <AddStoreDialog
        isOpen={showAddStore}
        onClose={() => setShowAddStore(false)}
        onCreated={handleStoreCreated}
      />
    </div>
  )
}
