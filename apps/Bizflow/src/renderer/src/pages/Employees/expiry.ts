/**
 * Backwards-compatible shim — expiry helpers now live in `./utils`.
 * Keep this file until all imports point at `./utils`.
 */
export { daysUntil, expiryState, type ExpiryState } from './utils'
