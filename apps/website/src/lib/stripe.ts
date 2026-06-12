import Stripe from "stripe";

/**
 * Lazily-created Stripe client. Returns null when STRIPE_SECRET_KEY is not set,
 * so the rest of the site keeps working (the buy buttons fall back to the
 * download link) until you add your keys. See docs/STRIPE-SETUP.md.
 *
 * Only import this from server code (API route handlers).
 */
let cached: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!cached) {
    cached = new Stripe(key, {
      // Pinning is optional; omit to use the account's default API version.
      appInfo: { name: "BizFlow Web", version: "1.0.0" },
    });
  }
  return cached;
}

/** True when a secret key is present (checkout can be created). */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Absolute site origin used to build success/cancel return URLs. */
export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}
