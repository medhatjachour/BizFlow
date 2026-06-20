"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PLUGINS, downloadUrlFor } from "@/lib/plugins";
import BuyButton from "@/components/BuyButton";
import { usePrices } from "@/components/usePrices";

/**
 * The module picker — the core of the experience. Each BizFlow module can be
 * tried live in the browser (isolated to just that module) or bought as its
 * own desktop build. Rich cards (highlights, full feature list, price) are
 * designed to move a visitor from "try" to "buy".
 */
export default function Plugins() {
  const prices = usePrices();
  return (
    <section id="plugins" className="relative mx-auto max-w-6xl px-4 py-28">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-2xl text-center"
      >
        <span className="glass mb-4 inline-block rounded-full px-4 py-1.5 text-xs font-medium text-foreground/80">
          {PLUGINS.length} modules · try free · one-time price
        </span>
        <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
          Pick a module.
          <span className="text-gradient"> Try it free. Own it.</span>
        </h2>
        <p className="mt-4 text-lg text-foreground/70">
          Every module runs live in your browser — isolated, with real data — so
          you can be sure before you buy. No subscription: pay once, run forever,
          even offline.
        </p>
      </motion.div>

      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PLUGINS.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
            className={`glass glow-card relative flex flex-col rounded-2xl p-6 ${
              p.popular ? "ring-1 ring-biz-400/60" : ""
            }`}
          >
            {p.popular && (
              <span className="absolute -top-3 right-5 rounded-full bg-gradient-to-r from-biz-400 to-biz-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg">
                Most popular
              </span>
            )}

            <div className="mb-4 flex items-center gap-3">
              <div
                className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br text-2xl ${p.accent}`}
              >
                {p.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold leading-tight">{p.name}</h3>
                <p className="text-xs text-foreground/50">{p.tagline}</p>
              </div>
            </div>

            {/* Highlight metric chips */}
            <div className="mb-4 grid grid-cols-3 gap-2">
              {p.highlights.map((h) => (
                <div
                  key={h.label}
                  className="rounded-lg bg-white/5 px-2 py-2 text-center"
                >
                  <div className="text-sm font-bold text-biz-300">{h.value}</div>
                  <div className="mt-0.5 text-[10px] leading-tight text-foreground/50">
                    {h.label}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-sm leading-relaxed text-foreground/65">
              {p.longDescription}
            </p>

            <ul className="mt-4 space-y-1.5">
              {p.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-xs text-foreground/65"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="mt-0.5 shrink-0 text-biz-300"
                  >
                    <path
                      d="M20 6L9 17l-5-5"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            <p className="mt-4 text-[11px] text-foreground/40">
              Best for {p.bestFor}.
            </p>

            {/* Price + CTAs */}
            <div className="mt-5 border-t border-white/10 pt-5">
              <div className="mb-3 flex items-baseline gap-1.5">
                <span className="text-2xl font-black">${prices.modules[p.id] ?? p.price}</span>
                <span className="text-xs text-foreground/50">
                  one-time · lifetime
                </span>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/app?module=${p.id}`}
                  className="flex-1 rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:scale-[1.02]"
                >
                  Try free
                </Link>
                <BuyButton
                  item={`module:${p.id}`}
                  label="Buy"
                  fallbackUrl={downloadUrlFor(p)}
                  className="glass flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition hover:bg-white/10 disabled:opacity-60"
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Suite upsell + custom request hooks */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-center sm:flex-row sm:text-left"
      >
        <p className="text-sm text-foreground/70">
          Need several modules? The{" "}
          <span className="font-semibold text-foreground">full suite</span> bundles
          all {PLUGINS.length} at a big discount — or request a custom module for your business.
        </p>
        <div className="flex shrink-0 gap-3">
          <a
            href="#pricing"
            className="rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.03]"
          >
            See suite pricing
          </a>
          <a
            href="#request"
            className="glass rounded-xl px-5 py-2.5 text-sm font-semibold transition hover:bg-white/10"
          >
            Request custom
          </a>
        </div>
      </motion.div>
    </section>
  );
}
