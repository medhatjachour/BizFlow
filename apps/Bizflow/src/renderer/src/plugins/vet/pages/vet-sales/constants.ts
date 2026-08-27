export const INPUT_BASE_CLS =
  'w-full px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700/80 rounded-xl bg-white dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all shadow-xs'

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', labelAr: 'نقدي', icon: 'Banknote' },
  { id: 'card', label: 'Card', labelAr: 'بطاقة / مدى', icon: 'CreditCard' },
  { id: 'insurance', label: 'Insurance', labelAr: 'تأمين', icon: 'ShieldCheck' },
  { id: 'other', label: 'Credit / Other', labelAr: 'آجل / أخرى', icon: 'Coins' }
] as const

export const QUICK_DISCOUNT_PERCENTAGES = [5, 10, 15, 20] as const
export const COMMON_CASH_DENOMINATIONS = [10, 20, 50, 100, 200] as const