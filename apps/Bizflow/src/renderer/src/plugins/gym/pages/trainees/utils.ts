import { Trainee, TraineeSubscription } from './types'

export function calculateAge(dateOfBirth?: string): string {
  if (!dateOfBirth) return ''
  const diff = Date.now() - new Date(dateOfBirth).getTime()
  const age = Math.floor(diff / (365.25 * 24 * 3600 * 1000))
  return age > 0 ? String(age) : ''
}

export function getActiveSubscription(trainee: Trainee): TraineeSubscription | undefined {
  if (!trainee.subscriptions || trainee.subscriptions.length === 0) return undefined
  return trainee.subscriptions.find(s => s.status === 'active') || trainee.subscriptions[0]
}

export interface SubBadgeConfig {
  label: string
  daysLeft?: number
  badgeCls: string
  avatarCls: string
  ringCls: string
}

export function getTraineeSubBadge(trainee: Trainee): SubBadgeConfig {
  const sub = getActiveSubscription(trainee)
  if (!sub) {
    return {
      label: 'No Plan',
      badgeCls: 'bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700',
      avatarCls: 'bg-slate-100 dark:bg-slate-800 text-slate-500',
      ringCls: 'ring-slate-300 dark:ring-slate-700'
    }
  }

  const daysLeft = Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / 86_400_000)

  if (sub.status === 'frozen') {
    return {
      label: '❄️ Frozen',
      badgeCls: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40',
      avatarCls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
      ringCls: 'ring-blue-400/40'
    }
  }

  if (sub.status === 'cancelled') {
    return {
      label: 'Cancelled',
      badgeCls: 'bg-slate-100 dark:bg-slate-700/60 text-slate-500 border border-slate-200 dark:border-slate-700',
      avatarCls: 'bg-slate-100 dark:bg-slate-800 text-slate-400',
      ringCls: 'ring-slate-300 dark:ring-slate-700'
    }
  }

  if (sub.status === 'expired' || daysLeft < 0) {
    return {
      label: 'Expired',
      badgeCls: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40',
      avatarCls: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600',
      ringCls: 'ring-rose-400/40'
    }
  }

  if (daysLeft <= 7) {
    return {
      label: `⚠️ ${daysLeft}d left`,
      daysLeft,
      badgeCls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40',
      avatarCls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
      ringCls: 'ring-amber-400/40'
    }
  }

  return {
    label: `${daysLeft}d left`,
    daysLeft,
    badgeCls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40',
    avatarCls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600',
    ringCls: 'ring-emerald-400/40'
  }
}

export function formatSubDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}