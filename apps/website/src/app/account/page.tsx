import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import AuroraBackground from "@/components/AuroraBackground";
import {
  AccountTabs,
  ActivityPanel,
  LicensesPanel,
  OrdersPanel,
  OverviewPanel,
  ProfilePanel,
  SupportPanel,
  isAccountTab,
  type AccountData,
} from "@/components/account/AccountPanels";
import { Pill } from "@/components/ui";
import { ACCOUNT_COOKIE, getAccountFromToken } from "@/lib/account-auth";
import { prisma } from "@/lib/db";
import { getPurchasable } from "@/lib/payments";
import { PLUGINS, getPlugin } from "@/lib/plugins";
import { withBasePath } from "@/lib/site";

export const metadata: Metadata = {
  title: "My Account",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const OPEN_TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER"];

const labelFor = (itemId: string) => getPurchasable(itemId)?.label ?? itemId;

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const token = (await cookies()).get(ACCOUNT_COOKIE)?.value;
  if (!token) redirect(withBasePath("/account/login"));

  const account = await getAccountFromToken(token);
  if (!account) redirect(withBasePath("/account/login"));

  const customerId = account.customer.id;
  const email = account.customer.email;

  const [customer, orders, licenses, tickets, activity] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        credentials: { select: { id: true } },
        oauthIdentities: { select: { provider: true } },
        _count: { select: { sessions: true } },
      },
    }),
    prisma.order.findMany({
      where: { customerId },
      include: { license: true },
      orderBy: { fulfilledAt: "desc" },
      take: 50,
    }),
    prisma.license.findMany({
      where: { customerId },
      include: { order: { select: { itemId: true } } },
      orderBy: { issuedAt: "desc" },
      take: 50,
    }),
    // Tickets raised before the account existed are only linked by email.
    prisma.supportTicket.findMany({
      where: { OR: [{ customerId }, { email }] },
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { lastMessageAt: "desc" },
      take: 25,
    }),
    prisma.accountActivity.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
  ]);

  if (!customer) redirect(withBasePath("/account/login"));

  // A suite licence unlocks every module, so expand it before de-duplicating.
  const ownedModuleIds = new Set<string>();
  for (const order of orders) {
    if (order.paymentStatus !== "paid") continue;
    if (order.itemId === "suite") PLUGINS.forEach((plugin) => ownedModuleIds.add(plugin.id));
    else if (order.itemId.startsWith("module:")) ownedModuleIds.add(order.itemId.slice("module:".length));
  }

  const data: AccountData = {
    customer: {
      id: customer.id,
      email: customer.email,
      fullName: customer.fullName,
      role: customer.role,
      status: customer.status,
      createdAt: customer.createdAt.toISOString(),
      emailVerifiedAt: customer.emailVerifiedAt?.toISOString() ?? null,
      hasPassword: customer.credentials !== null,
      oauthProviders: [...new Set(customer.oauthIdentities.map((identity) => identity.provider))],
      sessionCount: customer._count.sessions,
    },
    orders: orders.map((order) => ({
      sessionId: order.sessionId,
      itemId: order.itemId,
      label: labelFor(order.itemId),
      amountTotal: order.amountTotal,
      currency: order.currency,
      paymentStatus: order.paymentStatus,
      fulfilledAt: order.fulfilledAt.toISOString(),
      licenseKey: order.license?.key ?? null,
      licenseStatus: order.license?.status ?? null,
      deviceName: order.license?.deviceName ?? null,
      deviceActivatedAt: order.license?.deviceActivatedAt?.toISOString() ?? null,
    })),
    licenses: licenses.map((license) => ({
      id: license.id,
      key: license.key,
      status: license.status,
      itemId: license.order.itemId,
      label: labelFor(license.order.itemId),
      deviceName: license.deviceName,
      deviceFingerprint: license.deviceFingerprint,
      deviceActivatedAt: license.deviceActivatedAt?.toISOString() ?? null,
      issuedAt: license.issuedAt.toISOString(),
      revokedAt: license.revokedAt?.toISOString() ?? null,
      revokedReason: license.revokedReason,
    })),
    tickets: tickets.map((ticket) => ({
      publicId: ticket.publicId,
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      createdAt: ticket.createdAt.toISOString(),
      lastMessageAt: ticket.lastMessageAt.toISOString(),
      messages: ticket.messages.map((message) => ({
        senderType: message.senderType,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
      })),
    })),
    activity: activity.map((entry) => ({
      id: entry.id,
      action: entry.action,
      summary: entry.summary,
      createdAt: entry.createdAt.toISOString(),
    })),
    modules: [...ownedModuleIds]
      .map((id) => getPlugin(id))
      .filter((plugin): plugin is NonNullable<typeof plugin> => Boolean(plugin))
      .map((plugin) => ({ id: plugin.id, name: plugin.name, tagline: plugin.tagline })),
  };

  const { tab: rawTab } = await searchParams;
  const tab = isAccountTab(rawTab) ? rawTab : "overview";

  const openTickets = data.tickets.filter((ticket) => OPEN_TICKET_STATUSES.includes(ticket.status));

  return (
    <>
      <AuroraBackground />
      <main className="relative z-10 mx-auto min-h-screen w-full max-w-6xl px-4 py-10 sm:px-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-biz-300">My account</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">
              {data.customer.fullName ? `Welcome back, ${data.customer.fullName}` : "Welcome back"}
            </h1>
            <p className="mt-2 text-sm text-foreground/60">{data.customer.email}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Pill
                tone={
                  data.customer.status === "ACTIVE"
                    ? "good"
                    : data.customer.status === "SUSPENDED"
                      ? "bad"
                      : "warn"
                }
              >
                {data.customer.status}
              </Pill>
              <Pill tone="info">
                {data.modules.length} {data.modules.length === 1 ? "module" : "modules"}
              </Pill>
              {openTickets.length ? <Pill tone="warn">{openTickets.length} open tickets</Pill> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={withBasePath("/app")}
              className="rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.02]"
            >
              Open live demo
            </Link>
            <Link
              href={withBasePath("/download")}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
            >
              Downloads
            </Link>
          </div>
        </header>

        <AccountTabs active={tab} badges={{ support: openTickets.length }} />

        <div className="mt-6">
          {tab === "overview" ? <OverviewPanel data={data} /> : null}
          {tab === "orders" ? <OrdersPanel orders={data.orders} /> : null}
          {tab === "licenses" ? <LicensesPanel licenses={data.licenses} /> : null}
          {tab === "support" ? <SupportPanel tickets={data.tickets} /> : null}
          {tab === "activity" ? <ActivityPanel activity={data.activity} /> : null}
          {tab === "profile" ? <ProfilePanel data={data} /> : null}
        </div>
      </main>
    </>
  );
}
