"use client";

import { useState } from "react";

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
}: BuyButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item }),
      });

      if (res.status === 503) {
        // Payments not enabled yet — fall back to download if we have one.
        if (fallbackUrl) {
          window.open(fallbackUrl, "_blank", "noopener,noreferrer");
          return;
        }
        setError("Payments aren't enabled yet.");
        return;
      }

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not start checkout");
      }
      window.location.href = data.url as string;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={className}
      aria-busy={loading}
    >
      {loading ? "Starting…" : error ?? label}
    </button>
  );
}
