import { Inbox, Truck, CheckCircle2, XCircle, AlertTriangle, Zap, ArrowDownUp, Clock } from 'lucide-react'

export const STATUS_CONFIG = {
  received: { label: 'Received', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', icon: Inbox },
  in_transit: { label: 'In Transit', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', icon: XCircle }
}

export const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', dot: 'bg-slate-400', icon: ArrowDownUp },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300', dot: 'bg-blue-500', icon: Clock },
  high: { label: 'High', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300', dot: 'bg-orange-500', icon: AlertTriangle },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300', dot: 'bg-red-500', icon: Zap }
}
