import { useNavigate } from 'react-router-dom'
import { Edit2, Trash2, Mail, Phone, Eye } from 'lucide-react'
import { formatCurrency } from '@renderer/utils/formatNumber'
import { useLanguage } from '../../../contexts/LanguageContext'
import type { Customer } from '../types'

const TIER_GRADIENT: Record<string, string> = {
  Platinum: 'from-slate-600 to-slate-800',
  Gold: 'from-amber-500 to-amber-600',
  Silver: 'from-slate-400 to-slate-500',
  Bronze: 'from-amber-700 to-amber-800'
}

const TIER_ICON: Record<string, string> = {
  Platinum: '💎',
  Gold: '👑',
  Silver: '⭐',
  Bronze: '🥉'
}

interface Props {
  customer: Customer
  onEdit: (customer: Customer) => void
  onDelete: (id: string, customer: Customer) => void
}

export function CustomerCard({ customer, onEdit, onDelete }: Props) {
  const { t } = useLanguage()
  const navigate = useNavigate()

  const gradient = TIER_GRADIENT[customer.loyaltyTier] ?? TIER_GRADIENT.Bronze
  const icon = TIER_ICON[customer.loyaltyTier] ?? TIER_ICON.Bronze

  return (
    <div className="glass-card p-6 relative overflow-hidden hover:shadow-2xl transition-all duration-300">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 rounded-bl-full`} />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate pr-2">
            {customer.name}
          </h3>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase bg-gradient-to-r ${gradient} text-white flex items-center gap-1 shrink-0`}>
            <span>{icon}</span>
            {customer.loyaltyTier}
          </span>
        </div>

        {/* Contact */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Mail size={16} className="shrink-0" />
            <span className="truncate">{customer.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Phone size={16} className="shrink-0" />
            {customer.phone}
          </div>
        </div>

        {/* Stats */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400">{t('totalSpent')}</p>
              <p className="text-2xl font-bold text-primary" title={`$${customer.totalSpent.toFixed(2)}`}>
                {formatCurrency(customer.totalSpent)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400">{t('purchases')}</p>
              <p className="text-2xl font-bold text-success">{customer.purchaseCount ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={() => navigate(`/customers/${customer.id}`)}
            className="flex flex-col items-center justify-center gap-1 px-2 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
            title="View profile"
          >
            <Eye size={16} />
            <span className="text-xs">{t('profile')}</span>
          </button>
          <button
            onClick={() => onEdit(customer)}
            className="flex flex-col items-center justify-center gap-1 px-2 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors"
          >
            <Edit2 size={16} />
            <span className="text-xs">{t('edit')}</span>
          </button>
          <button
            onClick={() => onDelete(customer.id, customer)}
            className="flex flex-col items-center justify-center gap-1 px-2 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            title="Delete customer"
          >
            <Trash2 size={16} />
            <span className="text-xs">{t('delete')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
