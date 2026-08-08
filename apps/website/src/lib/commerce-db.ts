import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { getPurchasable } from "@/lib/payments";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeLicense(licenseKey: string): string {
  return licenseKey.trim().toUpperCase();
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function upsertCustomerByEmail(email: string) {
  const normalized = normalizeEmail(email);
  return prisma.customer.upsert({
    where: { email: normalized },
    create: { email: normalized, status: "ACTIVE" },
    update: {},
  });
}

export async function recordPaidOrder(params: {
  sessionId: string;
  itemId: string;
  email: string | null;
  licenseKey: string;
  amountTotal: number;
  currency?: string;
  paymentStatus?: string;
}) {
  const customer = params.email ? await upsertCustomerByEmail(params.email) : null;

  const order = await prisma.order.upsert({
    where: { sessionId: params.sessionId },
    create: {
      sessionId: params.sessionId,
      itemId: params.itemId,
      email: params.email ? normalizeEmail(params.email) : null,
      customerId: customer?.id,
      amountTotal: params.amountTotal,
      currency: (params.currency ?? "usd").toLowerCase(),
      paymentStatus: params.paymentStatus ?? "paid",
      fulfilledAt: new Date(),
    },
    update: {
      email: params.email ? normalizeEmail(params.email) : null,
      customerId: customer?.id,
      amountTotal: params.amountTotal,
      currency: (params.currency ?? "usd").toLowerCase(),
      paymentStatus: params.paymentStatus ?? "paid",
    },
  });

  if (customer) {
    await prisma.license.upsert({
      where: { orderId: order.id },
      create: {
        customerId: customer.id,
        orderId: order.id,
        key: normalizeLicense(params.licenseKey),
      },
      update: {
        customerId: customer.id,
        key: normalizeLicense(params.licenseKey),
      },
    });
  }

  await prisma.orderAudit.create({
    data: {
      orderId: order.id,
      event: "checkout.session.completed",
      payloadJson: JSON.stringify({
        sessionId: params.sessionId,
        itemId: params.itemId,
        email: params.email,
      }),
    },
  });
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

type LicenseWithOrder = {
  order: {
    sessionId: string;
    itemId: string;
    amountTotal: number;
    currency: string;
    fulfilledAt: Date;
    paymentStatus: string;
  };
};

export async function hasPaidLicenseDb(email: string, licenseKey: string): Promise<boolean> {
  const e = normalizeEmail(email);
  const k = normalizeLicense(licenseKey);

  const license = await prisma.license.findFirst({
    where: {
      key: k,
      status: "ACTIVE",
      customer: { email: e },
      order: { paymentStatus: "paid" },
    },
    select: { id: true },
  });

  return Boolean(license);
}

export async function getCustomerOrdersDb(email: string, licenseKey: string): Promise<CustomerOrderView[]> {
  const e = normalizeEmail(email);
  const k = normalizeLicense(licenseKey);

  const licenses = await prisma.license.findMany({
    where: {
      key: k,
      status: "ACTIVE",
      customer: { email: e },
      order: { paymentStatus: "paid" },
    },
    include: { order: true },
    orderBy: { order: { fulfilledAt: "desc" } },
  });

  return licenses.map((l: LicenseWithOrder) => ({
    sessionId: l.order.sessionId,
    itemId: l.order.itemId,
    itemLabel: getPurchasable(l.order.itemId)?.label ?? l.order.itemId,
    amountTotal: l.order.amountTotal,
    currency: l.order.currency.toUpperCase(),
    fulfilledAt: l.order.fulfilledAt.toISOString(),
    paymentStatus: l.order.paymentStatus,
  }));
}

export async function createSupportTicket(params: {
  email: string;
  subject: string;
  category: string;
  message: string;
  priority?: string;
}) {
  const customer = await upsertCustomerByEmail(params.email);
  const publicId = `BF-${Date.now().toString(36).toUpperCase()}-${crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;

  const ticket = await prisma.supportTicket.create({
    data: {
      publicId,
      customerId: customer.id,
      email: normalizeEmail(params.email),
      subject: params.subject,
      category: params.category,
      priority: params.priority ?? "normal",
      messages: {
        create: {
          senderType: "customer",
          body: params.message,
        },
      },
    },
  });

  return ticket;
}

export async function getSupportTicketByPublicId(publicId: string) {
  return prisma.supportTicket.findUnique({
    where: { publicId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export async function addSupportReplyByPublicId(params: {
  publicId: string;
  message: string;
  status?: "OPEN" | "IN_PROGRESS" | "WAITING_CUSTOMER" | "RESOLVED" | "CLOSED";
}) {
  const ticket = await prisma.supportTicket.findUnique({ where: { publicId: params.publicId } });
  if (!ticket) return null;

  return prisma.supportTicket.update({
    where: { publicId: params.publicId },
    data: {
      status: params.status,
      lastMessageAt: new Date(),
      messages: {
        create: {
          senderType: "support",
          body: params.message,
        },
      },
    },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export type DeviceActivationResult =
  | { ok: true; itemId: string; activatedNow: boolean; deviceFingerprint: string; deviceName: string | null }
  | { ok: false; reason: "NOT_FOUND" | "LOCKED_TO_OTHER_DEVICE"; currentDeviceFingerprint?: string | null; currentDeviceName?: string | null };

export async function activateLicenseForDevice(params: {
  email: string;
  licenseKey: string;
  deviceFingerprint: string;
  deviceName?: string;
}): Promise<DeviceActivationResult> {
  const email = normalizeEmail(params.email);
  const licenseKey = normalizeLicense(params.licenseKey);
  const deviceFingerprint = params.deviceFingerprint.trim();
  const deviceName = params.deviceName?.trim() || null;

  const license = await prisma.license.findFirst({
    where: {
      key: licenseKey,
      status: "ACTIVE",
      customer: { email },
      order: { paymentStatus: "paid" },
    },
    include: { order: true },
  });

  if (!license) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  if (license.deviceFingerprint && license.deviceFingerprint !== deviceFingerprint) {
    return {
      ok: false,
      reason: "LOCKED_TO_OTHER_DEVICE",
      currentDeviceFingerprint: license.deviceFingerprint,
      currentDeviceName: license.deviceName,
    };
  }

  const activatedNow = !license.deviceFingerprint;

  await prisma.license.update({
    where: { id: license.id },
    data: {
      deviceFingerprint,
      deviceName,
      deviceActivatedAt: license.deviceActivatedAt ?? new Date(),
    },
  });

  return {
    ok: true,
    itemId: license.order.itemId,
    activatedNow,
    deviceFingerprint,
    deviceName,
  };
}

export async function createPasswordResetToken(email: string) {
  const customer = await prisma.customer.findUnique({ where: { email: normalizeEmail(email) } });
  if (!customer) return null;

  const token = crypto.randomBytes(24).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

  await prisma.passwordResetToken.create({
    data: { customerId: customer.id, tokenHash, expiresAt },
  });

  return token;
}

export async function consumePasswordResetToken(token: string) {
  const tokenHash = hashToken(token);
  const rec = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, consumedAt: null, expiresAt: { gt: new Date() } },
  });

  if (!rec) return null;

  await prisma.passwordResetToken.update({ where: { id: rec.id }, data: { consumedAt: new Date() } });
  return rec.customerId;
}
