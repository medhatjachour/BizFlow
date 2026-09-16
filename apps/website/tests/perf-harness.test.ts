import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * The load / stress harness reports p95 and p99, and the whole point of a
 * percentile gate is that people trust it. The maths is therefore pinned here:
 * if `percentile` drifts, every budget in the project silently changes meaning.
 *
 * The harness itself lives in `scripts/perf` as plain `.mjs` files with no
 * dependencies, so it can run on a bare Node install on the VPS as well as on a
 * GitHub runner. Importing through a computed file URL keeps TypeScript happy
 * without adding a declaration file for a script that intentionally has no
 * build step.
 *
 * The safety rules are asserted too, because this is the one tool in the repo
 * that can take production down: aggressive profiles must refuse a remote host,
 * and nothing in the scenario catalogue may write.
 */

const ROOT = path.join(__dirname, "..", "..", "..");

/**
 * The harness modules are plain `.mjs` with no build step, so TypeScript cannot
 * infer their shapes. Rather than reaching for `any` at every call site, the
 * slice of the contract this suite touches is written out below: a rename or a
 * signature change inside `scripts/perf` now fails the typecheck here instead of
 * turning an assertion into a silent no-op.
 */
interface PerfSummary {
  count: number;
  min: number;
  max: number;
  mean: number;
  sumMs: number;
  p50: number;
  p95: number;
  p99: number;
  rps: number;
  wallMs: number;
}

interface PerfCheck {
  metric: string;
  ok: boolean;
  limit: number;
  actual: number;
}

interface PerfBudget {
  p95?: number;
  p99?: number;
  minRps?: number;
  maxErrorRate?: number;
}

interface PerfScenario {
  id: string;
  path: string;
  description?: string;
  method?: string;
  weight?: number;
  expect?: number[];
  budget?: PerfBudget;
  headers?: Record<string, string>;
  body?: string;
}

interface PerfRow {
  id: string;
  summary: PerfSummary;
  checks: PerfCheck[];
  description?: string;
  path?: string;
  method?: string;
  statuses?: Record<number, number>;
  bytes?: number;
  errors?: string[];
  errorRate?: number;
  ttfb?: PerfSummary | null;
  cold?: PerfSummary | null;
  warm?: PerfSummary | null;
  freshSockets?: number;
  freshSocketRate?: number;
}

interface PerfReport {
  generatedAt: string;
  kind: string;
  metadata: [string, string][];
  rows: PerfRow[];
  journeys: unknown[];
  failures: unknown[];
  title?: string;
  target?: string;
  profile?: string;
  concurrency?: number;
  durationMs?: number;
  wallMs?: number;
  host?: string;
}

interface StatsModule {
  percentile(samples: number[], percentile: number): number;
  summarize(samples: number[], options?: { wallMs?: number }): PerfSummary;
  evaluateBudget(
    summary: PerfSummary,
    budget: PerfBudget,
    options?: { errorRate?: number },
  ): PerfCheck[];
  budgetPassed(checks: PerfCheck[]): boolean;
}

interface ScheduleModule {
  buildSchedule<T extends { weight?: number }>(scenarios: T[]): T[];
}

interface TargetModule {
  assertSafeTarget(
    args: { target: string; profile: string; forceRemote?: boolean },
    aggressiveProfiles: Set<string>,
  ): { host: string; local: boolean };
}

interface ScenariosModule {
  buildScenarios(): PerfScenario[];
  totalWeight(scenarios: PerfScenario[]): number;
  defaultExpectation(scenario: { path: string }): number[];
  PROFILES: Record<
    string,
    { description: string; concurrency: number; durationMs: number; gatesLatency?: boolean }
  >;
  AGGRESSIVE_PROFILES: Set<string>;
  USER_JOURNEY: { id: string; path?: string; budget?: PerfBudget; steps: PerfScenario[] };
}

interface ReportModule {
  renderMarkdown(report: PerfReport): string;
  // Only `ok` is ever read, so accept anything shaped like a check.
  allPassed(checks: Array<Partial<PerfCheck> & { ok: boolean }>): boolean;
}

async function load<T>(relativePath: string): Promise<T> {
  const url = pathToFileURL(path.join(ROOT, relativePath)).href;
  return import(/* @vite-ignore */ url) as Promise<T>;
}

