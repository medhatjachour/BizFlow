"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";
import Link from "next/link";
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
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);

  const onClick = async () => {
    if (requirePolicyConsent && !acceptedPolicies) {
      setError("Please accept Terms, Privacy, and Refund Policy first.");
      return;
    }

    setLoading(true);
    setError(null);
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
        setError("Payments aren't enabled yet.");
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
        {loading ? "Starting…" : error ?? label}
      </button>
    </div>
  );
}
