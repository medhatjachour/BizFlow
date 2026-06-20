import Link from "next/link";
import type { Metadata } from "next";
import AuroraBackground from "@/components/AuroraBackground";

export const metadata: Metadata = {
  title: "Checkout cancelled — BizFlow",
  robots: { index: false },
};

/** Shown when the user backs out of Stripe Checkout. Nothing was charged. */
export default function CheckoutCancelPage() {
  return (
    <>
      <AuroraBackground />
      <main className="grid min-h-screen place-items-center px-4">
        <div className="glass-strong w-full max-w-lg rounded-3xl p-10 text-center">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-white/10 text-3xl">
            ↩
          </div>
          <h1 className="text-3xl font-black">Checkout cancelled</h1>
          <p className="mt-3 text-foreground/70">
            No worries — you weren&apos;t charged. You can keep trying modules
            free in the browser, or come back any time.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/#pricing"
              className="rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-6 py-3 text-sm font-semibold text-white transition hover:scale-[1.03]"
            >
              Back to pricing
            </Link>
            <Link
              href="/app"
              className="glass rounded-xl px-6 py-3 text-sm font-semibold transition hover:bg-white/10"
            >
              Try modules free
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
