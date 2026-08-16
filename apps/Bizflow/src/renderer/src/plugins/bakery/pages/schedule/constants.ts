import { Circle, PlayCircle, CheckCircle2, Ban } from 'lucide-react'
import { ScheduleStatus, StatusMeta } from './types'

export const STATUS_META: Record<ScheduleStatus, StatusMeta> = {
  planned: {
    chip: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    dot: 'bg-blue-500',
    icon: Circle,
    label: 'Planned',
    actionLabel: 'Start Run',
  },
  'in-progress': {
    chip: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    dot: 'bg-amber-500',
    icon: PlayCircle,
    label: 'In Progress',
    actionLabel: 'Complete',
  },
  completed: {
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
    dot: 'bg-emerald-500',
    icon: CheckCircle2,
    label: 'Completed',
  },
  cancelled: {
    chip: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    dot: 'bg-slate-400',
    icon: Ban,
    label: 'Cancelled',
  },
}

export const QTY_PRESETS = [1, 2, 5, 10, 25, 50]
export const PAGE_SIZES = [10, 20, 50, 100]