import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { licenseExpiryFrom, signActivationCertificate, type ActivationCertificate } from "@/lib/license";
import { requestIdFromHeaders } from "@/lib/observability";

export async function POST(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON", requestId }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const licenseKey = String(body.licenseKey ?? "").trim().toUpperCase();
  const deviceFingerprint = String(body.deviceFingerprint ?? "").trim();
  const deviceName = String(body.deviceName ?? "").trim();
  if (!email || !licenseKey || !deviceFingerprint) {
    return NextResponse.json({ error: "Email, license key, and device are required", requestId }, { status: 400 });
  }

  const license = await prisma.license.findFirst({
    where: {
      key: licenseKey,
      status: "ACTIVE",
      deviceFingerprint,
      customer: { email },
      order: { paymentStatus: "paid" },
    },
    select: {
      id: true,
      issuedAt: true,
      deviceName: true,
      order: { select: { itemId: true } },
    },
  });

  if (!license) {
    return NextResponse.json({ ok: true, valid: false, requestId });
  }

  // Successful revalidation rolls the validity window forward. The desktop
  // stores the returned certificate, so a device that revalidates every 30 days
  // stays active indefinitely.
  const now = new Date();
  const expiresAt = licenseExpiryFrom(now);

  await prisma.license.update({
    where: { id: license.id },
    data: { deviceActivatedAt: now },
  });

  // The certificate MUST be re-signed here. The desktop verifies the signature
  // over the whole payload, so it cannot store a new `expiresAt` on top of the
  // previous signature. Returning only `expiresAt` (the earlier behaviour) made
  // every client-side renewal fail its signature check, so the window never
  // rolled forward and customers were locked out at day 44 despite revalidating
  // perfectly.
  const activation: ActivationCertificate = {
    version: 2,
    email,
    licenseKey,
    itemId: license.order.itemId,
    deviceFingerprint,
    deviceName: deviceName || license.deviceName || "Unknown device",
    issuedAt: license.issuedAt.toISOString(),
    expiresAt,
    lastValidatedAt: now.toISOString(),
  };

  return NextResponse.json({
    ok: true,
    valid: true,
    expiresAt,
    activation,
    signature: signActivationCertificate(activation),
    requestId,
  });
}