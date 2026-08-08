import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  TICKET_STATUSES,
  readSupportTickets,
  setSupportTicketStatus,
  verifyToken,
  type TicketStatus,
} from "@/lib/admin";
import { addSupportReplyByPublicId } from "@/lib/commerce-db";
import { sendSupportAgentReplyEmail } from "@/lib/transactional-mail";
import { logEvent, requestIdFromHeaders } from "@/lib/observability";

/** List support tickets. Admin-only. */
export async function GET(request: Request) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestId = requestIdFromHeaders(request.headers);
  const tickets = await readSupportTickets();
  return NextResponse.json({ ok: true, requestId, tickets });
}

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

/** Add an admin reply to a support ticket. Admin-only. */
export async function POST(request: Request) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestId = requestIdFromHeaders(request.headers);

  let body: { publicId?: unknown; message?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON", requestId }, { status: 400 });
  }

  const publicId = String(body.publicId ?? "").trim().toUpperCase();
  const message = String(body.message ?? "").trim();
  const statusRaw = String(body.status ?? "").trim();
  const status = statusRaw ? (statusRaw as TicketStatus) : undefined;

  if (!publicId) {
    return NextResponse.json({ error: "Ticket ID is required", requestId }, { status: 400 });
  }
  if (message.length < 3 || message.length > 6000) {
    return NextResponse.json({ error: "Reply must be 3-6000 characters", requestId }, { status: 400 });
  }
  if (status && !TICKET_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status", requestId }, { status: 400 });
  }

  const ticket = await addSupportReplyByPublicId({ publicId, message, status });
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found", requestId }, { status: 404 });
  }

  const mail = await sendSupportAgentReplyEmail({
    customerEmail: ticket.email,
    ticketId: ticket.publicId,
    message,
    status: ticket.status,
  });

  if (!mail.sent) {
    logEvent("warn", "support_reply_email_failed", {
      requestId,
      publicId,
      reason: mail.reason ?? "unknown",
    });
  }

  return NextResponse.json({
    ok: true,
    requestId,
    ticket: {
      publicId: ticket.publicId,
      status: ticket.status,
      updatedAt: ticket.updatedAt,
      messageCount: ticket.messages.length,
    },
    notified: mail.sent,
  });
}
