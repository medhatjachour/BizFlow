import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { getPurchasable } from "@/lib/payments";
import { dataDir } from "@/lib/data-dir";

const DATA_DIR = dataDir;
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const SECRET = process.env.LICENSE_SECRET ?? "bizflow-dev-license-secret";

export const CUSTOMER_COOKIE = "bf_customer";

export interface StoredOrder {
  fulfilledAt?: string;
  sessionId: string;
  itemId: string;
  email: string | null;
  licenseKey?: string;
  amountTotal: number;
  currency?: string;
  paymentStatus?: string;
}

export interface CustomerSession {
  email: string;
  licenseKey: string;
  iat: number;
  exp: number;
}

export interface CustomerOrderView {
  sessionId: string;
  itemId: string;
  itemLabel: string;
  amountTotal: number;
  currency: string;
  fulfilledAt: string;
  paymentStatus: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeLicense(licenseKey: string): string {
  return licenseKey.trim().toUpperCase();
}

function base64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromBase64url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(payloadB64: string): string {
  return crypto.createHmac("sha256", SECRET).update(payloadB64).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export function createCustomerToken(email: string, licenseKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: CustomerSession = {
    email: normalizeEmail(email),
    licenseKey: normalizeLicense(licenseKey),
    iat: now,
    exp: now + 60 * 60 * 24 * 30,
  };
  const payloadB64 = base64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function parseCustomerToken(token: string | undefined | null): CustomerSession | null {
  if (!token) return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;
  if (!safeEqual(sig, sign(payloadB64))) return null;

  try {
    const payload = JSON.parse(fromBase64url(payloadB64)) as CustomerSession;
    if (!payload?.email || !payload?.licenseKey || !payload?.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return {
      email: normalizeEmail(payload.email),
      licenseKey: normalizeLicense(payload.licenseKey),
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

async function readOrders(): Promise<StoredOrder[]> {
  try {
    const parsed = JSON.parse(await fs.readFile(ORDERS_FILE, "utf8"));
    return Array.isArray(parsed) ? (parsed as StoredOrder[]) : [];
  } catch {
    return [];
  }
}

export async function hasPaidLicense(email: string, licenseKey: string): Promise<boolean> {
  const e = normalizeEmail(email);
  const k = normalizeLicense(licenseKey);
  const orders = await readOrders();
  return orders.some(
    (o) =>
      normalizeEmail(o.email ?? "") === e &&
      normalizeLicense(o.licenseKey ?? "") === k &&
      (o.paymentStatus ?? "paid") === "paid"
  );
}

export async function getCustomerOrders(email: string, licenseKey: string): Promise<CustomerOrderView[]> {
  const e = normalizeEmail(email);
  const k = normalizeLicense(licenseKey);
  const orders = await readOrders();

  return orders
    .filter(
      (o) =>
        normalizeEmail(o.email ?? "") === e &&
        normalizeLicense(o.licenseKey ?? "") === k &&
        (o.paymentStatus ?? "paid") === "paid"
    )
    .sort((a, b) => (b.fulfilledAt ?? "").localeCompare(a.fulfilledAt ?? ""))
    .map((o) => ({
      sessionId: o.sessionId,
      itemId: o.itemId,
      itemLabel: getPurchasable(o.itemId)?.label ?? o.itemId,
      amountTotal: o.amountTotal ?? 0,
      currency: (o.currency ?? "usd").toUpperCase(),
      fulfilledAt: o.fulfilledAt ?? "",
      paymentStatus: o.paymentStatus ?? "paid",
    }));
}
