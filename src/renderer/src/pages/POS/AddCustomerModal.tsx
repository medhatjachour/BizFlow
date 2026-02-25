/**
 * Add Customer Modal Component for POS
 * Quick customer creation during checkout
 */

import { useState } from 'react'
import { User, Mail, Phone } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import { ipc } from '../../utils/ipc'
import { useToast } from '../../contexts/ToastContext'
import { useLanguage } from '../../contexts/LanguageContext'
import type { Customer } from './types'
import logger from '../../../../shared/utils/logger'

type Props = {
  show: boolean
  onClose: () => void
  onCustomerAdded: (customer: Customer) => void
}

export default function AddCustomerModal({ show, onClose, onCustomerAdded }: Props) {
  const toast = useToast()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    loyaltyTier: 'Bronze' as 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.name.trim()) {
      toast.error(t('nameIsRequired'))
      return
    }
    if (formData.email.trim() && !formData.email.includes('@')) {
      toast.error(t('pleaseEnterValidEmail'))
      return
    }
    if (!formData.phone.trim()) {
      toast.error(t('phoneNumberIsRequired'))
      return
    }

    try {
      setLoading(true)
      const result = await ipc.customers.create({
        ...formData,
        totalSpent: 0
      })

      if (result.success) {
        toast.success(t('customerAddedSuccessfully'))
        onCustomerAdded(result.customer)
        handleClose()
      } else {
        toast.error(result.message || t('failedToAddCustomer'))
        if (result.existingCustomer) {
          toast.info(`${t('existingCustomer')}: ${result.existingCustomer.name}`)
        }
      }
    } catch (error: any) {
      logger.error('Failed to add customer:', error)
      toast.error(error?.message || t('failedToAddCustomer'))
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      loyaltyTier: 'Bronze'
    })
    onClose()
  }

  return (
    <Modal isOpen={show} onClose={handleClose} title={t('addNewCustomer')} size="md" >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              <User className="inline mr-1" size={16} />
              {t('customerNameRequired')}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              placeholder={t('enterCustomerName')}
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              <Mail className="inline mr-1" size={16} />
              {t('emailAddress')} <span className="text-slate-400 text-xs">({t('optional')})</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              placeholder="customer@example.com"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              <Phone className="inline mr-1" size={16} />
              {t('phoneNumberRequired')}
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              placeholder="+1234567890"
              required
            />
          </div>

          {/* Loyalty Tier */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('loyaltyTier')}
            </label>
            <select
              value={formData.loyaltyTier}
              onChange={(e) => setFormData({ ...formData, loyaltyTier: e.target.value as any })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            >
              <option value="Bronze">Bronze</option>
              <option value="Silver">Silver</option>
              <option value="Gold">Gold</option>
              <option value="Platinum">Platinum</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              disabled={loading}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? t('addingCustomer') : t('addCustomerButton')}
            </button>
          </div>
        </form>
    </Modal>
  )
}
