import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { dataDir } from "@/lib/data-dir";
import { prisma } from "@/lib/db";
import { getPurchasable } from "@/lib/payments";
import { AUDIT_EVENTS, type AuditEvent } from "@/lib/audit-events";
import { ACTIVITY_ACTIONS, type ActivityAction } from "@/lib/activity-actions";
import { recordAccountActivity } from "@/lib/account-auth";

/**
 * Server-only data + auth layer for the manager dashboard (/admin).
 *
 * Customer-facing commerce lives in the database (Customer / Order / License /
 * SupportTicket / AccountActivity / OrderAudit) and that is the authoritative
 * source. `.data/orders.json` and `.data/requests.json` are the older local
 * stores: custom-build requests still live only there, and orders are read from
 * the database first with any file-only order appended as a legacy row so no
 * historical sale disappears from the dashboard.
 *
 * Auth is a single shared password (ADMIN_PASSWORD). The login route sets an
 * httpOnly cookie holding an HMAC of the password (never the password itself),
 * verified on every protected page/route.
 */

const DATA_DIR = dataDir;
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const REQUESTS_FILE = path.join(DATA_DIR, "requests.json");

export const ADMIN_COOKIE = "bf_admin";

// HMAC secret for the admin/auth cookies. A publicly-known default would let
// anyone forge the cookie, so production must configure it explicitly.
const SECRET = process.env.LICENSE_SECRET ?? "bizflow-dev-license-secret";
if (process.env.NODE_ENV === "production" && SECRET === "bizflow-dev-license-secret") {
  throw new Error("LICENSE_SECRET must be configured in production");
}
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

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_CUSTOMER" | "RESOLVED" | "CLOSED";

export const TICKET_STATUSES: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_CUSTOMER",
  "RESOLVED",
  "CLOSED",
];

export interface AdminSupportMessage {
  senderType: string;
  body: string;
  createdAt: string;
}

export interface AdminSupportTicket {
  publicId: string;
  email: string;
  subject: string;
  category: string;
  priority: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  messageCount: number;
  latestMessage: string | null;
  messages: AdminSupportMessage[];
  /** Set once the ticket has been linked to a registered account. */
  customerId: string | null;
  /** Set when the ticket email resolves to a registered account. */
  accountId: string | null;
}

export interface AdminLicense {
  id: string;
  key: string;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  deviceName: string | null;
  deviceActivatedAt: string | null;
  customer: { id: string; email: string; fullName: string | null; status: string };
  order: { itemId: string; amountTotal: number; currency: string; fulfilledAt: string; paymentStatus: string };
}

