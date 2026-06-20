/**
 * Payment Methods Settings Panel
 */

import { CreditCard, DollarSign, Smartphone, Gift } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import type { PaymentMethodSettings } from './types'

type Props = {
  settings: PaymentMethodSettings
  onChange: (settings: PaymentMethodSettings) => void
}

export default function PaymentMethodsSettings({ settings, onChange }: Props) {
  const { t } = useLanguage()
  
  const handleToggle = (field: keyof PaymentMethodSettings) => {
    onChange({ ...settings, [field]: !settings[field] })
  }

  const paymentMethods = [
    { key: 'cash' as const, label: t('cash'), icon: DollarSign, description: t('acceptCash') },
    { key: 'credit' as const, label: t('creditCard'), icon: CreditCard, description: t('acceptCredit') },
    { key: 'debit' as const, label: t('debitCard'), icon: CreditCard, description: t('acceptDebit') },
    { key: 'mobile' as const, label: t('mobilePayment'), icon: Smartphone, description: t('acceptMobile') },
    { key: 'giftCard' as const, label: t('giftCard'), icon: Gift, description: t('acceptGiftCard') },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          {t('paymentMethods')}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          {t('paymentMethodsDesc')}
        </p>
      </div>

      <div className="space-y-4">
        {paymentMethods.map(({ key, label, icon: Icon, description }) => (
          <div
            key={key}
            className="glass-card p-4 flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                settings[key] ? 'bg-primary/20 text-primary' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
              }`}>
                <Icon size={24} />
              </div>
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">{label}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">{description}</div>
              </div>
            </div>
            <button
              onClick={() => handleToggle(key)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings[key] ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings[key] ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="glass-card p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-900 dark:text-blue-200">
          <strong>{t('note')}:</strong> {t('paymentMethodNote')}
        </p>
      </div>
    </div>
  )
}
