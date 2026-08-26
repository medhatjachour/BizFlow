export function getOwnerInitials(name: string): string {
  if (!name) return 'OW'
  return name
    .trim()
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || 'OW'
}

export function formatOwnerMoney(amount: number | undefined | null, currency = '$'): string {
  const n = Number(amount) || 0
  return `${currency}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function computePatientAge(dob: string | undefined | null): { years: string; months: string } {
  if (!dob) return { years: '', months: '' }
  const d = new Date(dob)
  const now = new Date()
  let years = now.getFullYear() - d.getFullYear()
  let months = now.getMonth() - d.getMonth()
  if (months < 0) {
    years--
    months += 12
  }
  return { years: String(Math.max(0, years)), months: String(Math.max(0, months)) }
}

export function dobFromAge(years: string, months: string): string | undefined {
  const y = parseInt(years, 10) || 0
  const m = parseInt(months, 10) || 0
  if (y === 0 && m === 0) return undefined
  const d = new Date()
  d.setFullYear(d.getFullYear() - y)
  d.setMonth(d.getMonth() - m)
  return d.toISOString()
}