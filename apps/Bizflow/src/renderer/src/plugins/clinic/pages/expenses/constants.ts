export interface LookupOption {
  value: string
  label: string
  labelAr: string
}

export const EXPENSE_CATEGORIES: LookupOption[] = [
  { value: 'rent',             label: 'Rent',             labelAr: 'الإيجار' },
  { value: 'utilities',        label: 'Utilities',        labelAr: 'المرافق' },
  { value: 'medical_supplies', label: 'Medical Supplies', labelAr: 'مستلزمات طبية' },
  { value: 'medications',      label: 'Medications',      labelAr: 'أدوية' },
  { value: 'equipment',        label: 'Equipment',        labelAr: 'معدات' },
  { value: 'maintenance',      label: 'Maintenance',      labelAr: 'صيانة' },
  { value: 'lab_fees',         label: 'Lab Fees',         labelAr: 'رسوم مختبر' },
  { value: 'insurance',        label: 'Insurance',        labelAr: 'تأمين' },
  { value: 'marketing',        label: 'Marketing',        labelAr: 'تسويق' },
  { value: 'cleaning',         label: 'Cleaning',         labelAr: 'تنظيف' },
  { value: 'salaries',         label: 'Salaries',         labelAr: 'رواتب' },
  { value: 'other',            label: 'Other',            labelAr: 'أخرى' },
]

export const PAYMENT_METHODS: LookupOption[] = [
  { value: 'cash',     label: 'Cash',     labelAr: 'نقداً' },
  { value: 'card',     label: 'Card',     labelAr: 'بطاقة' },
  { value: 'transfer', label: 'Transfer', labelAr: 'تحويل بنكي' },
  { value: 'cheque',   label: 'Cheque',   labelAr: 'شيك' },
]

export const RECURRENCE_OPTIONS: LookupOption[] = [
  { value: 'one_time', label: 'One Time', labelAr: 'مرة واحدة' },
  { value: 'weekly',   label: 'Weekly',   labelAr: 'أسبوعي' },
  { value: 'monthly',  label: 'Monthly',  labelAr: 'شهري' },
  { value: 'yearly',   label: 'Yearly',   labelAr: 'سنوي' },
]

export const CATEGORY_BADGES: Record<string, string> = {
  rent:             'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200 dark:border-violet-800',
  utilities:        'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
  medical_supplies: 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  medications:      'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  equipment:        'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  maintenance:      'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  lab_fees:         'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
  insurance:        'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  marketing:        'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 border-pink-200 dark:border-pink-800',
  cleaning:         'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  salaries:         'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  other:            'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
}

export const CATEGORY_BAR_COLORS: Record<string, string> = {
  rent:             '#8b5cf6',
  utilities:        '#eab308',
  medical_supplies: '#0d9488',
  medications:      '#3b82f6',
  equipment:        '#6366f1',
  maintenance:      '#f97316',
  lab_fees:         '#06b6d4',
  insurance:        '#10b981',
  marketing:        '#ec4899',
  cleaning:         '#0ea5e9',
  salaries:         '#f59e0b',
  other:            '#94a3b8',
}