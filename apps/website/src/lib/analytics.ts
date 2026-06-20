// Privacy-first, consent-gated analytics. Provider-agnostic: enable Plausible
// (cookieless) and/or GA4 via env. No script loads until the visitor opts in.
export const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

/** True when at least one analytics provider is configured. */
export const ANALYTICS_ENABLED = Boolean(PLAUSIBLE_DOMAIN || GA_ID);

export const CONSENT_KEY = "bizflow-analytics-consent";
export type ConsentValue = "granted" | "denied";

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, unknown> }) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function getConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value: ConsentValue) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* storage blocked — ignore */
  }
  window.dispatchEvent(new CustomEvent("bizflow:consent", { detail: value }));
}

/**
 * Fire a funnel event. No-ops unless the visitor granted consent and a
 * provider is loaded. Safe to call anywhere on the client.
 */
export function track(event: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (getConsent() !== "granted") return;
  try {
    window.plausible?.(event, props ? { props } : undefined);
    window.gtag?.("event", event, props ?? {});
  } catch {
    /* never let analytics break the UI */
  }
}
