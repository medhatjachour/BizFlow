"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type {
  AdminSupportTicket,
  CustomRequest,
  Order,
  RequestStatus,
  TicketStatus,
} from "@/lib/admin";
import { PLUGINS } from "@/lib/plugins";
import { withBasePath } from "@/lib/site";

type OrderView = Order & { label: string };

interface Props {
  orders: OrderView[];
  requests: CustomRequest[];
  tickets: AdminSupportTicket[];
  usingDefaultPassword: boolean;
}

const STATUS_META: Record<RequestStatus, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-biz-500/20 text-biz-200 border-biz-400/30" },
  reviewing: { label: "Reviewing", cls: "bg-amber-500/15 text-amber-300 border-amber-400/30" },
  quoted: { label: "Quoted", cls: "bg-violet-500/15 text-violet-300 border-violet-400/30" },
  accepted: { label: "Accepted", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30" },
  declined: { label: "Declined", cls: "bg-rose-500/15 text-rose-300 border-rose-400/30" },
};
const STATUS_ORDER: RequestStatus[] = ["new", "reviewing", "quoted", "accepted", "declined"];

const TICKET_STATUS_META: Record<TicketStatus, { label: string; cls: string }> = {
  OPEN: { label: "Open", cls: "bg-biz-500/20 text-biz-200 border-biz-400/30" },
  IN_PROGRESS: { label: "In progress", cls: "bg-amber-500/15 text-amber-300 border-amber-400/30" },
  WAITING_CUSTOMER: { label: "Waiting customer", cls: "bg-violet-500/15 text-violet-300 border-violet-400/30" },
  RESOLVED: { label: "Resolved", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30" },
  CLOSED: { label: "Closed", cls: "bg-slate-500/20 text-slate-300 border-slate-400/30" },
};

const TICKET_STATUS_ORDER: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_CUSTOMER",
  "RESOLVED",
  "CLOSED",
];

const TYPE_LABEL: Record<CustomRequest["type"], string> = {
  update: "Module update",
  "new-plugin": "New custom module",
  bundle: "Full suite",
};

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const usdCents = (c: number) => usd((c || 0) / 100);
const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const statusOf = (r: CustomRequest): RequestStatus => r.status ?? "new";

type Tab = "overview" | "orders" | "requests" | "tickets" | "pricing";

