export function formatCurrency(amount: number): string {
  return (amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatDate(isoDate: string): string {
  if (!isoDate) return '—'
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getExpiryStatus(expiresAt: string | null): {
  label: string
  badgeClass: string
  isUrgent: boolean
} {
  if (!expiresAt) {
    return {
      label: 'No Expiry',
      badgeClass: 'text-slate-400 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800',
      isUrgent: false,
    }
  }

  const diffMs = new Date(expiresAt).getTime() - Date.now()
  if (diffMs < 0) {
    return {
      label: 'Expired',
      badgeClass: 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
      isUrgent: true,
    }
  }

  const hoursLeft = diffMs / 3_600_000
  if (hoursLeft < 24) {
    return {
      label: `${Math.round(hoursLeft)}h left`,
      badgeClass: 'text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900',
      isUrgent: true,
    }
  }

  const daysLeft = Math.ceil(diffMs / 86_400_000)
  if (daysLeft <= 2) {
    return {
      label: `${daysLeft}d left`,
      badgeClass: 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
      isUrgent: true,
    }
  }

  return {
    label: formatDate(expiresAt),
    badgeClass: 'text-slate-600 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-slate-300',
    isUrgent: false,
  }
}