import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ACCOUNT_COOKIE, getAccountFromToken } from "@/lib/account-auth";
import { prisma } from "@/lib/db";
import { withBasePath } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const token = (await cookies()).get(ACCOUNT_COOKIE)?.value;
  if (!token) redirect(withBasePath("/account/login"));

  const account = await getAccountFromToken(token);
  if (!account) redirect(withBasePath("/account/login"));

  const orders = await prisma.order.findMany({
    where: { email: account.customer.email },
    orderBy: { fulfilledAt: "desc" },
    take: 20,
  });

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
