"use client";

import { useState } from "react";
import Link from "next/link";
import Feedback from "@/components/Feedback";
import { track } from "@/lib/analytics";
import { withBasePath } from "@/lib/site";

interface BuyButtonProps {
  /** Catalog item id: "suite" or "module:<pluginId>". */
  item: string;
  label: string;
  className?: string;
  /**
   * Where to send the user if payments aren't enabled yet (Stripe keys not
   * configured). Usually the module's download link.
   */
  fallbackUrl?: string;
  requirePolicyConsent?: boolean;
}

/**
 * Starts a Stripe Checkout session and redirects the browser to it.
 *
 * Graceful fallback: if the API reports payments aren't configured (503),
 * we open the fallback URL instead, so the site stays useful before keys exist.
 */
export default function BuyButton({
  item,
  label,
  className,
  fallbackUrl,
  requirePolicyConsent = true,
}: BuyButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<"consent" | "checkout">("checkout");
  const [paymentUnavailable, setPaymentUnavailable] = useState(false);
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);

  const onClick = async () => {
    if (requirePolicyConsent && !acceptedPolicies) {
      setErrorKind("consent");
      setError("Please accept the Terms, Privacy Policy and Refund Policy first.");
      return;
    }

    setLoading(true);
    setError(null);
    setErrorKind("checkout");
    track("checkout_start", { item });
    try {
      const res = await fetch(withBasePath("/api/checkout"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item, acceptedPolicies }),
      });

      if (res.status === 503) {
        // Payments not enabled yet — fall back to download if we have one.
        if (fallbackUrl) {
          track("checkout_fallback", { item });
          if (/^https?:\/\//i.test(fallbackUrl)) {
            window.open(fallbackUrl, "_blank", "noopener,noreferrer");
          } else {
            window.location.href = fallbackUrl;
          }
          return;
        }
        // No download link either: let the visitor express intent so a human
        // can follow up (and issue a license manually from the dashboard).
        setPaymentUnavailable(true);
        return;
      }

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not start checkout");
      }
      track("checkout_redirect", { item });
      window.location.href = data.url as string;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {requirePolicyConsent ? (
        <label className="flex items-start gap-2 text-[11px] text-foreground/60">
          <input
            type="checkbox"
            checked={acceptedPolicies}
            onChange={(e) => setAcceptedPolicies(e.target.checked)}
            className="mt-[2px]"
          />
          <span>
            I agree to the <Link className="underline" href={withBasePath("/legal/terms")}>Terms</Link>,{" "}
            <Link className="underline" href={withBasePath("/legal/privacy")}>Privacy Policy</Link>, and{" "}
            <Link className="underline" href={withBasePath("/legal/refund")}>Refund Policy</Link>.
          </span>
        </label>
      ) : null}

      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className={className}
        aria-busy={loading}
      >
        {loading ? "Starting…" : label}
      </button>

      {error && errorKind === "consent" ? (
        <Feedback
          tone="warning"
          title="One box left to tick"
          message="Agree to the policies above, then press the button again."
          nextSteps={[
            "The policies are short — they cover licensing, your data, and refunds.",
            "You only need to accept once per visit.",
          ]}
        />
      ) : null}

      {error && errorKind === "checkout" ? (
        <Feedback
          tone="error"
          title="Checkout didn't start"
          message={error}
          nextSteps={[
            "Try again — if a card payment was in progress, give it a few seconds first.",
            "Your card has not been charged.",
            "Still stuck? Contact us and we'll invoice you directly and issue the licence manually.",
          ]}
          actions={[{ label: "Contact us", variant: "secondary", href: "/support" }]}
        />
      ) : null}

      {paymentUnavailable ? (
        <Feedback
          tone="info"
          title="Card checkout isn't open just yet"
          message={`We're still finishing the payment setup. Nothing is lost — tell us you want ${label} and we'll sort it out by hand.`}
          nextSteps={[
            `Send us a message saying you want ${label}, with your business name.`,
            "We reply with a payment link (card or bank transfer) and your licence key.",
            "You get the desktop download link and activation steps straight after payment.",
          ]}
          actions={[{ label: `Contact us to buy ${label}`, href: "/support" }]}
        />
      ) : null}
    </div>
  );
}
