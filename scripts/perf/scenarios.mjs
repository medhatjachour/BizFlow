/**
 * Scenario catalogue for the BizFlow HTTP load / stress harness.
 *
 * Everything here is a *read-only* request. That is a deliberate safety rule:
 * the endpoints that write (POST /api/license/request, POST /api/requests,
 * POST /api/download's build trigger, POST /api/checkout) are never generated
 * by this harness, because hammering them would create real tickets, real
 * builds and real emails. The only POST in the catalogue is
 * /api/license/validate with a deliberately *unknown* key, which is a single
 * indexed read and returns { ok: true, valid: false } without writing.
 */

/** Closed-loop profiles. Concurrency is workers, not requests. */
export const PROFILES = {
  smoke: {
    description: "1 worker, short run - sanity check that the target is reachable",
    concurrency: 1,
    durationMs: 10_000,
    warmupMs: 0,
    rampMs: 0,
    // A 10 s run with no warm-up is far too short to say anything about
    // latency: the first few requests of a run pay the client's own DNS/TCP/TLS
    // start-up and can each take over a second (measured: 1.4-4.0 s). So smoke
    // gates *errors* only - reachability - and reports latency for information.
    gatesLatency: false,
  },
  load: {
    description: "expected traffic - 10 workers, steady state (safe for production)",
    concurrency: 10,
    durationMs: 30_000,
    warmupMs: 3_000,
    rampMs: 3_000,
  },
  stress: {
    description: "find the knee - 64 workers, ramped in over 15s",
    concurrency: 64,
    durationMs: 60_000,
    warmupMs: 5_000,
    rampMs: 15_000,
  },
  spike: {
    description: "sudden burst - 128 workers appear at once, run 20s",
    concurrency: 128,
    durationMs: 20_000,
    warmupMs: 2_000,
    rampMs: 0,
  },
  soak: {
    description: "endurance - 16 workers for 15 minutes (memory / connection leaks)",
    concurrency: 16,
    durationMs: 900_000,
    warmupMs: 10_000,
    rampMs: 10_000,
  },
};

/** Profiles that hammer a target hard enough to break a small VPS. */
export const AGGRESSIVE_PROFILES = new Set(["stress", "spike", "soak"]);

/**
 * HTML pages. Budgets are generous on purpose: the production box is a single
 * small VPS, and the point of the p95/p99 gate is to catch a real regression,
 * not to fail on a cold cache.
 */
export const WEBSITE_PAGES = [
  {
    id: "home",
    path: "/",
    weight: 6,
    description: "landing page (hero + plugins + pricing)",
    budget: { p95: 1500, p99: 2500, maxErrorRate: 0.01 },
  },
  {
    id: "plugin-restaurant",
    path: "/plugins/restaurant",
    weight: 3,
    description: "module detail page (evaluate a plugin)",
    budget: { p95: 1200, p99: 2000, maxErrorRate: 0.01 },
  },
  {
    id: "plugin-commerce",
    path: "/plugins/commerce",
    weight: 2,
    description: "module detail page (second module)",
    budget: { p95: 1200, p99: 2000, maxErrorRate: 0.01 },
  },
  {
    id: "plugin-pharmacy",
    path: "/plugins/pharmacy",
    weight: 2,
    description: "module detail page (third module)",
    budget: { p95: 1200, p99: 2000, maxErrorRate: 0.01 },
  },
  {
    id: "download",
    path: "/download",
    weight: 4,
    description: "download page (start the 14-day free trial)",
    budget: { p95: 1200, p99: 2000, maxErrorRate: 0.01 },
  },
  {
    id: "support",
    path: "/support",
    weight: 3,
    description: "support page (ask for a licence)",
    budget: { p95: 1200, p99: 2000, maxErrorRate: 0.01 },
  },
  {
    id: "account",
    path: "/account",
    weight: 2,
    expect: [307, 308],
    description: "signed-out visitor hitting the account area (redirect to login)",
    budget: { p95: 600, p99: 1000, maxErrorRate: 0.01 },
  },
  {
    id: "account-login",
    path: "/account/login",
    weight: 3,
    description: "account login page",
    budget: { p95: 1200, p99: 2000, maxErrorRate: 0.01 },
  },
  {
    id: "portal-login",
    path: "/portal/login",
    weight: 1,
    description: "reseller / portal login page",
    budget: { p95: 1200, p99: 2000, maxErrorRate: 0.01 },
  },
  {
    id: "legal-terms",
    path: "/legal/terms",
    weight: 1,
    description: "legal terms (no card, no subscription in the copy)",
    budget: { p95: 1000, p99: 1800, maxErrorRate: 0.01 },
  },
  {
    id: "status",
    path: "/status",
    weight: 1,
    description: "public status page",
    budget: { p95: 1200, p99: 2000, maxErrorRate: 0.01 },
  },
];

