// ─── Personal Work: shared renderer data hooks ───────────────────────────────
// Every tab loads through the same `useAsync` shape so loading, error and
// refresh handling never drift between screens.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
  setData: (value: T | null) => void
}

/**
 * Runs `loader` on mount and whenever `deps` change, ignoring stale responses
 * (a slower earlier request can never overwrite a newer one).
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const run = useRef(0)

  const loaderRef = useRef(loader)
  loaderRef.current = loader

  useEffect(() => {
    const ticket = ++run.current
    setLoading(true)
    loaderRef
      .current()
      .then((result) => {
        if (ticket !== run.current) return
        setData(result)
        setError(null)
      })
      .catch((err: unknown) => {
        if (ticket !== run.current) return
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (ticket !== run.current) return
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  const reload = useCallback(() => setNonce((value) => value + 1), [])

  return { data, loading, error, reload, setData }
}

/** The `paginate()` envelope every personal list endpoint returns. */
export interface Paged<T> {
  data: T[]
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function emptyPage<T>(): Paged<T> {
  return { data: [], items: [], total: 0, page: 1, pageSize: 25, totalPages: 1 }
}

/** Rows out of a paged envelope, tolerating a bare array response. */
export function rowsOf<T>(payload: Paged<T> | T[] | null | undefined): T[] {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  return payload.data ?? payload.items ?? []
}

/**
 * Counters for the tab bar. Refreshed on demand so completing a task or closing
 * a timer updates the badges without a full page reload.
 */
export function usePersonalCounts() {
  const [counts, setCounts] = useState<any>(null)

  const refresh = useCallback(() => {
    window.api.personal?.meta
      ?.getCounts?.()
      .then((value: any) => setCounts(value))
      .catch(() => setCounts(null))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const badges = useMemo<Record<string, string | undefined>>(() => {
    if (!counts) return {}
    const parts: Record<string, string | undefined> = {}
    const open = counts.tasks?.open ?? 0
    if (open) parts.tasks = String(open)
    const active = counts.projects?.active ?? 0
    if (active) parts.projects = String(active)
    const overdue = counts.invoices?.overdue ?? 0
    if (overdue) parts.invoices = String(overdue)
    const waits = counts.waits?.open ?? 0
    if (waits) parts.waits = String(waits)
    const requests = counts.changeRequests?.pending ?? 0
    if (requests) parts.requests = String(requests)
    if (counts.focus?.running) parts.focus = '●'
    const renewals = counts.subscriptions?.renewingThisWeek ?? 0
    if (renewals) parts.finance = String(renewals)
    return parts
  }, [counts])

  return { counts, badges, refresh }
}

/** The full `meta:getConfig` taxonomy, shared by every tab that renders selects. */
export function usePersonalConfig() {
  return useAsync<any>(() => window.api.personal.meta.getConfig(), [])
}
