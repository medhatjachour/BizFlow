import { NextResponse } from "next/server";

import { resetPasswordWithToken, validatePasswordStrength } from "@/lib/account-auth";
import { requestIdFromHeaders } from "@/lib/observability";

export async function POST(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON", requestId }, { status: 400 });
  }

  const token = String(body.token ?? "").trim();
  const password = String(body.password ?? "");

  if (!token) {
    return NextResponse.json({ error: "Reset token is required", requestId }, { status: 400 });
  }

  const pwError = validatePasswordStrength(password);
  if (pwError) {
    return NextResponse.json({ error: pwError, requestId }, { status: 400 });
  }

  try {
    await resetPasswordWithToken(token, password);
    return NextResponse.json({ ok: true, requestId });
  } catch (error) {
    if ((error as Error).message === "TOKEN_INVALID") {
      return NextResponse.json({ error: "Reset token is invalid or expired", requestId }, { status: 400 });
    }
    return NextResponse.json({ error: "Password reset failed", requestId }, { status: 500 });
  }
}
