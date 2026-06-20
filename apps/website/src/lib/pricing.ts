/**
 * Pricing model for BizFlow modules and custom work.
 *
 * Prices are illustrative starting points (USD, one-time license). The same
 * estimate logic runs on the client (live preview in the request form) and on
 * the server (when a request is submitted), so they always agree.
 */
import { PLUGINS, getPlugin } from "./plugins";

export type RequestType = "update" | "new-plugin" | "bundle";
export type Complexity = "small" | "medium" | "large";

export interface EstimateInput {
  type: RequestType;
  /** Module id for an "update" request. */
  moduleId?: string;
  complexity: Complexity;
  /** Add priority/rush delivery. */
  rush?: boolean;
  /** Add a year of priority support & updates. */
  support?: boolean;
}

export interface Estimate {
  /** Low end of the range, USD. */
  min: number;
  /** High end of the range, USD. */
  max: number;
  currency: "USD";
  /** Human-readable line items explaining the number. */
  breakdown: { label: string; amount: string }[];
  /** Rough delivery window. */
  eta: string;
}

/** Full suite price (sum of modules, with a bundle discount). */
export const SUITE_LIST_PRICE = PLUGINS.reduce((s, p) => s + p.price, 0);
export const SUITE_PRICE = Math.round((SUITE_LIST_PRICE * 0.6) / 10) * 10; // 40% off

const COMPLEXITY_FACTOR: Record<Complexity, number> = {
  small: 1,
  medium: 2,
  large: 3.5,
};

const COMPLEXITY_LABEL: Record<Complexity, string> = {
  small: "Small — a few screens / fields",
  medium: "Medium — a full feature area",
  large: "Large — a complete new business vertical",
};

// Base rates per request type (the "starting" price the user asked for).
const BASE: Record<RequestType, number> = {
  update: 150,
  "new-plugin": 1200,
  bundle: SUITE_PRICE,
};

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

/**
 * Produce a price range + breakdown for a request. Deterministic so the client
 * preview and the server-confirmed quote always match.
 */
export function estimate(input: EstimateInput): Estimate {
  const { type, moduleId, complexity, rush, support } = input;
  const breakdown: { label: string; amount: string }[] = [];

  if (type === "bundle") {
    breakdown.push({ label: "Full BizFlow suite (all modules)", amount: usd(SUITE_PRICE) });
    let base = SUITE_PRICE;
    if (support) {
      const s = Math.round(base * 0.2);
      base += s;
      breakdown.push({ label: "1 year priority support & updates", amount: usd(s) });
    }
    return {
      min: base,
      max: base,
      currency: "USD",
      breakdown,
      eta: "Available now",
    };
  }

  const factor = COMPLEXITY_FACTOR[complexity];

  if (type === "update") {
    const plugin = moduleId ? getPlugin(moduleId) : undefined;
    const base = BASE.update * factor;
    breakdown.push({
      label: `Update to ${plugin?.name ?? "an existing module"}`,
      amount: usd(BASE.update),
    });
    breakdown.push({ label: COMPLEXITY_LABEL[complexity], amount: `×${factor}` });
    let lo = base;
    let hi = Math.round(base * 1.5);
    if (rush) {
      const r = Math.round(base * 0.3);
      lo += r;
      hi += r;
      breakdown.push({ label: "Priority / rush delivery", amount: usd(r) });
    }
    if (support) {
      breakdown.push({ label: "1 year priority support", amount: usd(99) });
      lo += 99;
      hi += 99;
    }
    return {
      min: Math.round(lo),
      max: Math.round(hi),
      currency: "USD",
      breakdown,
      eta:
        complexity === "small"
          ? "1–2 weeks"
          : complexity === "medium"
            ? "3–5 weeks"
            : "6–10 weeks",
    };
  }

  // new-plugin
  const base = BASE["new-plugin"] * factor;
  breakdown.push({ label: "New custom module (base)", amount: usd(BASE["new-plugin"]) });
  breakdown.push({ label: COMPLEXITY_LABEL[complexity], amount: `×${factor}` });
  let lo = base;
  let hi = Math.round(base * 1.6);
  if (rush) {
    const r = Math.round(base * 0.3);
    lo += r;
    hi += r;
    breakdown.push({ label: "Priority / rush delivery", amount: usd(r) });
  }
  if (support) {
    const s = 299;
    lo += s;
    hi += s;
    breakdown.push({ label: "1 year priority support & updates", amount: usd(s) });
  }
  return {
    min: Math.round(lo),
    max: Math.round(hi),
    currency: "USD",
    breakdown,
    eta:
      complexity === "small"
        ? "2–4 weeks"
        : complexity === "medium"
          ? "5–8 weeks"
          : "10–16 weeks",
  };
}

/** Format an estimate as a short range string, e.g. "$1,200 – $1,920". */
export function formatRange(e: Estimate): string {
  return e.min === e.max ? usd(e.min) : `${usd(e.min)} – ${usd(e.max)}`;
}