/** The in-browser live demo. */
export const DEMO_PAGES = [
  {
    id: "demo-app",
    path: "/app",
    weight: 1,
    description: "live demo shell - the full desktop app in the browser",
    budget: { p95: 1500, p99: 2500, maxErrorRate: 0.01 },
  },
];

/** JSON endpoints that back the marketing site and the desktop updater. */
export const API_TARGETS = [
  {
    id: "api-version",
    path: "/api/version",
    weight: 3,
    description: "desktop updater probe (called by every installed app)",
    budget: { p95: 600, p99: 1200, maxErrorRate: 0.01 },
  },
  {
    id: "api-prices",
    path: "/api/prices",
    weight: 3,
    description: "public pricing feed",
    budget: { p95: 600, p99: 1200, maxErrorRate: 0.01 },
  },
  {
    id: "api-status",
    path: "/api/status",
    weight: 2,
    description: "status JSON",
    budget: { p95: 600, p99: 1200, maxErrorRate: 0.01 },
  },
  {
    id: "api-license-validate-unknown",
    path: "/api/license/validate",
    method: "POST",
    body: JSON.stringify({
      email: "perf-harness@example.invalid",
      licenseKey: "BIZ-00000-00000-00000-00000",
      deviceFingerprint: "perf-harness-device",
      deviceName: "perf-harness",
    }),
    headers: { "content-type": "application/json" },
    description: "licence revalidation read path (unknown key -> valid:false, no write)",
    budget: { p95: 800, p99: 1600, maxErrorRate: 0.01 },
  },
];

/** Static assets, checked mostly for cache/TTFB behaviour. */
export const ASSETS = [
  {
    id: "sitemap",
    path: "/sitemap.xml",
    weight: 1,
    description: "sitemap (crawlers)",
    budget: { p95: 800, p99: 1500, maxErrorRate: 0.01 },
  },
  {
    id: "robots",
    path: "/robots.txt",
    weight: 1,
    description: "robots.txt",
    budget: { p95: 500, p99: 1000, maxErrorRate: 0.01 },
  },
];

/**
 * The end-to-end user journey the marketing site is built around:
 *
 *   open demo -> try a module -> decide about custom features -> download and
 *   run the 14-day trial -> ask for a licence -> activate.
 *
 * The sample recorded for this scenario is the *whole sequence*, so its p95 is
 * literally "how long does the journey take"; each step is also reported on
 * its own.
 */
export const USER_JOURNEY = {
  id: "user-journey",
  weight: 1,
  description:
    "demo -> evaluate module -> custom-request page -> download -> trial -> licence request -> activate",
  budget: { p95: 6000, p99: 9000, maxErrorRate: 0.02 },
  steps: [
    { id: "landing", path: "/", description: "arrive on the site" },
    { id: "demo", path: "/app", description: "open the live demo (no install)" },
    {
      id: "module",
      path: "/plugins/restaurant",
      description: "evaluate a module, decide whether custom features are needed",
    },
    { id: "pricing", path: "/api/prices", description: "read the licence prices" },
    { id: "download", path: "/download", description: "download and start the 14-day trial" },
    { id: "support", path: "/support", description: "ask for a licence key" },
    {
      id: "activate",
      path: "/api/license/validate",
      method: "POST",
      body: JSON.stringify({
        email: "perf-harness@example.invalid",
        licenseKey: "BIZ-00000-00000-00000-00000",
        deviceFingerprint: "perf-harness-device",
        deviceName: "perf-harness",
      }),
      headers: { "content-type": "application/json" },
      description: "desktop activation call",
    },
    { id: "account", path: "/account", description: "confirm the licence in the account panel" },
  ],
};

/** Everything except the journey, as a flat weighted list. */
export function buildScenarios() {
  const all = [...WEBSITE_PAGES, ...DEMO_PAGES, ...API_TARGETS, ...ASSETS];
  return all.map((scenario) => ({
    weight: 1,
    expect: defaultExpectation(scenario),
    ...scenario,
  }));
}

/** Success codes we accept for a scenario unless it declares its own. */
export function defaultExpectation(scenario) {
  if (scenario.path === "/api/license/validate") return [200];
  return [200, 301, 302, 304, 307, 308];
}

/** Total weight, used to build the weighted schedule. */
export function totalWeight(scenarios) {
  return scenarios.reduce((acc, scenario) => acc + (scenario.weight ?? 1), 0);
}
