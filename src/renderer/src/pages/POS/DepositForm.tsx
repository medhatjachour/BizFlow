import React, { useState } from 'react'
import { DollarSign, Calendar, CreditCard, Banknote } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import FormInput from '../../components/ui/FormInput'
import SelectWithIcons from '../../components/ui/SelectWithIcons'
import FormTextarea from '../../components/ui/FormTextarea'
import logger from '../../../../shared/utils/logger'

interface DepositFormProps {
  isOpen: boolean
  onClose: () => void
  customerId?: string
  onSuccess: () => void
}

const DepositForm: React.FC<DepositFormProps> = ({
  isOpen,
  onClose,
  customerId,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'cash',
    note: '',
    status: 'paid'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!customerId) {
      alert('Customer ID is required')
      setIsSubmitting(false)
      return
    }

    try {
      const result = await window.api.deposits.create({
        amount: parseFloat(formData.amount),
        date: new Date(formData.date).toISOString(),
        method: formData.method,
        status: formData.status,
        note: formData.note || undefined,
        customerId
      })

      if (result.success) {
        onSuccess()
        setFormData({
          amount: '',
          date: new Date().toISOString().split('T')[0],
          method: 'cash',
          note: '',
          status: 'paid'
        })
      } else {
        alert('Error creating deposit: ' + result.error)
      }
    } catch (error) {
      logger.error('Error creating deposit:', error)
      alert('Error creating deposit')
    } finally {
      setIsSubmitting(false)
    }
  }

  const paymentMethods = [
    { value: 'cash', label: 'Cash', icon: Banknote },
    { value: 'card', label: 'Card', icon: CreditCard },
    { value: 'bank', label: 'Bank Transfer', icon: DollarSign }
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Deposit" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Amount"
            type="number"
            step="1"
            min="0"
            value={formData.amount}
            onChange={(value) => setFormData(prev => ({ ...prev, amount: value }))}
            required
            icon={<DollarSign size={16} />}
            placeholder="0.00"
          />

          <FormInput
            label="Date"
            type="date"
            value={formData.date}
            onChange={(value) => setFormData(prev => ({ ...prev, date: value }))}
            required
            icon={<Calendar size={16} />}
          />
        </div>

        <SelectWithIcons
          label="Payment Method"
          value={formData.method}
          onChange={(value) => setFormData(prev => ({ ...prev, method: value }))}
          options={paymentMethods.map(method => ({
            value: method.value,
            label: method.label,
            icon: method.icon
          }))}
          required
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Deposit Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent"
            required
          >
            <option value="paid">Paid</option>
            <option value="prepaid">Prepaid</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <FormTextarea
          label="Note (Optional)"
          value={formData.note}
          onChange={(value) => setFormData(prev => ({ ...prev, note: value }))}
          placeholder="Additional notes about this deposit..."
          rows={3}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || !formData.amount}
            loading={isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Add Deposit'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default DepositForm
