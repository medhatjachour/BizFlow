"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import {
  ANALYTICS_ENABLED,
  GA_ID,
  PLAUSIBLE_DOMAIN,
  getConsent,
  setConsent,
  type ConsentValue,
} from "@/lib/analytics";

/**
 * Consent banner + conditional analytics loader.
 * - No tracking scripts load until the visitor clicks "Accept".
 * - Choice is remembered in localStorage; the banner won't show again.
 * - If no provider is configured, nothing renders (dev/local default).
 */
export default function Analytics() {
  const [consent, setConsentState] = useState<ConsentValue | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    (async () => {
      setMounted(true);
      setConsentState(getConsent());
      const onChange = (e: Event) =>
        setConsentState((e as CustomEvent<ConsentValue>).detail);
      window.addEventListener("bizflow:consent", onChange);
      return () => window.removeEventListener("bizflow:consent", onChange);
    })();
  }, []);

  if (!ANALYTICS_ENABLED || !mounted) return null;

  const accept = () => setConsent("granted");
  const decline = () => setConsent("denied");

  return (
    <>
      {consent === "granted" && PLAUSIBLE_DOMAIN && (
        <Script
          defer
          data-domain={PLAUSIBLE_DOMAIN}
          src="https://plausible.io/js/script.outbound-links.js"
          strategy="afterInteractive"
        />
      )}

      {consent === "granted" && GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}', { anonymize_ip: true });`}
          </Script>
        </>
      )}

      {consent === null && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="Privacy & analytics consent"
          className="glass-strong fixed inset-x-3 bottom-3 z-[60] mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl px-5 py-4 shadow-2xl shadow-black/50 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-foreground/80">
            We use privacy-friendly analytics to understand what&apos;s useful —
            no ad tracking, no selling your data.{" "}
            <span className="text-foreground/50">
              You can change this anytime.
            </span>
          </p>

          <div className="flex shrink-0 gap-2">
            <button
              onClick={decline}
              className="rounded-xl px-4 py-2 text-sm font-medium text-foreground/70 transition hover:bg-white/10 hover:text-foreground"
            >
              Decline
            </button>
            <button
              onClick={accept}
              className="rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-5 py-2 text-sm font-semibold text-white transition hover:scale-[1.02]"
            >
              Accept
            </button>
          </div>
        </div>
      )}
    </>
  );
}
