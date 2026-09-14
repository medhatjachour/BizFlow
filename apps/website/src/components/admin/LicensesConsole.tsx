"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";

import { PLUGINS } from "@/lib/plugins";
import { withBasePath } from "@/lib/site";

/**
 * Licence console.
 *
 * Two jobs, and the old dashboard did neither well: mint a key (for a customer
 * who paid offline or whose request we just approved) and manage the keys
 * already out there. Both are here, and a request can be turned into a licence
 * without retyping anything — that retyping is where keys used to get sent to
 * the wrong address.
 *
 * Writes go through /api/admin/licenses; reads are seeded by the server
 * component so the first paint is never empty.
 */

export interface ConsoleLicense {
  id: string;
  key: string;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  deviceName: string | null;
  deviceActivatedAt: string | null;
  customer: { id: string; email: string; fullName: string | null; status: string };
  order: {
    itemId: string;
    amountTotal: number;
    currency: string;
    fulfilledAt: string;
    paymentStatus: string;
  };
}

export interface ConsoleRequest {
  ref: string;
  receivedAt: string;
  status: "new" | "issued" | "declined";
  source: "desktop" | "web";
  email: string;
  fullName: string;
  business: string;
  phone: string;
  itemId: string;
  seats: string;
  message: string;
  appVersion: string;
  platform: string;
  deviceName: string;
  deviceFingerprint: string;
  issuedLicenseKey?: string | null;
  handledAt?: string | null;
}

interface Props {
  licenses: ConsoleLicense[];
  requests: ConsoleRequest[];
}

type Tab = "requests" | "licenses";

const PRODUCT_OPTIONS = [
  { id: "suite", label: "BizFlow — Full Suite" },
  ...PLUGINS.map((plugin) => ({ id: `module:${plugin.id}`, label: `${plugin.name} module` })),
];

function itemLabel(itemId: string): string {
  return PRODUCT_OPTIONS.find((option) => option.id === itemId)?.label ?? itemId;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function fmtMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const area = document.createElement("textarea");
      area.value = value;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setDone(true);
    window.setTimeout(() => setDone(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-lg border border-white/15 px-2.5 py-1 text-[11px] font-semibold transition hover:bg-white/10"
    >
      {done ? "Copied" : label}
    </button>
  );
}

function Pill({ tone, children }: { tone: "ok" | "warn" | "bad" | "muted"; children: React.ReactNode }) {
  const tones = {
    ok: "border-emerald-400/30 bg-emerald-500/15 text-emerald-300",
    warn: "border-amber-400/30 bg-amber-500/15 text-amber-200",
    bad: "border-rose-400/30 bg-rose-500/15 text-rose-300",
    muted: "border-white/10 bg-white/5 text-foreground/60",
  } as const;
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  );
}

