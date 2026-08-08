import { NextResponse } from "next/server";

import { createResetTokenForEmail } from "@/lib/account-auth";
import { requestIdFromHeaders } from "@/lib/observability";

function isEmail(v: unknown): v is string {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;
}

export async function POST(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON", requestId }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!isEmail(email)) {
    return NextResponse.json({ error: "Valid email is required", requestId }, { status: 400 });
  }

  const token = await createResetTokenForEmail(email);

  return NextResponse.json({
    ok: true,
    requestId,
    // TODO: replace with email delivery. Token is exposed only in non-production for testing.
    resetToken: process.env.NODE_ENV === "production" ? undefined : token,
  });
}
