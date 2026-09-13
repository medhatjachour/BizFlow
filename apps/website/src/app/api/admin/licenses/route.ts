import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ADMIN_COOKIE, updateLicenseAccess, verifyToken } from "@/lib/admin";
import { issueLicenseManually } from "@/lib/commerce-db";
import { allItemIds } from "@/lib/payments";
import { sendLicenseDeliveryEmail } from "@/lib/transactional-mail";

const actions = ["revoke", "reactivate", "unlock_device"] as const;
type LicenseAction = (typeof actions)[number];

function isEmail(v: unknown): v is string {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;
}

/**
 * Manually issue a license for an email + item (e.g. a customer who paid
 * offline). Returns the license key so the admin can copy/send it, and
 * optionally emails it to the customer.
 */
export async function POST(request: Request) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifyToken(token)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { email?: unknown; itemId?: unknown; sendEmail?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const itemId = String(body.itemId ?? "").trim();
  const sendEmail = body.sendEmail === true;

  if (!isEmail(email)) return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  if (!allItemIds().includes(itemId)) {
    return NextResponse.json({ error: "Unknown item" }, { status: 400 });
  }

  const issued = await issueLicenseManually({ email, itemId });

  let emailSent = false;
  if (sendEmail) {
    try {
      const result = await sendLicenseDeliveryEmail({
        to: issued.email,
        itemLabel: issued.itemLabel,
        licenseKey: issued.licenseKey,
      });
      emailSent = result.sent;
    } catch {
      emailSent = false;
    }
  }

  return NextResponse.json({ ok: true, license: issued, emailSent });
}

export async function PATCH(request: Request) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifyToken(token)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { id?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = String(body.id ?? "").trim();
  const action = String(body.action ?? "") as LicenseAction;
  if (!id || !actions.includes(action)) return NextResponse.json({ error: "Invalid license action" }, { status: 400 });

  const updated = await updateLicenseAccess({ id, action });
  if (!updated) return NextResponse.json({ error: "License not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}