const stats = await load<StatsModule>("scripts/perf/lib/stats.mjs");
const schedule = await load<ScheduleModule>("scripts/perf/lib/schedule.mjs");
const target = await load<TargetModule>("scripts/perf/lib/target.mjs");
const scenarios = await load<ScenariosModule>("scripts/perf/scenarios.mjs");
const report = await load<ReportModule>("scripts/perf/lib/report.mjs");

describe("percentiles", () => {
  it("interpolates the way other load tools do", () => {
    // 1..10 in steps of 1: h = (10-1)*95/100 = 8.55 -> 9 + 0.55*(10-9) = 9.55
    const samples = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(stats.percentile(samples, 50)).toBeCloseTo(5.5, 10);
    expect(stats.percentile(samples, 95)).toBeCloseTo(9.55, 10);
    expect(stats.percentile(samples, 99)).toBeCloseTo(9.91, 10);
  });

  it("returns the extremes at both ends and clamps out-of-range requests", () => {
    const samples = [4, 9, 12, 30];
    expect(stats.percentile(samples, 0)).toBe(4);
    expect(stats.percentile(samples, 100)).toBe(30);
    expect(stats.percentile(samples, -5)).toBe(4);
    expect(stats.percentile(samples, 150)).toBe(30);
  });

  it("handles the degenerate inputs a short run produces", () => {
    expect(stats.percentile([], 95)).toBe(0);
    expect(stats.percentile([7], 95)).toBe(7);
    expect(stats.percentile([5, 5, 5], 99)).toBe(5);
  });

  it("never decreases as the percentile rises", () => {
    const samples = [3, 8, 13, 21, 21, 34, 55, 89, 100, 144, 233];
    const values = [50, 75, 90, 95, 99, 100].map((p) => stats.percentile(samples, p));
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
    }
  });
});

describe("summarize", () => {
  it("computes the spread, the tail and the throughput of a run", () => {
    const summary = stats.summarize([100, 200, 300, 400, 500], { wallMs: 1000 });
    expect(summary.count).toBe(5);
    expect(summary.min).toBe(100);
    expect(summary.max).toBe(500);
    expect(summary.mean).toBe(300);
    expect(summary.sumMs).toBe(1500);
    expect(summary.p50).toBe(300);
    // 5 requests in exactly one second.
    expect(summary.rps).toBe(5);
  });

  it("uses the measurement window rather than the sum of samples for RPS", () => {
    // Closed-loop runs leave gaps between requests; RPS must reflect the wall
    // clock, otherwise a slow target looks fast.
    const summary = stats.summarize([10, 10], { wallMs: 10_000 });
    expect(summary.rps).toBeCloseTo(0.2, 10);
    expect(summary.sumMs).toBe(20);
  });

  it("survives an empty or partially corrupt sample list", () => {
    const empty = stats.summarize([], { wallMs: 1000 });
    expect(empty.count).toBe(0);
    expect(empty.p95).toBe(0);
    expect(empty.rps).toBe(0);

    const dirty = stats.summarize([100, Number.NaN, Infinity, 200], { wallMs: 1000 });
    expect(dirty.count).toBe(2);
    expect(dirty.p95).toBeCloseTo(195, 10);
  });

  it("falls back to the sum of samples when no window is given", () => {
    const summary = stats.summarize([100, 100]);
    expect(summary.wallMs).toBe(200);
    expect(summary.rps).toBe(10);
  });
});

describe("budget evaluation", () => {
  const summary = stats.summarize([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], { wallMs: 1000 });

  it("checks only the metrics the budget actually mentions", () => {
    const checks = stats.evaluateBudget(summary, { p95: 1000 });
    expect(checks.map((c) => c.metric)).toEqual(["p95"]);
    expect(stats.budgetPassed(checks)).toBe(true);
  });

  it("fails a breach and reports the numbers behind it", () => {
    const checks = stats.evaluateBudget(summary, { p95: 50, p99: 5000 });
    expect(stats.budgetPassed(checks)).toBe(false);
    const breach = checks.find((c) => !c.ok)!;
    expect(breach.metric).toBe("p95");
    expect(breach.limit).toBe(50);
    expect(breach.actual).toBeCloseTo(summary.p95, 10);
  });

  it("treats a minimum throughput as a lower bound", () => {
    expect(stats.budgetPassed(stats.evaluateBudget(summary, { minRps: 10 }))).toBe(true);
    expect(stats.budgetPassed(stats.evaluateBudget(summary, { minRps: 100 }))).toBe(false);
  });

  it("fails on error rate passed in separately from the samples", () => {
    const errorRate = 0.05;
    const checks = stats.evaluateBudget(summary, { maxErrorRate: 0.01 }, { errorRate });
    expect(stats.budgetPassed(checks)).toBe(false);
    expect(checks[0]).toMatchObject({ metric: "errorRate", limit: 0.01, actual: errorRate });
  });

  it("assumes zero errors when none are reported", () => {
    expect(stats.budgetPassed(stats.evaluateBudget(summary, { maxErrorRate: 0.01 }))).toBe(true);
  });
});

