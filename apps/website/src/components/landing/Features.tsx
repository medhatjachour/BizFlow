"use client";

import { motion } from "framer-motion";

const features = [
  {
    title: "Try before you install",
    desc: "Every BizFlow module runs live in the browser tab — explore the full app with real data before downloading a thing.",
    icon: (
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
    ),
  },
  {
    title: "Point of Sale",
    desc: "A fast, professional checkout with barcode scanning, product variants, cart management and receipts.",
    icon: <path d="M4 5h16v14H4zM4 9h16M8 5v4" />,
  },
  {
    title: "Offline & private",
    desc: "Your data lives in a local database — no subscription, no cloud lock-in. It just works, even offline.",
    icon: <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z" />,
  },
  {
    title: "Modular plugins",
    desc: "Enable only what you need: bakery, restaurant, warehouse, clinic, vet or gym — each is fully self-contained.",
    icon: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  },
  {
    title: "Reports & finance",
    desc: "Revenue, expenses, profit tracking and exportable PDF/CSV reports give you the full picture at a glance.",
    icon: <path d="M4 19V5m0 14h16M8 15l3-4 3 2 4-6" />,
  },
  {
    title: "Bilingual & beautiful",
    desc: "Full English and Arabic UI with RTL support, a polished interface and thoughtful motion throughout.",
    icon: <path d="M12 3l2.5 5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-1z" />,
  },
];

export default function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-6xl px-4 py-28">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-2xl text-center"
      >
        <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
          Everything a business needs,
          <span className="text-gradient"> in one place</span>
        </h2>
        <p className="mt-4 text-lg text-foreground/70">
          A complete business management suite engineered for the modern web.
        </p>
      </motion.div>

      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="glass glow-card rounded-2xl p-7"
          >
            <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-biz-500/40 to-biz-300/30">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-biz-300"
              >
                {f.icon}
              </svg>
            </div>
            <h3 className="text-xl font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/65">
              {f.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
