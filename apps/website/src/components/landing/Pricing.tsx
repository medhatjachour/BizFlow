"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PLUGINS, DEFAULT_DOWNLOAD_URL } from "@/lib/plugins";
import { SUITE_PRICE, SUITE_LIST_PRICE } from "@/lib/pricing";
import BuyButton from "@/components/BuyButton";

/**
 * Transparent pricing: every module is a one-time purchase, or take the whole
 * suite at a discount. Designed to make the buy decision easy.
 */
export default function Pricing() {
  const saving = SUITE_LIST_PRICE - SUITE_PRICE;

  return (
    <section id="pricing" className="relative mx-auto max-w-6xl px-4 py-28">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-2xl text-center"
      >
        <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
          Simple, <span className="text-gradient">one-time</span> pricing
        </h2>
        <p className="mt-4 text-lg text-foreground/70">
          Buy only the modules you need, or get everything and save. No monthly
          fees, ever. Free updates within your support year.
        </p>
      </motion.div>

      <div className="mt-16 grid gap-6 lg:grid-cols-3">
        {/* Single module */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="glass flex flex-col rounded-3xl p-8"
        >
          <h3 className="text-lg font-semibold">Single module</h3>
          <p className="mt-2 text-sm text-foreground/60">
            Perfect if you need one thing done well.
          </p>
          <div className="mt-6 flex items-baseline gap-1.5">
            <span className="text-4xl font-black">$199</span>
            <span className="text-sm text-foreground/50">+ · one-time</span>
          </div>
          <ul className="mt-6 space-y-2 text-sm text-foreground/65">
            <Li>Any one module (from $199)</Li>
            <Li>Try free in the browser first</Li>
            <Li>Runs offline, data stays local</Li>
            <Li>Free updates for 1 year</Li>
          </ul>
          <a
            href="#plugins"
            className="mt-8 rounded-xl bg-white/10 px-6 py-3 text-center text-sm font-semibold transition hover:bg-white/20"
          >
            Browse modules
          </a>
        </motion.div>

        {/* Full suite — featured */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="glass-strong relative flex flex-col overflow-hidden rounded-3xl p-8 ring-2 ring-biz-400/70"
        >
          <span className="absolute -right-10 top-6 rotate-45 bg-gradient-to-r from-biz-400 to-biz-600 px-12 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            Best value
          </span>
          <h3 className="text-lg font-semibold">Full suite</h3>
          <p className="mt-2 text-sm text-foreground/60">
            All 7 modules. The whole business, covered.
          </p>
          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-4xl font-black">${SUITE_PRICE}</span>
            <span className="text-sm text-foreground/40 line-through">
              ${SUITE_LIST_PRICE}
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold text-emerald-400">
            Save ${saving} — pay once
          </p>
          <ul className="mt-6 space-y-2 text-sm text-foreground/75">
            <Li>All current & future modules</Li>
            <Li>Commerce, Bakery, Restaurant, Warehouse</Li>
            <Li>Clinic, Vet & Gym</Li>
            <Li>Priority support & updates included</Li>
          </ul>
          <BuyButton
            item="suite"
            label="Get the full suite"
            fallbackUrl={DEFAULT_DOWNLOAD_URL}
            className="mt-8 w-full rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-6 py-3 text-center text-sm font-semibold text-white transition hover:scale-[1.02] disabled:opacity-60"
          />
        </motion.div>

        {/* Custom */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="glass flex flex-col rounded-3xl p-8"
        >
          <h3 className="text-lg font-semibold">Custom</h3>
          <p className="mt-2 text-sm text-foreground/60">
            A new module for your unique business, or a tailored change.
          </p>
          <div className="mt-6 flex items-baseline gap-1.5">
            <span className="text-4xl font-black">Quote</span>
          </div>
          <ul className="mt-6 space-y-2 text-sm text-foreground/65">
            <Li>Built for your exact workflow</Li>
            <Li>Updates to any existing module</Li>
            <Li>Instant ballpark estimate</Li>
            <Li>Fixed quote, no commitment</Li>
          </ul>
          <Link
            href="#request"
            className="mt-8 rounded-xl bg-white/10 px-6 py-3 text-center text-sm font-semibold transition hover:bg-white/20"
          >
            Request a quote
          </Link>
        </motion.div>
      </div>

      {/* Per-module price strip */}
      <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
        {PLUGINS.map((p) => (
          <a
            key={p.id}
            href="#plugins"
            className="glass flex items-center gap-2 rounded-full px-4 py-2 text-sm transition hover:bg-white/10"
          >
            <span>{p.icon}</span>
            <span className="font-medium">{p.name}</span>
            <span className="text-foreground/50">${p.price}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <svg
        width="16"
        height="16"
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
      {children}
    </li>
  );
}
