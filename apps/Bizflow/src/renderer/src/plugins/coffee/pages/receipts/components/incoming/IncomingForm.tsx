import React, { useState } from 'react'
import { X, Plus, Trash2, Save, Loader2 } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useAuth } from '@renderer/contexts/AuthContext'
import { formatCurrency } from '../../utils'

export function IncomingForm({ isOpen, onClose, products, onSuccess }: { 
  isOpen: boolean; 
  onClose: () => void; 
  products: any[]; 
  onSuccess: () => void 
}) {
  const toast = useToast()
  const { user } = useAuth()
  
  const [saving, setSaving] = useState(false)
  const [supplierName, setSupplierName] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([{ productId: '', quantity: '1', unitCost: '', notes: '' }])

  const totalCost = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitCost || 0)), 0)

  const handleAddItem = () => setItems([...items, { productId: '', quantity: '1', unitCost: '', notes: '' }])
  const handleRemoveItem = (index: number) => setItems(items.filter((_, i) => i !== index))
  const handleItemChange = (index: number, field: string, value: string) => {
    setItems(items.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const handleSubmit = async () => {
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">New Incoming Receipt</h2>
            <p className="text-sm text-slate-500">Restock products and update inventory</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Meta Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Supplier Name</label>
              <input type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Invoice Number</label>
              <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Received Date</label>
              <input type="date" value={receivedAt} onChange={e => setReceivedAt(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent" />
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <span className="font-medium text-sm">Items</span>
              <button onClick={handleAddItem} className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                <Plus size={14} /> Add Item
              </button>
            </div>
            <div className="p-3 space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                  <select 
                    value={item.productId} 
                    onChange={e => handleItemChange(index, 'productId', e.target.value)}
                    className="col-span-5 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-transparent"
                  >
                    <option value="">Select Product</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                  </select>
                  <input type="number" placeholder="Qty" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="col-span-2 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-transparent" />
                  <input type="number" placeholder="Cost" value={item.unitCost} onChange={e => handleItemChange(index, 'unitCost', e.target.value)} className="col-span-2 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-transparent" />
                  <input type="text" placeholder="Notes" value={item.notes} onChange={e => handleItemChange(index, 'notes', e.target.value)} className="col-span-2 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-transparent" />
                  <button onClick={() => handleRemoveItem(index)} className="col-span-1 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded flex justify-center">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Cost:</span>
              <span className="text-lg font-bold text-amber-600">{formatCurrency(totalCost)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent" />
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl">Cancel</button>
          <button 
            onClick={handleSubmit} 
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Receipt'}
          </button>
        </div>
      </div>
    </div>
  )
}
