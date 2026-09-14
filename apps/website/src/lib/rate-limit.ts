/**
 * Tiny in-memory request limiter.
 *
 * Scope, stated plainly: this lives in the Node process, so it resets on deploy
 * and counts per instance. On one container that is enough to stop a single
 * caller driving an expensive endpoint in a loop, which is exactly what it is
 * for. If this ever runs on more than one instance, move the counter to shared
 * storage — the call signature here does not need to change.
 */

interface Bucket {
  count: number
  resetAt: number
}

export interface RateLimitResult {
  allowed: boolean
  /** Seconds until the window resets, for a Retry-After header. */
  retryAfter: number
  remaining: number
}

const buckets = new Map<string, Bucket>()

/** Above this many tracked keys, drop the expired ones before adding another. */
const PRUNE_THRESHOLD = 5000

function prune(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

/**
 * Count one request against `key`.
 *
 * Side-effecting: every call increments, so decide first whether this is a
 * request you intend to limit, then call it exactly once.
 */
export function consume(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()

  if (buckets.size > PRUNE_THRESHOLD) prune(now)

  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfter: 0, remaining: Math.max(0, limit - 1) }
  }

  existing.count += 1

  if (existing.count > limit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      remaining: 0,
    }
  }

  return { allowed: true, retryAfter: 0, remaining: limit - existing.count }
}

/**
 * Best-effort client identity.
 *
 * Prefers x-forwarded-for, which our own nginx sets. Falls back to a constant,
 * so callers behind a proxy that does not set it share one bucket — that fails
 * closed (stricter), which is the right direction for a limiter.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown"
}

/** Exposed for tests: forget everything. */
export function resetRateLimits(): void {
  buckets.clear()
}
