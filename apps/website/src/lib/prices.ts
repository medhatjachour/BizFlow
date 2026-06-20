import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PLUGINS } from "./plugins";

/**
 * Admin-editable price overrides.
 *
 * Base prices live in plugins.ts (mirrored from the BizFlow app). The admin
 * dashboard can override any module's one-time license price; overrides are
 * stored locally and merged at read time so the UI **and** the Stripe charge
 * always use the same effective number.
 *
 * NOTE: this is a local JSON store (same pattern as requests/orders). On
 * ephemeral/serverless hosts, point DATA at a persistent volume or swap this
 * for a KV/DB — the public API surface stays the same.
 */
const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "prices.json");

export type PriceMap = Record<string, number>;

const MAX_PRICE = 100_000;
const isValidPrice = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= MAX_PRICE;

/** Read saved per-module overrides (only known modules, sanitized). */
export async function getPriceOverrides(): Promise<PriceMap> {
  try {
    const raw = JSON.parse(await fs.readFile(FILE, "utf8")) as Record<string, unknown>;
    const out: PriceMap = {};
    for (const p of PLUGINS) {
      if (isValidPrice(raw?.[p.id])) out[p.id] = Math.round(raw[p.id] as number);
    }
    return out;
  } catch {
    return {};
  }
}

/** Persist sanitized overrides; returns what was stored. */
export async function setPriceOverrides(input: PriceMap): Promise<PriceMap> {
  const clean: PriceMap = {};
  for (const p of PLUGINS) {
    if (isValidPrice(input?.[p.id])) clean[p.id] = Math.round(input[p.id]);
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(clean, null, 2), "utf8");
  return clean;
}

export interface EffectivePrices {
  /** module id → effective one-time price (USD). */
  modules: PriceMap;
  /** Sum of all module prices. */
  suiteList: number;
  /** Full-suite price (40% bundle discount, rounded to $10). */
  suite: number;
}

/** Base prices + overrides, with the suite recomputed from the result. */
export async function getEffectivePrices(): Promise<EffectivePrices> {
  const overrides = await getPriceOverrides();
  const modules: PriceMap = {};
  for (const p of PLUGINS) modules[p.id] = overrides[p.id] ?? p.price;
  const suiteList = Object.values(modules).reduce((s, n) => s + n, 0);
  const suite = Math.round((suiteList * 0.6) / 10) * 10;
  return { modules, suiteList, suite };
}

/** Effective price for a checkout item id ("suite" | "module:<id>"), or null. */
export async function priceForItem(itemId: string): Promise<number | null> {
  const eff = await getEffectivePrices();
  if (itemId === "suite") return eff.suite;
  if (itemId.startsWith("module:")) {
    const id = itemId.slice("module:".length);
    return eff.modules[id] ?? null;
  }
  return null;
}
