export function calcAge(dob?: string | null): string {
  if (!dob) return '—'
  const birth = new Date(dob)
  if (isNaN(birth.getTime())) return '—'
  const age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 3600 * 1000))
  return age >= 0 ? `${age}y` : '—'
}

export function calcNumericAge(dob?: string | null): number | '' {
  if (!dob) return ''
  const birth = new Date(dob)
  if (isNaN(birth.getTime())) return ''
  const age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 3600 * 1000))
  return age >= 0 ? age : ''
}

export function dobFromAge(ageInput: string | number): string | null {
  const age = typeof ageInput === 'string' ? parseInt(ageInput, 10) : ageInput
  if (isNaN(age) || age < 0 || age > 130) return null
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setFullYear(d.getFullYear() - age)
  return d.toISOString()
}

export function getInitials(name: string): string {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function formatCurrency(amount: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

export function formatDate(isoString?: string | null): string {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}