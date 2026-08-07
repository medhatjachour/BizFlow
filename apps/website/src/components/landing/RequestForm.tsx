"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PLUGINS } from "@/lib/plugins";
import {
  estimate,
  formatRange,
  type Complexity,
  type RequestType,
} from "@/lib/pricing";
import { withBasePath } from "@/lib/site";

/**
 * Guest request / quote form. A visitor can ask for an update to an existing
 * module, a brand-new custom module for their business, or the full suite —
 * and see an instant price estimate that the server re-computes on submit.
 */
const TYPE_OPTIONS: { id: RequestType; label: string; desc: string }[] = [
  {
    id: "update",
    label: "Update a module",
    desc: "Add a feature or change an existing module",
  },
  {
    id: "new-plugin",
    label: "New custom module",
    desc: "A new module for your kind of business",
  },
  {
    id: "bundle",
    label: "Full suite",
    desc: `All ${PLUGINS.length} modules at a bundle price`,
  },
];

const COMPLEXITY_OPTIONS: { id: Complexity; label: string }[] = [
  { id: "small", label: "Small" },
  { id: "medium", label: "Medium" },
  { id: "large", label: "Large" },
];

const INDUSTRIES = [
  "Retail / shop", "Pharmacy", "Clinic / medical", "Veterinary", "Restaurant / café",
  "Gym / fitness", "Services", "Wholesale / distribution", "Manufacturing", "Other",
];

const CAPABILITY_GROUPS: { group: string; items: string[] }[] = [
  { group: "Sales & POS", items: ["Point of sale", "Barcode scanning", "Discounts & promotions", "Invoicing & receipts", "Returns & refunds", "Installments / deposits"] },
  { group: "Inventory", items: ["Stock tracking", "Batches & expiry", "Multi-location stock", "Purchase orders", "Low-stock alerts"] },
  { group: "Customers", items: ["Customer profiles", "Credit & balances", "Loyalty / points", "Appointments / booking"] },
  { group: "Finance", items: ["Expenses", "Reports & dashboards", "Profit & margins", "Payroll / salaries", "Tax / VAT"] },
  { group: "Team & access", items: ["Multiple users", "Roles & permissions", "Activity / audit log"] },
  { group: "Integrations", items: ["WhatsApp / SMS", "Email reports", "Online payments", "Accounting export", "Printer / scanner"] },
];

const PLATFORMS = ["Windows", "macOS", "Linux"];
const SEAT_OPTIONS = ["Just me", "2–5", "6–20", "20+"];
const LOCATION_OPTIONS = ["1", "2–3", "4+"];

