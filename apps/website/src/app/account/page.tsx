import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ACCOUNT_COOKIE, getAccountFromToken } from "@/lib/account-auth";
import { prisma } from "@/lib/db";
import { withBasePath } from "@/lib/site";

type AccountOrder = {
  id: string;
  itemId: string;
  fulfilledAt: Date;
  amountTotal: number;
  currency: string;
  paymentStatus: string;
};

type AccountLicense = {
  id: string;
  key: string;
  status: string;
  deviceName: string | null;
  deviceActivatedAt: Date | null;
  order: { itemId: string };
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const token = (await cookies()).get(ACCOUNT_COOKIE)?.value;
  if (!token) redirect(withBasePath("/account/login"));

  const account = await getAccountFromToken(token);
  if (!account) redirect(withBasePath("/account/login"));

  const orders: AccountOrder[] = await prisma.order.findMany({
    where: { customerId: account.customer.id },
    orderBy: { fulfilledAt: "desc" },
    take: 20,
  });
  const [licenses, tickets, activities] = await Promise.all([
    prisma.license.findMany({
      where: { customerId: account.customer.id },
      include: { order: { select: { itemId: true } } },
      orderBy: { issuedAt: "desc" },
      take: 20,
    }),
    prisma.supportTicket.findMany({
      where: { customerId: account.customer.id },
      orderBy: { lastMessageAt: "desc" },
      take: 20,
    }),
    prisma.accountActivity.findMany({
      where: { customerId: account.customer.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-black tracking-tight">My Account</h1>
      <p className="mt-3 text-sm text-foreground/70">Signed in as {account.customer.email}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-foreground/50">Role: {account.customer.role}</p>

      <section className="glass-strong mt-6 rounded-2xl p-5">
        <h2 className="text-xl font-bold">Recent Orders</h2>
        {!orders.length ? (
          <p className="mt-3 text-sm text-foreground/65">No paid orders found yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {orders.map((order) => (
              <div key={order.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{order.itemId}</span>
                  <span className="text-foreground/60">{new Date(order.fulfilledAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-xs text-foreground/65">
                  {(order.amountTotal / 100).toFixed(2)} {order.currency.toUpperCase()} · {order.paymentStatus}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="glass-strong mt-6 rounded-2xl p-5">
        <h2 className="text-xl font-bold">Licenses & devices</h2>
        {!licenses.length ? <p className="mt-3 text-sm text-foreground/65">No licenses issued yet.</p> : (
          <div className="mt-3 space-y-2">
            {(licenses as AccountLicense[]).map((license) => (
              <div key={license.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                <p className="font-semibold">{license.order.itemId} <span className="text-foreground/55">({license.status})</span></p>
                <p className="mt-1 break-all font-mono text-xs text-foreground/65">{license.key}</p>
                <p className="mt-1 text-xs text-foreground/65">
                  {license.deviceActivatedAt ? `Bound to ${license.deviceName ?? "an unnamed device"}` : "Not yet activated on a device"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="glass-strong mt-6 rounded-2xl p-5">
        <h2 className="text-xl font-bold">Support tickets</h2>
        {!tickets.length ? <p className="mt-3 text-sm text-foreground/65">No support tickets yet.</p> : (
          <div className="mt-3 space-y-2">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                <div className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{ticket.subject}</span><span className="text-foreground/60">{ticket.status}</span></div>
                <p className="mt-1 text-xs text-foreground/65">{ticket.publicId} · Updated {new Date(ticket.lastMessageAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="glass-strong mt-6 rounded-2xl p-5">
        <h2 className="text-xl font-bold">Activity</h2>
        {!activities.length ? <p className="mt-3 text-sm text-foreground/65">Activity will appear here as you download, purchase, request changes, or contact support.</p> : (
          <div className="mt-3 space-y-2">
            {activities.map((activity) => <div key={activity.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"><p>{activity.summary}</p><p className="mt-1 text-xs text-foreground/60">{new Date(activity.createdAt).toLocaleString()}</p></div>)}
          </div>
        )}
      </section>

      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <Link href={withBasePath("/portal")} className="underline">
          Open buyer portal
        </Link>
        <Link href={withBasePath("/support")} className="underline">
          Contact support
        </Link>
        <Link href={withBasePath("/status")} className="underline">
          View system status
        </Link>
      </div>
    </main>
  );
}
