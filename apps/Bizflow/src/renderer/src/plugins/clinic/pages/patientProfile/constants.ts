import type { ElementType } from 'react'
import { CheckCircle2, Clock, XCircle, MinusCircle, Banknote, CreditCard, DollarSign } from 'lucide-react'
import type { StatusConfigItem } from './types'

export const VISIT_TYPE_CONFIG: Record<string, StatusConfigItem> = {
  first_visit: { 
    label: 'First Visit', 
    cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300', 
    dotCls: 'bg-violet-500 ring-violet-200 dark:ring-violet-800' 
  },
  follow_up: { 
    label: 'Follow-up', 
    cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300', 
    dotCls: 'bg-sky-500 ring-sky-200 dark:ring-sky-800' 
  },
  routine: { 
    label: 'Routine', 
    cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300', 
    dotCls: 'bg-teal-500 ring-teal-200 dark:ring-teal-800' 
  },
  emergency: { 
    label: 'Emergency', 
    cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', 
    dotCls: 'bg-red-500 ring-red-200 dark:ring-red-800' 
  }
}

export const DEFAULT_DOT_CLS = 'bg-slate-400 ring-slate-200 dark:ring-slate-700'

export const PAYMENT_STATUS_CONFIG: Record<string, StatusConfigItem> = {
  paid:    { label: 'Paid',    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
  partial: { label: 'Partial', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',        icon: Clock },
  unpaid:  { label: 'Unpaid',  cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',                icon: XCircle },
  waived:  { label: 'Waived',  cls: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',           icon: MinusCircle }
}

export const PAYMENT_METHOD_ICONS: Record<string, ElementType> = {
  cash: Banknote,
  card: CreditCard,
  insurance: DollarSign,
  other: DollarSign
}

export const BLOOD_TYPE_COLORS: Record<string, string> = {
  'A+':  'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
  'A-':  'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
  'B+':  'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  'B-':  'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  'O+':  'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  'O-':  'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  'AB+': 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
  'AB-': 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
}

export const VITAL_LABELS: Record<string, string> = {
  bp: 'BP',
  temp: 'Temp',
  weight: 'Weight',
  height: 'Height',
  pulse: 'Pulse',
  o2sat: 'O₂ Sat'
}

export const APPOINTMENT_TYPE_CONFIG: Record<string, string> = {
  consultation: 'Consultation',
  follow_up: 'Follow-up',
  procedure: 'Procedure',
  checkup: 'Checkup'
}

export const APPOINTMENT_STATUS_CONFIG: Record<string, StatusConfigItem> = {
  scheduled: { label: 'Scheduled', cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
  confirmed: { label: 'Confirmed', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  completed: { label: 'Completed', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  no_show:   { label: 'No Show',   cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' }
}

export const AVATAR_GRADIENTS = [
  'from-teal-500 to-teal-600',
  'from-violet-500 to-violet-600',
  'from-sky-500 to-sky-600',
  'from-amber-500 to-amber-600',
  'from-rose-500 to-rose-600',
  'from-indigo-500 to-indigo-600'
]