export default function RequestForm() {
  const [type, setType] = useState<RequestType>("new-plugin");
  const [moduleId, setModuleId] = useState(PLUGINS[0].id);
  const [complexity, setComplexity] = useState<Complexity>("medium");
  const [rush, setRush] = useState(false);
  const [support, setSupport] = useState(true);
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [details, setDetails] = useState("");
  // Richer brief
  const [industry, setIndustry] = useState("");
  const [caps, setCaps] = useState<string[]>([]);
  const [seats, setSeats] = useState("");
  const [locations, setLocations] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["Windows"]);
  const [complexityTouched, setComplexityTouched] = useState(false);

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  // Auto-size the request from the number of capabilities chosen (until the
  // user overrides it manually) so the estimate reflects what they actually need.
  useEffect( () => {
    (async () => {
      if (complexityTouched || type === "bundle") return;
      const n = caps.length;
      setComplexity(n >= 8 ? "large" : n >= 4 ? "medium" : "small");
    })();
  
  }, [caps, complexityTouched, type]);

  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle"
  );
  const [result, setResult] = useState<{ ref: string; range: string } | null>(
    null
  );
  const [notify, setNotify] = useState<{ sent: boolean; target: string } | null>(
    null
  );
  const [error, setError] = useState("");

  const quote = useMemo(
    () => estimate({ type, moduleId, complexity, rush, support }),
    [type, moduleId, complexity, rush, support]
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError("");
    // Fold the structured brief into the details so nothing is lost server-side.
    const brief = [
      type === "new-plugin" && industry ? `Industry: ${industry}` : null,
      caps.length ? `Capabilities needed: ${caps.join(", ")}` : null,
      seats ? `Users/seats: ${seats}` : null,
      locations ? `Locations/branches: ${locations}` : null,
      platforms.length ? `Platforms: ${platforms.join(", ")}` : null,
    ].filter(Boolean).join("\n");
    const compiledDetails = [brief, details.trim()].filter(Boolean).join("\n\n");
    try {
      const res = await fetch(withBasePath("/api/requests"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          moduleId: type === "update" ? moduleId : undefined,
          complexity,
          rush,
          support,
          email,
          company,
          details: compiledDetails,
        }),
      });
      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await res.json()
        : {
            error:
              "Server returned a non-JSON response. Please refresh and try again.",
          };
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setResult({ ref: data.ref, range: formatRange(data.quote) });
      setNotify({
        sent: Boolean(data.notified),
        target: String(data.notificationTarget ?? ""),
      });
      setStatus("done");
    } catch (err) {
      setError((err as Error).message);
      setStatus("error");
    }
  };

  if (status === "done" && result) {
    return (
      <section id="request" className="relative mx-auto max-w-3xl px-4 py-28">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-strong rounded-3xl p-10 text-center"
        >
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-biz-500 text-3xl">
            ✓
          </div>
          <h2 className="text-3xl font-black">Request received</h2>
          <p className="mt-3 text-foreground/70">
            Thanks! Your reference is{" "}
            <span className="font-mono font-semibold text-biz-300">
              {result.ref}
            </span>
            . Our estimate for your request is:
          </p>
          <p className="mt-4 text-4xl font-black text-gradient">
            {result.range}
          </p>
          <p className="mt-3 text-sm text-foreground/50">
            {notify?.sent
              ? `Sent to ${notify.target}. We will reply to ${email}.`
              : `Saved your request. SMTP is not configured yet, so email delivery is pending.`}
          </p>
          <button
            onClick={() => {
              setStatus("idle");
              setResult(null);
              setNotify(null);
            }}
            className="mt-8 glass rounded-xl px-6 py-3 text-sm font-semibold transition hover:bg-white/10"
          >
            Send another request
          </button>
        </motion.div>
      </section>
    );
  }

  return (
    <section id="request" className="relative mx-auto max-w-5xl px-4 py-28">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-2xl text-center"
      >
        <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
          Build exactly what your <span className="text-gradient">business needs</span>
        </h2>
        <p className="mt-4 text-lg text-foreground/70">
          Pick the capabilities, your industry and your scale — and get an instant,
          itemised estimate. No sales calls, no waiting.
        </p>
      </motion.div>

      <div className="mt-12 grid gap-6 lg:grid-cols-5">
        {/* Form */}
        <form
          onSubmit={onSubmit}
          className="glass space-y-5 rounded-2xl p-6 lg:col-span-3"
        >
          {/* Request type */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              What do you need?
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              {TYPE_OPTIONS.map((o) => (
                <button
                  type="button"
                  key={o.id}
                  onClick={() => setType(o.id)}
                  className={`rounded-xl border p-3 text-left text-xs transition ${
                    type === o.id
                      ? "border-biz-400 bg-biz-500/15"
                      : "border-white/10 bg-white/5 hover:border-white/25"
                  }`}
                >
                  <div className="font-semibold">{o.label}</div>
                  <div className="mt-0.5 text-foreground/50">{o.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Which module (update only) */}
          {type === "update" && (
            <div>
              <label className="mb-2 block text-sm font-medium">
                Which module?
              </label>
              <select
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-biz-400"
              >
                {PLUGINS.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900">
                    {p.icon} {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Complexity (not for bundle) */}
          {type !== "bundle" && (
            <div>
              <label className="mb-2 block text-sm font-medium">
                How big is it?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {COMPLEXITY_OPTIONS.map((o) => (
                  <button
                    type="button"
                    key={o.id}
                    onClick={() => { setComplexity(o.id); setComplexityTouched(true); }}
                    className={`rounded-xl border py-2.5 text-sm font-medium transition ${
                      complexity === o.id
                        ? "border-biz-400 bg-biz-500/15"
                        : "border-white/10 bg-white/5 hover:border-white/25"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Industry (new module only) */}
          {type === "new-plugin" && (
            <div>
              <label className="mb-2 block text-sm font-medium">Your industry</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-biz-400"
              >
                <option value="" className="bg-slate-900">Select your business type…</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i} className="bg-slate-900">{i}</option>
                ))}
              </select>
            </div>
          )}

          {/* Capabilities */}
          {type !== "bundle" && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-medium">What should it do?</label>
                <span className="text-xs text-foreground/50">{caps.length} selected</span>
              </div>
              <div className="space-y-3">
                {CAPABILITY_GROUPS.map((g) => (
                  <div key={g.group}>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/40">{g.group}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {g.items.map((item) => {
                        const on = caps.includes(item);
                        return (
                          <button
                            type="button"
                            key={item}
                            onClick={() => toggle(caps, setCaps, item)}
                            className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
                              on
                                ? "border-biz-400 bg-biz-500/15 text-foreground"
                                : "border-white/10 bg-white/5 text-foreground/60 hover:border-white/25"
                            }`}
                          >
                            {on ? "✓ " : ""}{item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-foreground/40">
                Pick the building blocks you need — the estimate adjusts automatically.
              </p>
            </div>
          )}

          {/* Scale */}
          {type !== "bundle" && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium">Users</label>
                <select
                  value={seats}
                  onChange={(e) => setSeats(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-biz-400"
                >
                  <option value="" className="bg-slate-900">Any</option>
                  {SEAT_OPTIONS.map((s) => (
                    <option key={s} value={s} className="bg-slate-900">{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Locations</label>
                <select
                  value={locations}
                  onChange={(e) => setLocations(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-biz-400"
                >
                  <option value="" className="bg-slate-900">Any</option>
                  {LOCATION_OPTIONS.map((l) => (
                    <option key={l} value={l} className="bg-slate-900">{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Platforms</label>
                <div className="flex gap-1.5">
                  {PLATFORMS.map((p) => {
                    const on = platforms.includes(p);
                    return (
                      <button
                        type="button"
                        key={p}
                        onClick={() => toggle(platforms, setPlatforms, p)}
                        className={`flex-1 rounded-lg border py-2 text-xs transition ${
                          on
                            ? "border-biz-400 bg-biz-500/15"
                            : "border-white/10 bg-white/5 text-foreground/60 hover:border-white/25"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Add-ons */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={support}
                onChange={(e) => setSupport(e.target.checked)}
                className="h-4 w-4 accent-biz-500"
              />
              1 year support & updates
            </label>
            {type !== "bundle" && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={rush}
                  onChange={(e) => setRush(e.target.checked)}
                  className="h-4 w-4 accent-biz-500"
                />
                Priority / rush delivery
              </label>
            )}
          </div>

          {/* Details */}
          {type !== "bundle" && (
            <div>
              <label className="mb-2 block text-sm font-medium">
                Describe what you need
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={4}
                placeholder="e.g. A loyalty-points system for my coffee shops, with tiers and a redemption screen in the POS…"
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-biz-400"
              />
            </div>
          )}

          {/* Contact */}
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-biz-400"
            />
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company (optional)"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-biz-400"
            />
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-6 py-3 font-semibold text-white transition hover:scale-[1.01] disabled:opacity-60"
          >
            {status === "sending" ? "Sending…" : "Get my estimate"}
          </button>
        </form>

        {/* Live estimate */}
        <div className="lg:col-span-2">
          <div className="glass-strong sticky top-24 rounded-2xl p-6">
            <p className="text-sm text-foreground/60">Estimated price</p>
            <p className="mt-1 text-4xl font-black text-gradient">
              {formatRange(quote)}
            </p>
            <p className="mt-1 text-xs text-foreground/50">
              Typical delivery: {quote.eta}
            </p>

            <div className="mt-5 space-y-2 border-t border-white/10 pt-5">
              {quote.breakdown.map((b, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-foreground/60">{b.label}</span>
                  <span className="font-medium">{b.amount}</span>
                </div>
              ))}
            </div>

            <p className="mt-5 text-[11px] leading-relaxed text-foreground/40">
              This is an automated ballpark to help you plan. We&apos;ll confirm a
              fixed quote after reviewing your request — no commitment.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
