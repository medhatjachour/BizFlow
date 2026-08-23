import React, { useState } from 'react'
import { X, Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { LocationItem, OrderType, OrderPriority, CreateOrderFormData } from '../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'

interface Props {
  isOpen: boolean
  onClose: () => void
  locations: LocationItem[]
  onSuccess: () => Promise<void>
}

export const CreateOrderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  locations,
  onSuccess
}) => {
  const { t } = useLanguage()
  const toast = useToast()
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState<CreateOrderFormData>({
    orderType: 'inbound',
    sourceRef: '',
    partnerName: '',
    locationId: '',
    createdBy: 'warehouse.manager',
    priority: 'normal',
    lines: [{ productName: '', sku: '', requestedQty: '1', unit: 'pcs' }]
  })

  if (!isOpen) return null

  const handleAddLine = () => {
    setForm(f => ({
      ...f,
      lines: [...f.lines, { productName: '', sku: '', requestedQty: '1', unit: 'pcs' }]
    }))
  }

  const handleRemoveLine = (index: number) => {
    setForm(f => ({
      ...f,
      lines: f.lines.length === 1 ? f.lines : f.lines.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.locationId) {
      toast.warning(t('warehouseSelectLocationFirst') || 'Please select a warehouse location.')
      return
    }

    const cleanLines = form.lines
      .filter(l => l.productName.trim())
      .map(l => ({
        productName: l.productName.trim(),
        sku: l.sku.trim() || undefined,
        requestedQty: Math.max(1, Number(l.requestedQty) || 1),
        unit: l.unit.trim() || 'pcs'
      }))

    if (cleanLines.length === 0) {
      toast.warning(t('warehouseAddAtLeastOneLineItem') || 'Please add at least one line item.')
      return
    }

    setSubmitting(true)
    try {
      await window.api.warehouse.createOrder({
        orderType: form.orderType,
        sourceRef: form.sourceRef || undefined,
        partnerName: form.partnerName || undefined,
        locationId: form.locationId,
        createdBy: form.createdBy,
        priority: form.priority,
        lines: cleanLines
      })
      toast.success(t('warehouseOrderCreated') || 'Order initialized successfully')
      await onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err?.message || t('warehouseCreateOrderFailed') || 'Failed to create order')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t('warehouseCreateOperationalOrder') || 'Create Operational Order'}
            </h3>
            <p className="text-xs text-slate-400">Initialize a new inbound or outbound journey</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Controls */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('warehouseOrderType') || 'Order Type'}
            </label>
            <select
              value={form.orderType}
              onChange={e => setForm(f => ({ ...f, orderType: e.target.value as OrderType }))}
              className="w-full rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-800 dark:text-slate-100"
            >
              <option value="inbound">{t('warehouseInbound') || 'Inbound'}</option>
              <option value="outbound">{t('warehouseOutbound') || 'Outbound'}</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('warehouseLocation') || 'Warehouse Facility'}
            </label>
            <select
              required
              value={form.locationId}
              onChange={e => setForm(f => ({ ...f, locationId: e.target.value }))}
              className="w-full rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-800 dark:text-slate-100"
            >
              <option value="">{t('warehouseSelectLocationOption') || 'Select Location'}</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('warehousePriority') || 'Priority'}
            </label>
            <select
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value as OrderPriority }))}
              className="w-full rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-800 dark:text-slate-100"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* References */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('warehouseSourceRefLabel') || 'Source Reference'}
            </label>
            <input
              type="text"
              value={form.sourceRef}
              onChange={e => setForm(f => ({ ...f, sourceRef: e.target.value }))}
              placeholder="e.g. PO-84920, SO-1092"
              className="w-full rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('warehousePartner') || 'Partner / Customer'}
            </label>
            <input
              type="text"
              value={form.partnerName}
              onChange={e => setForm(f => ({ ...f, partnerName: e.target.value }))}
              placeholder="e.g. Acron Corp, Logistics LLC"
              className="w-full rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Line Items */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {t('warehouseOrderLines') || 'Line Items'}
            </span>
            <button
              type="button"
              onClick={handleAddLine}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Row
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {form.lines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  required
                  type="text"
                  value={line.productName}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      lines: f.lines.map((l, i) => (i === idx ? { ...l, productName: e.target.value } : l))
                    }))
                  }
                  placeholder={t('warehouseProductName') || 'Product Name'}
                  className="flex-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2"
                />
                <input
                  type="text"
                  value={line.sku}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      lines: f.lines.map((l, i) => (i === idx ? { ...l, sku: e.target.value } : l))
                    }))
                  }
                  placeholder={t('warehouseSKU') || 'SKU'}
                  className="flex-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2"
                />
                <input
                  type="number"
                  min="1"
                  value={line.requestedQty}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      lines: f.lines.map((l, i) => (i === idx ? { ...l, requestedQty: e.target.value } : l))
                    }))
                  }
                  placeholder="Qty"
                  className="w-20 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveLine(idx)}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {t('warehouseCancel') || 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {submitting ? t('warehouseCreating') || 'Creating...' : t('warehouseCreateOrder') || 'Create Order'}
          </button>
        </div>
      </form>
    </div>
  )
}