describe("scheduling", () => {
  it("keeps the weights but interleaves instead of blocking", () => {
    const weight = (id: string, w: number) => ({ id, weight: w });
    const built = schedule.buildSchedule([
      weight("home", 2),
      weight("api", 1),
      weight("assets", 1),
    ]);
    expect(built.map((s) => s.id)).toEqual(["home", "api", "assets", "home"]);
  });

  it("covers every scenario within the first pass", () => {
    const built = schedule.buildSchedule(scenarios.buildScenarios());
    const firstPass = built.slice(0, scenarios.buildScenarios().length);
    expect(new Set(firstPass.map((s) => s.id)).size).toBe(scenarios.buildScenarios().length);
  });

  it("preserves the declared mix over a full cycle", () => {
    const built = schedule.buildSchedule(scenarios.buildScenarios());
    expect(built.length).toBe(scenarios.totalWeight(scenarios.buildScenarios()));
    const declared = new Map<string, number>(
      scenarios.buildScenarios().map((s) => [s.id, s.weight ?? 1]),
    );
    for (const [id, weight] of declared) {
      expect(built.filter((s) => s.id === id).length).toBe(weight);
    }
  });
});

describe("target safety", () => {
  const aggressive = scenarios.AGGRESSIVE_PROFILES;

  it("refuses to point a stress profile at production", () => {
    expect(() =>
      target.assertSafeTarget(
        { target: "https://www.bizflow.medhatjachour.tech", profile: "stress" },
        aggressive,
      ),
    ).toThrow(/Refusing to run the "stress" profile/);
  });

  it("refuses the spike and soak profiles too", () => {
    for (const profile of ["spike", "soak"]) {
      expect(() =>
        target.assertSafeTarget({ target: "https://example.com", profile }, aggressive),
      ).toThrow(/Refusing/);
    }
  });

  it("allows the load profile against production, because it is read-only", () => {
    const result = target.assertSafeTarget(
      { target: "https://www.bizflow.medhatjachour.tech", profile: "load" },
      aggressive,
    );
    expect(result).toMatchObject({ host: "www.bizflow.medhatjachour.tech", local: false });
  });

  it("allows an aggressive profile locally, or with an explicit opt-in", () => {
    expect(
      target.assertSafeTarget({ target: "http://127.0.0.1:3000", profile: "stress" }, aggressive),
    ).toMatchObject({ local: true });
    expect(
      target.assertSafeTarget(
        { target: "https://www.bizflow.medhatjachour.tech", profile: "stress", forceRemote: true },
        aggressive,
      ),
    ).toMatchObject({ local: false });
  });
});

