import React from 'react'
import { X, Truck } from 'lucide-react'
import { PharmacySupplierItem } from '../types'
import { inputCls } from '../../components/_shared'
import { Button } from '../../components/ui'
import { useSupplierForm } from '../hooks/useSupplierForm'

interface SupplierFormModalProps {
  initial: PharmacySupplierItem | null
  onClose: () => void
  onSaved: () => void
  toast: any
  t: (k: string) => string
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  initial,
  onClose,
  onSaved,
  toast,
  t,
}) => {
  const { form, busy, setField, submit } = useSupplierForm(initial, toast, t, onSaved)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2">
            <Truck size={17} className="text-emerald-500" />
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">
              {initial ? t('phEditSupplier') || 'Edit Supplier' : t('phAddSupplier') || 'Add Supplier'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Company / Vendor Name *
            </label>
            <input
              value={form.name}
              onChange={setField('name')}
              required
              placeholder="e.g. Novartis Pharma Distro"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Contact Phone
              </label>
              <input
                value={form.phone}
                onChange={setField('phone')}
                placeholder="+1 800-555-0199"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={setField('email')}
                placeholder="orders@supplier.com"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Physical Warehouse / Office Address
            </label>
            <input
              value={form.address}
              onChange={setField('address')}
              placeholder="Industrial Zone, Block C"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Payment Terms & Procurement Notes
            </label>
            <textarea
              value={form.notes}
              onChange={setField('notes')}
              rows={2}
              placeholder="Net 30 days, delivery schedules, rep contact..."
              className={inputCls}
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="flex-1" loading={busy}>
              Save Vendor
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}