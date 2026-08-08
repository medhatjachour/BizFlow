import type { Metadata } from "next";

import { prisma } from "@/lib/db";

type ApiStatus = {
  ok: boolean;
  service: string;
  timestamp: string;
  db: string;
  metrics?: {
    paidOrders: number;
    openTickets: number;
  };
  sla?: {
    supportFirstResponseHours: number;
    supportResolutionBusinessDays: number;
  };
  error?: string;
};

export const metadata: Metadata = {
  title: "System Status",
  description: "BizFlow operational status and customer-facing SLA indicators.",
};

async function getStatus(): Promise<ApiStatus> {
  try {
    const [ordersPaid, openTickets] = await Promise.all([
      prisma.order.count({ where: { paymentStatus: "paid" } }),
      prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER"] } } }),
    ]);

    return {
      ok: true,
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
    };
  } catch (error) {
    return {
      ok: false,
      service: "bizflow-website",
      timestamp: new Date().toISOString(),
      db: "down",
      error: (error as Error).message,
    };
  }
}

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const data = await getStatus();

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-black tracking-tight">System Status</h1>
      <p className="mt-3 text-sm text-foreground/70">Live health and support service indicators for BizFlow.</p>

      <section className="glass-strong mt-6 rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{data.service}</h2>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
              data.ok ? "bg-emerald-500/20 text-emerald-200" : "bg-rose-500/20 text-rose-200"
            }`}
          >
            {data.ok ? "Operational" : "Degraded"}
          </span>
        </div>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-foreground/50">Database</dt>
            <dd className="font-semibold">{data.db}</dd>
          </div>
          <div>
            <dt className="text-foreground/50">Checked At</dt>
            <dd className="font-semibold">{new Date(data.timestamp).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-foreground/50">Paid Orders</dt>
            <dd className="font-semibold">{data.metrics?.paidOrders ?? 0}</dd>
          </div>
          <div>
            <dt className="text-foreground/50">Open Tickets</dt>
            <dd className="font-semibold">{data.metrics?.openTickets ?? 0}</dd>
          </div>
        </dl>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
          <p>SLA targets:</p>
          <ul className="mt-2 list-disc pl-5 text-foreground/75">
            <li>First response in {data.sla?.supportFirstResponseHours ?? 24} hours</li>
            <li>Typical resolution in {data.sla?.supportResolutionBusinessDays ?? 3} business days</li>
          </ul>
        </div>

        {!data.ok && data.error ? <p className="mt-2 text-sm text-rose-300">{data.error}</p> : null}
      </section>
    </main>
  );
}
