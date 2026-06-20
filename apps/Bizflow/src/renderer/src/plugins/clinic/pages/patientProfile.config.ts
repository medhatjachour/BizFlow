// Static lookup tables (labels, colour classes, icons) for the Patient Profile UI.
import type { ElementType } from 'react'
import { CheckCircle2, Clock, XCircle, MinusCircle, Banknote, CreditCard, DollarSign } from 'lucide-react'

export const visitTypeConfig: Record<string, { label: string; cls: string; dotCls: string }> = {
  first_visit: { label: 'First Visit', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300', dotCls: 'bg-violet-500 ring-violet-200 dark:ring-violet-800' },
  follow_up:   { label: 'Follow-up',   cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',             dotCls: 'bg-sky-500 ring-sky-200 dark:ring-sky-800' },
  routine:     { label: 'Routine',     cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',         dotCls: 'bg-teal-500 ring-teal-200 dark:ring-teal-800' },
  emergency:   { label: 'Emergency',   cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',             dotCls: 'bg-red-500 ring-red-200 dark:ring-red-800' }
}

export const defaultDotCls = 'bg-slate-400 ring-slate-200 dark:ring-slate-700'

export const paymentStatusConfig: Record<string, { label: string; cls: string; icon: ElementType }> = {
  paid:    { label: 'Paid',    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
  partial: { label: 'Partial', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',        icon: Clock },
  unpaid:  { label: 'Unpaid',  cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',                icon: XCircle },
  waived:  { label: 'Waived',  cls: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',           icon: MinusCircle }
}

export const paymentMethodIcons: Record<string, ElementType> = {
  cash: Banknote, card: CreditCard, insurance: DollarSign, other: DollarSign
}

export const bloodTypeColors: Record<string, string> = {
  'A+': 'bg-red-100 text-red-700', 'A-': 'bg-red-100 text-red-700',
  'B+': 'bg-blue-100 text-blue-700', 'B-': 'bg-blue-100 text-blue-700',
  'O+': 'bg-emerald-100 text-emerald-700', 'O-': 'bg-emerald-100 text-emerald-700',
  'AB+': 'bg-purple-100 text-purple-700', 'AB-': 'bg-purple-100 text-purple-700'
}

export const vitalLabels: Record<string, string> = {
  bp: 'BP', temp: 'Temp', weight: 'Weight', height: 'Height', pulse: 'Pulse', o2sat: 'O₂ Sat'
}

export const statusColors: Record<string, string> = {
  completed: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  active:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
}

export const appointmentTypeConfig: Record<string, string> = {
  consultation: 'Consultation',
  follow_up: 'Follow-up',
  procedure: 'Procedure',
  checkup: 'Checkup'
}

export const appointmentStatusConfig: Record<string, { label: string; cls: string }> = {
  scheduled: { label: 'Scheduled', cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
  confirmed: { label: 'Confirmed', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  completed: { label: 'Completed', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  no_show: { label: 'No Show', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' }
}

export const avatarColors = [
  'from-teal-500 to-teal-600',
  'from-violet-500 to-violet-600',
  'from-sky-500 to-sky-600',
  'from-amber-500 to-amber-600',
  'from-rose-500 to-rose-600',
  'from-indigo-500 to-indigo-600'
]
