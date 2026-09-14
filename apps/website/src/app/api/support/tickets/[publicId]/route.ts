import { NextResponse } from "next/server";

import { getSupportTicketByPublicId } from "@/lib/commerce-db";
import { requestIdFromHeaders } from "@/lib/observability";

type TicketMessage = {
  senderType: string;
  body: string;
  createdAt: Date;
};

export async function GET(
  request: Request,
  context: { params: Promise<{ publicId: string }> }
) {
  const requestId = requestIdFromHeaders(request.headers);
  const { publicId } = await context.params;

  if (!publicId || publicId.length > 64) {
    return NextResponse.json({ error: "Invalid ticket id", requestId }, { status: 400 });
  }

  // A ticket id is not a secret. It is generated from a millisecond timestamp
  // plus only three random bytes, it appears in emails and in the copy button on
  // the support form, and this endpoint used to return the customer's address
  // and the entire conversation to anybody who asked - no auth, no ownership
  // check, and a crisp 404 as an existence oracle.
  //
  // Require the address the ticket was raised from as well, the same two things
  // an airline asks for. A mismatch answers 404, not 403, so the response cannot
  // be used to confirm that a ticket id is real.
  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase() ?? "";
  if (!email) {
    return NextResponse.json(
      { error: "Enter the email address the ticket was raised from", requestId },
      { status: 400 }
    );
  }

  const ticket = await getSupportTicketByPublicId(publicId.toUpperCase());
  if (!ticket || ticket.email.trim().toLowerCase() !== email) {
    return NextResponse.json({ error: "Ticket not found", requestId }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    requestId,
    ticket: {
      publicId: ticket.publicId,
      email: ticket.email,
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      messages: ticket.messages.map((m: TicketMessage) => ({
        senderType: m.senderType,
        body: m.body,
        createdAt: m.createdAt,
      })),
    },
  });
}
