import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  REQUEST_STATUSES,
  setRequestStatus,
  verifyToken,
  type RequestStatus,
} from "@/lib/admin";

/** Update a custom request's status. Admin-only. */
export async function PATCH(request: Request) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { ref?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ref = String(body.ref ?? "");
  const status = String(body.status ?? "") as RequestStatus;
  if (!REQUEST_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const ok = await setRequestStatus(ref, status);
  if (!ok) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
