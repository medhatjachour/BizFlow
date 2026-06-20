/**
 * Catalog of purchasable items, shared by the checkout API, the webhook
 * fulfillment, and the UI. No secrets here — safe to import anywhere.
 *
 * Item ids:
 *   "module:<pluginId>"  — a single module license
 *   "suite"               — the full BizFlow suite (all modules)
 */
import { PLUGINS, getPlugin } from "./plugins";
import { SUITE_PRICE } from "./pricing";

export interface PurchasableItem {
  id: string;
  /** Human label shown on the Stripe checkout line item. */
  label: string;
  /** Price in the smallest currency unit (cents). */
  amountCents: number;
  /** Marketing description for the checkout line item. */
  description: string;
  /**
   * Optional pre-created Stripe Price ID. When set (via env), checkout uses it
   * instead of building a dynamic price. See docs/STRIPE-SETUP.md.
   */
  stripePriceId?: string;
}

export const CURRENCY = (process.env.STRIPE_CURRENCY || "usd").toLowerCase();

/** Build the canonical item id for a module. */
export const moduleItemId = (pluginId: string) => `module:${pluginId}`;

/**
 * Resolve a purchasable item by id, or null if unknown. Pulls prices from the
 * single catalog so the UI and the charge always agree.
 */
export function getPurchasable(itemId: string): PurchasableItem | null {
  if (itemId === "suite") {
    return {
      id: "suite",
      label: "BizFlow — Full Suite",
      description: `Lifetime license for all ${PLUGINS.length} BizFlow modules.`,
      amountCents: SUITE_PRICE * 100,
      stripePriceId: process.env.STRIPE_PRICE_SUITE,
    };
  }

  if (itemId.startsWith("module:")) {
    const plugin = getPlugin(itemId.slice("module:".length));
    if (!plugin) return null;
    return {
      id: moduleItemId(plugin.id),
      label: `BizFlow — ${plugin.name}`,
      description: `Lifetime license for the ${plugin.name} module.`,
      amountCents: plugin.price * 100,
      // Per-module Price ID override, e.g. STRIPE_PRICE_GYM
      stripePriceId: process.env[`STRIPE_PRICE_${plugin.id.toUpperCase()}`],
    };
  }

  return null;
}

/** All purchasable item ids (modules + suite) — handy for validation/tests. */
export function allItemIds(): string[] {
  return ["suite", ...PLUGINS.map((p) => moduleItemId(p.id))];
}
