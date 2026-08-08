import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { licenseKeyFor } from "@/lib/license";
import { dataDir } from "@/lib/data-dir";
import { recordPaidOrder } from "@/lib/commerce-db";
import { logEvent, requestIdFromHeaders } from "@/lib/observability";
import { sendLicenseDeliveryEmail } from "@/lib/transactional-mail";
import { getPurchasable } from "@/lib/payments";

/**
 * Stripe webhook receiver.
 *
 * Stripe calls this after events like `checkout.session.completed`. We verify
 * the signature against STRIPE_WEBHOOK_SECRET, then fulfill the order.
 *
 * IMPORTANT: webhook signature verification needs the RAW request body, so we
 * read it with request.text() (never request.json()).
 */
const DATA_DIR = dataDir;
const ORDERS = path.join(DATA_DIR, "orders.json");

async function recordOrder(order: Record<string, unknown>): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    let existing: unknown[] = [];
    try {
      existing = JSON.parse(await fs.readFile(ORDERS, "utf8"));
      if (!Array.isArray(existing)) existing = [];
    } catch {
      existing = [];
    }
    existing.push(order);
    await fs.writeFile(ORDERS, JSON.stringify(existing, null, 2), "utf8");
  } catch (e) {
    console.error("[webhook] could not persist order:", (e as Error).message);
  }
}

/**
 * Fulfillment hook. This is where you grant access after payment.
 * TODO (see docs/STRIPE-SETUP.md): generate a license key, email the
 * download link, create the customer's account, etc.
 */
async function fulfill(session: Stripe.Checkout.Session, requestId: string): Promise<void> {
  const itemId = session.metadata?.itemId ?? "unknown";
  const email = session.customer_details?.email ?? session.customer_email ?? null;
  const amount = session.amount_total ?? 0;

  // Deterministic key — the success page derives the same value for display.
  const licenseKey = licenseKeyFor({ sessionId: session.id, itemId, email });

  logEvent("info", "stripe_webhook_fulfill_start", {
    requestId,
    sessionId: session.id,
    itemId,
    email,
    amount,
    currency: session.currency,
  });

  await recordPaidOrder({
    sessionId: session.id,
    itemId,
    email,
    licenseKey,
    amountTotal: amount,
    currency: session.currency ?? "usd",
    paymentStatus: session.payment_status ?? "paid",
  });

  await recordOrder({
    fulfilledAt: new Date().toISOString(),
    sessionId: session.id,
    itemId,
    email,
    licenseKey,
    amountTotal: amount,
    currency: session.currency,
    paymentStatus: session.payment_status,
  });

  logEvent("info", "stripe_webhook_fulfill_success", {
    requestId,
    sessionId: session.id,
    licenseKey,
  });

  if (email) {
    const itemLabel = getPurchasable(itemId)?.label ?? itemId;
    const mail = await sendLicenseDeliveryEmail({
      to: email,
      itemLabel,
      licenseKey,
    });

    if (!mail.sent) {
      logEvent("warn", "stripe_webhook_license_email_failed", {
        requestId,
        sessionId: session.id,
        email,
        reason: mail.reason ?? "unknown",
      });
    } else {
      logEvent("info", "stripe_webhook_license_email_sent", {
        requestId,
        sessionId: session.id,
        email,
      });
    }
  }
}

export async function POST(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhooks are not configured. See docs/STRIPE-SETUP.md." },
      { status: 503 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (e) {
    logEvent("warn", "stripe_webhook_invalid_signature", {
      requestId,
      error: (e as Error).message,
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status === "paid") {
          await fulfill(session, requestId);
        }
        break;
      }
      // Add more events as needed (refunds, disputes, async payment success…).
      default:
        break;
    }
  } catch (e) {
    logEvent("error", "stripe_webhook_handler_error", {
      requestId,
      eventType: event.type,
      error: (e as Error).message,
    });
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  // Always 200 quickly so Stripe doesn't retry a handled event.
  return NextResponse.json({ received: true, requestId });
}
