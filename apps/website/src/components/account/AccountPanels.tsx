/**
 * Server-rendered panels for the customer account area.
 *
 * The tabs are plain links driven by `?tab=` rather than client state: the page
 * stays shareable, works without JavaScript, and every panel can await data in
 * the parent server component.
 */

import Link from "next/link";

import CopyField from "@/components/account/CopyField";
import AccountSignOut from "@/components/account/AccountSignOut";
import SendResetLink from "@/components/account/SendResetLink";
import {
  Empty,
  Field,
  Pill,
  Stat,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  licenseStatusTone,
  relativeTime,
  type Tone,
} from "@/components/ui";
import { installerFor, type OSId } from "@/lib/downloads";
import { activityMeta } from "@/lib/activity-actions";
import { withBasePath } from "@/lib/site";

// ── Types ────────────────────────────────────────────────────────────────────

export interface AccountOrder {
  sessionId: string;
  itemId: string;
  label: string;
  amountTotal: number;
  currency: string;
  paymentStatus: string;
  fulfilledAt: string;
  licenseKey: string | null;
  licenseStatus: string | null;
  deviceName: string | null;
  deviceActivatedAt: string | null;
}

export interface AccountLicense {
  id: string;
  key: string;
  status: string;
  itemId: string;
  label: string;
  deviceName: string | null;
  deviceFingerprint: string | null;
  deviceActivatedAt: string | null;
  issuedAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
}

export interface AccountTicket {
  publicId: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  lastMessageAt: string;
  messages: { senderType: string; body: string; createdAt: string }[];
}

export interface AccountData {
  customer: {
    id: string;
    email: string;
    fullName: string | null;
    role: string;
    status: string;
    createdAt: string;
    emailVerifiedAt: string | null;
    hasPassword: boolean;
    oauthProviders: string[];
    sessionCount: number;
  };
  orders: AccountOrder[];
  licenses: AccountLicense[];
  tickets: AccountTicket[];
  activity: { id: string; action: string; summary: string; createdAt: string }[];
  modules: { id: string; name: string; tagline: string }[];
}

export const ACCOUNT_TABS = [
  { id: "overview", label: "Overview" },
  { id: "orders", label: "Orders" },
  { id: "licenses", label: "Licenses & devices" },
  { id: "support", label: "Support" },
  { id: "activity", label: "Activity" },
  { id: "profile", label: "Profile & security" },
] as const;

export type AccountTab = (typeof ACCOUNT_TABS)[number]["id"];

export function isAccountTab(value: string | undefined | null): value is AccountTab {
  return typeof value === "string" && ACCOUNT_TABS.some((tab) => tab.id === value);
}

/**
 * Capabilities that ship inside every paid module. They are not separate
 * products, which is why the account page states them explicitly — buyers keep
 * asking whether HR or expenses cost extra.
 */
const CORE_INCLUDED = [
  { name: "Employees & HR", detail: "Profiles, contracts, leave, attendance, shifts, payroll" },
  { name: "Finance", detail: "Revenue, profit, cash-flow projection, installment plans" },
  { name: "Expenses", detail: "Categories, receipts, breakdowns, tax receipts" },
  { name: "Reports", detail: "Sales trends, heatmaps, item-level exports" },
  { name: "Settings & roles", detail: "Multi-user permissions, backups, tax profiles" },
];

const OSES: OSId[] = ["windows", "mac", "linux"];

const TICKET_TONE: Record<string, Tone> = {
  OPEN: "info",
  IN_PROGRESS: "warn",
  WAITING_CUSTOMER: "violet",
  RESOLVED: "good",
  CLOSED: "neutral",
};

const moduleIdFromItem = (itemId: string) =>
  itemId === "suite" ? "suite" : itemId.startsWith("module:") ? itemId.slice(7) : "suite";

// ── Shell ────────────────────────────────────────────────────────────────────