describe("scenario catalogue", () => {
  const all = scenarios.buildScenarios();

  it("has unique ids and a positive integer weight", () => {
    const ids = all.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const scenario of all) {
      expect(Number.isInteger(scenario.weight)).toBe(true);
      expect(scenario.weight).toBeGreaterThan(0);
    }
  });

  it("gives every scenario a p95 budget", () => {
    for (const scenario of [...all, scenarios.USER_JOURNEY]) {
      expect(scenario.budget?.p95, `${scenario.id} has no p95 budget`).toBeGreaterThan(0);
    }
  });

  it("never writes to the site", () => {
    const writing = [
      "/api/download",
      "/api/license/request",
      "/api/license/activate",
      "/api/checkout",
      "/api/requests",
      "/api/contact",
    ];
    const requests = [...all, ...scenarios.USER_JOURNEY.steps];
    for (const scenario of requests) {
      for (const path of writing) {
        expect(scenario.path, `${scenario.id} must not hit ${path}`).not.toBe(path);
      }
    }
    const posts = requests.filter((s) => (s.method ?? "GET") !== "GET");
    // The only POST is the licence *validation* read path, and it uses a key
    // that cannot exist, so it cannot mutate a real licence.
    expect(posts.map((s) => s.path)).toEqual([
      "/api/license/validate",
      "/api/license/validate",
    ]);
    for (const post of posts) {
      expect(post.body).toContain("00000-00000-00000-00000");
    }
  });

  it("covers the pages the user flow starts from", () => {
    const paths = all.map((s) => s.path);
    expect(paths).toContain("/");
    expect(paths).toContain("/app"); // the in-browser demo
    expect(paths).toContain("/download"); // 14-day trial download
    expect(paths).toContain("/support"); // ask for a licence
    expect(paths).toContain("/account/login");
    expect(paths.filter((p: string) => p.startsWith("/plugins/")).length).toBeGreaterThanOrEqual(3);
  });

  it("replays the journey in the order the user actually walks it", () => {
    expect(scenarios.USER_JOURNEY.steps.map((s) => s.id)).toEqual([
      "landing",
      "demo",
      "module",
      "pricing",
      "download",
      "support",
      "activate",
      "account",
    ]);
  });

  it("accepts a redirect when a signed-out visitor asks for the account area", () => {
    const account = all.find((s) => s.id === "account")!;
    expect(account.expect).toEqual([307, 308]);
    expect(scenarios.defaultExpectation({ path: "/anything-else" })).toContain(307);
  });

  it("keeps the stress profiles heavier than the load profile", () => {
    const { PROFILES } = scenarios;
    expect(PROFILES.load.concurrency).toBe(10);
    expect(PROFILES.stress.concurrency).toBeGreaterThan(PROFILES.load.concurrency);
    expect(PROFILES.spike.concurrency).toBeGreaterThan(PROFILES.stress.concurrency);
    expect(PROFILES.soak.durationMs).toBeGreaterThan(600_000);
  });
});

describe("latency gating", () => {
  it("only gates latency on a profile long enough to measure it", () => {
    const { PROFILES } = scenarios;
    // smoke is a reachability check: 10 s with no warm-up measures the client's
    // own DNS/TCP/TLS start-up far more than the server.
    expect(PROFILES.smoke.gatesLatency).toBe(false);
    expect(PROFILES.load.gatesLatency).not.toBe(false);
    expect(PROFILES.stress.gatesLatency).not.toBe(false);
  });

  it("lets a flag override the profile in both directions", async () => {
    const run = fs.readFileSync(path.join(ROOT, "scripts", "perf", "run.mjs"), "utf8");
    expect(run).toContain('case "--no-latency-gate"');
    expect(run).toContain('case "--gate-latency"');
    // `args.gateLatency ?? profile.gatesLatency !== false`: an explicit flag wins.
    expect(run).toContain("args.gateLatency ?? profile.gatesLatency !== false");
    // ...and the error rate is never downgraded by it.
    expect(run).toContain('check.metric === "errorRate"');
  });

  it("runs CI with latency reported rather than gated", async () => {
    const workflow = fs.readFileSync(
      path.join(ROOT, ".github", "workflows", "perf.yml"),
      "utf8",
    );
    expect(workflow).toContain("--no-latency-gate");
    // A shared runner's handshake variance would make a p95 gate flap, so the
    // workflow must not pass the flag that turns the gate back on. Anchored to
    // the start of a line so that a mention in a comment does not count.
    expect(workflow).not.toMatch(/^\s+--gate-latency\b/m);
  });
});

describe("markdown report", () => {
  const rows = [
    {
      id: "home",
      description: "landing page",
      path: "/",
      method: "GET",
      statuses: { 200: 10 },
      bytes: 1000,
      errors: [],
      errorRate: 0,
      summary: stats.summarize([100, 200], { wallMs: 1000 }),
      checks: stats.evaluateBudget(stats.summarize([100, 200], { wallMs: 1000 }), { p95: 1500 }),
    },
  ];
  const markdown = report.renderMarkdown({
    generatedAt: new Date().toISOString(),
    kind: "http",
    title: "test",
    metadata: [["Target", "https://example.com"]],
    target: "https://example.com",
    profile: "load",
    concurrency: 10,
    durationMs: 1000,
    wallMs: 1000,
    host: "example.com",
    rows,
    journeys: [],
    failures: [],
  });

  it("renders tables whose header and separator widths match", () => {
    const tables = markdown.split(/\r?\n\r?\n/).filter((block) => block.startsWith("|"));
    expect(tables.length).toBeGreaterThan(0);
    for (const block of tables) {
      const lines = block.split(/\r?\n/);
      const cells = lines[0].split("|").length;
      for (const line of lines) {
        expect(line.split("|").length, `ragged row in:\n${block}`).toBe(cells);
      }
    }
  });

  it("marks a passing run and reports the p95 it measured", () => {
    expect(markdown).toContain("PASS");
    expect(markdown).toContain("Target");
    expect(report.allPassed(rows[0].checks)).toBe(true);
    expect(report.allPassed([{ metric: "p95", ok: false }])).toBe(false);
  });
});

