import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
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
    select: { id: true },
  });

  return NextResponse.json({ ok: true, valid: Boolean(license), requestId });
}