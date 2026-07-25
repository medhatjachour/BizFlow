import { useState, useRef, useEffect } from 'react'
import { X, Plus, Trash2, Save, Loader2, Search, ChevronDown } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useAuth } from '@renderer/contexts/AuthContext'
import { formatCurrency } from '../../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import type { Product } from '../../types'

// ─── Custom Searchable Dropdown Component ───────────────────────────────────────
interface ProductSearchInputProps {
  products: Product[]
  value: string
  onChange: (id: string) => void
}

function ProductSearchInput({ products, value, onChange }: ProductSearchInputProps) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        if (!value) setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [value])

  const selectedProduct = products.find(p => p.id === value)

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className="flex items-center w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
        onClick={() => {
          setIsOpen(true)
          inputRef.current?.focus()
        }}
      >
        <Search className="w-4 h-4 text-slate-400 mr-2" />
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={value ? selectedProduct?.name : "Search product..."}
          className="w-full bg-transparent outline-none text-slate-700 dark:text-white placeholder:text-slate-400"
        />
        <ChevronDown className="w-4 h-4 text-slate-400 ml-2" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500">No products found</div>
          ) : (
            filteredProducts.map(p => (
              <div
                key={p.id}
                onClick={() => {
                  onChange(p.id)
                  setIsOpen(false)
                  setSearch('')
                }}
                className={`px-3 py-1.5 text-xs cursor-pointer flex justify-between items-center transition-colors ${
                  value === p.id 
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' 
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span>{p.name}</span>
                <span className="text-slate-400 ml-2">Stock: {p.stock}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Form Component ───────────────────────────────────────────────────────
interface IncomingItem {
  productId: string
  quantity: string
  unitCost: string
  notes: string
}

export function IncomingForm({ isOpen, onClose, products, onSuccess }: { 
  isOpen: boolean; 
  onClose: () => void; 
  products: Product[]; 
  onSuccess: () => void 
}) {
  const toast = useToast()
  const { user } = useAuth()
  const { t } = useLanguage()
  
  const [saving, setSaving] = useState(false)
  const [supplierName, setSupplierName] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<IncomingItem[]>([{ productId: '', quantity: '1', unitCost: '', notes: '' }])

  const totalCost = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitCost || 0)), 0)

  const handleAddItem = () => setItems([...items, { productId: '', quantity: '1', unitCost: '', notes: '' }])
  
  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      toast.error("You must have at least one item.")
      return
    }
    setItems(items.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: keyof IncomingItem, value: string) => {
    setItems(items.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const handleSubmit = async () => {
    if (!supplierName) {
      toast.error('Please enter a supplier name')
      return
    }
    if (items.some(i => !i.productId || !i.quantity || !i.unitCost)) {
      toast.error('Please complete all product fields')
      return
    }

    setSaving(true)
    try {
      await window.api.coffee.incomingReceipts.create({
        supplierName,
        invoiceNumber,
        receivedAt,
        notes,
        createdById: user?.id,
        items: items.map(i => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          unitCost: Number(i.unitCost),
          notes: i.notes
        }))
      })
      toast.success('Receipt saved successfully')
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save receipt')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!isOpen) {
      setSupplierName('')
      setInvoiceNumber('')
      setReceivedAt(new Date().toISOString().slice(0, 10))
      setNotes('')
      setItems([{ productId: '', quantity: '1', unitCost: '', notes: '' }])
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('cfNewIncomingReceipt') || 'New Incoming Receipt'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('cfRestockProductsAndUpdateInventory') || 'Restock products and update inventory'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6 overflow-y-auto">
          {/* Meta Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t('cfSupplierName') || 'Supplier Name'} *
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t('cfInvoiceNumber') || 'Invoice Number'}
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t('cfReceivedDate') || 'Received Date'}
              </label>
              <input
                type="date"
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                {t('cfItems') || 'Items'}
              </h3>
              <button
                onClick={handleAddItem}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('cfAddItem') || 'Add Item'}
              </button>
            </div>
            {/* Grid Header */}
            <div className="hidden md:grid grid-cols-12 gap-2 px-2 mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <div className="col-span-4">Product</div>
              <div className="col-span-2">Quantity</div>
              <div className="col-span-2">Unit Cost</div>
              <div className="col-span-3">Notes</div>
              <div className="col-span-1"></div>
            </div>

            {/* Grid Body */}
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-12 md:col-span-4">
                    <ProductSearchInput
                      products={products}
                      value={item.productId}
                      onChange={(id) => handleItemChange(index, 'productId', id)}
                    />
                  </div>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    className="col-span-4 md:col-span-2 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <input
                    type="number"
                    value={item.unitCost}
                    onChange={(e) => handleItemChange(index, 'unitCost', e.target.value)}
                    className="col-span-4 md:col-span-2 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                    className="col-span-3 md:col-span-2 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    onClick={() => handleRemoveItem(index)}
                    className="col-span-1 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded flex justify-center items-center transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            
            {/* Total Footer */}
            <div className="flex justify-end items-center pt-3 border-t border-slate-200 dark:border-slate-700 mt-3">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400 mr-4">
                {t('cfTotalCost') || 'Total Cost'}:
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {formatCurrency(totalCost)}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              {t('cfNotes') || 'Notes'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? (t('cfSaving') || 'Saving...') : (t('cfSaveReceipt') || 'Save Receipt')}
          </button>
        </div>
      </div>
    </div>
  )
}
