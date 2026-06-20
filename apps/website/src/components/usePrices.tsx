"use client";

import { useEffect, useState } from "react";
import { PLUGINS } from "@/lib/plugins";

export interface Prices {
  modules: Record<string, number>;
  suite: number;
  suiteList: number;
}

// Static fallback so SSR / no-JS / API-down still shows the catalog prices.
const baseModules: Record<string, number> = Object.fromEntries(
  PLUGINS.map((p) => [p.id, p.price])
);
const baseSuiteList = PLUGINS.reduce((s, p) => s + p.price, 0);
export const FALLBACK_PRICES: Prices = {
  modules: baseModules,
  suiteList: baseSuiteList,
  suite: Math.round((baseSuiteList * 0.6) / 10) * 10,
};

/** Live effective prices (base + admin overrides), with a static fallback. */
export function usePrices(): Prices {
  const [prices, setPrices] = useState<Prices>(FALLBACK_PRICES);

  useEffect(() => {
    let alive = true;
    fetch("/api/prices")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Prices | null) => {
        if (alive && d && d.modules) setPrices(d);
      })
      .catch(() => {
        /* keep fallback */
      });
    return () => {
      alive = false;
    };
  }, []);

  return prices;
}
