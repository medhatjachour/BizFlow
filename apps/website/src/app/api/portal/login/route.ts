import { NextResponse } from "next/server";

import {
  CUSTOMER_COOKIE,
  createCustomerToken,
  hasPaidLicense,
} from "@/lib/customer";

export async function POST(request: Request) {
  let body: { email?: unknown; licenseKey?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const licenseKey = String(body.licenseKey ?? "").trim().toUpperCase();

  if (!email || !licenseKey) {
    return NextResponse.json({ error: "Email and license key are required" }, { status: 400 });
  }

  const valid = await hasPaidLicense(email, licenseKey);
  if (!valid) {
    return NextResponse.json(
      { error: "No paid order was found for this email and license key" },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(CUSTOMER_COOKIE, createCustomerToken(email, licenseKey), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CUSTOMER_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
