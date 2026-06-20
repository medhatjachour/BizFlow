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
        <motion.span
          variants={item}
          className="glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-foreground/80"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-biz-300" />
          Try every module live in your browser — no install
        </motion.span>

        <motion.h1
          variants={item}
          className="text-balance text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl md:text-7xl"
        >
          Run your whole business
          <br />
          <span className="text-gradient">in one beautiful app</span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-6 max-w-2xl text-pretty text-lg text-foreground/70 sm:text-xl"
        >
          BizFlow is a modern business management system — POS, inventory,
          finance and specialized modules for bakeries, restaurants, clinics and
          more. Try any module in your browser, then download the desktop build
          you need.
        </motion.p>

        <motion.div
          variants={item}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <a
            href="#plugins"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-biz-400 to-biz-600 px-7 py-3.5 text-base font-semibold text-white shadow-[0_0_30px_rgba(5,121,203,0.45)] transition hover:scale-[1.03]"
          >
            <span className="absolute inset-0 -translate-x-full bg-white/30 transition group-hover:translate-x-full" />
            Explore modules
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
          </a>
          <Link
            href="/app"
            className="glass rounded-2xl px-7 py-3.5 text-base font-semibold text-foreground transition hover:bg-white/10"
          >
            Open the live demo
          </Link>
        </motion.div>
      </motion.div>

      {/* Floating window mockup */}
      <motion.div
        initial={{ y: 60, opacity: 0, rotateX: 12 }}
        animate={{ y: 0, opacity: 1, rotateX: 0 }}
        transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
        className="mt-16 w-full max-w-4xl [perspective:1200px]"
      >
        <div className="glass-strong animate-float-slow overflow-hidden rounded-2xl shadow-2xl shadow-biz-700/30">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-biz-600" />
            <span className="h-3 w-3 rounded-full bg-yellow-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
            <span className="ml-3 text-xs text-foreground/50">
              bizflow://workspace
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 bg-[radial-gradient(circle_at_30%_20%,rgba(5,121,203,0.28),transparent_60%)] p-6 sm:grid-cols-4">
            {PLUGINS.map((p, i) => (
              <div
                key={p.id}
                className="glass flex aspect-square flex-col items-center justify-center gap-2 rounded-xl text-center"
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                <div
                  className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${p.accent} text-lg`}
                >
                  {p.icon}
                </div>
                <span className="text-[10px] text-foreground/70">{p.name}</span>
              </div>
            ))}
            <div className="glass flex aspect-square flex-col items-center justify-center gap-2 rounded-xl text-center">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-lg">
                ＋
              </div>
              <span className="text-[10px] text-foreground/70">More</span>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
