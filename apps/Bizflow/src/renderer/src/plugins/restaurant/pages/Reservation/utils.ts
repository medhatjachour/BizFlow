export function formatTimeSlot(dateString: string): string {
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatReservationDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

export function parseGuestTags(tagsJson?: string | null): string[] {
  if (!tagsJson) return []
  return tagsJson
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}