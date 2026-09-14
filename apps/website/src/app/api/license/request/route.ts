import { NextResponse } from "next/server";

import {
  appendLicenseRequest,
  licenseRequestRef,
  sendLicenseRequestNotification,
  type LicenseRequestRecord,
} from "@/lib/license-requests";
import { allItemIds } from "@/lib/payments";
import { clientKey, consume } from "@/lib/rate-limit";

/**
 * Public licence request endpoint.
 *
 * Called by the BizFlow desktop app (through its main process, so the device
 * details travel with the request) and by the website's request form. It is
 * public on purpose — a customer whose trial just ended has no account yet, and
 * making them create one before they can ask for a key loses the sale.
 *
 * It therefore has to be cheap to abuse: validated hard, rate limited per IP,
 * and it never issues anything by itself. An admin still mints the key.
 */

const MAX_BODY_BYTES = 8_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const limit = consume(`license-request:${clientKey(request)}`, 8, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later, or email us directly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = str(body.email, 254).toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
  }

  // Unknown or missing product falls back to the suite rather than failing: the
  // customer is asking us a question, not placing an order, and an admin reads
  // every one of these before a key is minted.
  const requestedItem = str(body.itemId, 60);
  const itemId = allItemIds().includes(requestedItem) ? requestedItem : "suite";

  const message = str(body.message, 2000);
  const source = body.source === "web" ? "web" : "desktop";

  const record: LicenseRequestRecord = {
    ref: licenseRequestRef(),
    receivedAt: new Date().toISOString(),
    status: "new",
    source,
    email,
    fullName: str(body.fullName, 120),
    business: str(body.business, 160),
    phone: str(body.phone, 40),
    itemId,
    seats: str(body.seats, 40),
    message,
    appVersion: str(body.appVersion, 40),
    platform: str(body.platform, 60),
    deviceName: str(body.deviceName, 120),
    deviceFingerprint: str(body.deviceFingerprint, 128),
    issuedLicenseKey: null,
    handledAt: null,
  };

  try {
    await appendLicenseRequest(record);
  } catch (error) {
    console.error("[license-request] could not persist:", (error as Error).message);
    return NextResponse.json(
      { error: "We could not save your request. Please email us instead." },
      { status: 500 }
    );
  }

  // Best effort: the request is already stored, so a mail failure must not fail
  // the customer. The admin console reads the store directly.
  let notified = false;
  try {
    const result = await sendLicenseRequestNotification(record);
    notified = result.sent;
    if (!result.sent) {
      console.warn(`[license-request] notification not sent (${result.reason ?? "unknown"})`);
    }
  } catch (error) {
    console.error("[license-request] notification failed:", (error as Error).message);
  }

  return NextResponse.json({
    ok: true,
    ref: record.ref,
    notified,
    // The customer is told what happens next rather than just "thanks".
    nextSteps: [
      "We check your details and confirm the module or suite you need.",
      `We email the licence key to ${email} — usually the same working day.`,
      "In BizFlow, enter that email address and the key on the activation screen.",
    ],
  });
}
