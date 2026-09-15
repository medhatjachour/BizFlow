/**
 * The `/admin` tab contract.
 *
 * This lives outside the dashboard component on purpose: the dashboard is a
 * client component, and a server component (the `/admin` page) cannot call a
 * function that is exported from a `"use client"` module — doing so throws
 * "Attempted to call isTab() from the server" at runtime.
 */
export type AdminTab =
  | "overview"
  | "users"
  | "orders"
  | "access"
  | "requests"
  | "tickets"
  | "pricing";

export const DASHBOARD_TABS: AdminTab[] = [
  "overview",
  "users",
  "orders",
  "access",
  "requests",
  "tickets",
  "pricing",
];

/** Narrows an untrusted `?tab=` value so a bad link just falls back to overview. */
export function isTab(value: string | undefined | null): value is AdminTab {
  return typeof value === "string" && (DASHBOARD_TABS as string[]).includes(value);
}
