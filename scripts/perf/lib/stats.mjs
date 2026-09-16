/**
 * Percentile / throughput maths for the BizFlow performance harness.
 *
 * Zero dependencies on purpose: the harness has to run on a bare Node install
 * (local Windows, the VPS, or a GitHub runner) without adding anything to
 * package.json.
 */

/**
 * Linear-interpolation percentile (the same definition as Excel's
 * PERCENTILE.INC and most load-testing tools): h = (n - 1) * p / 100, then
 * interpolate between the two neighbouring samples.
 *
 * @param {number[]} sortedAsc samples, already sorted ascending
 * @param {number} p percentile in 0..100
 * @returns {number}
 */
export function percentile(sortedAsc, p) {
  const n = sortedAsc.length;
  if (n === 0) return 0;
  if (n === 1) return sortedAsc[0];
  const clamped = Math.min(100, Math.max(0, p));
  const h = ((n - 1) * clamped) / 100;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  if (lo === hi) return sortedAsc[lo];
  return sortedAsc[lo] + (h - lo) * (sortedAsc[hi] - sortedAsc[lo]);
}

/**
 * Summarise a list of latencies (milliseconds) or any numeric samples.
 *
 * @param {number[]} samples
 * @param {{ wallMs?: number }} [options] wallMs lets us compute real RPS from
 *   the measurement window instead of assuming the samples cover it exactly.
 */
export function summarize(samples, options = {}) {
  const clean = samples.filter((value) => Number.isFinite(value));
  const count = clean.length;
  const sorted = [...clean].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, value) => acc + value, 0);
  const mean = count === 0 ? 0 : sum / count;
  const variance =
    count === 0 ? 0 : sorted.reduce((acc, value) => acc + (value - mean) ** 2, 0) / count;
  const wallMs = Number.isFinite(options.wallMs) && options.wallMs > 0 ? options.wallMs : sum;

  return {
    count,
    min: count === 0 ? 0 : sorted[0],
    mean,
    stddev: Math.sqrt(variance),
    p50: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    max: count === 0 ? 0 : sorted[count - 1],
    sumMs: sum,
    wallMs,
    rps: wallMs > 0 ? (count / wallMs) * 1000 : 0,
  };
}

/**
 * Compare a summary against a budget. Every metric is optional, so a scenario
 * can assert only what it actually cares about.
 *
 * @param {ReturnType<typeof summarize>} summary
 * @param {{ p50?: number, p95?: number, p99?: number, max?: number, minRps?: number, maxErrorRate?: number }} budget
 * @param {{ errorRate?: number }} [extra]
 */
export function evaluateBudget(summary, budget = {}, extra = {}) {
  const checks = [];
  const add = (metric, limit, actual, comparator = "lte") => {
    if (!Number.isFinite(limit)) return;
    const ok = comparator === "lte" ? actual <= limit : actual >= limit;
    checks.push({ metric, limit, actual, comparator, ok });
  };

  add("p50", budget.p50, summary.p50);
  add("p95", budget.p95, summary.p95);
  add("p99", budget.p99, summary.p99);
  add("max", budget.max, summary.max);
  add("rps", budget.minRps, summary.rps, "gte");
  add("errorRate", budget.maxErrorRate, extra.errorRate ?? 0);

  return checks;
}

/** True when every check passed. */
export function budgetPassed(checks) {
  return checks.every((check) => check.ok);
}

/** `12.34 ms`, `1.24 s` - stable widths keep report tables readable. */
export function formatMs(value) {
  if (!Number.isFinite(value)) return "n/a";
  if (value >= 1000) return `${(value / 1000).toFixed(2)} s`;
  if (value >= 100) return `${value.toFixed(1)} ms`;
  return `${value.toFixed(2)} ms`;
}

/** `1.20%` */
export function formatPct(value) {
  if (!Number.isFinite(value)) return "n/a";
  return `${(value * 100).toFixed(2)}%`;
}

/** Flatten per-scenario sample arrays into one list. */
export function mergeSamples(groups) {
  return groups.flat();
}