export function AccountTabs({
  active,
  badges,
}: {
  active: AccountTab;
  badges?: Partial<Record<AccountTab, number>>;
}) {
  return (
    <nav className="mt-8 flex flex-wrap gap-2" aria-label="Account sections">
      {ACCOUNT_TABS.map((tab) => {
        const badge = badges?.[tab.id];
        return (
          <Link
            key={tab.id}
            href={withBasePath(tab.id === "overview" ? "/account" : `/account?tab=${tab.id}`)}
            aria-current={active === tab.id ? "page" : undefined}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              active === tab.id
                ? "bg-gradient-to-r from-biz-400 to-biz-600 text-white"
                : "glass hover:bg-white/10"
            }`}
          >
            {tab.label}
            {badge ? (
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${
                  active === tab.id ? "bg-white/20" : "bg-white/10"
                }`}
              >
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────

export function OverviewPanel({ data }: { data: AccountData }) {
  const paid = data.orders.filter((order) => order.paymentStatus === "paid");
  const activeLicense = data.licenses.find((license) => license.status === "ACTIVE") ?? data.licenses[0];
  const openTickets = data.tickets.filter((ticket) =>
    ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER"].includes(ticket.status)
  );

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Modules owned" value={data.modules.length} hint="Licensed on this account" />
        <Stat
          label="Active licences"
          value={data.licenses.filter((l) => l.status === "ACTIVE").length}
          hint={`${data.licenses.length} issued in total`}
          tone={data.licenses.some((l) => l.status === "ACTIVE") ? "good" : "warn"}
        />
        <Stat label="Paid orders" value={paid.length} hint={fmtMoney(paid.reduce((s, o) => s + o.amountTotal, 0))} />
        <Stat
          label="Open tickets"
          value={openTickets.length}
          hint={data.tickets[0] ? `Last reply ${relativeTime(data.tickets[0].lastMessageAt)}` : "No tickets yet"}
          tone={openTickets.length ? "warn" : "neutral"}
        />
      </section>

      {activeLicense ? (
        <section className="glass-strong rounded-2xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black tracking-tight">Your licence</h2>
              <p className="mt-1 text-sm text-foreground/55">
                Paste this key into BizFlow → Settings → Licence activation.
              </p>
            </div>
            <Pill tone={licenseStatusTone(activeLicense.status)}>{activeLicense.status}</Pill>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <CopyField
              label="Licence key"
              value={activeLicense.key}
              hint="Starts with BIZ- and includes the dashes."
            />
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/45">Device</p>
              <p className="mt-1.5 text-sm">
                {activeLicense.deviceActivatedAt
                  ? activeLicense.deviceName || "Unnamed device"
                  : "Not activated yet — install BizFlow and activate to bind this licence."}
              </p>
              {activeLicense.deviceActivatedAt ? (
                <p className="mt-1 text-xs text-foreground/50">
                  Activated {fmtDate(activeLicense.deviceActivatedAt)}
                </p>
              ) : null}
            </div>
          </div>
          <p className="mt-4 text-xs text-foreground/50">
            A licence covers one device at a time. Replace the machine? Ask us to release the
            binding and re-activate the new one — it is free. BizFlow re-checks the licence online
            about every 30 days, and keeps working offline in between.
          </p>
        </section>
      ) : (
        <section className="glass-strong rounded-2xl p-5">
          <h2 className="text-lg font-black tracking-tight">No licence on this account yet</h2>
          <p className="mt-1 text-sm text-foreground/55">
            Try any module in your browser first — nothing to install, no card needed.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={withBasePath("/app")}
              className="rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.02]"
            >
              Open the live demo
            </Link>
            <Link
              href={withBasePath("/download")}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
            >
              Compare modules
            </Link>
          </div>
        </section>
      )}

      {data.modules.length ? (
        <section className="glass-strong rounded-2xl p-5">
          <h2 className="text-lg font-black tracking-tight">What your licence includes</h2>
          <p className="mt-1 text-sm text-foreground/55">
            Installed modules and the shared back-office every module ships with.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.modules.map((module) => (
              <div key={module.id} className="rounded-xl border border-biz-400/20 bg-biz-500/10 p-3">
                <p className="text-sm font-bold">{module.name}</p>
                <p className="mt-0.5 text-xs text-foreground/60">{module.tagline}</p>
                <Link
                  href={withBasePath(`/app?module=${module.id}`)}
                  className="mt-2 inline-block text-xs font-semibold text-biz-200 hover:underline"
                >
                  Open in browser →
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-2 border-t border-white/10 pt-4 sm:grid-cols-2 lg:grid-cols-5">
            {CORE_INCLUDED.map((item) => (
              <div key={item.name}>
                <p className="text-xs font-bold text-foreground/80">{item.name}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-foreground/50">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="glass-strong rounded-2xl p-5">
        <h2 className="text-lg font-black tracking-tight">Getting started</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "Install",
              body: "Download the installer for your computer from the Orders tab.",
            },
            {
              step: "2",
              title: "Activate",
              body: "Open Settings → Licence activation and paste the email and key above.",
            },
            {
              step: "3",
              title: "Load your data",
              body: "Add your products, staff and tax profile — everything stays on your machine.",
            },
          ].map((item) => (
            <li key={item.step} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-biz-400 to-biz-600 text-xs font-bold text-white">
                {item.step}
              </span>
              <p className="mt-2 text-sm font-bold">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-foreground/60">{item.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {data.activity.length ? (
        <section className="glass-strong rounded-2xl p-5">
          <h2 className="text-lg font-black tracking-tight">Latest activity</h2>
          <ul className="mt-4 space-y-2">
            {data.activity.slice(0, 5).map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5"
              >
                <span className="text-sm">{entry.summary}</span>
                <span className="text-xs text-foreground/45">{relativeTime(entry.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

// ── Orders ───────────────────────────────────────────────────────────────────

export function OrdersPanel({ orders }: { orders: AccountOrder[] }) {
  if (!orders.length) {
    return <Empty text="No orders yet. Any purchase made with this email shows up here." />;
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const moduleId = moduleIdFromItem(order.itemId);
        return (
          <section key={order.sessionId} className="glass-strong rounded-2xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold">{order.label}</h2>
                  <Pill tone={order.paymentStatus === "paid" ? "good" : "warn"}>
                    {order.paymentStatus}
                  </Pill>
                  {order.licenseStatus ? (
                    <Pill tone={licenseStatusTone(order.licenseStatus)}>{order.licenseStatus}</Pill>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-foreground/50">
                  {fmtDateTime(order.fulfilledAt)} · ref {order.sessionId.slice(0, 18)}…
                </p>
              </div>
              <p className="text-sm font-bold">{fmtMoney(order.amountTotal, order.currency)}</p>
            </div>

            {order.licenseKey ? (
              <div className="mt-4">
                <CopyField
                  label="Licence key"
                  value={order.licenseKey}
                  hint={
                    order.deviceActivatedAt
                      ? `Bound to ${order.deviceName || "an unnamed device"} on ${fmtDate(order.deviceActivatedAt)}`
                      : "Not activated on a device yet"
                  }
                />
              </div>
            ) : null}

            <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-foreground/45">
              Download the installer
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {OSES.map((os) => {
                const download = installerFor(moduleId, os);
                return (
                  <Link
                    key={`${order.sessionId}-${os}`}
                    href={withBasePath(`/download?module=${moduleId}&os=${os}&autoStart=1`)}
                    className="glass rounded-xl px-3 py-3 text-sm font-semibold transition hover:bg-white/10"
                  >
                    <span className="block">
                      {download.os.emoji} {download.os.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs font-normal text-foreground/55">
                      {download.fileName}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ── Licences & devices ───────────────────────────────────────────────────────

export function LicensesPanel({ licenses }: { licenses: AccountLicense[] }) {
  if (!licenses.length) {
    return <Empty text="No licences yet. Licences are issued automatically after a purchase." />;
  }

  return (
    <div className="space-y-3">
      {licenses.map((license) => (
        <section key={license.id} className="glass-strong rounded-2xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">{license.label}</h2>
              <p className="mt-1 text-xs text-foreground/50">Issued {fmtDate(license.issuedAt)}</p>
            </div>
            <Pill tone={licenseStatusTone(license.status)}>{license.status}</Pill>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <CopyField label="Licence key" value={license.key} />
            <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
              <Field label="Device">
                {license.deviceActivatedAt
                  ? license.deviceName || "Unnamed device"
                  : "No device bound — activate in the desktop app"}
              </Field>
              {license.deviceActivatedAt ? (
                <Field label="Bound on">{fmtDateTime(license.deviceActivatedAt)}</Field>
              ) : null}
              {license.revokedReason ? (
                <Field label="Revoked reason">{license.revokedReason}</Field>
              ) : null}
            </div>
          </div>

          {license.status === "ACTIVE" ? (
            <p className="mt-3 text-xs text-foreground/50">
              One device at a time · online re-check roughly every 30 days · offline use between
              checks.
            </p>
          ) : null}
        </section>
      ))}
    </div>
  );
}

// ── Support ──────────────────────────────────────────────────────────────────

export function SupportPanel({ tickets }: { tickets: AccountTicket[] }) {
  return (
    <div className="space-y-4">
      <section className="glass-strong flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5">
        <div>
          <h2 className="text-lg font-black tracking-tight">Need a hand?</h2>
          <p className="mt-1 text-sm text-foreground/55">
            Tickets you open are answered on the same email address as this account. Want a feature
            built for your business? Send it as a custom request instead.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={withBasePath("/support")}
            className="rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.02]"
          >
            Open a ticket
          </Link>
          <Link
            href={withBasePath("/#request")}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
          >
            Request a custom feature
          </Link>
        </div>
      </section>

      {!tickets.length ? (
        <Empty text="No support tickets yet." />
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <section key={ticket.publicId} className="glass-strong rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-bold">{ticket.subject}</h3>
                  <p className="mt-1 text-xs text-foreground/50">
                    {ticket.publicId} · {ticket.category} · {ticket.priority} priority · updated{" "}
                    {relativeTime(ticket.lastMessageAt)}
                  </p>
                </div>
                <Pill tone={TICKET_TONE[ticket.status] ?? "neutral"}>
                  {ticket.status.replace(/_/g, " ")}
                </Pill>
              </div>

              <div className="mt-4 space-y-2">
                {ticket.messages.map((message, index) => {
                  const fromSupport = message.senderType !== "customer";
                  return (
                    <div
                      key={`${ticket.publicId}-${index}`}
                      className={`rounded-xl border px-4 py-3 text-sm ${
                        fromSupport
                          ? "border-biz-400/25 bg-biz-500/10"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/45">
                        {fromSupport ? "BizFlow support" : "You"} · {fmtDateTime(message.createdAt)}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap leading-relaxed text-foreground/80">
                        {message.body}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Activity ─────────────────────────────────────────────────────────────────

export function ActivityPanel({
  activity,
}: {
  activity: { id: string; action: string; summary: string; createdAt: string }[];
}) {
  if (!activity.length) {
    return (
      <Empty text="Activity appears here as you download, purchase, request changes, or contact support." />
    );
  }

  return (
    <section className="glass-strong rounded-2xl p-5">
      <h2 className="text-lg font-black tracking-tight">Account activity</h2>
      <ol className="mt-4 space-y-2">
        {activity.map((entry) => {
          const meta = activityMeta(entry.action);
          return (
            <li
              key={entry.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Pill tone={meta.tone}>{meta.label}</Pill>
                <span className="truncate text-sm">{entry.summary}</span>
              </div>
              <span className="text-xs text-foreground/45" title={fmtDateTime(entry.createdAt)}>
                {relativeTime(entry.createdAt)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ── Profile & security ───────────────────────────────────────────────────────

export function ProfilePanel({ data }: { data: AccountData }) {
  const { customer } = data;
  const signInMethods = [
    customer.hasPassword ? "Email + password" : null,
    ...customer.oauthProviders.map((provider) =>
      provider === "google" ? "Google" : provider.charAt(0).toUpperCase() + provider.slice(1)
    ),
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      <section className="glass-strong rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black tracking-tight">Account</h2>
            <p className="mt-1 text-sm text-foreground/55">
              The email here is the one we license your modules to.
            </p>
          </div>
          <AccountSignOut />
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Name">{customer.fullName || "Not set"}</Field>
          <Field label="Email">{customer.email}</Field>
          <Field label="Email verified">
            {customer.emailVerifiedAt ? (
              <span className="inline-flex items-center gap-2">
                {fmtDate(customer.emailVerifiedAt)}
                <Pill tone="good">Verified</Pill>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                Not yet
                <Pill tone="warn">Check your inbox</Pill>
              </span>
            )}
          </Field>
          <Field label="Account status">
            <Pill tone={customer.status === "ACTIVE" ? "good" : customer.status === "SUSPENDED" ? "bad" : "warn"}>
              {customer.status}
            </Pill>
          </Field>
          <Field label="Role">{customer.role}</Field>
          <Field label="Member since">{fmtDate(customer.createdAt)}</Field>
          <Field label="Sign-in methods">{signInMethods.join(" · ") || "None"}</Field>
          <Field label="Active sessions">
            {customer.sessionCount} {customer.sessionCount === 1 ? "device" : "devices"}
          </Field>
        </div>
      </section>

      <section className="glass-strong rounded-2xl p-5">
        <h2 className="text-lg font-black tracking-tight">Security</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-bold">Change your password</p>
            <p className="mt-1 text-xs leading-relaxed text-foreground/60">
              We email a one-time link. Anyone signed in elsewhere stays signed in until you use
              &ldquo;Sign out everywhere&rdquo; below.
            </p>
            <SendResetLink email={customer.email} />
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-bold">Sessions</p>
            <p className="mt-1 text-xs leading-relaxed text-foreground/60">
              Signed in on {customer.sessionCount} {customer.sessionCount === 1 ? "device" : "devices"}.
              Signing out everywhere revokes every existing session, including this one.
            </p>
            <div className="mt-3">
              <AccountSignOut />
            </div>
          </div>
        </div>
      </section>

      <section className="glass-strong rounded-2xl p-5">
        <h2 className="text-lg font-black tracking-tight">Where your data lives</h2>
        <p className="mt-1 text-sm leading-relaxed text-foreground/60">
          Sales, customers, stock, staff records and expenses stay in the BizFlow database on your
          own computer. Our servers only ever see your email address, your licence key, your device
          name, and the support messages you choose to send. No sales figures, no customer names,
          ever leave the machine.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href={withBasePath("/status")} className="font-semibold text-biz-200 hover:underline">
            System status
          </Link>
          <Link href={withBasePath("/legal/privacy")} className="font-semibold text-biz-200 hover:underline">
            Privacy policy
          </Link>
          <Link href={withBasePath("/support")} className="font-semibold text-biz-200 hover:underline">
            Contact support
          </Link>
        </div>
      </section>
    </div>
  );
}
