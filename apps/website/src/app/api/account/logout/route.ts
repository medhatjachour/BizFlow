import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ACCOUNT_COOKIE, logoutAccount } from "@/lib/account-auth";
import { requestIdFromHeaders } from "@/lib/observability";

export async function DELETE(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);
  const token = (await cookies()).get(ACCOUNT_COOKIE)?.value;

  if (token) {
    await logoutAccount(token);
  }

  const response = NextResponse.json({ ok: true, requestId });
  response.cookies.set(ACCOUNT_COOKIE, "", { path: "/", maxAge: 0, httpOnly: true });
  return response;
}
