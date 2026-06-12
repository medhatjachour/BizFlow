"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const steps = [
  {
    n: "01",
    title: "Pick a module",
    desc: "Choose Commerce, Bakery, Clinic or any module that fits your business.",
  },
  {
    n: "02",
    title: "Try it live",
    desc: "It opens instantly in your browser with a real database — log in and explore.",
  },
  {
    n: "03",
    title: "Download when ready",
    desc: "Grab the desktop build for that module and run it offline on your machine.",
  },
];

export default function Showcase() {
  return (
    <section id="showcase" className="relative mx-auto max-w-6xl px-4 py-28">
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
            Try it like it&apos;s
            <span className="text-gradient"> really installed</span>
          </h2>
          <p className="mt-4 text-lg text-foreground/70">
            This isn&apos;t a video or a mockup. It&apos;s the real BizFlow app
            running on the web platform, backed by a live database — so what you
            try is exactly what you download.
          </p>

          <ul className="mt-10 space-y-6">
            {steps.map((s) => (
              <li key={s.n} className="flex gap-4">
                <span className="text-gradient text-2xl font-black">{s.n}</span>
                <div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="text-sm text-foreground/60">{s.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <Link
            href="/app"
            className="mt-10 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-biz-400 to-biz-600 px-6 py-3 font-semibold text-white transition hover:scale-[1.03]"
          >
            Launch the live demo
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="glass-strong relative overflow-hidden rounded-3xl p-2 shadow-2xl shadow-biz-700/30"
        >
          <div className="overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_70%_10%,rgba(3,187,251,0.25),transparent_55%),radial-gradient(circle_at_10%_90%,rgba(0,96,230,0.28),transparent_55%)] p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-biz-600" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className="space-y-3">
              <div className="glass flex items-center justify-between rounded-xl p-4">
                <span className="text-sm font-medium">Today&apos;s Revenue</span>
                <span className="font-mono text-biz-300">$4,820</span>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-foreground/50">Point of Sale</p>
                <p className="mt-1 text-sm">3 items · checkout ready 🧾</p>
              </div>
              <div className="glass flex items-center justify-between rounded-xl bg-black/30 p-4 text-sm">
                <span className="text-foreground/60">Low stock alerts</span>
                <span className="font-semibold text-amber-300">2</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
