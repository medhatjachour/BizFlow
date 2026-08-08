import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import AuroraBackground from "@/components/AuroraBackground";
import {
  CUSTOMER_COOKIE,
  getCustomerOrders,
  parseCustomerToken,
} from "@/lib/customer";
import { installerFor, type OSId } from "@/lib/downloads";
import { withBasePath } from "@/lib/site";
import PortalSignOutButton from "@/components/portal/PortalSignOutButton";

export const metadata: Metadata = {
  title: "Buyer Portal",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const OSES: OSId[] = ["windows", "mac", "linux"];

function fmtMoney(amountCents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency}`;
  }
}

function moduleIdFromItem(itemId: string): string {
  if (itemId === "suite") return "suite";
  if (itemId.startsWith("module:")) return itemId.slice("module:".length);
  return "suite";
}

export default async function PortalPage() {
  const token = parseCustomerToken((await cookies()).get(CUSTOMER_COOKIE)?.value);
  if (!token) redirect(withBasePath("/portal/login"));

  const orders = await getCustomerOrders(token.email, token.licenseKey);
  if (!orders.length) redirect(withBasePath("/portal/login"));

  return (
    <>
      <AuroraBackground />
      <main className="relative z-10 mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-biz-300">Buyer Portal</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">Your Licenses & Downloads</h1>
            <p className="mt-2 text-sm text-foreground/60">Signed in as {token.email}</p>
          </div>
          <PortalSignOutButton />
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">License Key</p>
          <p className="mt-1 select-all font-mono text-sm tracking-wide">{token.licenseKey}</p>
        </div>

        <div className="mt-6 grid gap-4">
          {orders.map((order) => {
            const moduleId = moduleIdFromItem(order.itemId);
            return (
              <section key={order.sessionId} className="glass-strong rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">{order.itemLabel}</h2>
                    <p className="text-xs text-foreground/55">
                      Purchased {order.fulfilledAt ? new Date(order.fulfilledAt).toLocaleString() : "recently"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{fmtMoney(order.amountTotal, order.currency)}</p>
                    <p className="text-xs text-foreground/55">{order.paymentStatus.toUpperCase()}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {OSES.map((os) => {
                    const dl = installerFor(moduleId, os);
                    return (
                      <a
                        key={`${order.sessionId}-${os}`}
                        href={dl.url}
                        className="glass rounded-xl px-3 py-3 text-sm font-semibold transition hover:bg-white/10"
                      >
                        <span className="block">{dl.os.name}</span>
                        <span className="mt-0.5 block truncate text-xs font-normal text-foreground/55">
                          {dl.fileName}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-6">
          <Link href={withBasePath("/download")} className="text-sm font-semibold text-biz-200 hover:underline">
            Need another module? Go to Build Your Version.
          </Link>
        </div>
      </main>
    </>
  );
}
