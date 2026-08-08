import { NextResponse } from "next/server";

import { ACCOUNT_COOKIE, loginAccount } from "@/lib/account-auth";
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

  if (!isEmail(email) || !password) {
    return NextResponse.json({ error: "Email and password are required", requestId }, { status: 400 });
  }

  try {
    const { token, customer } = await loginAccount({ email, password });
    const response = NextResponse.json({ ok: true, requestId, customer });
    response.cookies.set(ACCOUNT_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    const message = (error as Error).message;
    if (message === "ACCOUNT_LOCKED") {
      return NextResponse.json({ error: "Account is temporarily locked", requestId }, { status: 423 });
    }
    if (message === "INVALID_CREDENTIALS") {
      return NextResponse.json({ error: "Invalid credentials", requestId }, { status: 401 });
    }
    return NextResponse.json({ error: "Could not sign in", requestId }, { status: 500 });
  }
}
