import React, { useState } from 'react'
import { DollarSign, Calendar, AlertCircle } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import FormInput from '../../components/ui/FormInput'
import FormTextarea from '../../components/ui/FormTextarea'
import logger from '../../../../shared/utils/logger'

interface InstallmentFormProps {
  isOpen: boolean
  onClose: () => void
  customerId?: string
  onSuccess: () => void
}

const InstallmentForm: React.FC<InstallmentFormProps> = ({
  isOpen,
  onClose,
  customerId,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    amount: '',
    dueDate: '',
    note: '',
    status: 'pending'
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
      const result = await window.api.installments.create({
        amount: parseFloat(formData.amount),
        dueDate: new Date(formData.dueDate).toISOString(),
        status: formData.status,
        note: formData.note || undefined,
        customerId
      })

      if (result.success) {
        onSuccess()
        setFormData({
          amount: '',
          dueDate: '',
          note: '',
          status: 'pending'
        })
      } else {
        alert('Error creating installment: ' + result.error)
      }
    } catch (error) {
      logger.error('Error creating installment:', error)
      alert('Error creating installment')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Installment" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-blue-600 dark:text-blue-400 mt-0.5" size={16} />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium">Installment Payment</p>
              <p className="mt-1">This will create a scheduled payment that the customer needs to pay by the due date.</p>
            </div>
          </div>
        </div>

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
            label="Due Date"
            type="date"
            value={formData.dueDate}
            onChange={(value) => setFormData(prev => ({ ...prev, dueDate: value }))}
            required
            icon={<Calendar size={16} />}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <FormTextarea
          label="Note (Optional)"
          value={formData.note}
          onChange={(value) => setFormData(prev => ({ ...prev, note: value }))}
          placeholder="Additional notes about this installment..."
          rows={3}
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Installment Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent"
            required
          >
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="prepaid">Prepaid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

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
            disabled={isSubmitting || !formData.amount || !formData.dueDate}
            loading={isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Add Installment'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default InstallmentForm
