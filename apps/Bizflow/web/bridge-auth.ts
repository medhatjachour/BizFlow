/**
 * Which personal channels the public web bridge refuses before anybody has
 * authenticated on the process.
 *
 * The bridge is reachable without a login, and `requireCap()` is documented to
 * fail OPEN while no user is bound (so an unauthenticated desktop start is never
 * bricked). The desktop does not care, because it installs the universal
 * permission guard; on a public bridge that combination would hand the
 * capability-gated actions to any caller, so they are gated here instead.
 *
 * Kept dependency-free so the rule can be unit-tested without starting the
 * server.
 */

/** Personal channels the desktop protects with a dedicated action capability. */
export const BRIDGE_REQUIRES_AUTH =
  /^personal:billing:(refundPayment|voidInvoice|writeOff|deleteInvoice|deletePayment|applyDiscount|taxVault:delete)$/i;

/** Channels that are only sensitive for one particular payload. */
const VOID_VIA_MARK_STATUS = /^personal:billing:markStatus$/i;

/**
 * `markStatus` can reach `void` as well, and a channel name cannot express that,
 * so the payload is inspected rather than the name alone.
 */
export function bridgeRequiresAuth(channel: unknown, args: unknown): boolean {
  if (typeof channel !== "string") return false;
  if (BRIDGE_REQUIRES_AUTH.test(channel)) return true;
  if (!VOID_VIA_MARK_STATUS.test(channel)) return false;
  const first = Array.isArray(args) ? args[0] : undefined;
  return String((first as { status?: unknown } | undefined)?.status ?? "") === "void";
}
