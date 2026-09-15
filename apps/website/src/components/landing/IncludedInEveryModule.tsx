"use client";

import Link from "next/link";
import { motion } from "framer-motion";

/**
 * The question every buyer asks before picking a module is "what do I still have
 * to buy?". The answer is nothing: HR, finance, expenses, reports and access
 * control ship inside every module. This section states that, lists the real
 * capabilities, and offers the two next actions (try it, or order more).
 */

interface Suite {
  title: string;
  blurb: string;
  items: string[];
  icon: string;
}

const SUITES: Suite[] = [
  {
    title: "Employees & HR",
    blurb: "Run your team from the same app that runs your sales.",
    icon: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a3 3 0 100 6 3 3 0 000-6zM22 21v-2a4 4 0 00-3-3.87",
    items: [
      "Employee profiles & contracts",
      "Leave requests with an approvals inbox",
      "Attendance, shifts and rosters",
      "Overtime tracking",
      "Payroll runs and printable payslips",
      "Documents, onboarding & offboarding",
      "HR analytics and attention alerts",
    ],
  },
  {
    title: "Finance",
    blurb: "See whether the month actually made money — not just what sold.",
    icon: "M3 3v18h18M7 15l4-5 3 3 4-6",
    items: [
      "Revenue and profit per module",
      "Financial health scorecard",
      "Cash-flow projection",
      "Revenue forecasting",
      "Pricing calculator with margins",
      "Installment / layaway plans",
      "Compare locations side by side",
    ],
  },
  {
    title: "Expenses",
    blurb: "Every cost, categorised, so profit is never a guess.",
    icon: "M2 7h20v10H2zM2 11h20M6 15h4",
    items: [
      "Expense entry with categories",
      "Attach supplier and reference details",
      "Monthly and category breakdowns",
      "Filter and search your history",
      "Rolls straight into finance and reports",
    ],
  },
  {
    title: "Reports",
    blurb: "The numbers you need for a bank, a partner, or your own sanity.",
    icon: "M4 19V5m0 14h16M8 15V9m4 6V6m4 9v-4",
    items: [
      "Today at a glance",
      "Revenue trend over time",
      "Sales heatmap by hour and day",
      "Best and worst sellers",
      "Activity feed of everything that happened",
      "Export to CSV and printable PDF",
    ],
  },
  {
    title: "Access & settings",
    blurb: "Add staff without handing over the whole business.",
    icon: "M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6zM9 12l2 2 4-4",
    items: [
      "User accounts with roles",
      "Per-plugin permission matrix",
      "Turn modules on and off per branch",
      "Tax rates and receipt templates",
      "Scheduled backups and archives",
    ],
  },
];

const PLUGIN_DEPTH = [
  "Retail: barcode POS, products & variants, suppliers",
  "Bakery: recipes, daily production, pantry, wastage",
  "Restaurant: tables, kitchen display, split checks",
  "Coffee: quick POS, open tabs, shift receipts",
  "Warehouse: locations, transfers, stock operations",
  "Clinic: patients, appointments, doctors, sessions",
  "Vet: owners, pets, appointments, medicines, follow-ups",
  "Gym: plans, subscriptions, check-ins, lockers, coaches",
  "Pharmacy: batch & expiry tracking, purchase orders",
];

export default function IncludedInEveryModule() {
  return (
    <section id="included" className="relative mx-auto max-w-6xl px-4 py-28">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-3xl text-center"
      >
        <span className="glass mb-4 inline-block rounded-full px-4 py-1.5 text-xs font-medium text-foreground/80">
          No add-ons · no extra licences · no per-seat fees
        </span>
        <h2 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">
          Buy one module,
          <span className="text-gradient"> get the whole back office</span>
        </h2>
        <p className="mt-4 text-lg text-foreground/70">
          HR, finance, expenses, reports and access control are not separate
          products. They are built into every single module — so a bakery licence
          includes the same payroll, the same cash-flow projection and the same
          reporting as a pharmacy licence.
        </p>
      </motion.div>

      <div className="mt-16 grid gap-6 lg:grid-cols-3">
        {SUITES.map((suite, i) => (
          <motion.div
            key={suite.title}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.07 }}
            className={`glass glow-card flex flex-col rounded-2xl p-6 ${
              i === 0 ? "lg:col-span-2" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-biz-500/40 to-biz-300/30">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-biz-300"
                  aria-hidden="true"
                >
                  <path d={suite.icon} />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold leading-tight">{suite.title}</h3>
                <p className="text-xs text-foreground/50">{suite.blurb}</p>
              </div>
            </div>

            <ul
              className={`mt-5 grid gap-x-5 gap-y-2 ${
                i === 0 ? "sm:grid-cols-2" : ""
              }`}
            >
              {suite.items.map((entry) => (
                <li key={entry} className="flex items-start gap-2 text-sm text-foreground/70">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="mt-0.5 shrink-0 text-biz-300"
                    aria-hidden="true"
                  >
                    <path
                      d="M20 6L9 17l-5-5"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {entry}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>

      {/* Everything above is generic; this is what makes each module yours. */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="glass-strong mt-8 rounded-2xl p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold">Plus the part that is specific to your trade</h3>
          <p className="text-xs text-foreground/50">
            Not on this list? That is exactly what custom work is for.
          </p>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PLUGIN_DEPTH.map((entry) => (
            <p
              key={entry}
              className="rounded-lg bg-white/5 px-3 py-2 text-xs leading-relaxed text-foreground/65"
            >
              {entry}
            </p>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
        className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-biz-400/25 bg-biz-500/10 px-6 py-5 text-center sm:flex-row sm:text-left"
      >
        <p className="text-sm text-foreground/75">
          <span className="font-semibold text-foreground">Nothing here is a mock-up.</span> Open
          any module in your browser and click through HR, finance, expenses and reports before you
          spend a cent — no install, no card, no sales call.
        </p>
        <div className="flex shrink-0 flex-wrap justify-center gap-3">
          <Link
            href="/app"
            className="rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.03]"
          >
            Open the live demo
          </Link>
          <a
            href="#request"
            className="glass rounded-xl px-5 py-2.5 text-sm font-semibold transition hover:bg-white/10"
          >
            Order a custom feature
          </a>
        </div>
      </motion.div>
    </section>
  );
}