export default function AdminDashboard({ orders, requests, tickets, usingDefaultPassword }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");

  // ── Derived metrics ──────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const paid = orders.filter((o) => (o.paymentStatus ?? "paid") === "paid");
    const revenueCents = paid.reduce((s, o) => s + (o.amountTotal || 0), 0);
    const licenses = orders.filter((o) => o.licenseKey).length;
    const pending = requests.filter((r) => statusOf(r) === "new").length;
    const open = requests.filter((r) => !["accepted", "declined"].includes(statusOf(r)));
    const pipeline = open.reduce((s, r) => s + (r.quote?.max ?? 0), 0);
    const won = requests
      .filter((r) => statusOf(r) === "accepted")
      .reduce((s, r) => s + (r.quote?.max ?? 0), 0);

    // Sales by product label.
    const byProduct = new Map<string, { count: number; cents: number }>();
    for (const o of paid) {
      const e = byProduct.get(o.label) ?? { count: 0, cents: 0 };
      e.count += 1;
      e.cents += o.amountTotal || 0;
      byProduct.set(o.label, e);
    }
    const products = [...byProduct.entries()]
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => b.cents - a.cents);
    const topProductCents = products[0]?.cents ?? 1;

    const openTicketStates: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER"];
    const openTickets = tickets.filter((t) => openTicketStates.includes(t.status));
    const urgentTickets = tickets.filter((t) => {
      const p = t.priority.trim().toLowerCase();
      return p === "high" || p === "urgent";
    });
    const avgFirstResponseHours = openTickets.length
      ? Math.round(
          openTickets.reduce((sum, t) => sum + (Date.now() - new Date(t.createdAt).getTime()) / 36e5, 0) /
            openTickets.length
        )
      : 0;

    return {
      revenueCents,
      orders: orders.length,
      paidCount: paid.length,
      licenses,
      pending,
      pipeline,
      won,
      products,
      topProductCents,
      openTickets: openTickets.length,
      urgentTickets: urgentTickets.length,
      avgFirstResponseHours,
    };
  }, [orders, requests, tickets]);

  async function logout() {
    await fetch(withBasePath("/api/admin/login"), { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "orders", label: "Licenses & orders", badge: orders.length || undefined },
    { id: "requests", label: "Custom requests", badge: metrics.pending || undefined },
    { id: "tickets", label: "Support tickets", badge: metrics.openTickets || undefined },
    { id: "pricing", label: "Pricing" },
  ];

  return (
    <main className="relative z-10 mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-biz-300">
            Manager dashboard
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">
            Welcome back 👋
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.refresh()}
            className="glass rounded-xl px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
          >
            ↻ Refresh
          </button>
          <button
            onClick={logout}
            className="glass rounded-xl px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10"
          >
            Sign out
          </button>
        </div>
      </div>

      {usingDefaultPassword && (
        <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          ⚠️ Using the default password <code className="font-mono">admin</code>. Set{" "}
          <code className="font-mono">ADMIN_PASSWORD</code> in <code className="font-mono">.env.local</code> before going live.
        </div>
      )}

      {/* KPI cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Revenue" value={usdCents(metrics.revenueCents)} hint={`${metrics.paidCount} paid`} accent="from-emerald-400 to-teal-600" />
        <Kpi label="Licenses issued" value={String(metrics.licenses)} hint="active keys" accent="from-biz-400 to-biz-600" />
        <Kpi label="New requests" value={String(metrics.pending)} hint="awaiting review" accent="from-amber-400 to-orange-600" />
        <Kpi label="Open pipeline" value={usd(metrics.pipeline)} hint={`${usd(metrics.won)} won`} accent="from-violet-400 to-fuchsia-600" />
        <Kpi label="Open tickets" value={String(metrics.openTickets)} hint={`${metrics.urgentTickets} urgent · ${metrics.avgFirstResponseHours}h avg age`} accent="from-cyan-400 to-sky-600" />
      </div>

      {/* Tabs */}
      <div className="mt-8 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === t.id
                ? "bg-gradient-to-r from-biz-400 to-biz-600 text-white"
                : "glass hover:bg-white/10"
            }`}
          >
            {t.label}
            {t.badge != null && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${tab === t.id ? "bg-white/20" : "bg-white/10"}`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="mt-6"
        >
          {tab === "overview" && <Overview metrics={metrics} orders={orders} requests={requests} tickets={tickets} />}
          {tab === "orders" && <OrdersPanel orders={orders} />}
          {tab === "requests" && <RequestsPanel requests={requests} />}
          {tab === "tickets" && <TicketsPanel tickets={tickets} />}
          {tab === "pricing" && <PricingPanel />}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}

