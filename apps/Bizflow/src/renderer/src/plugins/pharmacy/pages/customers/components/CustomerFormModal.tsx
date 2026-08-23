import React, { useState } from 'react'
import { X, Percent } from 'lucide-react'
import { PharmacyCustomerItem, CustomerFormData } from '../types'
import { initialCustomerFormData } from '../utils'
import { pharma, inputCls } from '../../components/_shared'
import { Button } from '../../components/ui'

interface CustomerFormModalProps {
  initial: PharmacyCustomerItem | null
  onClose: () => void
  onSaved: () => void
  toast: any
  t: (k: string) => string
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  initial,
  onClose,
  onSaved,
  toast,
  t,
}) => {
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<CustomerFormData>(() => initialCustomerFormData(initial))

  const setField = (k: keyof CustomerFormData) => (e: any) => {
    setForm(prev => ({ ...prev, [k]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const payload = {
        ...form,
        defaultDiscount: parseFloat(form.defaultDiscount) || 0,
      }

      if (initial) {
        await pharma()?.customers.update(initial.id, payload)
      } else {
        await pharma()?.customers.create(payload)
      }

      toast.success(
        initial
          ? t('phCustomerUpdated') || 'Customer updated'
          : t('phCustomerAdded') || 'Customer added'
      )
      onSaved()
    } catch (err: any) {
      toast.error(err?.message || 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <h2 className="font-bold text-sm text-slate-900 dark:text-white">
            {initial ? t('phEditCustomer') || 'Edit Customer' : t('phAddCustomer') || 'Add Customer'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Customer Full Name *
            </label>
            <input
              value={form.name}
              onChange={setField('name')}
              required
              placeholder="e.g. John Doe"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                value={form.phone}
                onChange={setField('phone')}
                placeholder="e.g. +1 555-0199"
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
                placeholder="customer@email.com"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Address / Residence
            </label>
            <input
              value={form.address}
              onChange={setField('address')}
              placeholder="Street name, Apt / House #"
              className={inputCls}
            />
          </div>

          <div className="bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200/60 dark:border-violet-900/50 p-2.5 rounded-xl">
            <div className="flex items-center gap-1.5 text-violet-700 dark:text-violet-300 font-bold mb-1">
              <Percent size={13} />
              <span>Default Loyalty Discount (%)</span>
            </div>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={form.defaultDiscount}
              onChange={setField('defaultDiscount')}
              placeholder="e.g. 5 (Automatically applied at POS checkout)"
              className={`${inputCls} py-1 text-xs`}
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Medical / Account Notes
            </label>
            <textarea
              value={form.notes}
              onChange={setField('notes')}
              rows={2}
              placeholder="Allergies, chronic prescriptions, or payment terms..."
              className={inputCls}
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="flex-1" loading={busy}>
              Save Profile
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}