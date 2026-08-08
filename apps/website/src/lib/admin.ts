import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { dataDir } from "@/lib/data-dir";

/**
 * Server-only data + auth layer for the manager dashboard (/admin).
 *
 * Reads the same local stores the public APIs write:
 *   .data/orders.json   — fulfilled Stripe orders + issued license keys
 *   .data/requests.json — custom-build requests with their server estimate
 *
 * Auth is a single shared password (ADMIN_PASSWORD). The login route sets an
 * httpOnly cookie holding an HMAC of the password (never the password itself),
 * verified on every protected page/route.
 */

const DATA_DIR = dataDir;
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const REQUESTS_FILE = path.join(DATA_DIR, "requests.json");

export const ADMIN_COOKIE = "bf_admin";

const SECRET = process.env.LICENSE_SECRET ?? "bizflow-dev-license-secret";
const RAW_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

/** Local development may use the documented default; production must configure it. */
export const adminUsingDefault = RAW_PASSWORD.length === 0;
const PASSWORD = adminUsingDefault ? "admin" : RAW_PASSWORD;

if (process.env.NODE_ENV === "production" && adminUsingDefault) {
  throw new Error("ADMIN_PASSWORD must be set in production");
}

/** The opaque token stored in the cookie (HMAC of the password). */
export function adminToken(): string {
  return crypto.createHmac("sha256", SECRET).update(`admin:${PASSWORD}`).digest("hex");
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export function verifyPassword(pw: string): boolean {
  return constantTimeEqual(pw, PASSWORD);
}

export function verifyToken(token: string | undefined | null): boolean {
  if (!token) return false;
  return constantTimeEqual(token, adminToken());
}

// ── Domain types ──────────────────────────────────────────────────────────

export type RequestStatus = "new" | "reviewing" | "quoted" | "accepted" | "declined";

export const REQUEST_STATUSES: RequestStatus[] = [
  "new",
  "reviewing",
  "quoted",
  "accepted",
  "declined",
];

export interface Order {
  fulfilledAt?: string;
  sessionId: string;
  itemId: string;
  email: string | null;
  licenseKey?: string;
  amountTotal: number;
  currency?: string;
  paymentStatus?: string;
}

export interface QuoteShape {
  min: number;
  max: number;
  currency: string;
  eta: string;
  breakdown?: { label: string; amount: string }[];
}

export interface CustomRequest {
  ref: string;
  receivedAt: string;
  type: "update" | "new-plugin" | "bundle";
  moduleId: string | null;
  complexity: string;
  rush: boolean;
  support: boolean;
  email: string;
  company?: string;
  details: string;
  quote: QuoteShape;
  status?: RequestStatus;
}

// ── Stores ────────────────────────────────────────────────────────────────

async function readArray<T>(file: string): Promise<T[]> {
  try {
    const parsed = JSON.parse(await fs.readFile(file, "utf8"));
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export const readOrders = () => readArray<Order>(ORDERS_FILE);
export const readRequests = () => readArray<CustomRequest>(REQUESTS_FILE);

/** Update a request's status. Returns false if the ref doesn't exist. */
export async function setRequestStatus(
  ref: string,
  status: RequestStatus
): Promise<boolean> {
  const all = await readRequests();
  const i = all.findIndex((r) => r.ref === ref);
  if (i === -1) return false;
  all[i] = { ...all[i], status };
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(REQUESTS_FILE, JSON.stringify(all, null, 2), "utf8");
  return true;
}
