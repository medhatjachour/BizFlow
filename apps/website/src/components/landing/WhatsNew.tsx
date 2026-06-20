const UPDATES: { tag: string; icon: string; title: string; body: string; accent: string }[] = [
  {
    tag: "New",
    icon: "🔐",
    title: "Role-based permissions",
    body: "Decide exactly who can give discounts, void sales, issue refunds or see profit — per role, enforced everywhere. Multi-staff trust, solved.",
    accent: "from-indigo-400 to-blue-600",
  },
  {
    tag: "New",
    icon: "📟",
    title: "Barcode-first checkout & receiving",
    body: "Scan to sell and scan to receive stock against a purchase order. No drivers, no setup — just a USB scanner and Enter.",
    accent: "from-emerald-400 to-teal-600",
  },
  {
    tag: "Improved",
    icon: "📈",
    title: "Honest profit analytics",
    body: "Expected vs. actual profit, net of refunds and discounts — and correct even when you sell by sub-unit. Numbers owners can act on.",
    accent: "from-amber-300 to-orange-500",
  },
  {
    tag: "New",
    icon: "💳",
    title: "Customer credit & outstanding",
    body: "Customer profiles with running balances, default discounts and one-tap settle. Sell on credit and always know who owes what.",
    accent: "from-violet-400 to-purple-600",
  },
  {
    tag: "New",
    icon: "⚖️",
    title: "Sell by sub-unit",
    body: "Break a bottle into millilitres or a strip into tablets. Stock, cost and price stay perfectly in sync down to the unit.",
    accent: "from-rose-400 to-pink-600",
  },
  {
    tag: "New",
    icon: "💧",
    title: "Owner cashflow home",
    body: "One screen: cash collected today, receivables, payables, low stock and expiring batches. The dashboard owners actually live in.",
    accent: "from-sky-400 to-blue-600",
  },
];

export default function WhatsNew() {
  return (
    <section id="whats-new" className="relative mx-auto w-full max-w-6xl px-4 py-24">
      <div className="mb-12 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1 text-xs font-semibold text-emerald-300">
          ● Shipping every week
        </span>
        <h2 className="mt-4 bg-gradient-to-r from-white to-foreground/60 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
          What&apos;s new in BizFlow
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-foreground/60">
          BizFlow isn&apos;t a frozen product — it grows with real businesses. Here&apos;s a taste of what
          landed recently. Buy once and these updates are yours.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {UPDATES.map((u) => (
          <article
            key={u.title}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.05]"
          >
            <div className="flex items-center justify-between">
              <span className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br text-xl ${u.accent}`}>
                {u.icon}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/60">
                {u.tag}
              </span>
            </div>
            <h3 className="mt-4 text-lg font-semibold">{u.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/60">{u.body}</p>
          </article>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <a
          href="/download"
          className="rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-6 py-3 text-sm font-semibold text-white transition hover:shadow-[0_0_24px_rgba(5,121,203,0.6)]"
        >
          Download the latest build
        </a>
        <a href="#pricing" className="rounded-xl border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-foreground/80 transition hover:bg-white/[0.08]">
          See pricing
        </a>
      </div>
    </section>
  );
}
