import { Trash2, DollarSign } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

type CartFooterProps = {
  subtotal: number
  tax: number
  taxRate: number
  totalDiscount: number
  total: number
  cartItemCount: number
  onClearCart: () => void
  onCheckout: () => void
}

export function CartFooter({
  subtotal,
  tax,
  taxRate,
  totalDiscount,
  total,
  cartItemCount,
  onClearCart,
  onCheckout,
}: CartFooterProps) {
  const { t } = useLanguage()
  const isEmpty = cartItemCount === 0

  return (
    <div className="p-3 border-t border-slate-200 dark:border-slate-700 space-y-2.5">
      <div className="space-y-1 py-2 border-t border-slate-200 dark:border-slate-700">
        <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
          <span>{t('subtotal')}:</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>

        {totalDiscount > 0 && (
          <div className="flex justify-between text-xs text-green-600 dark:text-green-400">
            <span>{t('discount')}:</span>
            <span>-${totalDiscount.toFixed(2)}</span>
          </div>
        )}

        {taxRate > 0 && (
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-500">
            <span>
              {t('tax')} ({taxRate}%):
            </span>
            <span>${tax.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between text-lg font-bold text-slate-900 dark:text-white pt-1">
          <span>{t('total')}:</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onClearCart}
          disabled={isEmpty}
          className="flex-1 px-4 py-2 text-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('clear')}
        </button>
        <button
          onClick={onCheckout}
          disabled={isEmpty}
          className="flex-1 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-1.5"
        >
          <DollarSign size={18} />
          {t('checkout')}
        </button>
      </div>
    </div>
  )
}