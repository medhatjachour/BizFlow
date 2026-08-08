import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requestIdFromHeaders } from "@/lib/observability";

export async function GET(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);

  try {
    const [ordersPaid, openTickets] = await Promise.all([
      prisma.order.count({ where: { paymentStatus: "paid" } }),
      prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER"] } } }),
    ]);

    return NextResponse.json({
      ok: true,
      requestId,
      service: "bizflow-website",
      timestamp: new Date().toISOString(),
      db: "up",
      metrics: {
        paidOrders: ordersPaid,
        openTickets,
      },
      sla: {
        supportFirstResponseHours: 24,
        supportResolutionBusinessDays: 3,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        requestId,
        service: "bizflow-website",
        timestamp: new Date().toISOString(),
        db: "down",
        error: (error as Error).message,
      },
      { status: 503 }
    );
  }
}
