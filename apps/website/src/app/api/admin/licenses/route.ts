import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  ADMIN_COOKIE,
  readLicenses,
  recordLicenseEmailResent,
  updateLicenseAccess,
  verifyToken,
} from "@/lib/admin";
import { issueLicenseManually } from "@/lib/commerce-db";
import { prisma } from "@/lib/db";
import { readLicenseRequests, setLicenseRequestStatus } from "@/lib/license-requests";
import { allItemIds, getPurchasable } from "@/lib/payments";
import { sendLicenseDeliveryEmail } from "@/lib/transactional-mail";

const accessActions = ["revoke", "reactivate", "unlock_device", "resend_email"] as const;
type AccessAction = (typeof accessActions)[number];

function isEmail(v: unknown): v is string {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;
}

async function authorized(): Promise<boolean> {
  return verifyToken((await cookies()).get(ADMIN_COOKIE)?.value);
}

/**
 * Everything the licences console needs, in one round trip.
 *
 * Licences live in the database and requests in a JSON inbox; the console shows
 * them side by side, so returning both keeps a refresh from being two requests
 * that can disagree with each other.
 */
export async function GET() {
  if (!(await authorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [licenses, requests] = await Promise.all([readLicenses(), readLicenseRequests()]);
  return NextResponse.json({ licenses, requests });
}

/**
 * Manually issue a license for an email + item (e.g. a customer who paid
 * offline, or an approved licence request). Returns the license key so the admin
 * can copy/send it, and optionally emails it to the customer.
 */
export async function POST(request: Request) {
  if (!(await authorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    email?: unknown;
    itemId?: unknown;
    sendEmail?: unknown;
    amountCents?: unknown;
    requestRef?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const itemId = String(body.itemId ?? "").trim();
  const sendEmail = body.sendEmail === true;
  const requestRef = String(body.requestRef ?? "").trim();

  // Record what the customer actually paid. Without this every manually issued
  // licence booked $0 revenue, so the dashboard under-reported sales.
  const item = getPurchasable(itemId);
  const parsedAmount = Number(body.amountCents);
  const amountCents =
    Number.isFinite(parsedAmount) && parsedAmount >= 0
      ? Math.round(parsedAmount)
      : item?.amountCents ?? 0;

  if (!isEmail(email)) return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  if (!allItemIds().includes(itemId)) {
    return NextResponse.json({ error: "Unknown item" }, { status: 400 });
  }

  const issued = await issueLicenseManually({ email, itemId, amountTotal: amountCents });

  let emailSent = false;
  let emailReason: string | undefined;
  if (sendEmail) {
    try {
      const result = await sendLicenseDeliveryEmail({
        to: issued.email,
        itemLabel: issued.itemLabel,
        licenseKey: issued.licenseKey,
      });
      emailSent = result.sent;
      emailReason = result.reason;
    } catch (error) {
      emailReason = (error as Error).message;
      emailSent = false;
    }
  }

  // Close the loop on the inbox row so a request is never issued twice.
  let requestClosed = false;
  if (requestRef) {
    requestClosed = await setLicenseRequestStatus(requestRef, "issued", {
      issuedLicenseKey: issued.licenseKey,
    });
  }

  return NextResponse.json({ ok: true, license: issued, emailSent, emailReason, requestClosed });
}

export async function PATCH(request: Request) {
  if (!(await authorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = String(body.id ?? "").trim();
  const action = String(body.action ?? "") as AccessAction;
  if (!id || !accessActions.includes(action)) {
    return NextResponse.json({ error: "Invalid license action" }, { status: 400 });
  }

  // Re-sending the delivery email is a read: it must not touch access state.
  if (action === "resend_email") {
    const license = await prisma.license.findUnique({
      where: { id },
      include: { customer: true, order: true },
    });
    if (!license) return NextResponse.json({ error: "License not found" }, { status: 404 });

    const result = await sendLicenseDeliveryEmail({
      to: license.customer.email,
      itemLabel: getPurchasable(license.order.itemId)?.label ?? license.order.itemId,
      licenseKey: license.key,
    });
    if (!result.sent) {
      return NextResponse.json(
        { error: `Could not send the email (${result.reason ?? "unknown"})` },
        { status: 502 }
      );
    }

    await recordLicenseEmailResent({
      orderId: license.orderId,
      customerId: license.customerId,
      key: license.key,
    });
    return NextResponse.json({ ok: true, emailSent: true });
  }

  const updated = await updateLicenseAccess({ id, action });
  if (!updated) return NextResponse.json({ error: "License not found" }, { status: 404 });
  return NextResponse.json({ ok: true, delivered: action });
}