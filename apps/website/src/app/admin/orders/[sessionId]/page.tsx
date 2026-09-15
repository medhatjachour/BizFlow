import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import AuroraBackground from "@/components/AuroraBackground";
import LicenseActions from "@/components/admin/LicenseActions";
import {
  Empty,
  Field,
  Panel,
  Pill,
  Stat,
  customerStatusTone,
  fmtDateTime,
  fmtMoney,
  licenseStatusTone,
  relativeTime,
} from "@/components/ui";
import { ADMIN_COOKIE, readOrderDetail, verifyToken } from "@/lib/admin";
import { auditLabel } from "@/lib/audit-events";

export const metadata: Metadata = {
  title: "Order — BizFlow Manager",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifyToken(token)) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <Panel title="Session expired" subtitle="Sign in to the manager dashboard to open this order.">
          <Link
            href="/admin/login"
            className="inline-block rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Go to sign in
          </Link>
        </Panel>
      </main>
    );
  }

  const detail = await readOrderDetail(sessionId);
  if (!detail) notFound();

  const { order, customer, audits, tickets } = detail;
  const paid = order.paymentStatus === "paid";

  return (
    <>
      <AuroraBackground />
      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <nav className="flex flex-wrap items-center gap-2 text-xs text-foreground/50">
          <Link href="/admin" className="hover:text-foreground">
            Manager
          </Link>
          <span aria-hidden>/</span>
          <Link href="/admin?tab=orders" className="hover:text-foreground">
            Orders
          </Link>
          <span aria-hidden>/</span>
          <span className="font-mono text-foreground/70">{order.sessionId}</span>
        </nav>

        <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-black tracking-tight">{order.label}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Pill tone={paid ? "good" : "warn"}>{order.paymentStatus}</Pill>
              {order.legacy ? <Pill tone="warn">Legacy file record</Pill> : null}
              {order.license ? <Pill tone={licenseStatusTone(order.license.status)}>{order.license.status}</Pill> : null}
            </div>
            <p className="mt-2 text-sm text-foreground/60">
              {order.itemId} · fulfilled {relativeTime(order.fulfilledAt)}
            </p>
          </div>
          {customer ? (
            <Link
              href={`/admin/customers/${customer.id}`}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-foreground/75 transition hover:border-biz-400/40 hover:text-foreground"
            >
              Open customer account →
            </Link>
          ) : (
            <span className="text-sm text-foreground/45">No linked customer account</span>
          )}
        </header>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Amount" value={fmtMoney(order.amountTotal, order.currency)} hint="charged at checkout" />
          <Stat label="Fulfilled" value={fmtDateTime(order.fulfilledAt).split(",")[0]} hint={fmtDateTime(order.fulfilledAt)} />
          <Stat
            label="Device"
            value={order.license?.deviceName || (order.license?.deviceActivatedAt ? "Unnamed" : "—")}
            hint={order.license ? (order.license.deviceActivatedAt ? "bound" : "not activated") : "no licence"}
          />
          <Stat
            label="Audit events"
            value={audits.length}
            hint={audits.length ? `latest ${relativeTime(audits[0].createdAt)}` : "none recorded"}
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Panel title="Order" subtitle="As Stripe reported it, and what we stored.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Module">{order.label}</Field>
              <Field label="Item id">
                <span className="font-mono text-xs">{order.itemId}</span>
              </Field>
              <Field label="Amount">{fmtMoney(order.amountTotal, order.currency)}</Field>
              <Field label="Currency">{order.currency.toUpperCase()}</Field>
              <Field label="Payment status">{order.paymentStatus}</Field>
              <Field label="Fulfilled">{fmtDateTime(order.fulfilledAt)}</Field>
              <Field label="Buyer email">{order.email || "—"}</Field>
              <Field label="Stripe session">
                <span className="break-all font-mono text-xs">{order.sessionId}</span>
              </Field>
            </div>
            {order.legacy ? (
              <p className="mt-4 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                This order predates the customer database, so it has no linked account or audit
                trail. It is shown from the legacy <span className="font-mono">orders.json</span> store.
              </p>
            ) : null}
          </Panel>

          <Panel title="Customer" subtitle={customer ? "Account this order belongs to." : "No account is linked to this order."}>
            {customer ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/customers/${customer.id}`} className="font-semibold hover:text-biz-200">
                    {customer.fullName || customer.email}
                  </Link>
                  <Pill tone={customerStatusTone(customer.status)}>{customer.status}</Pill>
                  <Pill tone={customer.role === "CUSTOMER" ? "neutral" : "violet"}>{customer.role}</Pill>
                </div>
                <Field label="Email">{customer.email}</Field>
                <Field label="Joined">{fmtDateTime(customer.createdAt)}</Field>
                <Field label="Email verified">{fmtDateTime(customer.emailVerifiedAt)}</Field>
                <Field label="Customer id">
                  <span className="font-mono text-xs">{customer.id}</span>
                </Field>
              </div>
            ) : (
              <Empty text="Nothing links this order to a customer account yet." />
            )}
          </Panel>

          <Panel
            title="Licence & device"
            subtitle="One device per licence. Release the binding when the customer changes hardware."
          >
            {order.license ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={licenseStatusTone(order.license.status)}>{order.license.status}</Pill>
                  <span className="text-xs text-foreground/45">issued {fmtDateTime(order.license.issuedAt)}</span>
                </div>
                <Field label="Licence key">
                  <span className="break-all font-mono text-xs">{order.license.key}</span>
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Device">
                    {order.license.deviceName ||
                      (order.license.deviceActivatedAt ? "Unnamed device" : "Not activated")}
                  </Field>
                  <Field label="Bound on">{fmtDateTime(order.license.deviceActivatedAt)}</Field>
                </div>
                {order.license.deviceFingerprint ? (
                  <Field label="Fingerprint">
                    <span className="break-all font-mono text-[11px]">{order.license.deviceFingerprint}</span>
                  </Field>
                ) : null}
                {order.license.revokedReason ? (
                  <Field label="Revoked because">{order.license.revokedReason}</Field>
                ) : null}
                {order.license.id.startsWith("legacy:") ? (
                  <p className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                    This key was recorded before licences moved into the database, so it cannot be
                    revoked or re-bound from here.
                  </p>
                ) : (
                  <LicenseActions
                    licenseId={order.license.id}
                    status={order.license.status}
                    bound={Boolean(order.license.deviceActivatedAt)}
                    email={customer?.email ?? order.email ?? ""}
                  />
                )}
              </div>
            ) : (
              <Empty text="No licence was issued for this order." />
            )}
          </Panel>

          <div className="space-y-4">
            <Panel title="Audit trail" subtitle="What the system recorded for this order.">
              {audits.length === 0 ? (
                <Empty text="No audit events recorded." />
              ) : (
                <ol className="relative space-y-3 border-l border-white/10 pl-4">
                  {audits.map((entry) => (
                    <li key={entry.id} className="relative">
                      <span className="absolute -left-[1.35rem] top-1.5 h-2 w-2 rounded-full bg-biz-400" />
                      <p className="text-sm text-foreground/85">{auditLabel(entry.event)}</p>
                      <p className="text-[11px] text-foreground/45">{fmtDateTime(entry.createdAt)}</p>
                      {entry.payloadJson ? (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-[11px] text-foreground/45 hover:text-foreground/70">
                            Raw payload
                          </summary>
                          <pre className="mt-1 overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-2 text-[11px] text-foreground/60">
                            {prettyJson(entry.payloadJson)}
                          </pre>
                        </details>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </Panel>

            <Panel
              title="Support tickets"
              subtitle="Anything this buyer has raised, newest first."
              actions={
                <Link
                  href="/admin?tab=tickets"
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-foreground/70 hover:border-biz-400/40 hover:text-foreground"
                >
                  Open the ticket queue →
                </Link>
              }
            >
              {tickets.length === 0 ? (
                <Empty text="No tickets from this buyer." />
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
                      {!ticket.customerId ? (
                        <p className="mt-3 text-[11px] text-amber-300/80">
                          Raised before the account existed — linked by email address.
                        </p>
                      ) : null}
                    </details>
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

function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}
