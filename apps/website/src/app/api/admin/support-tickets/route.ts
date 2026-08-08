import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  TICKET_STATUSES,
  setSupportTicketStatus,
  verifyToken,
  type TicketStatus,
} from "@/lib/admin";

/** Update a support ticket status. Admin-only. */
export async function PATCH(request: Request) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { publicId?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const publicId = String(body.publicId ?? "").trim();
  const status = String(body.status ?? "") as TicketStatus;

  if (!publicId) {
    return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 });
  }
  if (!TICKET_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const ok = await setSupportTicketStatus(publicId, status);
  if (!ok) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
