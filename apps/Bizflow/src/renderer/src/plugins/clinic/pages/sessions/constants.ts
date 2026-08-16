import { CheckCircle2, Clock, XCircle, MinusCircle, Banknote, CreditCard, DollarSign } from 'lucide-react'
import { VisitType, PaymentStatus, SessionStatus, TimeframeFilter } from './types'

export const APPT_TO_VISIT_TYPE: Record<string, VisitType> = {
  consultation: 'first_visit',
  follow_up: 'follow_up',
  procedure: 'routine',
  checkup: 'routine'
}

export const VISIT_TYPE_CONFIG: Record<VisitType, { label: string; badgeCls: string; dotCls: string }> = {
  first_visit: {
    label: 'First Visit',
    badgeCls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    dotCls: 'bg-purple-500 ring-purple-200 dark:ring-purple-900'
  },
  follow_up: {
    label: 'Follow-up',
    badgeCls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    dotCls: 'bg-sky-500 ring-sky-200 dark:ring-sky-900'
  },
  routine: {
    label: 'Routine Visit',
    badgeCls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    dotCls: 'bg-teal-500 ring-teal-200 dark:ring-teal-900'
  },
  emergency: {
    label: 'Emergency',
    badgeCls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800 animate-pulse',
    dotCls: 'bg-rose-500 ring-rose-200 dark:ring-rose-900'
  }
}

export const STATUS_CONFIG: Record<SessionStatus, { label: string; badgeCls: string; icon: React.ElementType }> = {
  completed: {
    label: 'Completed',
    badgeCls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    icon: CheckCircle2
  },
  active: {
    label: 'In Progress',
    badgeCls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    icon: Clock
  },
  cancelled: {
    label: 'Cancelled',
    badgeCls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
    icon: XCircle
  }
}

export const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, { label: string; badgeCls: string; icon: React.ElementType }> = {
  paid: {
    label: 'Fully Paid',
    badgeCls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    icon: CheckCircle2
  },
  partial: {
    label: 'Partial Payment',
    badgeCls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    icon: Clock
  },
  unpaid: {
    label: 'Unpaid / Due',
    badgeCls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    icon: XCircle
  },
  waived: {
    label: 'Waived',
    badgeCls: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    icon: MinusCircle
  }
}

export const PAYMENT_METHOD_ICONS: Record<string, React.ElementType> = {
  cash: Banknote,
  card: CreditCard,
  insurance: DollarSign,
  transfer: DollarSign,
  other: DollarSign
}

export const VITAL_LABELS: Record<string, { label: string; unit: string; placeholder: string }> = {
  bp: { label: 'Blood Pressure', unit: 'mmHg', placeholder: '120/80' },
  temp: { label: 'Temperature', unit: '°C', placeholder: '37.0' },
  weight: { label: 'Weight', unit: 'kg', placeholder: '70' },
  height: { label: 'Height', unit: 'cm', placeholder: '175' },
  pulse: { label: 'Pulse Rate', unit: 'bpm', placeholder: '72' },
  o2sat: { label: 'O₂ Saturation', unit: '%', placeholder: '98' }
}

export const TIMEFRAME_FILTERS: { key: TimeframeFilter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All History' }
]