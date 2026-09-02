import crypto from "node:crypto";

/**
 * Deterministic, offline license keys.
 *
 * A key is an HMAC of the purchase identity (Stripe session + item + email)
 * signed with LICENSE_SECRET. Because it is deterministic, both the Stripe
 * webhook (fulfillment) and the success page can derive the *same* key without
 * a shared database — handy for a static-ish marketing site.
 *
 * Format: BIZ-XXXXX-XXXXX-XXXXX-XXXXX (Crockford base32, 20 chars of entropy).
 */

const SECRET = process.env.LICENSE_SECRET ?? "bizflow-dev-license-secret";
function pemFromEnvironment(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.includes("BEGIN")) return value.replace(/\\n/g, "\n");
  try {
    return Buffer.from(value, "base64").toString("utf8");
  } catch {
    return undefined;
  }
}

const SIGNING_PRIVATE_KEY = pemFromEnvironment(process.env.LICENSE_SIGNING_PRIVATE_KEY);

if (process.env.NODE_ENV === "production" && !process.env.LICENSE_SECRET) {
  throw new Error("LICENSE_SECRET must be configured in production");
}

// Crockford base32 alphabet (no I, L, O, U to avoid ambiguity).
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function toBase32(bytes: Buffer, length: number): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    if (out.length >= length) break;
  }
  return out.slice(0, length).padEnd(length, "0");
}

export interface LicenseInput {
  sessionId: string;
  itemId: string;
  email: string | null;
}

/** Stable payload string the HMAC is computed over. */
function payload({ sessionId, itemId, email }: LicenseInput): string {
  return `${sessionId}|${itemId}|${(email ?? "").toLowerCase().trim()}`;
}

/** Generate the canonical license key for a purchase. */
export function licenseKeyFor(input: LicenseInput): string {
  const mac = crypto.createHmac("sha256", SECRET).update(payload(input)).digest();
  const body = toBase32(mac, 20); // 4 groups of 5
  const groups = body.match(/.{1,5}/g) ?? [body];
  return `BIZ-${groups.join("-")}`;
}

/** Verify a key matches a purchase identity (constant-time). */
export function verifyLicenseKey(key: string, input: LicenseInput): boolean {
  const expected = licenseKeyFor(input);
  if (key.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(key), Buffer.from(expected));
}

export interface ActivationCertificate {
  version: 1;
  email: string;
  licenseKey: string;
  itemId: string;
  deviceFingerprint: string;
  deviceName: string;
  issuedAt: string;
}

export function signActivationCertificate(certificate: ActivationCertificate): string {
  if (!SIGNING_PRIVATE_KEY) {
    throw new Error("LICENSE_SIGNING_PRIVATE_KEY must be configured to activate licenses");
  }

  return crypto.sign(null, Buffer.from(JSON.stringify(certificate)), SIGNING_PRIVATE_KEY).toString("base64");
}
