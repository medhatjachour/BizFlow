"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PLUGINS } from "@/lib/plugins";
import {
  estimate,
  formatRange,
  type Complexity,
  type RequestType,
} from "@/lib/pricing";

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
    desc: "All 7 modules at a bundle price",
  },
];

const COMPLEXITY_OPTIONS: { id: Complexity; label: string }[] = [
  { id: "small", label: "Small" },
  { id: "medium", label: "Medium" },
  { id: "large", label: "Large" },
];

export default function RequestForm() {
  const [type, setType] = useState<RequestType>("new-plugin");
  const [moduleId, setModuleId] = useState(PLUGINS[0].id);
  const [complexity, setComplexity] = useState<Complexity>("medium");
  const [rush, setRush] = useState(false);
  const [support, setSupport] = useState(true);
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [details, setDetails] = useState("");

  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle"
  );
  const [result, setResult] = useState<{ ref: string; range: string } | null>(
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
    try {
      const res = await fetch("/api/requests", {
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
          details,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setResult({ ref: data.ref, range: formatRange(data.quote) });
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
            We&apos;ll email a detailed proposal to {email} shortly.
          </p>
          <button
            onClick={() => {
              setStatus("idle");
              setResult(null);
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
          Need something <span className="text-gradient">custom</span>?
        </h2>
        <p className="mt-4 text-lg text-foreground/70">
          Tell us what your business needs — an update to a module or a whole new
          one — and get an instant ballpark price.
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
                    onClick={() => setComplexity(o.id)}
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
