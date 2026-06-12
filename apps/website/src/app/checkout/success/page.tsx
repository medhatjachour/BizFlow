import Link from "next/link";
import type { Metadata } from "next";
import AuroraBackground from "@/components/AuroraBackground";
import { getStripe } from "@/lib/stripe";
import { getPurchasable } from "@/lib/payments";

export const metadata: Metadata = {
  title: "Thank you — BizFlow",
  robots: { index: false },
};

/**
 * Post-checkout confirmation. If Stripe is configured we look up the session to
 * show the purchased item; otherwise we show a generic thank-you. Fulfillment
 * (license/email) happens in the webhook, not here.
 */
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  let itemLabel: string | null = null;
  let email: string | null = null;

  const stripe = getStripe();
  if (stripe && session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      const item = getPurchasable(session.metadata?.itemId ?? "");
      itemLabel = item?.label ?? null;
      email = session.customer_details?.email ?? null;
    } catch {
      // Ignore — show the generic message.
    }
  }

  return (
    <>
      <AuroraBackground />
      <main className="grid min-h-screen place-items-center px-4">
        <div className="glass-strong w-full max-w-lg rounded-3xl p-10 text-center">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-biz-500 text-3xl text-white">
            ✓
          </div>
          <h1 className="text-3xl font-black">Payment successful</h1>
          <p className="mt-3 text-foreground/70">
            {itemLabel ? (
              <>
                Thank you for purchasing{" "}
                <span className="font-semibold text-foreground">{itemLabel}</span>.
              </>
            ) : (
              <>Thank you for your purchase.</>
            )}
          </p>
          {email && (
            <p className="mt-2 text-sm text-foreground/50">
              A receipt and your download details will be sent to {email}.
            </p>
          )}

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/app"
              className="rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-6 py-3 text-sm font-semibold text-white transition hover:scale-[1.03]"
            >
              Open BizFlow
            </Link>
            <Link
              href="/"
              className="glass rounded-xl px-6 py-3 text-sm font-semibold transition hover:bg-white/10"
            >
              Back to home
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
