import  { useState } from 'react'
import { X, Plus, Trash2, Save, Loader2 } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useAuth } from '@renderer/contexts/AuthContext'
import { PRIORITY_CONFIG } from '../../constants'
import { formatCurrency } from '../../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export function TransitForm({ isOpen, onClose, onSuccess }: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess: () => void 
}) {
  const toast = useToast()
  const { user } = useAuth()
  
  const {t} = useLanguage()

  const [saving, setSaving] = useState(false)
  const [senderName, setSenderName] = useState('')
  const [senderPhone, setSenderPhone] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [recipientAddress, setRecipientAddress] = useState('')
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().slice(0, 10))
  const [deliveryFee, setDeliveryFee] = useState('')
  const [priority, setPriority] = useState('normal')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([{ description: '', quantity: '1', unitPrice: '', weight: '', notes: '' }])

  const itemsTotal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice || 0)), 0)
  const grandTotal = itemsTotal + Number(deliveryFee || 0)

  const handleAddItem = () => setItems([...items, { description: '', quantity: '1', unitPrice: '', weight: '', notes: '' }])
  const handleRemoveItem = (index: number) => setItems(items.filter((_, i) => i !== index))
  const handleItemChange = (index: number, field: string, value: string) => {
    setItems(items.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const handleSubmit = async () => {
    if (items.some(i => !i.description.trim() || !i.quantity)) {
      toast.error('Items need at least a description and quantity')
      return
    }

    setSaving(true)
    try {
      await window.api.coffee.transitReceipts.create({
        senderName,
        senderPhone,
        recipientName,
        recipientPhone,
        recipientAddress,
        receivedAt,
        deliveryFee: Number(deliveryFee || 0),
        priority,
        notes,
        createdById: user?.id,
        items: items.map(i => ({
          description: i.description,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice || 0),
          weight: i.weight ? Number(i.weight) : undefined,
          notes: i.notes
        }))
      })
      toast.success('Transit receipt created')
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create transit receipt')
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
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">{t('cfCreateTransitReceipt') || 'Create Transit Receipt'}</h2>
            <p className="text-sm text-slate-500">{t('cfCreateTransitReceiptDescription') || 'Create a transit receipt for orders passing through your cafe.'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3 p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Sender Info</h3>
              <input type="text" placeholder={t('cfSenderName') || 'Name'} value={senderName} onChange={e => setSenderName(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent" />
              <input type="text" placeholder={t('cfSenderPhone') || 'Phone'} value={senderPhone} onChange={e => setSenderPhone(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent" />
            </div>
            <div className="space-y-3 p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('cfRecipientInfo') || 'Recipient Info'}</h3>
              <input type="text" placeholder={t('cfRecipientName') || 'Name'} value={recipientName} onChange={e => setRecipientName(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent" />
              <input type="text" placeholder={t('cfRecipientPhone') || 'Phone'} value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent" />
              <input type="text" placeholder={t('cfRecipientAddress') || 'Address'} value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('cfReceivedDate') || 'Date'}</label>
              <input type="date" value={receivedAt} onChange={e => setReceivedAt(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('cfDeliveryFees') || 'Delivery Fee'}</label>
              <input type="number" placeholder="0.00" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">{t('cfPriority') || 'Priority'}</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent">
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <span className="font-medium text-sm">{t('cfTransitItems') || 'Transit Items (Free Text)'}</span>
              <button onClick={handleAddItem} className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                <Plus size={14} /> Add Item
              </button>
            </div>
            <div className="p-3 space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                  <input type="text" placeholder={t('cfItemDescription') || 'Item description'} value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} className="col-span-5 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-transparent" />
                  <input type="number" placeholder={t('cfQuantity') || 'Qty'} value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="col-span-2 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-transparent" />
                  <input type="number" placeholder={t('cfUnitCost') || 'Price'} value={item.unitPrice} onChange={e => handleItemChange(index, 'unitPrice', e.target.value)} className="col-span-2 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-transparent" />
                  <input type="text" placeholder={t('cfWeight') || 'Weight'} value={item.weight} onChange={e => handleItemChange(index, 'weight', e.target.value)} className="col-span-2 px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded bg-transparent" />
                  <button onClick={() => handleRemoveItem(index)} className="col-span-1 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded flex justify-center">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">{t('cfGrandTotal') || 'Grand Total (Items + Delivery):'}</span>
              <span className="text-lg font-bold text-blue-600">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t('cfNotes') || 'Notes'}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent" />
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl">{t('cfCancel') || 'Cancel'}</button>
          <button 
            onClick={handleSubmit} 
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? t('cfSaving') || 'Saving...' : t('cfCreateTransitReceipt') || 'Create Transit'}
          </button>
        </div>
      </div>
    </div>
  )
}
