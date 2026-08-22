import { Locker } from './types'

export function isLockerOccupied(locker: Locker): boolean {
  return Boolean(locker.assignments && locker.assignments.length > 0)
}

export function formatExpiryDate(isoDate?: string): string {
  if (!isoDate) return 'Permanent / Indefinite'
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function isAssignmentExpiringSoon(isoDate?: string): boolean {
  if (!isoDate) return false
  const daysLeft = Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86_400_000)
  return daysLeft >= 0 && daysLeft <= 5
}