export interface AdminCustomer {
  id: string;
  email: string;
  fullName: string | null;
  status: string;
  role: string;
  createdAt: string;
  emailVerifiedAt: string | null;
  hasPassword: boolean;
  oauthProviders: string[];
  counts: { orders: number; licenses: number; supportTickets: number; sessions: number };
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

export async function readSupportTickets(): Promise<AdminSupportTicket[]> {
  const rows = await prisma.supportTicket.findMany({
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { lastMessageAt: "desc" }
  });

  // Guest tickets only carry an email address. Resolve them to an account in a
  // single lookup so support can open the full customer record from the list.
  const unlinked = [
    ...new Set(
      rows.filter((t) => !t.customerId).map((t) => t.email.trim().toLowerCase())
    ),
  ];
  const accounts = unlinked.length
    ? await prisma.customer.findMany({
        where: { email: { in: unlinked } },
        select: { id: true, email: true },
      })
    : [];
  const idByEmail = new Map(accounts.map((c) => [c.email, c.id]));

  return rows.map((t: (typeof rows)[number]) => ({
    publicId: t.publicId,
    email: t.email,
    subject: t.subject,
    category: t.category,
    priority: t.priority,
    status: t.status as TicketStatus,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    lastMessageAt: t.lastMessageAt.toISOString(),
    messageCount: t.messages.length,
    latestMessage: t.messages.length ? t.messages[t.messages.length - 1].body : null,
    customerId: t.customerId,
    accountId: t.customerId ?? idByEmail.get(t.email.trim().toLowerCase()) ?? null,
    messages: t.messages.map((m: (typeof t.messages)[number]) => ({
      senderType: m.senderType,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    })),
  }));
}

export async function readLicenses(): Promise<AdminLicense[]> {
  const rows = await prisma.license.findMany({
    include: { customer: true, order: true },
    orderBy: { issuedAt: "desc" },
  });

  return rows.map((license) => ({
    id: license.id,
    key: license.key,
    status: license.status,
    deviceName: license.deviceName,
    deviceActivatedAt: license.deviceActivatedAt?.toISOString() ?? null,
    customer: {
      id: license.customer.id,
      email: license.customer.email,
      fullName: license.customer.fullName,
      status: license.customer.status,
    },
    order: {
      itemId: license.order.itemId,
      amountTotal: license.order.amountTotal,
      currency: license.order.currency,
      fulfilledAt: license.order.fulfilledAt.toISOString(),
      paymentStatus: license.order.paymentStatus,
    },
  }));
}

export async function readCustomers(): Promise<AdminCustomer[]> {
  const rows = await prisma.customer.findMany({
    include: {
      credentials: { select: { id: true } },
      oauthIdentities: { select: { provider: true } },
      _count: { select: { orders: true, licenses: true, supportTickets: true, sessions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((customer) => ({
    id: customer.id,
    email: customer.email,
    fullName: customer.fullName,
    status: customer.status,
    role: customer.role,
    createdAt: customer.createdAt.toISOString(),
    emailVerifiedAt: customer.emailVerifiedAt?.toISOString() ?? null,
    hasPassword: customer.credentials !== null,
    oauthProviders: [...new Set(customer.oauthIdentities.map((identity) => identity.provider))],
    counts: {
      orders: customer._count.orders,
      licenses: customer._count.licenses,
      supportTickets: customer._count.supportTickets,
      sessions: customer._count.sessions,
    },
  }));
}

/**
 * Admin licence actions are audited under the order they belong to and mirrored
 * into the customer's activity feed; without this the order page's "audit trail"
 * showed a revoked licence whose last recorded event was the checkout.
 */
const LICENSE_ACTION_META = {
  revoke: {
    event: AUDIT_EVENTS.licenseRevoked,
    activity: ACTIVITY_ACTIONS.licenseRevoked,
    summary: (key: string) => `Licence ${key} was revoked by BizFlow support`,
  },
  reactivate: {
    event: AUDIT_EVENTS.licenseReactivated,
    activity: ACTIVITY_ACTIONS.licenseReactivated,
    summary: (key: string) => `Licence ${key} was re-activated by BizFlow support`,
  },
  unlock_device: {
    event: AUDIT_EVENTS.licenseDeviceReleased,
    activity: ACTIVITY_ACTIONS.deviceReleased,
    summary: (key: string) => `Licence ${key} was released from its device`,
  },
} satisfies Record<
  "revoke" | "reactivate" | "unlock_device",
  { event: AuditEvent; activity: ActivityAction; summary: (key: string) => string }
>;

export async function updateLicenseAccess(params: {
  id: string;
  action: "revoke" | "reactivate" | "unlock_device";
}): Promise<boolean> {
  const license = await prisma.license.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      orderId: true,
      customerId: true,
      key: true,
      status: true,
      revokedAt: true,
      deviceFingerprint: true,
      deviceName: true,
    },
  });
  if (!license) return false;

  const previousDevice = license.deviceName ?? license.deviceFingerprint;
  let changed: boolean;
  let data: { status?: "ACTIVE" | "REVOKED"; revokedAt?: Date | null; revokedReason?: string | null; deviceFingerprint?: null; deviceName?: null; deviceActivatedAt?: null };

  if (params.action === "revoke") {
    changed = license.status !== "REVOKED";
    data = { status: "REVOKED", revokedAt: new Date(), revokedReason: "Revoked by administrator" };
  } else if (params.action === "reactivate") {
    changed = license.status !== "ACTIVE" || license.revokedAt !== null;
    data = { status: "ACTIVE", revokedAt: null, revokedReason: null };
  } else {
    changed = license.deviceFingerprint !== null;
    data = { deviceFingerprint: null, deviceName: null, deviceActivatedAt: null };
  }

  // Re-sending the same action (e.g. revoking an already revoked licence) is a
  // no-op, and must not stack duplicate audit rows.
  if (!changed) return true;

  await prisma.license.update({ where: { id: params.id }, data });

  const meta = LICENSE_ACTION_META[params.action];
  await prisma.orderAudit.create({
    data: {
      orderId: license.orderId,
      event: meta.event,
      payloadJson: JSON.stringify({ key: license.key, releasedDevice: previousDevice }),
    },
  });
  await recordAccountActivity(license.customerId, meta.activity, meta.summary(license.key));

  return true;
}

/**
 * Re-sending the licence email changes no access state, but it is still an
 * action an admin took on a customer's order — leaving it unrecorded made the
 * order page's audit trail stop at the checkout while an email had just gone out.
 */
export async function recordLicenseEmailResent(license: {
  orderId: string;
  customerId: string;
  key: string;
}): Promise<void> {
  await prisma.orderAudit.create({
    data: {
      orderId: license.orderId,
      event: AUDIT_EVENTS.licenseReissued,
      payloadJson: JSON.stringify({ key: license.key, channel: "email" }),
    },
  });
  await recordAccountActivity(
    license.customerId,
    ACTIVITY_ACTIONS.licenseReissued,
    `Licence ${license.key} was emailed again by BizFlow support`
  );
}

export async function setSupportTicketStatus(publicId: string, status: TicketStatus): Promise<boolean> {
  const existing = await prisma.supportTicket.findUnique({ where: { publicId }, select: { id: true } });
  if (!existing) return false;

  await prisma.supportTicket.update({
    where: { publicId },
    data: { status, updatedAt: new Date() },
  });
  return true;
}

// ── Unified order view ───────────────────────────────────────────────────
//
// One row shape for every surface that lists orders (dashboard tab, customer
// drill-down, order detail page) so a sale is never shown with a different
// set of columns depending on where you opened it.

export interface AdminOrderLicense {
  id: string;
  key: string;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  deviceName: string | null;
  deviceFingerprint: string | null;
  deviceActivatedAt: string | null;
  issuedAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
}

export interface AdminOrder {
  sessionId: string;
  itemId: string;
  label: string;
  email: string | null;
  amountTotal: number;
  currency: string;
  paymentStatus: string;
  fulfilledAt: string;
  customer: { id: string; email: string; fullName: string | null; status: string } | null;
  license: AdminOrderLicense | null;
  /** True when the order only exists in the legacy `.data/orders.json` file. */
  legacy: boolean;
}

export interface AdminAuditEntry {
  id: string;
  event: string;
  payloadJson: string | null;
  createdAt: string;
}

export interface AdminCustomerDetail {
  customer: AdminCustomer;
  orders: AdminOrder[];
  licenses: AdminOrderLicense[];
  tickets: AdminSupportTicket[];
  activity: { id: string; action: string; summary: string; createdAt: string }[];
  audits: (AdminAuditEntry & { sessionId: string | null; itemId: string | null })[];
  metrics: {
    paidOrders: number;
    revenueCents: number;
    currency: string;
    activeLicenses: number;
    openTickets: number;
    lastActivityAt: string | null;
  };
}

export interface AdminOrderDetail {
  order: AdminOrder;
  customer: AdminCustomerDetail["customer"] | null;
  audits: AdminAuditEntry[];
  tickets: AdminSupportTicket[];
}

const labelFor = (itemId: string) => getPurchasable(itemId)?.label ?? itemId;

function toOrderLicense(license: {
  id: string;
  key: string;
  status: string;
  deviceName: string | null;
  deviceFingerprint: string | null;
  deviceActivatedAt: Date | null;
  issuedAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;
}): AdminOrderLicense {
  return {
    id: license.id,
    key: license.key,
    status: license.status as AdminOrderLicense["status"],
    deviceName: license.deviceName,
    deviceFingerprint: license.deviceFingerprint,
    deviceActivatedAt: license.deviceActivatedAt?.toISOString() ?? null,
    issuedAt: license.issuedAt.toISOString(),
    revokedAt: license.revokedAt?.toISOString() ?? null,
    revokedReason: license.revokedReason,
  };
}

/**
 * Every order the dashboard should account for: database rows first, then any
 * file-only (pre-database) order that the database does not already know about.
 * The file is only consulted as a fallback so a slow or empty database cannot
 * hide a sale.
 */
export async function readOrdersEnriched(): Promise<AdminOrder[]> {
  let dbRows: {
    sessionId: string;
    itemId: string;
    email: string | null;
    amountTotal: number;
    currency: string;
    paymentStatus: string;
    fulfilledAt: Date;
    customer: { id: string; email: string; fullName: string | null; status: string } | null;
    license: {
      id: string;
      key: string;
      status: string;
      deviceName: string | null;
      deviceFingerprint: string | null;
      deviceActivatedAt: Date | null;
      issuedAt: Date;
      revokedAt: Date | null;
      revokedReason: string | null;
    } | null;
  }[] = [];

  try {
    dbRows = await prisma.order.findMany({
      include: { customer: true, license: true },
      orderBy: { fulfilledAt: "desc" },
    });
  } catch {
    // Database not reachable yet — fall through to the legacy file only.
    dbRows = [];
  }

  const orders: AdminOrder[] = dbRows.map((row) => ({
    sessionId: row.sessionId,
    itemId: row.itemId,
    label: labelFor(row.itemId),
    email: row.email,
    amountTotal: row.amountTotal,
    currency: row.currency,
    paymentStatus: row.paymentStatus,
    fulfilledAt: row.fulfilledAt.toISOString(),
    customer: row.customer
      ? {
          id: row.customer.id,
          email: row.customer.email,
          fullName: row.customer.fullName,
          status: row.customer.status,
        }
      : null,
    license: row.license ? toOrderLicense(row.license) : null,
    legacy: false,
  }));

  const seen = new Set(orders.map((order) => order.sessionId));
  for (const legacy of await readOrders()) {
    if (seen.has(legacy.sessionId)) continue;
    seen.add(legacy.sessionId);
    orders.push({
      sessionId: legacy.sessionId,
      itemId: legacy.itemId,
      label: labelFor(legacy.itemId),
      email: legacy.email,
      amountTotal: legacy.amountTotal,
      currency: legacy.currency ?? "usd",
      paymentStatus: legacy.paymentStatus ?? "paid",
      fulfilledAt: legacy.fulfilledAt ?? new Date(0).toISOString(),
      customer: null,
      license: legacy.licenseKey
        ? {
            id: `legacy:${legacy.sessionId}`,
            key: legacy.licenseKey,
            status: "ACTIVE",
            deviceName: null,
            deviceFingerprint: null,
            deviceActivatedAt: null,
            issuedAt: legacy.fulfilledAt ?? new Date(0).toISOString(),
            revokedAt: null,
            revokedReason: null,
          }
        : null,
      legacy: true,
    });
  }

  orders.sort((a, b) => new Date(b.fulfilledAt).getTime() - new Date(a.fulfilledAt).getTime());
  return orders;
}

const OPEN_TICKET_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER"];

function ticketView(
  ticket: {
    publicId: string;
    email: string;
    subject: string;
    category: string;
    priority: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    lastMessageAt: Date;
    customerId?: string | null;
    messages: { senderType: string; body: string; createdAt: Date }[];
  },
  accountId?: string | null
): AdminSupportTicket {
  return {
    publicId: ticket.publicId,
    email: ticket.email,
    subject: ticket.subject,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status as TicketStatus,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    lastMessageAt: ticket.lastMessageAt.toISOString(),
    messageCount: ticket.messages.length,
    latestMessage: ticket.messages.length ? ticket.messages[ticket.messages.length - 1].body : null,
    customerId: ticket.customerId ?? null,
    accountId: ticket.customerId ?? accountId ?? null,
    messages: ticket.messages.map((message) => ({
      senderType: message.senderType,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

/** Everything the manager needs about one customer, in a single round trip. */
export async function readCustomerDetail(id: string): Promise<AdminCustomerDetail | null> {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      credentials: { select: { id: true, failedCount: true, lockedUntil: true } },
      oauthIdentities: { select: { provider: true } },
      _count: { select: { orders: true, licenses: true, supportTickets: true, sessions: true } },
    },
  });
  if (!customer) return null;

  const [orders, tickets, activity, sessions] = await Promise.all([
    prisma.order.findMany({
      where: { customerId: id },
      include: { license: true },
      orderBy: { fulfilledAt: "desc" },
    }),
    // Tickets raised before the account existed are only linked by email, so the
    // customer id alone would hide the first few conversations of every buyer.
    prisma.supportTicket.findMany({
      where: { OR: [{ customerId: id }, { email: customer.email }] },
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { lastMessageAt: "desc" },
    }),
    prisma.accountActivity.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.customerSession.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, expiresAt: true, revokedAt: true },
      take: 20,
    }),
  ]);

  const audits = orders.length
    ? await prisma.orderAudit.findMany({
        where: { orderId: { in: orders.map((order) => order.id) } },
        orderBy: { createdAt: "desc" },
        include: { order: { select: { sessionId: true, itemId: true } } },
      })
    : [];

  const orderViews: AdminOrder[] = orders.map((order) => ({
    sessionId: order.sessionId,
    itemId: order.itemId,
    label: labelFor(order.itemId),
    email: order.email,
    amountTotal: order.amountTotal,
    currency: order.currency,
    paymentStatus: order.paymentStatus,
    fulfilledAt: order.fulfilledAt.toISOString(),
    customer: {
      id: customer.id,
      email: customer.email,
      fullName: customer.fullName,
      status: customer.status,
    },
    license: order.license ? toOrderLicense(order.license) : null,
    legacy: false,
  }));

  const paidOrders = orderViews.filter((order) => order.paymentStatus === "paid");
  const licenses = orders
    .map((order) => order.license)
    .filter((license): license is NonNullable<typeof license> => Boolean(license))
    .map(toOrderLicense);

  return {
    customer: {
      id: customer.id,
      email: customer.email,
      fullName: customer.fullName,
      status: customer.status,
      role: customer.role,
      createdAt: customer.createdAt.toISOString(),
      emailVerifiedAt: customer.emailVerifiedAt?.toISOString() ?? null,
      hasPassword: customer.credentials !== null,
      oauthProviders: [...new Set(customer.oauthIdentities.map((identity) => identity.provider))],
      counts: {
        orders: customer._count.orders,
        licenses: customer._count.licenses,
        // Email-linked tickets count too, so this matches the list below.
        supportTickets: tickets.length,
        sessions: customer._count.sessions,
      },
    },
    orders: orderViews,
    licenses,
    tickets: tickets.map((ticket) => ticketView(ticket, id)),
    activity: activity.map((entry) => ({
      id: entry.id,
      action: entry.action,
      summary: entry.summary,
      createdAt: entry.createdAt.toISOString(),
    })),
    audits: audits.map((entry) => ({
      id: entry.id,
      event: entry.event,
      payloadJson: entry.payloadJson,
      createdAt: entry.createdAt.toISOString(),
      sessionId: entry.order.sessionId,
      itemId: entry.order.itemId,
    })),
    metrics: {
      paidOrders: paidOrders.length,
      revenueCents: paidOrders.reduce((sum, order) => sum + order.amountTotal, 0),
      currency: paidOrders[0]?.currency ?? "usd",
      activeLicenses: licenses.filter((license) => license.status === "ACTIVE").length,
      openTickets: tickets.filter((ticket) => OPEN_TICKET_STATUSES.includes(ticket.status as TicketStatus)).length,
      lastActivityAt: activity[0]?.createdAt.toISOString() ?? sessions[0]?.createdAt.toISOString() ?? null,
    },
  };
}

/**
 * One order with its audit trail. Ticket history is included because the first
 * place a manager looks when an order is questioned is the customer's messages.
 */
export async function readOrderDetail(sessionId: string): Promise<AdminOrderDetail | null> {
  const order = await prisma.order.findUnique({
    where: { sessionId },
    include: { customer: true, license: true, audits: { orderBy: { createdAt: "desc" } } },
  });

  if (order) {
    // Match on the account *or* the buyer's email: a ticket raised from the
    // public support form carries no customer id, and an account created after
    // the order carries no link to it. Filtering on only one of the two hides
    // real conversations, so both are always considered.
    const orLinked: { customerId?: string; email?: string }[] = [];
    if (order.customerId) orLinked.push({ customerId: order.customerId });
    if (order.email) orLinked.push({ email: order.email });

    const tickets = orLinked.length
      ? await prisma.supportTicket.findMany({
          where: { OR: orLinked },
          include: { messages: { orderBy: { createdAt: "asc" } } },
          orderBy: { lastMessageAt: "desc" },
        })
      : [];

    // An order placed as a guest may still belong to someone who signed up
    // afterwards, so resolve the buyer by email before dropping the account link.
    const accountId =
      order.customerId ??
      (order.email ? await findCustomerIdByEmail(order.email) : null);

    return {
      order: {
        sessionId: order.sessionId,
        itemId: order.itemId,
        label: labelFor(order.itemId),
        email: order.email,
        amountTotal: order.amountTotal,
        currency: order.currency,
        paymentStatus: order.paymentStatus,
        fulfilledAt: order.fulfilledAt.toISOString(),
        customer: order.customer
          ? {
              id: order.customer.id,
              email: order.customer.email,
              fullName: order.customer.fullName,
              status: order.customer.status,
            }
          : null,
        license: order.license ? toOrderLicense(order.license) : null,
        legacy: false,
      },
      customer: order.customer
        ? {
            id: order.customer.id,
            email: order.customer.email,
            fullName: order.customer.fullName,
            status: order.customer.status,
            role: order.customer.role,
            createdAt: order.customer.createdAt.toISOString(),
            emailVerifiedAt: order.customer.emailVerifiedAt?.toISOString() ?? null,
            hasPassword: true,
            oauthProviders: [],
            counts: { orders: 0, licenses: 0, supportTickets: tickets.length, sessions: 0 },
          }
        : null,
      audits: order.audits.map((entry) => ({
        id: entry.id,
        event: entry.event,
        payloadJson: entry.payloadJson,
        createdAt: entry.createdAt.toISOString(),
      })),
      tickets: tickets.map((ticket) => ticketView(ticket, accountId)),
    };
  }

  // Legacy fallback: an order that predates the database has no audit trail.
  const legacy = (await readOrders()).find((row) => row.sessionId === sessionId);
  if (!legacy) return null;

  return {
    order: {
      sessionId: legacy.sessionId,
      itemId: legacy.itemId,
      label: labelFor(legacy.itemId),
      email: legacy.email,
      amountTotal: legacy.amountTotal,
      currency: legacy.currency ?? "usd",
      paymentStatus: legacy.paymentStatus ?? "paid",
      fulfilledAt: legacy.fulfilledAt ?? new Date(0).toISOString(),
      customer: null,
      license: legacy.licenseKey
        ? {
            id: `legacy:${legacy.sessionId}`,
            key: legacy.licenseKey,
            status: "ACTIVE",
            deviceName: null,
            deviceFingerprint: null,
            deviceActivatedAt: null,
            issuedAt: legacy.fulfilledAt ?? new Date(0).toISOString(),
            revokedAt: null,
            revokedReason: null,
          }
        : null,
      legacy: true,
    },
    customer: null,
    audits: [],
    tickets: [],
  };
}

/** A customer account by email — used to jump from an order to its buyer. */
export async function findCustomerIdByEmail(email: string): Promise<string | null> {
  const row = await prisma.customer.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true },
  });
  return row?.id ?? null;
}

