import { NextResponse } from "next/server";

import { createSupportTicket } from "@/lib/commerce-db";
import { logEvent, requestIdFromHeaders } from "@/lib/observability";
import { sendSupportTicketEmails } from "@/lib/transactional-mail";

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
  const subject = String(body.subject ?? "").trim();
  const category = String(body.category ?? "general").trim().toLowerCase();
  const message = String(body.message ?? "").trim();
  const priority = String(body.priority ?? "normal").trim().toLowerCase();

  if (!isEmail(email)) {
    return NextResponse.json({ error: "Valid email is required", requestId }, { status: 400 });
  }
  if (subject.length < 4 || subject.length > 160) {
    return NextResponse.json(
      { error: "Subject must be 4-160 characters", requestId },
      { status: 400 }
    );
  }
  if (message.length < 10 || message.length > 6000) {
    return NextResponse.json(
      { error: "Message must be 10-6000 characters", requestId },
      { status: 400 }
    );
  }

  try {
    const ticket = await createSupportTicket({
      email,
      subject,
      category,
      message,
      priority,
    });

    logEvent("info", "support_ticket_created", {
      requestId,
      publicId: ticket.publicId,
      category,
      priority,
    });

    const mail = await sendSupportTicketEmails({
      ticketId: ticket.publicId,
      customerEmail: email,
      subject,
      category,
      priority,
      message,
    });

    if (!mail.supportSent || !mail.customerSent) {
      logEvent("warn", "support_ticket_email_partial_failure", {
        requestId,
        publicId: ticket.publicId,
        supportSent: mail.supportSent,
        customerSent: mail.customerSent,
        reason: mail.reason ?? "unknown",
      });
    }

    return NextResponse.json({
      ok: true,
      requestId,
      notified: mail.supportSent,
      ticket: {
        publicId: ticket.publicId,
        status: ticket.status,
        createdAt: ticket.createdAt,
      },
    });
  } catch (error) {
    logEvent("error", "support_ticket_create_failed", {
      requestId,
      error: (error as Error).message,
    });
    return NextResponse.json(
      { error: "Could not create ticket", requestId },
      { status: 500 }
    );
  }
}
