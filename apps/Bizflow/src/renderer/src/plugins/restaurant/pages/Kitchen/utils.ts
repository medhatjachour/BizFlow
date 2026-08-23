import { KdsUrgency } from './types'

export function getElapsedInfo(openedAt: string): { mins: number; text: string; urgency: KdsUrgency } {
  const diffMins = Math.max(0, Math.floor((Date.now() - new Date(openedAt).getTime()) / 60000))
  let urgency: KdsUrgency = 'fresh'
  if (diffMins >= 20) urgency = 'critical'
  else if (diffMins >= 10) urgency = 'warning'

  if (diffMins < 60) return { mins: diffMins, text: `${diffMins}m`, urgency }
  const hrs = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  return { mins: diffMins, text: `${hrs}h ${mins}m`, urgency }
}

export function parseModifiers(modifiersJson?: string | null): string[] {
  if (!modifiersJson) return []
  try {
    const parsed = JSON.parse(modifiersJson)
    if (Array.isArray(parsed)) {
      return parsed.map((m: any) => m.name)
    }
    return []
  } catch {
    return []
  }
}