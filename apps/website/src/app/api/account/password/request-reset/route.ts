import { NextResponse } from "next/server";

import { createResetTokenForEmail } from "@/lib/account-auth";
import { logEvent, requestIdFromHeaders } from "@/lib/observability";
import { sendPasswordResetEmail } from "@/lib/transactional-mail";

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

  if (token) {
    const mail = await sendPasswordResetEmail({ to: email, token });
    if (!mail.sent) {
      logEvent("warn", "password_reset_email_failed", {
        requestId,
        email,
        reason: mail.reason ?? "unknown",
      });
    } else {
      logEvent("info", "password_reset_email_sent", { requestId, email });
    }
  }

  return NextResponse.json({
    ok: true,
    requestId,
    // Keep reset token visible only in non-production for easier testing.
    resetToken: process.env.NODE_ENV === "production" ? undefined : token,
  });
}
