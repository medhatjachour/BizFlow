"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PLUGINS } from "@/lib/plugins";

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { y: 24, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

export default function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-4 pt-28 text-center">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex max-w-4xl flex-col items-center"
      >
        {/* Try-Before-You-Buy Badge */}
        <motion.span
          variants={item}
          className="glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-foreground/90 shadow-sm"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          The live demo is the full app — no install, no card, no sales call
        </motion.span>

        {/* Main Headline */}
        <motion.h1
          variants={item}
          className="text-balance text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl md:text-7xl"
        >
          Business management,
          <br />
          <span className="text-gradient">built & customized for your field.</span>
        </motion.h1>

        {/* Value Proposition Body */}
        <motion.p
          variants={item}
          className="mt-6 max-w-2xl text-pretty text-lg text-foreground/70 sm:text-xl"
        >
          BizFlow is a modular, offline-first management system for <strong className="font-semibold text-foreground">Retail, Bakery, Restaurant, Coffee, Pharmacy, Clinic, Vet, Gym & Warehouse</strong>.
          Every module already includes the full back office — <strong className="font-semibold text-foreground">employees &amp; HR, finance, expenses, reports and role-based access</strong> — so there is nothing extra to buy. Open it in your browser with real data first, then commission any feature your business still needs.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          variants={item}
          className="mt-10 flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row"
        >
          {/* Primary: Try Live Demo */}
          <Link
            href="/app"
            className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-biz-400 to-biz-600 px-8 py-4 text-base font-semibold text-white shadow-[0_0_30px_rgba(5,121,203,0.45)] transition hover:scale-[1.03] active:scale-[0.98] sm:w-auto"
          >
            <span className="absolute inset-0 -translate-x-full bg-white/30 transition group-hover:translate-x-full" />
            Try free in browser
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="transition group-hover:translate-x-1"
            >
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>

          {/* Secondary: See Pricing & Modules */}
          <a
            href="#plugins"
            className="glass inline-flex w-full items-center justify-center gap-2 rounded-2xl px-7 py-4 text-base font-semibold text-foreground transition hover:bg-white/10 active:scale-[0.98] sm:w-auto"
          >
            <span>Modules & Pricing</span>
          </a>

          {/* Tertiary / Custom Modifications */}
          <Link
            href="#request"
            className="inline-flex w-full items-center justify-center text-sm font-medium text-foreground/70 transition hover:text-biz-300 sm:w-auto sm:px-3"
          >
            Need custom features? →
          </Link>
        </motion.div>

        {/* 4 Core Trust Guarantees */}
        <motion.div
          variants={item}
          className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-foreground/60"
        >
          <div className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            HR, finance, expenses &amp; reports in every module
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            No install required — try the whole app in a browser
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-biz-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            One-time licence, no subscription, runs offline
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Custom features built on request
          </div>
        </motion.div>
      </motion.div>

      {/* Floating window mockup */}
      <motion.div
        initial={{ y: 60, opacity: 0, rotateX: 12 }}
        animate={{ y: 0, opacity: 1, rotateX: 0 }}
        transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
        className="mt-14 w-full max-w-4xl [perspective:1200px]"
      >
        <div className="glass-strong animate-float-slow overflow-hidden rounded-2xl shadow-2xl shadow-biz-700/30">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-biz-600" />
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
              <span className="ml-3 text-xs text-foreground/50">
                bizflow://live-demo • try online with full demo data
              </span>
            </div>
            <span className="hidden rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 sm:inline-block">
              Interactive Preview Ready
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 bg-[radial-gradient(circle_at_30%_20%,rgba(5,121,203,0.28),transparent_60%)] p-6 sm:grid-cols-4">
            {PLUGINS.map((p, i) => (
              <div
                key={p.id}
                className="glass flex aspect-square flex-col items-center justify-center gap-2 rounded-xl text-center transition hover:scale-105"
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                <div
                  className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${p.accent} text-lg`}
                >
                  {p.icon}
                </div>
                <span className="text-[11px] font-medium text-foreground/80">{p.name}</span>
              </div>
            ))}
            <Link
              href="/support"
              className="glass flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 text-center transition hover:scale-105 hover:border-biz-400"
            >
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-lg text-biz-300">
                ⚙️
              </div>
              <span className="text-[11px] font-medium text-foreground/80">Custom Mod</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}