/**
 * Suspend or re-activate an account.
 *
 * Suspension has to end the open sessions too — otherwise a signed-in browser
 * keeps full access until its cookie happens to expire, which is not what an
 * administrator pressing "Suspend" expects.
 */
export async function setCustomerStatus(
  id: string,
  status: "ACTIVE" | "SUSPENDED"
): Promise<{ ok: boolean; changed: boolean; previousStatus: "PENDING" | "ACTIVE" | "SUSPENDED" | null }> {
  const existing = await prisma.customer.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!existing) return { ok: false, changed: false, previousStatus: null };
  if (existing.status === status) return { ok: true, changed: false, previousStatus: existing.status };

  await prisma.customer.update({ where: { id }, data: { status } });
  if (status === "SUSPENDED") await revokeCustomerSessions(id);

  // Activating a never-verified sign-up is a first activation, not a
  // re-activation, and the customer reads this line in their own activity feed.
  const verb =
    status === "SUSPENDED" ? "suspended" : existing.status === "PENDING" ? "activated" : "re-activated";

  // Recorded after the suspension so the audit trail explains the sign-out that
  // follows it in the same timeline.
  await recordAccountActivity(
    id,
    status === "SUSPENDED" ? ACTIVITY_ACTIONS.accountSuspended : ACTIVITY_ACTIONS.accountReactivated,
    `Account ${verb} by a manager`
  );

  return { ok: true, changed: true, previousStatus: existing.status };
}

/** Sign the customer out everywhere. */
export async function revokeCustomerSessions(id: string): Promise<number> {
  const result = await prisma.customerSession.updateMany({
    where: { customerId: id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (result.count > 0) {
    await recordAccountActivity(
      id,
      ACTIVITY_ACTIONS.signedOutAll,
      `Signed out of ${result.count} session${result.count === 1 ? "" : "s"}`
    );
  }

  return result.count;
}

/** Grant or revoke the support/admin role. Customers can never promote themselves. */
export async function setCustomerRole(
  id: string,
  role: "CUSTOMER" | "SUPPORT" | "ADMIN"
): Promise<boolean> {
  const existing = await prisma.customer.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!existing) return false;
  if (existing.role === role) return true;

  await prisma.customer.update({ where: { id }, data: { role } });
  await recordAccountActivity(
    id,
    ACTIVITY_ACTIONS.roleChanged,
    `Account role changed from ${existing.role} to ${role}`
  );

  return true;
}
