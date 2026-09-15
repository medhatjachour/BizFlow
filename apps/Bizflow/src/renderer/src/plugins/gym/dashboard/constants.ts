import { Plus, ClipboardList, Lock, DollarSign, LucideIcon } from 'lucide-react'
import type { PluginTabTarget } from '@renderer/utils/pluginTabs'

export interface QuickActionItem extends PluginTabTarget {
  id: string
  labelKey: string
  icon: LucideIcon
  className: string
}

export const QUICK_ACTIONS: QuickActionItem[] = [
  {
    id: 'add-member',
    labelKey: 'gymAddMember',
    icon: Plus,
    tab: 'trainees',
    className: 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20 shadow-sm'
  },
  {
    id: 'new-sub',
    labelKey: 'gymNewSub',
    icon: Plus,
    tab: 'subscriptions',
    className: 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20 shadow-sm'
  },
  {
    id: 'new-program',
    labelKey: 'gymNewProgramBtn',
    icon: ClipboardList,
    tab: 'programs',
    className: 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20 shadow-sm'
  },
  {
    id: 'lockers',
    labelKey: 'gymManageLockers',
    icon: Lock,
    tab: 'lockers',
    className: 'bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white'
  },
  {
    id: 'finance',
    labelKey: 'gymViewFinance',
    icon: DollarSign,
    to: '/finance',
    className: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700'
  }
]