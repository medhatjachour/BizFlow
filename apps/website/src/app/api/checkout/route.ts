import { NextResponse } from "next/server";
import { getStripe, isStripeConfigured, siteUrl } from "@/lib/stripe";
import { getPurchasable, CURRENCY } from "@/lib/payments";

/**
 * Creates a Stripe Checkout session for a module or the full suite and returns
 * its hosted URL. The client redirects the browser there.
 *
 * Request body: { item: "suite" | "module:<pluginId>", email?: string }
 *
 * If Stripe isn't configured yet, responds 503 with { configured: false } so
 * the UI can gracefully fall back to the download link.
 */
export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        error: "Payments are not enabled yet. See docs/STRIPE-SETUP.md.",
      },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const itemId = String(body.item ?? "");
  const item = getPurchasable(itemId);
  if (!item) {
    return NextResponse.json({ error: "Unknown item" }, { status: 400 });
  }

  const email =
    typeof body.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)
      ? body.email
      : undefined;

  const stripe = getStripe()!;
  const origin = siteUrl();

  // Use a pre-created Price ID if provided, otherwise build a one-off price.
  const lineItem = item.stripePriceId
    ? { price: item.stripePriceId, quantity: 1 }
    : {
        quantity: 1,
        price_data: {
          currency: CURRENCY,
          unit_amount: item.amountCents,
          product_data: { name: item.label, description: item.description },
        },
      };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [lineItem],
      customer_email: email,
      // Tagged so the webhook can fulfill the right license.
      metadata: { itemId: item.id },
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[checkout] Stripe error:", (e as Error).message);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 502 }
    );
  }
}
