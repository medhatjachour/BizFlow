import { NextResponse } from "next/server";

import { registerAccount, validatePasswordStrength } from "@/lib/account-auth";
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
    if (message === "ACCOUNT_EXISTS") {
      return NextResponse.json({ error: "Account already exists", requestId }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not register account", requestId }, { status: 500 });
  }
}
