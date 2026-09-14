import { NextResponse } from "next/server";

import {
  createResetTokenForEmail,
  registerAccount,
  validatePasswordStrength,
} from "@/lib/account-auth";
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
  const password = String(body.password ?? "");
  const fullName = String(body.fullName ?? "").trim();

  if (!isEmail(email)) {
    return NextResponse.json({ error: "Valid email is required", requestId }, { status: 400 });
  }

  const pwError = validatePasswordStrength(password);
  if (pwError) {
    return NextResponse.json({ error: pwError, requestId }, { status: 400 });
  }

  try {
    const customer = await registerAccount({ email, password, fullName });
    return NextResponse.json({
      ok: true,
      requestId,
      customer: {
        email: customer.email,
        fullName: customer.fullName,
      },
    });
  } catch (error) {
    const message = (error as Error).message;

    // The address already belongs to a customer who has never set a password -
    // they bought something, or signed in with Google. We deliberately do not
    // attach the password they just typed: anyone could know their address.
    // Email them the claim link instead, then say the same thing we say to a
    // brand-new sign-up so the response does not confirm the account exists.
    if (message === "ACCOUNT_CLAIM_REQUIRES_EMAIL") {
      const token = await createResetTokenForEmail(email);
      if (token) {
        const mail = await sendPasswordResetEmail({ to: email, token });
        logEvent(mail.sent ? "info" : "warn", "account_claim_email", {
          requestId,
          email,
          sent: mail.sent,
          reason: mail.reason,
        });
      }

      return NextResponse.json({
        ok: true,
        requestId,
        verificationRequired: true,
        message: "We've emailed you a link to finish setting up your account.",
      });
    }

    if (message === "ACCOUNT_EXISTS") {
      return NextResponse.json({ error: "Account already exists", requestId }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not register account", requestId }, { status: 500 });
  }
}
