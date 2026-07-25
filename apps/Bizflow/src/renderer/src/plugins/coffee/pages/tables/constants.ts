export const CARD_BG: Record<string, string> = {
  available: 'border-l-4 border-l-emerald-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-md',
  occupied:  'border-l-4 border-l-amber-500 bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 hover:shadow-md',
  cleaning:  'border-l-4 border-l-blue-500 bg-blue-50/60 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 hover:shadow-md'
};

export const STATUS_DOT: Record<string, string> = {
  available: 'bg-emerald-500', 
  occupied: 'bg-amber-500 animate-pulse', 
  cleaning: 'bg-blue-500'
};

export const ITEM_ST: Record<string, string> = {
  pending:   'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300',
  preparing: 'bg-orange-200 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  ready:     'bg-green-200 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  served:    'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
};

export const CAT_PILL: Record<string, string> = {
  amber:'bg-amber-100 text-amber-700 hover:bg-amber-200',
  orange:'bg-orange-100 text-orange-700 hover:bg-orange-200',
  teal:'bg-teal-100 text-teal-700 hover:bg-teal-200',
  green:'bg-green-100 text-green-700 hover:bg-green-200',
  violet:'bg-violet-100 text-violet-700 hover:bg-violet-200',
  blue:'bg-blue-100 text-blue-700 hover:bg-blue-200',
  default:'bg-slate-100 text-slate-600 hover:bg-slate-200'
};

export const INPUT_CLASS = 'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none transition-shadow';
