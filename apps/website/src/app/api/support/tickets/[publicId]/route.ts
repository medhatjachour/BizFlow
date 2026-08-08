import { NextResponse } from "next/server";

import { getSupportTicketByPublicId } from "@/lib/commerce-db";
import { requestIdFromHeaders } from "@/lib/observability";

export async function GET(
  request: Request,
  context: { params: Promise<{ publicId: string }> }
) {
  const requestId = requestIdFromHeaders(request.headers);
  const { publicId } = await context.params;

  if (!publicId || publicId.length > 64) {
    return NextResponse.json({ error: "Invalid ticket id", requestId }, { status: 400 });
  }

  const ticket = await getSupportTicketByPublicId(publicId.toUpperCase());
  if (!ticket) {
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
      messages: ticket.messages.map((m) => ({
        senderType: m.senderType,
        body: m.body,
        createdAt: m.createdAt,
      })),
    },
  });
}
