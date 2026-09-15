import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import AuroraBackground from "@/components/AuroraBackground";
import CustomerActions from "@/components/admin/CustomerActions";
import {
  Empty,
  Field,
  Panel,
  Pill,
  Stat,
  customerStatusTone,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  licenseStatusTone,
  relativeTime,
} from "@/components/ui";
import { ADMIN_COOKIE, readCustomerDetail, verifyToken } from "@/lib/admin";
import { auditLabel } from "@/lib/audit-events";
import { withBasePath } from "@/lib/site";

export const metadata: Metadata = {
  title: "Customer — BizFlow Manager",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifyToken(token)) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <Panel title="Session expired" subtitle="Sign in to the manager dashboard to open this customer.">
          <Link
            href={withBasePath("/admin/login")}
            className="inline-block rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Go to sign in
          </Link>
        </Panel>
      </main>
    );
  }

  const detail = await readCustomerDetail(id);
  if (!detail) notFound();

  const { customer, orders, licenses, tickets, activity, audits, metrics } = detail;
  const isSuspended = customer.status === "SUSPENDED";

  return (
    <>
      <AuroraBackground />
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <nav className="flex flex-wrap items-center gap-2 text-xs text-foreground/50">
          <Link href={withBasePath("/admin")} className="hover:text-foreground">
            Manager
          </Link>
          <span aria-hidden>/</span>
          <Link href={`${withBasePath("/admin")}?tab=users`} className="hover:text-foreground">
            Customers
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground/70">{customer.email}</span>
        </nav>

        <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-black tracking-tight">{customer.fullName || customer.email}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Pill tone={customerStatusTone(customer.status)}>{customer.status}</Pill>
              <Pill tone={customer.role === "CUSTOMER" ? "neutral" : "violet"}>{customer.role}</Pill>
              <Pill tone={customer.emailVerifiedAt ? "good" : "warn"}>
                {customer.emailVerifiedAt ? "Email verified" : "Email unverified"}
              </Pill>
              {licenses.length ? (
                <Pill tone={metrics.activeLicenses ? "good" : "bad"}>
                  {metrics.activeLicenses}/{licenses.length} licences active
                </Pill>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-foreground/60">
              {customer.email} · joined {fmtDate(customer.createdAt)} · last activity {relativeTime(metrics.lastActivityAt)}
            </p>
          </div>
          <CustomerActions
            customerId={customer.id}
            status={customer.status}
            role={customer.role}
            email={customer.email}
          />
        </header>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Lifetime value"
            value={fmtMoney(metrics.revenueCents, metrics.currency)}
            hint={`${metrics.paidOrders} paid ${metrics.paidOrders === 1 ? "order" : "orders"}`}
          />
          <Stat
            label="Licences"
            value={`${metrics.activeLicenses}/${licenses.length}`}
            hint={licenses.length ? "active / issued" : "none issued yet"}
            tone={licenses.length && !metrics.activeLicenses ? "bad" : "neutral"}
          />
          <Stat
            label="Support tickets"
            value={tickets.length}
            hint={metrics.openTickets ? `${metrics.openTickets} still open` : "all resolved"}
            tone={metrics.openTickets ? "warn" : "good"}
          />
          <Stat
            label="Sessions"
            value={customer.counts.sessions}
            hint={isSuspended ? "suspended — signing out" : "sign-in history"}
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="space-y-4">
            <Panel
              title="Orders"
              subtitle="Every sale on this account, newest first."
              actions={
                <Link
                  href={`${withBasePath("/admin")}?tab=orders`}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-foreground/70 hover:border-biz-400/40 hover:text-foreground"
                >
                  All orders
                </Link>
              }
            >
              {orders.length === 0 ? (
                <Empty text="No orders on this account yet." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[36rem] border-collapse text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-foreground/45">
                        <th className="pb-2 pr-4 font-semibold">Module</th>
                        <th className="pb-2 pr-4 font-semibold">Fulfilled</th>
                        <th className="pb-2 pr-4 font-semibold">Amount</th>
                        <th className="pb-2 pr-4 font-semibold">Payment</th>
                        <th className="pb-2 font-semibold">Licence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.sessionId} className="border-t border-white/8">
                          <td className="py-2.5 pr-4">
                            <Link
                              href={withBasePath(`/admin/orders/${order.sessionId}`)}
                              className="font-semibold hover:text-biz-200"
                            >
                              {order.label}
                            </Link>
                            <p className="text-[11px] text-foreground/45">{order.itemId}</p>
                          </td>
                          <td className="py-2.5 pr-4 text-foreground/70">{fmtDate(order.fulfilledAt)}</td>
                          <td className="py-2.5 pr-4 font-semibold">
                            {fmtMoney(order.amountTotal, order.currency)}
                          </td>
                          <td className="py-2.5 pr-4">
                            <Pill tone={order.paymentStatus === "paid" ? "good" : "warn"}>
                              {order.paymentStatus}
                            </Pill>
                          </td>
                          <td className="py-2.5">
                            {order.license ? (
                              <span className="font-mono text-xs text-foreground/70">{order.license.key}</span>
                            ) : (
                              <span className="text-xs text-foreground/45">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel title="Support tickets" subtitle="Full conversation history with this customer.">
              {tickets.length === 0 ? (
                <Empty text="This customer has never opened a ticket." />
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <details key={ticket.publicId} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
                        <span className="font-semibold">{ticket.subject}</span>
                        <Pill
                          tone={
                            ticket.status === "OPEN" || ticket.status === "IN_PROGRESS"
                              ? "warn"
                              : ticket.status === "WAITING_CUSTOMER"
                                ? "violet"
                                : "good"
                          }
                        >
                          {ticket.status.replace(/_/g, " ")}
                        </Pill>
                        <span className="text-xs text-foreground/45">
                          {ticket.publicId} · {ticket.category} · {ticket.messageCount} messages ·{" "}
                          {relativeTime(ticket.lastMessageAt)}
                        </span>
                      </summary>
                      <ol className="mt-3 space-y-2">
                        {ticket.messages.map((message, index) => (
                          <li
                            key={`${ticket.publicId}-${index}`}
                            className={`rounded-lg border px-3 py-2 text-sm ${
                              message.senderType === "customer"
                                ? "border-white/10 bg-white/[0.04]"
                                : "border-biz-400/25 bg-biz-500/10"
                            }`}
                          >
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/45">
                              {message.senderType === "customer" ? "Customer" : "BizFlow team"} ·{" "}
                              {fmtDateTime(message.createdAt)}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-foreground/80">{message.body}</p>
                          </li>
                        ))}
                      </ol>
                      <Link
                        href={`${withBasePath("/admin")}?tab=tickets`}
                        className="mt-3 inline-block text-xs font-semibold text-biz-200 hover:underline"
                      >
                        Reply from the ticket queue →
                      </Link>
                    </details>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Activity & audit trail" subtitle="What the account did, and what the system recorded.">
              {activity.length === 0 && audits.length === 0 ? (
                <Empty text="No activity recorded yet." />
              ) : (
                <ol className="relative space-y-3 border-l border-white/10 pl-4">
                  {[
                    ...activity.map((entry) => ({
                      id: entry.id,
                      at: entry.createdAt,
                      title: entry.summary,
                      meta: entry.action,
                    })),
                    ...audits.map((entry) => ({
                      id: entry.id,
                      at: entry.createdAt,
                      title: auditLabel(entry.event),
                      meta: [entry.itemId, entry.sessionId].filter(Boolean).join(" · "),
                    })),
                  ]
                    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
                    .slice(0, 40)
                    .map((entry) => (
                      <li key={entry.id} className="relative">
                        <span className="absolute -left-[1.35rem] top-1.5 h-2 w-2 rounded-full bg-biz-400" />
                        <p className="text-sm text-foreground/85">{entry.title}</p>
                        <p className="text-[11px] text-foreground/45">
                          {fmtDateTime(entry.at)}
                          {entry.meta ? ` · ${entry.meta}` : ""}
                        </p>
                      </li>
                    ))}
                </ol>
              )}
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="Account">
              <div className="space-y-3">
                <Field label="Email">{customer.email}</Field>
                <Field label="Name">{customer.fullName || "—"}</Field>
                <Field label="Sign-in methods">
                  {[customer.hasPassword ? "Password" : null, ...customer.oauthProviders].filter(Boolean).join(", ") ||
                    "None"}
                </Field>
                <Field label="Email verified">{fmtDateTime(customer.emailVerifiedAt)}</Field>
                <Field label="Created">{fmtDateTime(customer.createdAt)}</Field>
                <Field label="Customer id">
                  <span className="font-mono text-xs">{customer.id}</span>
                </Field>
              </div>
            </Panel>

            <Panel
              title="Licences & devices"
              subtitle="One device per licence. Release the binding when hardware changes."
            >
              {licenses.length === 0 ? (
                <Empty text="No licence issued for this account." />
              ) : (
                <div className="space-y-3">
                  {licenses.map((license) => (
                    <article key={license.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Pill tone={licenseStatusTone(license.status)}>{license.status}</Pill>
                        <span className="text-[11px] text-foreground/45">issued {fmtDate(license.issuedAt)}</span>
                      </div>
                      <p className="mt-2 break-all font-mono text-xs text-foreground/80">{license.key}</p>
                      <div className="mt-3 space-y-2">
                        <Field label="Device">
                          {license.deviceName || (license.deviceActivatedAt ? "Unnamed device" : "Not activated")}
                        </Field>
                        {license.deviceActivatedAt ? (
                          <Field label="Bound on">{fmtDateTime(license.deviceActivatedAt)}</Field>
                        ) : null}
                        {license.deviceFingerprint ? (
                          <Field label="Fingerprint">
                            <span className="break-all font-mono text-[11px]">{license.deviceFingerprint}</span>
                          </Field>
                        ) : null}
                        {license.revokedReason ? (
                          <Field label="Revoked because">{license.revokedReason}</Field>
                        ) : null}
                      </div>
                      <Link
                        href={withBasePath("/admin/licenses")}
                        className="mt-3 inline-block text-xs font-semibold text-biz-200 hover:underline"
                      >
                        Manage in the licence console →
                      </Link>
                    </article>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      </main>
    </>
  );
}