/**
 * A raw latency number is not interpretable on its own: the first request in a
 * fresh process pays for DNS + TCP + TLS, and that cost belongs to the network,
 * not to the server. These tests pin the three columns that make the difference
 * visible - server think time (TTFB), the cold/warm split, and how often a
 * fresh socket was actually needed.
 */
describe("connection-aware report columns", () => {
  function buildRows() {
    const summary = stats.summarize([100, 200, 300], { wallMs: 1000 });
    return [
      {
        id: "home",
        description: "landing page",
        path: "/",
        method: "GET",
        statuses: { 200: 3 },
        bytes: 3000,
        errors: [],
        errorRate: 0,
        summary,
        ttfb: stats.summarize([40, 60, 80]),
        cold: stats.summarize([1900]),
        warm: stats.summarize([100, 200]),
        freshSockets: 1,
        freshSocketRate: 1 / 3,
        checks: stats.evaluateBudget(summary, { p95: 1500 }),
      },
      {
        id: "api-version",
        description: "updater probe",
        path: "/api/version",
        method: "GET",
        statuses: { 200: 3 },
        bytes: 300,
        errors: [],
        errorRate: 0,
        summary,
        ttfb: stats.summarize([12, 18, 24]),
        cold: null,
        warm: stats.summarize([20, 30]),
        freshSockets: 0,
        freshSocketRate: 0,
        checks: stats.evaluateBudget(summary, { p95: 1500 }),
      },
    ];
  }

  const markdown = report.renderMarkdown({
    generatedAt: new Date().toISOString(),
    kind: "http",
    title: "connections",
    metadata: [["Label", "c=10"]],
    target: "https://example.com",
    profile: "load",
    concurrency: 10,
    durationMs: 1000,
    wallMs: 1000,
    host: "example.com",
    rows: buildRows(),
    journeys: [],
    failures: [],
  });

  it("adds the TTFB, cold and warm columns when the rows carry them", () => {
    const header = markdown.split(/\r?\n/).find((line) => line.startsWith("| Scenario |"));
    expect(header).toContain("TTFB p95");
    expect(header).toContain("cold p95");
    expect(header).toContain("warm p95");
  });

  it("distinguishes a cold request from a warm one in the cells", () => {
    // The cold sample in this fixture is ~1.9 s, the warm one ~0.1-0.2 s. If
    // the split were dropped or swapped, that difference would vanish.
    const row = markdown.split(/\r?\n/).find((line) => line.includes("`home`"));
    expect(row).toContain("1.90 s");
    expect(row).toContain("195.0 ms");
    // A row with no cold sample must render a dash, not a zero - zero would be
    // read as "instant" rather than "not measured".
    const hot = markdown.split(/\r?\n/).find((line) => line.includes("`api-version`"));
    expect(hot).toContain("| - |");
  });

  it("reports how many measured requests needed a brand-new socket", () => {
    expect(markdown).toContain("New sockets");
    expect(markdown).toContain("1 / 3 (33.33%)");
    expect(markdown).toContain("0 / 3 (0.00%)");
  });

  it("omits the connection columns entirely for a plain-latency report", () => {
    const bare = report.renderMarkdown({
      generatedAt: new Date().toISOString(),
      kind: "desktop",
      metadata: [],
      rows: [
        {
          id: "catalog.page-1",
          description: "page one",
          summary: stats.summarize([1, 2, 3]),
          checks: [],
        },
      ],
      journeys: [],
      failures: [],
    });
    expect(bare).not.toContain("TTFB p95");
    expect(bare).not.toContain("cold p95");
    expect(bare).not.toContain("New sockets");
  });
});
