/**
 * ProductFormWrapper Component
 * Manages state and logic for ProductForm (add/edit products)
 */

import { useState, useEffect } from 'react'
import { ipc } from '@renderer/utils/ipc'
import { useToast } from '@renderer/contexts/ToastContext'
import { useAuth } from '@renderer/contexts/AuthContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import ProductForm from '@renderer/components/ProductForm'
import { PRODUCT_DEFAULTS } from '@/shared/constants'
import StockMovementDialog from '@renderer/components/StockMovementDialog'
import type { Product } from '../types'
import type { NewCategory } from '@renderer/components/AddCategoryDialog'
import type { NewStore } from '@renderer/components/AddStoreDialog'
import logger from '@/shared/utils/logger'

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
  variants: Array<{
    id: string
    attributes: { name: string; value: string }[]
    sku: string
    barcode?: string
    price: number
    stock: number
  }>
}

type FormErrors = {
  name?: string
  baseSKU?: string
  categoryId?: string
  basePrice?: string
  baseCost?: string
  images?: string
}

interface ProductFormWrapperProps {
  product?: Product | null
  onSuccess: () => void
  onCancel: () => void
}

export default function ProductFormWrapper({ product, onSuccess, onCancel }: ProductFormWrapperProps) {
  const toast = useToast()
  const { user } = useAuth()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [stores, setStores] = useState<Store[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    baseSKU: '',
    baseBarcode: '',
    categoryId: '',
    description: '',
    basePrice: 0,
    baseCost: 0,
    baseStock: 0,
    storeId: '',
    images: [],
    hasVariants: false,
    variants: []
  })

  const [errors, setErrors] = useState<FormErrors>({})

  // Variant form state
  const [newVariant, setNewVariant] = useState({
    attributes: [] as { name: string; value: string }[],
    sku: '',
    barcode: '',
    price: 0,
    stock: 0
  })

  // Batch variant creation state
  const [batchMode, setBatchMode] = useState(false)
  const [batchVariant, setBatchVariant] = useState({
    attributes: [] as { name: string; values: string[] }[],
    baseSKU: '',
    baseBarcode: '',
    price: 0,
    stock: 0
  })

  // Stock movement dialog state
  const [stockMovementDialog, setStockMovementDialog] = useState<{
    isOpen: boolean
    variantId: string | null
    variantIndex: number | null
    productName: string
    variantLabel: string
    currentStock: number
  }>({ 
    isOpen: false, 
    variantId: null, 
    variantIndex: null,
    productName: '', 
    variantLabel: '', 
    currentStock: 0 
  })
  // Load stores and categories
  useEffect(() => {
    loadStores()
    loadCategories()
  }, [])

  // Load product data if editing
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        baseSKU: product.baseSKU,
        baseBarcode: product.baseBarcode || '',
        categoryId: product.categoryId || '',
        description: product.description || '',
        basePrice: product.basePrice,
        baseCost: product.baseCost,
        baseStock: 0,
        storeId: '',
        images: product.images?.map(img => img.imageData) || [],
        hasVariants: product.hasVariants,
        variants: product.variants?.map(v => ({
          id: v.id,
          attributes: (v as any).attributeValues?.map((av: any) => ({name: av.attribute?.name || '', value: av.value})) || [],
          sku: v.sku,
          barcode: v.barcode || undefined,
          price: v.price,
          stock: v.stock
        })) || []
      })
    }
  }, [product])

  /**
   * Handle stock movement for existing product variants
   */
  const handleStockMovement = async (data: {
    mode: 'add' | 'set' | 'remove'
    value: number
    reason: string
    notes: string
  }) => {
    try {
      if (!stockMovementDialog.variantId) {
        toast.error('No variant selected')
        return
      }

      // Record the stock movement
      const result = await window.api?.stockMovements?.record({
        variantId: stockMovementDialog.variantId,
        mode: data.mode,
        value: data.value,
        reason: data.reason,
        notes: data.notes,
        userId: user?.id
      })

      if (result?.success) {
        toast.success(`Stock ${data.mode === 'add' ? 'added' : data.mode === 'remove' ? 'removed' : 'updated'} successfully`)
        
        // Update local formData to reflect new stock
        if (stockMovementDialog.variantIndex !== null) {
          const newStock = result.data?.variant?.stock || 0
          setFormData(prev => ({
            ...prev,
            variants: prev.variants.map((v, idx) => 
              idx === stockMovementDialog.variantIndex ? { ...v, stock: newStock } : v
            )
          }))
        }
        
        setStockMovementDialog(prev => ({ ...prev, isOpen: false }))
      } else {
        toast.error(result?.error || 'Failed to record stock movement')
      }
    } catch (error) {
      logger.error('Error recording stock movement:', error)
      toast.error('Failed to record stock movement')
    }
  }

  /**
   * Handle variant price update
   */
  const handleVariantPriceChange = (index: number, newPrice: number) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map((v, idx) => 
        idx === index ? { ...v, price: newPrice } : v
      )
    }))
  }

  /**
   * Handle variant stock update (for new variants or before save)
   */
  const handleVariantStockChange = (index: number, newStock: number) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map((v, idx) => 
        idx === index ? { ...v, stock: newStock } : v
      )
    }))
  }

  /**
   * Open stock adjustment dialog for a variant
   */
  const handleOpenStockDialog = (index: number, variant: any) => {
    // Only open dialog for existing variants with valid IDs
    if (product && variant.id && !variant.id.startsWith('temp-')) {
      const variantLabel = variant.attributes?.map((a: any) => `${a.name}: ${a.value}`).join(' • ') || variant.sku
      setStockMovementDialog({
        isOpen: true,
        variantId: variant.id,
        variantIndex: index,
        productName: product.name,
        variantLabel,
        currentStock: variant.stock
      })
    }
  }

  const loadStores = async () => {
    try {
      const data = await ipc.stores.getAll()
      setStores(data.filter((s: any) => s.status === 'active'))
    } catch (error) {
      logger.error('Failed to load stores:', error)
    }
  }

  const loadCategories = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('categories:getAll')
      if (result.success && result.categories) {
        setCategories(result.categories)
      }
    } catch (error) {
      logger.error('Failed to load categories:', error)
    }
  }

  /** Optimistically append a newly-created category and auto-select it */
  const handleCategoryCreated = (category: NewCategory) => {
    setCategories((prev) => [...prev, { id: category.id, name: category.name, description: category.description }])
    setFormData((prev) => ({ ...prev, categoryId: category.id }))
  }

  /** Optimistically append a newly-created store and auto-select it */
  const handleStoreCreated = (store: NewStore) => {
    setStores((prev) => [...prev, { id: store.id, name: store.name, location: store.location }])
    setFormData((prev) => ({ ...prev, storeId: store.id }))
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required'
    }

    if (!formData.baseSKU.trim()) {
      newErrors.baseSKU = 'SKU is required'
    }

    if (!formData.categoryId.trim()) {
      newErrors.categoryId = 'Category is required'
    }

    if (formData.basePrice <= 0) {
      newErrors.basePrice = 'Price must be greater than 0'
    }

    if (formData.baseCost < 0) {
      newErrors.baseCost = 'Cost cannot be negative'
    }

    if (formData.images.length > 5) {
      newErrors.images = 'Maximum 5 images allowed'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const remainingSlots = 5 - formData.images.length
    if (remainingSlots === 0) {
      toast.error('Maximum 5 images allowed')
      return
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots)
    
    filesToProcess.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, base64]
        }))
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  const handleAddVariant = async () => {
    if (newVariant.attributes.length === 0 || !newVariant.sku) {
      toast.error('Please add at least one attribute and enter a SKU')
      return
    }

    if (newVariant.price <= 0) {
      toast.error('Variant price must be greater than 0')
      return
    }

    if (newVariant.stock < 0) {
      toast.error('Variant stock cannot be negative')
      return
    }

    const attrKey = newVariant.attributes.map(a => `${a.name}:${a.value}`).sort().join('|')
    const variantExists = formData.variants.some(
      v => v.attributes.map(a => `${a.name}:${a.value}`).sort().join('|') === attrKey
    )

    if (variantExists) {
      toast.error('A variant with this attribute combination already exists')
      return
    }

    const skuExists = formData.variants.some(
      v => v.sku === newVariant.sku
    )

    if (skuExists) {
      toast.error(`A variant with SKU "${newVariant.sku}" already exists in this product`)
      return
    }

    // Auto-generate barcode if not provided
    const barcode = newVariant.barcode || `BAR${newVariant.sku}`

    // Check for duplicate barcode within this product
    const barcodeExists = formData.variants.some(
      v => v.barcode && v.barcode === barcode
    )

    if (barcodeExists) {
      toast.error(`A variant with barcode "${barcode}" already exists in this product`)
      return
    }

    // Check for global barcode uniqueness
    try {
      const existingProduct = await window.api.inventory.searchByBarcode(barcode)
      if (existingProduct && existingProduct.id !== product?.id) {
        toast.error(`Barcode "${barcode}" is already used by another product: ${existingProduct.name}`)
        return
      }
    } catch (error) {
      logger.error('Error checking barcode uniqueness:', error)
      toast.error('Failed to validate barcode uniqueness')
      return
    }

    setFormData(prev => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          id: `temp-${Date.now()}`,
          attributes: newVariant.attributes,
          sku: newVariant.sku,
          barcode: barcode,
          price: newVariant.price,
          stock: newVariant.stock
        }
      ]
    }))

    setNewVariant({
      attributes: [],
      sku: '',
      barcode: '',
      price: 0,
      stock: 0
    })

    toast.success('Variant added')
  }

  const handleRemoveVariant = (id: string) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter(v => v.id !== id)
    }))
    toast.success('Variant removed')
  }

  // Batch attribute handlers (EAV)
  const handleAddBatchAttribute = (name: string) => {
    if (!name.trim()) return
    if (batchVariant.attributes.some(a => a.name.toLowerCase() === name.trim().toLowerCase())) {
      toast.error('Attribute already exists')
      return
    }
    setBatchVariant(prev => ({
      ...prev,
      attributes: [...prev.attributes, { name: name.trim(), values: [] }]
    }))
  }

  const handleAddAttributeValue = (attrName: string, value: string) => {
    if (!value.trim()) return
    setBatchVariant(prev => ({
      ...prev,
      attributes: prev.attributes.map(a =>
        a.name === attrName && !a.values.includes(value.trim())
          ? { ...a, values: [...a.values, value.trim()] }
          : a
      )
    }))
  }

  const handleRemoveAttributeValue = (attrName: string, value: string) => {
    setBatchVariant(prev => ({
      ...prev,
      attributes: prev.attributes.map(a =>
        a.name === attrName
          ? { ...a, values: a.values.filter(v => v !== value) }
          : a
      )
    }))
  }

  const handleRemoveBatchAttribute = (name: string) => {
    setBatchVariant(prev => ({
      ...prev,
      attributes: prev.attributes.filter(a => a.name !== name)
    }))
  }

  const handleGenerateBatchVariants = async () => {
    // Validation
    if (!batchVariant.baseSKU.trim()) {
      toast.error('Please enter a base SKU')
      return
    }

    if (batchVariant.price <= 0) {
      toast.error('Price must be greater than 0')
      return
    }

    if (batchVariant.stock < 0) {
      toast.error('Stock cannot be negative')
      return
    }

    if (batchVariant.attributes.length === 0) {
      toast.error('Please add at least one attribute')
      return
    }

    const emptyAttr = batchVariant.attributes.find(a => a.values.length === 0)
    if (emptyAttr) {
      toast.error(`Attribute "${emptyAttr.name}" has no values`)
      return
    }

    // Cartesian product of all attribute values
    const cartesian = (attrs: { name: string; values: string[] }[]): { name: string; value: string }[][] => {
      return attrs.reduce<{ name: string; value: string }[][]>((acc, attr) => {
        return acc.flatMap(combo => attr.values.map(v => [...combo, { name: attr.name, value: v }]))
      }, [[]])
    }

    const combos = cartesian(batchVariant.attributes)
    let counter = 1
    const baseSKU = batchVariant.baseSKU.trim().toUpperCase()

    const newVariants: Array<{
      id: string
      attributes: { name: string; value: string }[]
      sku: string
      barcode: string
      price: number
      stock: number
    }> = combos.map(attrs => {
      const sku = `${baseSKU}-${counter}`
      const barcode = batchVariant.baseBarcode
        ? `${batchVariant.baseBarcode}-${counter}`
        : `BAR${sku}`
      counter++
      return {
        id: `temp-${Date.now()}-${counter}`,
        attributes: attrs,
        sku,
        barcode,
        price: batchVariant.price,
        stock: batchVariant.stock
      }
    })

    // Check for duplicate attribute combinations
    const existingKeys = new Set(
      formData.variants.map(v =>
        v.attributes.map(a => `${a.name}:${a.value}`).sort().join('|')
      )
    )
    const duplicates = newVariants.filter(v =>
      existingKeys.has(v.attributes.map(a => `${a.name}:${a.value}`).sort().join('|'))
    )

    if (duplicates.length > 0) {
      toast.error('Some variant combinations already exist')
      return
    }

    // Check for global barcode uniqueness
    try {
      for (const variant of newVariants) {
        const existingProduct = await window.api.inventory.searchByBarcode(variant.barcode)
        if (existingProduct && existingProduct.id !== product?.id) {
          toast.error(`Barcode "${variant.barcode}" is already used by another product: ${existingProduct.name}`)
          return
        }
      }
    } catch (error) {
      logger.error('Error checking barcode uniqueness:', error)
      toast.error('Failed to validate barcode uniqueness')
      return
    }

    // Add all variants
    setFormData(prev => ({
      ...prev,
      variants: [...prev.variants, ...newVariants]
    }))

    // Reset batch form
    setBatchVariant({
      attributes: [],
      baseSKU: '',
      baseBarcode: '',
      price: 0,
      stock: 0
    })

    toast.success(`${newVariants.length} variants created successfully`)
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix the form errors')
      return
    }

    if (formData.hasVariants && formData.variants.length === 0) {
      toast.error('Please add at least one variant or disable variants')
      return
    }

    setLoading(true)

    try {
      // Auto-generate baseBarcode if not provided for products without variants
      const finalBaseBarcode = !formData.hasVariants && !formData.baseBarcode.trim()
        ? `BAR${formData.baseSKU.trim()}`
        : formData.baseBarcode.trim() || undefined

      // Prepare data for API
      const productData = {
        name: formData.name.trim(),
        baseSKU: formData.baseSKU.trim(),
        baseBarcode: finalBaseBarcode,
        categoryId: formData.categoryId,
        description: formData.description.trim(),
        basePrice: formData.basePrice,
        baseCost: formData.baseCost,
        hasVariants: formData.hasVariants,
        storeId: formData.storeId || undefined, // Include storeId
        images: formData.images,
        variants: formData.hasVariants ? formData.variants.map(v => ({
          attributes: v.attributes,
          sku: v.sku,
          barcode: v.barcode,
          price: v.price,
          cost: PRODUCT_DEFAULTS.calculateDefaultCost(v.price),
          stock: v.stock
        })) : [],
        baseStock: formData.baseStock
      }

      let result
      if (product) {
        // Update existing product
        result = await ipc.products.update(product.id, productData)
      } else {
        // Create new product
        result = await ipc.products.create(productData)
      }

      if (result.success) {
        toast.success(product ? 'Product updated successfully' : 'Product created successfully')
        onSuccess()
      } else {
        // Show detailed error message from backend
        const errorMsg = result.message || 'Failed to save product'
        toast.error(errorMsg, 8000) // 8 seconds for longer error messages
      }
    } catch (error: any) {
      logger.error('Failed to save product:', error)
      // Show detailed error with stack trace if available
      const errorMsg = error?.message || error?.toString() || 'Failed to save product'
      toast.error(`Error: ${errorMsg}`, 8000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <ProductForm
        formData={formData}
        setFormData={setFormData}
        errors={errors}
        stores={stores}
        categories={categories}
        onImageUpload={handleImageUpload}
        onRemoveImage={handleRemoveImage}
        newVariant={newVariant}
        setNewVariant={setNewVariant}
        onAddVariant={handleAddVariant}
        onRemoveVariant={handleRemoveVariant}
        batchMode={batchMode}
        setBatchMode={setBatchMode}
        batchVariant={batchVariant}
        setBatchVariant={setBatchVariant}
        onAddBatchAttribute={handleAddBatchAttribute}
        onAddAttributeValue={handleAddAttributeValue}
        onRemoveAttributeValue={handleRemoveAttributeValue}
        onRemoveBatchAttribute={handleRemoveBatchAttribute}
        onGenerateBatchVariants={handleGenerateBatchVariants}
        isEditMode={!!product}
        onVariantPriceChange={handleVariantPriceChange}
        onVariantStockChange={handleVariantStockChange}
        onOpenStockDialog={handleOpenStockDialog}
        onCategoryCreated={handleCategoryCreated}
        onStoreCreated={handleStoreCreated}
      />

      {/* Stock Movement Dialog */}
      <StockMovementDialog
        isOpen={stockMovementDialog.isOpen}
        onClose={() => setStockMovementDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleStockMovement}
        productName={stockMovementDialog.productName}
        variantLabel={stockMovementDialog.variantLabel}
        currentStock={stockMovementDialog.currentStock}
      />

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          {t('cancel')}
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              {t('loading')}...
            </>
          ) : (
            product ? t('edit') + ' ' + t('productName') : t('add') + ' ' + t('productName')
          )}
        </button>
      </div>
    </div>
  )
}
