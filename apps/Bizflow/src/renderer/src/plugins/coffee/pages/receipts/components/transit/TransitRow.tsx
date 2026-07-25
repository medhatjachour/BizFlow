import  { useState } from 'react'
import { ChevronDown, ChevronUp, MapPin, Phone, User, Trash2 } from 'lucide-react'
import { TransitReceipt } from '../../types'
import { STATUS_CONFIG, PRIORITY_CONFIG } from '../../constants'
import { formatCurrency, formatDateTime } from '../../utils'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export function TransitRow({ receipt, onStatusUpdate }: { receipt: TransitReceipt; onStatusUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const toast = useToast()
  const statusConfig = STATUS_CONFIG[receipt.status]
  const priorityConfig = PRIORITY_CONFIG[receipt.priority]
  const StatusIcon = statusConfig.icon

  const {t} = useLanguage()

  const handleStatusChange = async (newStatus: string) => {
    try {
      await window.api.coffee.transitReceipts.updateStatus({ id: receipt.id, status: newStatus })
      toast.success(`Status updated to ${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG].label}`)
      onStatusUpdate()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update status')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this transit receipt?')) return
    try {
      await window.api.coffee.transitReceipts.delete(receipt.id)
      toast.success('Transit receipt deleted')
      onStatusUpdate()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete')
    }
  }

  return (
    <div className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
      <div className="p-4 flex items-center justify-between gap-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${statusConfig.color}`}>
            <StatusIcon size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{receipt.receiptNumber}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${priorityConfig.color} flex items-center gap-1`}>
                <span className={`w-1.5 h-1.5 rounded-full ${priorityConfig.dot}`}></span>
                {priorityConfig.label}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
              {receipt.senderName || 'Unknown'} → {receipt.recipientName || 'Unknown'} · {formatDateTime(receipt.receivedAt)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(receipt.totalAmount)}</p>
            {receipt.deliveryFee > 0 && <p className="text-xs text-slate-400">+{formatCurrency(receipt.deliveryFee)} delivery</p>}
          </div>
          {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-6 pb-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Sender Card */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">{t('cfSenderInfo') || 'Sender'}</h4>
              <div className="space-y-1 text-sm">
                <p className="flex items-center gap-2 text-slate-700 dark:text-slate-300"><User size={14} /> {receipt.senderName || '—'}</p>
                {receipt.senderPhone && <p className="flex items-center gap-2 text-slate-500"><Phone size={14} /> {receipt.senderPhone}</p>}
              </div>
            </div>
            
            {/* Recipient Card */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">{t('cfRecipientInfo') || 'Recipient'}</h4>
              <div className="space-y-1 text-sm">
                <p className="flex items-center gap-2 text-slate-700 dark:text-slate-300"><User size={14} /> {receipt.recipientName || '—'}</p>
                {receipt.recipientPhone && <p className="flex items-center gap-2 text-slate-500"><Phone size={14} /> {receipt.recipientPhone}</p>}
                {receipt.recipientAddress && <p className="flex items-center gap-2 text-slate-500"><MapPin size={14} /> {receipt.recipientAddress}</p>}
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="mt-4 bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">{t('cfTransitItems') || 'Items In Transit'}</h4>
            <div className="space-y-2">
              {receipt.items.map(item => (
                <div key={item.id} className="flex justify-between items-center text-sm border-b border-slate-100 dark:border-slate-700 pb-2 last:border-0">
                  <div>
                    <p className="text-slate-700 dark:text-slate-300">{item.description}</p>
                    <p className="text-xs text-slate-400">{item.quantity} × {formatCurrency(item.unitPrice)} {item.weight ? `· ${item.weight}kg` : ''}</p>
                  </div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(item.lineTotal)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Status Actions */}
          <div className="mt-4 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{t('cfUpdateStatus') || 'Update status:'}</span>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => handleStatusChange(key)}
                  disabled={receipt.status === key}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-all ${
                    receipt.status === key ? config.color + ' opacity-100 font-medium' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 hover:opacity-80'
                  }`}
                >
                  <config.icon size={12} /> {config.label}
                </button>
              ))}
            </div>
            <button onClick={handleDelete} className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
              <Trash2 size={12} /> {t('cfDelete') || 'Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
