import { 
  Search, Plus, Download, ArrowUpDown, Star, 
  Phone, MapPin, StickyNote, TrendingUp, Coffee, 
  ShoppingBag, CalendarClock, Edit2, Trash2, X, UserPlus 
} from 'lucide-react'

export const PAGE_SIZE = 30

export const SORT_OPTIONS = [
  { value: 'recent', label: 'Recent Activity' },
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'spent_desc', label: 'Highest Spend' },
  { value: 'visits_desc', label: 'Most Visits' }
] as const

export const INPUT_CLASS = 'w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all'

export const PROFILE_STATS = [
  { key: 'totalSpent', label: 'Total Spent', icon: TrendingUp, color: 'emerald' },
  { key: 'visitCount', label: 'Visits', icon: Coffee, color: 'amber' },
  { key: 'orders', label: 'Orders', icon: ShoppingBag, color: 'blue' },
  { key: 'avgOrder', label: 'Avg Order', icon: CalendarClock, color: 'violet' }
] as const

export const COLOR_STYLES: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/20', gradient: 'from-emerald-500 to-teal-500' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/20', gradient: 'from-amber-500 to-orange-500' },
  blue:    { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-500/20', gradient: 'from-blue-500 to-indigo-500' },
  violet:  { bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-500/20', gradient: 'from-violet-500 to-purple-500' },
  rose:    { bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-500/20', gradient: 'from-rose-500 to-pink-500' }
}
