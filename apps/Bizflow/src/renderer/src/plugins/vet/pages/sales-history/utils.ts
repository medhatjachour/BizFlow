export function roundCurrency(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100
}

export function formatDate(dateStr: string, includeTime = false): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'

  if (includeTime) {
    return `${d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function calculateDatePreset(preset: 'today' | 'week' | 'month'): { from: string; to: string } {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const today = fmt(now)

  if (preset === 'today') {
    return { from: today, to: today }
  }

  if (preset === 'week') {
    const w = new Date(now)
    w.setDate(now.getDate() - 6)
    return { from: fmt(w), to: today }
  }

  const m = new Date(now)
  m.setDate(now.getDate() - 29)
  return { from: fmt(m), to: today }
}