// ── KPI card ────────────────────────────────────────────────────────────────
function Kpi({ label, value, hint, accent }: { label: string; value: string; hint: string; accent: string }) {
  return (
    <div className="glass-strong rounded-2xl p-4">
      <div className={`mb-3 h-1.5 w-10 rounded-full bg-gradient-to-r ${accent}`} />
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight">{value}</p>
      <p className="text-xs text-foreground/40">{hint}</p>
    </div>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────
interface Metrics {
  revenueCents: number;
  orders: number;
  paidCount: number;
  licenses: number;
  pending: number;
  pipeline: number;
  won: number;
  products: { label: string; count: number; cents: number }[];
  topProductCents: number;
  openTickets: number;
  urgentTickets: number;
  avgFirstResponseHours: number;
}

function Overview({
  metrics,
  orders,
  requests,
  tickets,
}: {
  metrics: Metrics;
  orders: OrderView[];
  requests: CustomRequest[];
  tickets: AdminSupportTicket[];
}) {
  const recentOrders = [...orders].sort(byDateDesc((o) => o.fulfilledAt)).slice(0, 5);
  const recentRequests = [...requests].sort(byDateDesc((r) => r.receivedAt)).slice(0, 5);
  const recentTickets = [...tickets].sort(byDateDesc((t) => t.lastMessageAt)).slice(0, 5);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Sales by product */}
      <div className="glass-strong rounded-2xl p-5">
        <h3 className="text-sm font-bold">Sales by product</h3>
        {metrics.products.length === 0 ? (
          <Empty text="No paid orders yet." />
        ) : (
          <ul className="mt-4 space-y-3">
            {metrics.products.map((p) => (
              <li key={p.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{p.label}</span>
                  <span className="text-foreground/60">
                    {usdCents(p.cents)} · {p.count}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-biz-400 to-biz-600"
                    style={{ width: `${Math.max(6, (p.cents / metrics.topProductCents) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Request pipeline summary */}
      <div className="glass-strong rounded-2xl p-5">
        <h3 className="text-sm font-bold">Request pipeline</h3>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {STATUS_ORDER.map((s) => {
            const count = requests.filter((r) => statusOf(r) === s).length;
            return (
              <div key={s} className="rounded-xl border border-white/10 bg-white/5 p-2 text-center">
                <p className="text-lg font-black">{count}</p>
                <p className="text-[10px] text-foreground/50">{STATUS_META[s].label}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-sm">
          <span className="text-foreground/60">Open pipeline value</span>
          <span className="font-bold">{usd(metrics.pipeline)}</span>
        </div>
      </div>

      {/* Recent orders */}
      <div className="glass-strong rounded-2xl p-5">
        <h3 className="text-sm font-bold">Recent orders</h3>
        {recentOrders.length === 0 ? (
          <Empty text="No orders yet." />
        ) : (
          <ul className="mt-3 divide-y divide-white/5">
            {recentOrders.map((o) => (
              <li key={o.sessionId} className="flex items-center justify-between py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{o.label}</p>
                  <p className="truncate text-xs text-foreground/50">{o.email ?? "—"}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{usdCents(o.amountTotal)}</p>
                  <p className="text-xs text-foreground/50">{fmtDate(o.fulfilledAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent requests */}
      <div className="glass-strong rounded-2xl p-5">
        <h3 className="text-sm font-bold">Recent custom requests</h3>
        {recentRequests.length === 0 ? (
          <Empty text="No requests yet." />
        ) : (
          <ul className="mt-3 divide-y divide-white/5">
            {recentRequests.map((r) => (
              <li key={r.ref} className="flex items-center justify-between py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{TYPE_LABEL[r.type]}</p>
                  <p className="truncate text-xs text-foreground/50">{r.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={statusOf(r)} />
                  <span className="text-xs text-foreground/50">{fmtRange(r)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Support queue snapshot */}
      <div className="glass-strong rounded-2xl p-5 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold">Support queue snapshot</h3>
          <p className="text-xs text-foreground/50">
            {metrics.openTickets} open · {metrics.urgentTickets} urgent · {metrics.avgFirstResponseHours}h avg age
          </p>
        </div>
        {recentTickets.length === 0 ? (
          <Empty text="No support tickets yet." />
        ) : (
          <ul className="mt-3 divide-y divide-white/5">
            {recentTickets.map((t) => (
              <li key={t.publicId} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.subject}</p>
                  <p className="truncate text-xs text-foreground/50">
                    {t.email} · {t.publicId} · {t.category}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <TicketStatusPill status={t.status} />
                  <span className="text-xs text-foreground/50">{fmtDate(t.lastMessageAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Orders / licenses panel ──────────────────────────────────────────────────
function OrdersPanel({ orders }: { orders: OrderView[] }) {
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const sorted = [...orders].sort(byDateDesc((o) => o.fulfilledAt));
    const needle = q.trim().toLowerCase();
    if (!needle) return sorted;
    return sorted.filter(
      (o) =>
        o.label.toLowerCase().includes(needle) ||
        (o.email ?? "").toLowerCase().includes(needle) ||
        (o.licenseKey ?? "").toLowerCase().includes(needle)
    );
  }, [orders, q]);

  return (
    <div className="glass-strong rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold">Licenses &amp; orders</h3>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search product, email or key…"
          className="w-64 max-w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-biz-400"
        />
      </div>

      {rows.length === 0 ? (
        <Empty text="No matching orders." />
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-foreground/40">
              <tr>
                <Th>Date</Th>
                <Th>Product</Th>
                <Th>Customer</Th>
                <Th>Amount</Th>
                <Th>License key</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((o) => (
                <tr key={o.sessionId} className="hover:bg-white/5">
                  <Td className="whitespace-nowrap text-foreground/60">{fmtDate(o.fulfilledAt)}</Td>
                  <Td className="font-medium">{o.label}</Td>
                  <Td className="text-foreground/70">{o.email ?? "—"}</Td>
                  <Td className="font-semibold">{usdCents(o.amountTotal)}</Td>
                  <Td>{o.licenseKey ? <CopyKey value={o.licenseKey} /> : <span className="text-foreground/30">—</span>}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CopyKey({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* ignore */
        }
      }}
      className="rounded-md bg-white/5 px-2 py-1 font-mono text-xs tracking-wider transition hover:bg-white/10"
      title="Copy license key"
    >
      {copied ? "Copied ✓" : value}
    </button>
  );
}

// ── Custom requests panel ────────────────────────────────────────────────────
function RequestsPanel({ requests }: { requests: CustomRequest[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<RequestStatus | "all">("all");
  const [busyRef, setBusyRef] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = useMemo(() => {
    const sorted = [...requests].sort(byDateDesc((r) => r.receivedAt));
    const needle = q.trim().toLowerCase();
    return sorted.filter((r) => {
      if (filter !== "all" && statusOf(r) !== filter) return false;
      if (!needle) return true;
      return (
        r.email.toLowerCase().includes(needle) ||
        (r.company ?? "").toLowerCase().includes(needle) ||
        r.ref.toLowerCase().includes(needle) ||
        r.details.toLowerCase().includes(needle)
      );
    });
  }, [requests, q, filter]);

  async function changeStatus(ref: string, status: RequestStatus) {
    setBusyRef(ref);
    try {
      await fetch(withBasePath("/api/admin/requests"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref, status }),
      });
      router.refresh();
    } finally {
      setBusyRef(null);
    }
  }

  return (
    <div className="glass-strong rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold">Custom requests</h3>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as RequestStatus | "all")}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-biz-400"
          >
            <option value="all">All statuses</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search email, ref, details…"
            className="w-56 max-w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-biz-400"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <Empty text="No matching requests." />
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => {
            const open = expanded === r.ref;
            return (
              <li key={r.ref} className="rounded-2xl border border-white/10 bg-white/5">
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{TYPE_LABEL[r.type]}</span>
                      <StatusPill status={statusOf(r)} />
                      <span className="font-mono text-[11px] text-foreground/40">{r.ref}</span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-foreground/60">
                      {r.company ? `${r.company} · ` : ""}
                      {r.email} · {fmtDate(r.receivedAt)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold">{fmtRange(r)}</p>
                    <p className="text-xs text-foreground/50">{r.quote?.eta ?? ""}</p>
                  </div>

                  <select
                    value={statusOf(r)}
                    disabled={busyRef === r.ref}
                    onChange={(e) => changeStatus(r.ref, e.target.value as RequestStatus)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-biz-400 disabled:opacity-50"
                  >
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_META[s].label}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => setExpanded(open ? null : r.ref)}
                    className="glass rounded-xl px-3 py-2 text-sm transition hover:bg-white/10"
                  >
                    {open ? "Hide" : "Details"}
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="grid gap-4 border-t border-white/10 p-4 md:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
                            What they asked for
                          </p>
                          <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground/80">
                            {r.details || "—"}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <Tag>Complexity: {r.complexity}</Tag>
                            {r.moduleId && <Tag>Module: {r.moduleId}</Tag>}
                            {r.rush && <Tag>Rush</Tag>}
                            {r.support && <Tag>+ Support</Tag>}
                          </div>
                          <a
                            href={`mailto:${r.email}?subject=Your BizFlow request ${r.ref}`}
                            className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.02]"
                          >
                            Reply by email
                          </a>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
                            Estimate breakdown
                          </p>
                          <ul className="mt-1.5 space-y-1 text-sm">
                            {(r.quote?.breakdown ?? []).map((b, i) => (
                              <li key={i} className="flex justify-between gap-4">
                                <span className="text-foreground/70">{b.label}</span>
                                <span className="font-medium">{b.amount}</span>
                              </li>
                            ))}
                            <li className="mt-1 flex justify-between gap-4 border-t border-white/10 pt-2 font-bold">
                              <span>Total</span>
                              <span>{fmtRange(r)}</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Support tickets panel ───────────────────────────────────────────────────
function TicketsPanel({ tickets }: { tickets: AdminSupportTicket[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<TicketStatus | "all">("all");
  const [priority, setPriority] = useState<"all" | "normal" | "high" | "urgent">("all");
  const [busyTicket, setBusyTicket] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...tickets]
      .sort(byDateDesc((t) => t.lastMessageAt))
      .filter((t) => {
        if (filter !== "all" && t.status !== filter) return false;
        if (priority !== "all" && t.priority.trim().toLowerCase() !== priority) return false;
        if (!needle) return true;
        return (
          t.subject.toLowerCase().includes(needle) ||
          t.email.toLowerCase().includes(needle) ||
          t.publicId.toLowerCase().includes(needle) ||
          (t.latestMessage ?? "").toLowerCase().includes(needle)
        );
      });
  }, [tickets, q, filter, priority]);

  async function changeTicketStatus(publicId: string, status: TicketStatus) {
    setBusyTicket(publicId);
    try {
      await fetch(withBasePath("/api/admin/support-tickets"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId, status }),
      });
      router.refresh();
    } finally {
      setBusyTicket(null);
    }
  }

  async function sendReply(publicId: string, status: TicketStatus) {
    const message = (replyDrafts[publicId] ?? "").trim();
    if (message.length < 3) return;

    setBusyTicket(publicId);
    try {
      await fetch(withBasePath("/api/admin/support-tickets"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId, message, status }),
      });

      setReplyDrafts((prev) => ({ ...prev, [publicId]: "" }));
      router.refresh();
    } finally {
      setBusyTicket(null);
    }
  }

  return (
    <div className="glass-strong rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold">Support tickets</h3>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as TicketStatus | "all")}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-biz-400"
          >
            <option value="all">All statuses</option>
            {TICKET_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {TICKET_STATUS_META[s].label}
              </option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as "all" | "normal" | "high" | "urgent")}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-biz-400"
          >
            <option value="all">All priorities</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ticket, subject, email..."
            className="w-64 max-w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-biz-400"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <Empty text="No matching tickets." />
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((t) => {
            const open = expanded === t.publicId;
            const isUrgent = ["urgent", "high"].includes(t.priority.trim().toLowerCase());
            return (
              <li
                key={t.publicId}
                className={`rounded-2xl border bg-white/5 ${
                  isUrgent ? "border-rose-400/40" : "border-white/10"
                }`}
              >
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{t.subject}</span>
                      <TicketStatusPill status={t.status} />
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-foreground/70">
                        {t.priority}
                      </span>
                      <span className="font-mono text-[11px] text-foreground/40">{t.publicId}</span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-foreground/60">
                      {t.email} · {t.category} · {t.messageCount} messages
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-foreground/50">Last activity</p>
                    <p className="text-sm font-semibold">{fmtDate(t.lastMessageAt)}</p>
                  </div>

                  <select
                    value={t.status}
                    disabled={busyTicket === t.publicId}
                    onChange={(e) => changeTicketStatus(t.publicId, e.target.value as TicketStatus)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-biz-400 disabled:opacity-50"
                  >
                    {TICKET_STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {TICKET_STATUS_META[s].label}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => setExpanded(open ? null : t.publicId)}
                    className="glass rounded-xl px-3 py-2 text-sm transition hover:bg-white/10"
                  >
                    {open ? "Hide" : "Details"}
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="grid gap-4 border-t border-white/10 p-4 md:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
                            Conversation timeline
                          </p>
                          <ul className="mt-2 space-y-2">
                            {t.messages.map((m, i) => (
                              <li key={`${t.publicId}-${i}`} className="rounded-xl bg-white/5 p-3">
                                <div className="mb-1 flex items-center justify-between gap-3 text-xs text-foreground/50">
                                  <span className="uppercase tracking-wide">{m.senderType}</span>
                                  <span>{fmtDate(m.createdAt)}</span>
                                </div>
                                <p className="whitespace-pre-wrap text-sm text-foreground/80">{m.body}</p>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
                            Ticket actions
                          </p>
                          <div className="mt-2 space-y-2 rounded-xl bg-white/5 p-3 text-sm">
                            <p>
                              <span className="text-foreground/50">Customer:</span> {t.email}
                            </p>
                            <p>
                              <span className="text-foreground/50">Category:</span> {t.category}
                            </p>
                            <p>
                              <span className="text-foreground/50">Current status:</span> {TICKET_STATUS_META[t.status].label}
                            </p>
                          </div>
                          <a
                            href={`mailto:${t.email}?subject=Re:${encodeURIComponent(t.subject)} (${t.publicId})`}
                            className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.02]"
                          >
                            Reply by email
                          </a>

                          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
                              Reply from dashboard
                            </p>
                            <textarea
                              value={replyDrafts[t.publicId] ?? ""}
                              onChange={(e) =>
                                setReplyDrafts((prev) => ({ ...prev, [t.publicId]: e.target.value }))
                              }
                              rows={4}
                              placeholder="Write a direct support reply to this customer..."
                              className="mt-2 w-full rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-sm outline-none focus:border-biz-400"
                            />
                            <div className="mt-2 flex items-center justify-between gap-3">
                              <p className="text-xs text-foreground/50">
                                This sends an email to the customer and appends the message to the ticket timeline.
                              </p>
                              <button
                                disabled={busyTicket === t.publicId || (replyDrafts[t.publicId] ?? "").trim().length < 3}
                                onClick={() => sendReply(t.publicId, t.status)}
                                className="rounded-lg bg-gradient-to-r from-biz-400 to-biz-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                              >
                                {busyTicket === t.publicId ? "Sending..." : "Send reply"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Small shared bits ────────────────────────────────────────────────────────
function StatusPill({ status }: { status: RequestStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${m.cls}`}>
      {m.label}
    </span>
  );
}

function TicketStatusPill({ status }: { status: TicketStatus }) {
  const m = TICKET_STATUS_META[status];
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${m.cls}`}>
      {m.label}
    </span>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md bg-white/5 px-2 py-1 text-foreground/70">{children}</span>;
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-semibold">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-3 ${className}`}>{children}</td>;
}
function Empty({ text }: { text: string }) {
  return <p className="mt-6 text-center text-sm text-foreground/40">{text}</p>;
}

function fmtRange(r: CustomRequest): string {
  const { min, max } = r.quote ?? { min: 0, max: 0 };
  return min === max ? usd(min) : `${usd(min)} – ${usd(max)}`;
}

function byDateDesc<T>(get: (x: T) => string | undefined) {
  return (a: T, b: T) => new Date(get(b) ?? 0).getTime() - new Date(get(a) ?? 0).getTime();
}

// ── Pricing panel ─────────────────────────────────────────────────────────────
interface EffectivePrices {
  modules: Record<string, number>;
  suite: number;
  suiteList: number;
}

function PricingPanel() {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [effective, setEffective] = useState<EffectivePrices | null>(null);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(withBasePath("/api/admin/prices"), { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data = (await res.json()) as {
        overrides: Record<string, number>;
        effective: EffectivePrices;
      };
      setEffective(data.effective);
      setOverrides(data.overrides ?? {});
      // Seed the draft inputs with the current effective per-module price.
      setDraft(
        Object.fromEntries(
          PLUGINS.map((p) => [p.id, String(data.effective.modules[p.id] ?? p.price)])
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load prices");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const prices: Record<string, number> = {};
      for (const p of PLUGINS) {
        const n = Number(draft[p.id]);
        if (Number.isFinite(n) && n >= 0) prices[p.id] = Math.round(n);
      }
      const res = await fetch(withBasePath("/api/admin/prices"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prices }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      const data = (await res.json()) as {
        overrides: Record<string, number>;
        effective: EffectivePrices;
      };
      setEffective(data.effective);
      setOverrides(data.overrides ?? {});
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function resetItem(id: string, base: number) {
    setDraft((d) => ({ ...d, [id]: String(base) }));
  }

  if (loading) {
    return <Empty text="Loading prices…" />;
  }

  return (
    <div className="space-y-6">
      <div className="glass-strong rounded-2xl p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-black tracking-tight">Module pricing</h2>
            <p className="mt-1 text-sm text-foreground/55">
              Set the one-time price for each module. These prices are used across
              the site and at checkout. The suite price is auto-calculated at a 40%
              discount on the total.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-foreground/40">Suite price</p>
            <p className="text-2xl font-black">{effective ? usd(effective.suite) : "—"}</p>
            <p className="text-xs text-foreground/40">
              list {effective ? usd(effective.suiteList) : "—"}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PLUGINS.map((p) => {
            const overridden = overrides[p.id] != null;
            return (
              <div key={p.id} className="glass rounded-xl p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-semibold">
                    <span className="text-lg">{p.icon}</span>
                    {p.name}
                  </span>
                  {overridden && (
                    <span className="rounded-full bg-biz-500/20 px-2 py-0.5 text-[10px] font-semibold text-biz-200">
                      custom
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-foreground/50">$</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={draft[p.id] ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [p.id]: e.target.value }))
                    }
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold outline-none focus:border-biz-400/50"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-foreground/40">
                  <span>Catalog: ${p.price}</span>
                  <button
                    onClick={() => resetItem(p.id, p.price)}
                    className="rounded px-2 py-0.5 transition hover:bg-white/10 hover:text-foreground/70"
                  >
                    Reset
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.02] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save prices"}
          </button>
          <button
            onClick={load}
            disabled={saving}
            className="glass rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-50"
          >
            Revert
          </button>
          {saved && <span className="text-sm font-semibold text-emerald-300">✓ Saved</span>}
          {error && <span className="text-sm font-semibold text-rose-300">{error}</span>}
        </div>
      </div>
    </div>
  );
}
