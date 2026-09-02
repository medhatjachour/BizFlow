import crypto from "node:crypto";
import { promisify } from "node:util";

import { prisma } from "@/lib/db";

const scryptAsync = promisify(crypto.scrypt);

export const ACCOUNT_COOKIE = "bf_account";

const SESSION_DAYS = 30;
const PASSWORD_MIN = 10;

type Role = "CUSTOMER" | "SUPPORT" | "ADMIN";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function nowPlusDays(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function createAccountSession(customerId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.customerSession.create({
    data: {
      customerId,
      tokenHash: hashToken(token),
      expiresAt: nowPlusDays(SESSION_DAYS),
    },
  });
  return token;
}

export async function recordAccountActivity(customerId: string, action: string, summary: string) {
  await prisma.accountActivity.create({ data: { customerId, action, summary } });
}

function parsePasswordHash(stored: string): { salt: string; hash: string } | null {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return null;
  return { salt, hash };
}

function safeEqualHex(aHex: string, bHex: string): boolean {
  const a = Buffer.from(aHex, "hex");
  const b = Buffer.from(bHex, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function makePasswordHash(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parsed = parsePasswordHash(storedHash);
  if (!parsed) return false;
  const hash = (await scryptAsync(password, parsed.salt, 64)) as Buffer;
  return safeEqualHex(hash.toString("hex"), parsed.hash);
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include a number.";
  return null;
}

export async function registerAccount(params: { email: string; password: string; fullName?: string }) {
  const email = normalizeEmail(params.email);
  const existing = await prisma.customer.findUnique({
    where: { email },
    include: { credentials: true },
  });
  if (existing?.credentials) {
    throw new Error("ACCOUNT_EXISTS");
  }

  const passwordHash = await makePasswordHash(params.password);
  const customer =
    existing ??
    (await prisma.customer.create({
      data: {
        email,
        fullName: params.fullName?.trim() || null,
        status: "ACTIVE",
      },
    }));

  await prisma.credential.upsert({
    where: { customerId: customer.id },
    create: { customerId: customer.id, passwordHash },
    update: {
      passwordHash,
      failedCount: 0,
      lockedUntil: null,
    },
  });

  return customer;
}

export async function loginAccount(params: { email: string; password: string }) {
  const email = normalizeEmail(params.email);
  const customer = await prisma.customer.findUnique({
    where: { email },
    include: { credentials: true },
  });

  if (!customer?.credentials) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (customer.credentials.lockedUntil && customer.credentials.lockedUntil > new Date()) {
    throw new Error("ACCOUNT_LOCKED");
  }

  const ok = await verifyPassword(params.password, customer.credentials.passwordHash);
  if (!ok) {
    const failedCount = customer.credentials.failedCount + 1;
    await prisma.credential.update({
      where: { id: customer.credentials.id },
      data: {
        failedCount,
        lockedUntil: failedCount >= 6 ? new Date(Date.now() + 15 * 60 * 1000) : null,
      },
    });
    throw new Error("INVALID_CREDENTIALS");
  }

  await prisma.credential.update({
    where: { id: customer.credentials.id },
    data: { failedCount: 0, lockedUntil: null },
  });

  const token = await createAccountSession(customer.id);

  return {
    token,
    customer: {
      id: customer.id,
      email: customer.email,
      fullName: customer.fullName,
      role: customer.role,
      status: customer.status,
    },
  };
}

export async function loginWithGoogleProfile(params: { subject: string; email: string; fullName?: string }) {
  const email = normalizeEmail(params.email);
  const identity = await prisma.oAuthIdentity.findUnique({
    where: { provider_providerAccountId: { provider: "google", providerAccountId: params.subject } },
    include: { customer: true },
  });

  const customer =
    identity?.customer ??
    (await prisma.customer.upsert({
      where: { email },
      create: { email, fullName: params.fullName?.trim() || null, emailVerifiedAt: new Date(), status: "ACTIVE" },
      update: { emailVerifiedAt: new Date(), fullName: params.fullName?.trim() || undefined },
    }));

  if (!identity) {
    await prisma.oAuthIdentity.create({
      data: { customerId: customer.id, provider: "google", providerAccountId: params.subject },
    });
  }

  const token = await createAccountSession(customer.id);
  return { token, customer };
}

export async function logoutAccount(token: string) {
  await prisma.customerSession.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getAccountFromToken(token: string) {
  const session = await prisma.customerSession.findFirst({
    where: {
      tokenHash: hashToken(token),
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      customer: true,
    },
  });

  if (!session) return null;
  return {
    sessionId: session.id,
    customer: {
      id: session.customer.id,
      email: session.customer.email,
      fullName: session.customer.fullName,
      role: session.customer.role,
      status: session.customer.status,
    },
  };
}

export async function requireRole(token: string, allowedRoles: Role[]) {
  const account = await getAccountFromToken(token);
  if (!account) return null;
  if (!allowedRoles.includes(account.customer.role as Role)) return null;
  return account;
}

export async function createResetTokenForEmail(email: string) {
  const customer = await prisma.customer.findUnique({ where: { email: normalizeEmail(email) } });
  if (!customer) return null;

  const token = crypto.randomBytes(24).toString("hex");
  const tokenHash = hashToken(token);
  await prisma.passwordResetToken.create({
    data: {
      customerId: customer.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });

  return token;
}

export async function resetPasswordWithToken(token: string, newPassword: string) {
  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!record) throw new Error("TOKEN_INVALID");

  const passwordHash = await makePasswordHash(newPassword);
  await prisma.$transaction([
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    }),
    prisma.credential.upsert({
      where: { customerId: record.customerId },
      create: { customerId: record.customerId, passwordHash },
      update: { passwordHash, failedCount: 0, lockedUntil: null },
    }),
  ]);
}
