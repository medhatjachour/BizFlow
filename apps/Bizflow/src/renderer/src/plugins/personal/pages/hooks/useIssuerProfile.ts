import { useCallback, useState } from 'react'

/**
 * The operator's own invoicing identity — the "from" block on every exported
 * invoice and statement.
 *
 * It is deliberately local-only: it is printed onto client-facing documents but
 * is not part of any business record, so it lives in `localStorage` instead of
 * earning a schema migration. The parse and write helpers are exported apart
 * from the hook so the storage contract is unit-testable without rendering.
 */

export interface IssuerProfile {
  name: string
  detail: string
  email: string
}

export const ISSUER_STORAGE_KEY = 'personal:documentIssuer'

export const EMPTY_ISSUER: IssuerProfile = { name: '', detail: '', email: '' }

const MAX_NAME = 120
const MAX_DETAIL = 240
const MAX_EMAIL = 160

function shortText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

/** Collapses whitespace, caps length and refuses unknown keys. */
export function normalizeIssuer(input: unknown): IssuerProfile {
  if (!input || typeof input !== 'object') return EMPTY_ISSUER
  const source = input as Record<string, unknown>
  return {
    name: shortText(source.name, MAX_NAME),
    detail: shortText(source.detail, MAX_DETAIL),
    email: shortText(source.email, MAX_EMAIL)
  }
}

export function hasIssuerName(issuer: IssuerProfile): boolean {
  return issuer.name.trim().length > 0
}

/** A corrupt or hand-edited entry must never break an export. */
export function readIssuer(): IssuerProfile {
  try {
    const raw = window.localStorage.getItem(ISSUER_STORAGE_KEY)
    if (!raw) return EMPTY_ISSUER
    return normalizeIssuer(JSON.parse(raw))
  } catch {
    return EMPTY_ISSUER
  }
}

export function writeIssuer(issuer: IssuerProfile): void {
  try {
    window.localStorage.setItem(ISSUER_STORAGE_KEY, JSON.stringify(issuer))
  } catch {
    // Storage unavailable (private mode): the identity simply stops persisting.
  }
}

export function useIssuerProfile() {
  const [issuer, setIssuerState] = useState<IssuerProfile>(() => readIssuer())

  const setIssuer = useCallback((next: IssuerProfile) => {
    const clean = normalizeIssuer(next)
    setIssuerState(clean)
    writeIssuer(clean)
    return clean
  }, [])

  return { issuer, setIssuer }
}
