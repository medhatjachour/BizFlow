export function formatCurrency(amount: number): string {
  return `$${Number(amount || 0).toFixed(2)}`
}

export function parseModifierSummary(modifiersJson?: string | null): string[] {
  if (!modifiersJson) return []
  try {
    const parsed = JSON.parse(modifiersJson)
    if (Array.isArray(parsed)) {
      return parsed.map((m: any) => (m.priceDelta ? `${m.name} (+$${m.priceDelta.toFixed(2)})` : m.name))
    }
    return []
  } catch {
    return []
  }
}

export function formatElapsed(dateString: string): string {
  const diffMins = Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 60000))
  if (diffMins < 60) return `${diffMins}m`
  const hrs = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  return `${hrs}h ${mins}m`
}