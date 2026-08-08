import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ACCOUNT_COOKIE, getAccountFromToken } from "@/lib/account-auth";
import { requestIdFromHeaders } from "@/lib/observability";

export async function GET(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);
  const token = (await cookies()).get(ACCOUNT_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ ok: false, requestId }, { status: 401 });
  }

  const account = await getAccountFromToken(token);
  if (!account) {
    return NextResponse.json({ ok: false, requestId }, { status: 401 });
  }

  return NextResponse.json({ ok: true, requestId, customer: account.customer });
}
