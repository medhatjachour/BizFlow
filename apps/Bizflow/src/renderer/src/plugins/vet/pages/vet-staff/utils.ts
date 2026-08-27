export function getStaffInitials(name: string): string {
  if (!name) return 'DR'
  return name
    .replace(/^(Dr\.|د\.|دكتور|طبيب)\s*/i, '')
    .trim()
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || 'DR'
}

export function formatStaffMoney(amount: number | undefined | null, currency = '$'): string {
  const n = Number(amount) || 0
  return `${currency}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatStaffDate(iso: string | undefined | null, locale = 'en'): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  } catch {
    return iso
  }
}