export default function LicensesConsole({ licenses, requests }: Props) {
  const [tab, setTab] = useState<Tab>(requests.some((r) => r.status === "new") ? "requests" : "licenses");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ACTIVE" | "REVOKED" | "unbound">("all");
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const openRequests = requests.filter((request) => request.status === "new");

  const filteredLicenses = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return licenses.filter((license) => {
      if (statusFilter === "unbound" && license.deviceName) return false;
      if (statusFilter !== "all" && statusFilter !== "unbound" && license.status !== statusFilter) return false;
      if (!needle) return true;
      return [license.customer.email, license.customer.fullName ?? "", license.key, license.order.itemId, license.deviceName ?? ""]
        .some((value) => value.toLowerCase().includes(needle));
    });
  }, [licenses, query, statusFilter]);

  const totals = useMemo(
    () => ({
      total: licenses.length,
      active: licenses.filter((license) => license.status === "ACTIVE").length,
      bound: licenses.filter((license) => Boolean(license.deviceName)).length,
      newRequests: openRequests.length,
    }),
    [licenses, openRequests.length]
  );

  const act = useCallback(
    async (id: string, action: "revoke" | "reactivate" | "unlock_device" | "resend_email") => {
      setBusy(`${id}:${action}`);
      setMessage(null);
      try {
        const response = await fetch(withBasePath("/api/admin/licenses"), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, action }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error ?? "The action did not complete");

        const done: Record<typeof action, string> = {
          revoke: "Licence revoked. The device will lock on its next check.",
          reactivate: "Licence reactivated.",
          unlock_device: "Device binding released — the key can be activated on another machine.",
          resend_email: "Licence key emailed to the customer.",
        };
        setMessage({ tone: "ok", text: done[action] });
        // Read back from the database rather than trusting local state.
        window.location.reload();
      } catch (error) {
        setMessage({ tone: "bad", text: error instanceof Error ? error.message : "The action did not complete" });
      } finally {
        setBusy(null);
      }
    },
    []
  );

  return (
    <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={withBasePath("/admin")} className="text-xs font-semibold uppercase tracking-widest text-biz-300 hover:underline">
            ← Manager
          </Link>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Licence console</h1>
          <p className="mt-2 max-w-2xl text-sm text-foreground/60">
            Mint keys, answer licence requests, and keep device bindings straight. A licence is bound to
            one device at a time — release the binding when a customer changes hardware.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
        >
          Refresh
        </button>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-4">
        <Stat label="Licences" value={String(totals.total)} hint="Minted in total" />
        <Stat label="Active" value={String(totals.active)} hint="Usable right now" />
        <Stat label="Device-bound" value={String(totals.bound)} hint="Activated somewhere" />
        <Stat label="Open requests" value={String(totals.newRequests)} hint="Waiting on you" tone={totals.newRequests ? "warn" : "muted"} />
      </section>

      {message ? (
        <p
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            message.tone === "ok"
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
              : "border-rose-400/30 bg-rose-500/10 text-rose-200"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <div className="mt-6 flex gap-2">
        <TabButton active={tab === "requests"} onClick={() => setTab("requests")}>
          Requests {totals.newRequests ? `(${totals.newRequests})` : ""}
        </TabButton>
        <TabButton active={tab === "licenses"} onClick={() => setTab("licenses")}>
          Licences ({licenses.length})
        </TabButton>
      </div>

      {tab === "requests" ? (
        <RequestsTab requests={requests} />
      ) : (
        <section className="glass-strong mt-4 rounded-2xl p-5">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search customer, key, device, product…"
              className="min-w-64 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-biz-400"
            />
            {(["all", "ACTIVE", "REVOKED", "unbound"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition ${
                  statusFilter === value ? "border-biz-400 bg-biz-500/15" : "border-white/10 bg-white/5 hover:border-white/25"
                }`}
              >
                {value === "unbound" ? "No device" : value.toLowerCase()}
              </button>
            ))}
          </div>

          {filteredLicenses.length === 0 ? (
            <p className="mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-foreground/50">
              No licences match this filter.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {filteredLicenses.map((license) => (
                <LicenseRow key={license.id} license={license} busy={busy} onAct={act} />
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function Stat({ label, value, hint, tone = "muted" }: { label: string; value: string; hint: string; tone?: "muted" | "warn" }) {
  return (
    <div className="glass-strong rounded-2xl p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">{label}</p>
      <p className={`mt-1 text-2xl font-black tracking-tight ${tone === "warn" ? "text-amber-200" : ""}`}>{value}</p>
      <p className="text-xs text-foreground/40">{hint}</p>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
        active ? "border-biz-400 bg-biz-500/15" : "border-white/10 bg-white/5 hover:border-white/25"
      }`}
    >
      {children}
    </button>
  );
}

function LicenseRow({
  license,
  busy,
  onAct,
}: {
  license: ConsoleLicense;
  busy: string | null;
  onAct: (id: string, action: "revoke" | "reactivate" | "unlock_device" | "resend_email") => void;
}) {
  const active = license.status === "ACTIVE";
  const rowBusy = busy?.startsWith(license.id) ?? false;

  return (
    <article className="grid gap-4 rounded-xl border border-white/10 bg-white/5 p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{license.customer.fullName || license.customer.email}</h3>
          <Pill tone={active ? "ok" : "bad"}>{license.status}</Pill>
          {license.deviceName ? <Pill tone="muted">{license.deviceName}</Pill> : <Pill tone="warn">No device</Pill>}
        </div>
        <p className="mt-1 text-sm text-foreground/65">
          {license.customer.email} · {itemLabel(license.order.itemId)} ·{" "}
          {fmtMoney(license.order.amountTotal, license.order.currency)}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="break-all rounded-md bg-black/25 px-2 py-1 font-mono text-xs tracking-wider">{license.key}</code>
          <CopyButton value={license.key} label="Copy key" />
          <CopyButton value={license.customer.email} label="Copy email" />
        </div>
        <p className="mt-2 text-xs text-foreground/45">
          Issued {fmtDate(license.order.fulfilledAt)}
          {license.deviceActivatedAt ? ` · activated ${fmtDate(license.deviceActivatedAt)}` : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-2 lg:justify-end">
        <button
          type="button"
          disabled={rowBusy}
          onClick={() => onAct(license.id, "resend_email")}
          className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold transition hover:bg-white/10 disabled:opacity-50"
        >
          {busy === `${license.id}:resend_email` ? "Sending…" : "Resend key"}
        </button>
        {license.deviceName ? (
          <button
            type="button"
            disabled={rowBusy}
            onClick={() => onAct(license.id, "unlock_device")}
            className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold transition hover:bg-white/10 disabled:opacity-50"
          >
            Release device
          </button>
        ) : null}
        {active ? (
          <button
            type="button"
            disabled={rowBusy}
            onClick={() => onAct(license.id, "revoke")}
            className="rounded-lg border border-rose-400/30 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:opacity-50"
          >
            Revoke
          </button>
        ) : (
          <button
            type="button"
            disabled={rowBusy}
            onClick={() => onAct(license.id, "reactivate")}
            className="rounded-lg bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/30 disabled:opacity-50"
          >
            Reactivate
          </button>
        )}
      </div>
    </article>
  );
}

function RequestsTab({ requests }: { requests: ConsoleRequest[] }) {
  const [selected, setSelected] = useState<ConsoleRequest | null>(null);

  if (!requests.length) {
    return (
      <p className="glass-strong mt-4 rounded-2xl px-4 py-10 text-center text-sm text-foreground/50">
        No licence requests yet. When a customer&apos;s trial ends, the desktop app can send one from its
        activation screen and it lands here.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {requests.map((request) => (
        <article key={request.ref} className="glass-strong rounded-2xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{request.fullName || request.email}</h3>
                <Pill tone={request.status === "new" ? "warn" : request.status === "issued" ? "ok" : "muted"}>
                  {request.status}
                </Pill>
                <Pill tone="muted">{request.source === "desktop" ? "Desktop app" : "Website"}</Pill>
              </div>
              <p className="mt-1 text-sm text-foreground/65">
                {request.email}
                {request.business ? ` · ${request.business}` : ""}
                {request.phone ? ` · ${request.phone}` : ""}
              </p>
              <p className="mt-0.5 text-xs text-foreground/45">
                {request.ref} · {fmtDate(request.receivedAt)} · {itemLabel(request.itemId)}
                {request.seats ? ` · ${request.seats} users` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(request)}
              className="rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.02]"
            >
              {request.status === "issued" ? "Issue again" : "Issue licence"}
            </button>
          </div>

          {request.message ? (
            <p className="mt-3 whitespace-pre-wrap rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-foreground/70">
              {request.message}
            </p>
          ) : null}

          {request.deviceFingerprint ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-foreground/55">
              <span className="font-semibold uppercase tracking-wide">Device ID</span>
              <code className="break-all rounded-md bg-black/25 px-2 py-1 font-mono">{request.deviceFingerprint}</code>
              <CopyButton value={request.deviceFingerprint} />
              {request.appVersion ? <span>· app {request.appVersion}</span> : null}
              {request.platform ? <span>· {request.platform}</span> : null}
            </div>
          ) : null}

          {request.issuedLicenseKey ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-emerald-200/80">
              <span className="font-semibold uppercase tracking-wide">Issued key</span>
              <code className="break-all rounded-md bg-black/25 px-2 py-1 font-mono">{request.issuedLicenseKey}</code>
              <CopyButton value={request.issuedLicenseKey} />
            </div>
          ) : null}
        </article>
      ))}

      {selected ? <IssueDrawer request={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

/**
 * Issue sheet, pre-filled from a request.
 *
 * Anything the customer already told us is carried across, so the only decision
 * left is the product and the price.
 */
function IssueDrawer({ request, onClose }: { request: ConsoleRequest; onClose: () => void }) {
  const [email, setEmail] = useState(request.email);
  const [itemId, setItemId] = useState(request.itemId);
  const [price, setPrice] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ key: string; reissued: boolean; emailSent: boolean } | null>(null);

  async function issue() {
    setBusy(true);
    setError(null);
    try {
      const parsed = price.trim() === "" ? undefined : Math.round(Number(price) * 100);
      if (parsed !== undefined && (!Number.isFinite(parsed) || parsed < 0)) {
        throw new Error("Enter a price in whole currency units, e.g. 149");
      }
      const response = await fetch(withBasePath("/api/admin/licenses"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          itemId,
          sendEmail,
          amountCents: parsed,
          requestRef: request.ref,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Could not issue the licence");
      setResult({
        key: data.license.licenseKey,
        reissued: Boolean(data.license.reissued),
        emailSent: Boolean(data.emailSent),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not issue the licence");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Issue a licence">
      <button type="button" aria-label="Close" onClick={onClose} className="flex-1 bg-black/50 backdrop-blur-sm" />
      <div className="h-full w-full max-w-lg overflow-y-auto border-s border-white/10 bg-slate-950/95 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black tracking-tight">Issue a licence</h2>
            <p className="mt-1 text-sm text-foreground/55">
              Creates a paid order and a key bound to one device. Request {request.ref}.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/15 px-3 py-1.5 text-sm transition hover:bg-white/10">
            Close
          </button>
        </div>

        {result ? (
          <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5">
            <p className="text-sm font-semibold text-emerald-200">
              {result.reissued ? "Customer already had this licence — key retrieved" : "Licence issued"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="break-all rounded-md bg-black/30 px-3 py-2 font-mono tracking-wider text-emerald-100">
                {result.key}
              </code>
              <CopyButton value={result.key} label="Copy key" />
            </div>
            <p className="mt-3 text-xs text-emerald-200/70">
              {result.emailSent
                ? `Sent to ${email}.`
                : "Not emailed. Give the customer the key above, or check SMTP settings."}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/30"
              >
                Back to the console
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <dl className="grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
              <Row label="Customer" value={request.fullName || "—"} />
              <Row label="Business" value={request.business || "—"} />
              <Row label="Phone" value={request.phone || "—"} />
              {request.deviceName ? <Row label="Device" value={request.deviceName} /> : null}
            </dl>

            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-foreground/40">Customer email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-biz-400"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-foreground/40">Product</span>
              <select
                value={itemId}
                onChange={(event) => setItemId(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-biz-400"
              >
                {PRODUCT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id} className="bg-slate-900">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-foreground/40">
                Price charged (blank = list price)
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="149"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-biz-400"
              />
              <span className="mt-1 block text-xs text-foreground/45">
                Recorded against the order so revenue reporting stays honest.
              </span>
            </label>

            <label className="flex items-center gap-2 text-sm text-foreground/75">
              <input type="checkbox" checked={sendEmail} onChange={(event) => setSendEmail(event.target.checked)} />
              Email the key and download link to the customer
            </label>

            {error ? (
              <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>
            ) : null}

            <button
              type="button"
              onClick={issue}
              disabled={busy || !email.trim()}
              className="w-full rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-5 py-3 font-semibold text-white transition hover:scale-[1.01] disabled:opacity-50"
            >
              {busy ? "Issuing…" : "Issue licence"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-foreground/40">{label}</dt>
      <dd className="min-w-0 break-words text-foreground/75">{value}</dd>
    </div>
  );
}
