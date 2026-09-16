#!/usr/bin/env node
/**
 * Render the desktop benchmark results.
 *
 * `apps/Bizflow/src/test/perf/desktop.perf.ts` writes raw samples only; all the
 * maths happens here so the desktop numbers and the HTTP numbers come out of
 * exactly the same percentile implementation.
 *
 *   npm run perf:desktop
 *
 * Writes `perf-reports/desktop-<label>.{json,md}` and exits non-zero when a
 * workload breached its budget.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { budgetPassed, evaluateBudget, formatMs, summarize } from "../lib/stats.mjs";
import { allPassed, printRow, renderMarkdown } from "../lib/report.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, "..", "..", "..");
const REPORT_DIR = path.join(REPO_ROOT, "perf-reports");
const RAW = path.join(REPORT_DIR, "desktop-raw.json");
const APP_ROOT = path.join(REPO_ROOT, "apps", "Bizflow");
const RENDERER_ASSETS = path.join(APP_ROOT, "out", "renderer", "assets");

/**
 * Renderer bundle budgets. Set at the measured baseline with headroom, so they
 * act as a regression gate rather than an aspiration - the current entry chunk
 * is already ~1.2 MB and the lazy plugin chunks push the total to ~12 MB.
 */
const BUNDLE_BUDGET = { entryJs: 1_600_000, totalJs: 13_500_000, totalCss: 500_000 };

function human(bytes) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} kB`;
  return `${bytes} B`;
}

/**
 * Sum the built renderer bundles. Absent when the app has not been built, which
 * is not a failure - the benchmark itself does not need a build.
 *
 * The entry chunk is the one `index.html` actually loads; everything else is a
 * lazily imported route/plugin chunk, so the two are reported separately.
 */
function rendererBundles() {
  if (!fs.existsSync(RENDERER_ASSETS)) return null;
  const files = fs.readdirSync(RENDERER_ASSETS);
  const indexPath = path.join(path.dirname(RENDERER_ASSETS), "index.html");
  const html = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf8") : "";
  const referenced = new Set(
    [...html.matchAll(/(?:src|href)="[^"]*\/assets\/([^"/]+\.(?:js|css))"/g)].map((match) => match[1]),
  );

  const sizeOf = (list) =>
    list.reduce((total, file) => total + fs.statSync(path.join(RENDERER_ASSETS, file)).size, 0);
  const scripts = files.filter((file) => file.endsWith(".js"));
  const styles = files.filter((file) => file.endsWith(".css"));
  const entryFiles = [...referenced].filter((file) => file.endsWith(".js"));
  const entryJs = entryFiles.length > 0 ? sizeOf(entryFiles) : sizeOf(scripts.filter((file) => /^index-/.test(file)));
  const totalJs = sizeOf(scripts);
  const totalCss = sizeOf(styles);
  const checks = [
    { metric: "entryJs", limit: BUNDLE_BUDGET.entryJs, actual: entryJs, comparator: "lte", ok: entryJs <= BUNDLE_BUDGET.entryJs },
    { metric: "totalJs", limit: BUNDLE_BUDGET.totalJs, actual: totalJs, comparator: "lte", ok: totalJs <= BUNDLE_BUDGET.totalJs },
    { metric: "totalCss", limit: BUNDLE_BUDGET.totalCss, actual: totalCss, comparator: "lte", ok: totalCss <= BUNDLE_BUDGET.totalCss },
  ];
  const largest = scripts
    .map((file) => ({ file, size: fs.statSync(path.join(RENDERER_ASSETS, file)).size }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 5)
    .map((entry) => `${entry.file} ${human(entry.size)}`);

  return {
    dir: path.relative(REPO_ROOT, RENDERER_ASSETS).replace(/\\/g, "/"),
    chunkCount: scripts.length + styles.length,
    entryFiles,
    entryJs,
    totalJs,
    totalCss,
    largest,
    checks,
  };
}

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function groupRows(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.group)) groups.set(row.group, []);
    groups.get(row.group).push(...row.samples);
  }
  return [...groups.entries()].map(([name, samples]) => ({
    name,
    summary: summarize(samples),
    errorRate: 0,
  }));
}

function main() {
  if (!fs.existsSync(RAW)) {
    console.error(`No raw benchmark data at ${path.relative(REPO_ROOT, RAW)}.`);
    console.error("Run `npm run perf:bench --prefix apps/Bizflow` first.");
    process.exit(2);
  }

  const raw = JSON.parse(fs.readFileSync(RAW, "utf8"));
  const label = argValue("--label", `${raw.platform}-scale${raw.scale}`);
  const quiet = process.argv.includes("--quiet");

  const rows = raw.rows.map((row) => {
    const summary = summarize(row.samples, { wallMs: row.samples.reduce((a, b) => a + b, 0) });
    const errorRate = row.samples.length + row.errors.length > 0 ? row.errors.length / (row.samples.length + row.errors.length) : 0;
    const checks = row.budget ? evaluateBudget(summary, row.budget, { errorRate }) : [];
    return {
      id: row.id,
      description: row.description,
      group: row.group,
      summary,
      samples: row.samples,
      errorRate,
      errors: row.errors,
      extra: row.extra,
      checks,
      passed: budgetPassed(checks)
    };
  });

  const failures = rows.filter((row) => !row.passed && row.checks.length > 0);
  const allLatencies = rows.flatMap((row) => row.samples);
  const overall = summarize(allLatencies);

  if (!quiet) {
    console.log("");
    console.log("Desktop benchmark - operations on a seeded SQLite database");
    console.log("");
    for (const row of rows) console.log(printRow(row));
    console.log("");
    console.log(
      `overall: n=${overall.count} p50 ${formatMs(overall.p50)} p95 ${formatMs(overall.p95)} ` +
        `p99 ${formatMs(overall.p99)} max ${formatMs(overall.max)}`,
    );
    console.log("");
  }

  const bundles = rendererBundles();
  const report = {
    kind: "desktop",
    label,
    generatedAt: new Date().toISOString(),
    platform: raw.platform,
    node: raw.node,
    scale: raw.scale,
    db: raw.db,
    seed: raw.seed,
    tables: raw.tables,
    overall,
    rows,
    groups: groupRows(rows),
    bundle: bundles,
    failures: failures.map((row) => ({ id: row.id, checks: row.checks.filter((check) => !check.ok) })),
  };

  const metadata = [
    ["Platform", `${raw.platform}, Node ${raw.node}`],
    ["Data scale", `${raw.scale}x deterministic seed`],
    ["Database", `SQLite temp copy (${raw.db.schemaSource}) - production client settings`],
    ["Seeded rows", Object.entries(raw.seed?.tables ?? raw.tables ?? {}).map(([table, count]) => `${table} ${count}`).join(", ")],
    ["Operations", `${overall.count} timed across ${rows.length} workloads`],
    ["Overall p95 / p99", `${formatMs(overall.p95)} / ${formatMs(overall.p99)}`],
  ];
  if (bundles) {
    metadata.push([
      "Renderer bundle",
      `entry ${human(bundles.entryJs)} (budget ${human(BUNDLE_BUDGET.entryJs)}), ` +
        `all JS ${human(bundles.totalJs)} in ${bundles.chunkCount} chunks (budget ${human(BUNDLE_BUDGET.totalJs)}), ` +
        `CSS ${human(bundles.totalCss)}`,
    ]);
    metadata.push(["Largest chunks", bundles.largest.join(", ")]);
  } else {
    metadata.push(["Renderer bundle", "not built - run `npx electron-vite build` to measure it"]);
  }

  const notes = [
    "Every workload runs the real main-process code against a temporary SQLite database opened with the production Prisma client settings (datasource flags, Serializable transactions, WAL + mmap PRAGMAs).",
    "Warm-up iterations are discarded; only the measured iterations are reported.",
    `Budgets are local-SSD expectations: p95 ${formatMs(100)}-${formatMs(600)} per operation. A breach is a regression signal, not a network effect.`,
    "The POS workload commits a full sale (sale + 3 line items + stock decrement + 3 stock movements) inside a Serializable transaction.",
  ];
  if (bundles) {
    notes.push(
      `Renderer bundle budget: entry JS <= ${human(BUNDLE_BUDGET.entryJs)}, all JS <= ${human(BUNDLE_BUDGET.totalJs)}, CSS <= ${human(BUNDLE_BUDGET.totalCss)}.`,
    );
  }
  if (rows.some((row) => row.errors.length > 0)) {
    notes.push("Workloads reporting errors had failing iterations excluded from the percentiles.");
  }

  const markdown = renderMarkdown({
    title: `BizFlow desktop performance report (${label})`,
    generatedAt: report.generatedAt,
    metadata,
    rows,
    groups: report.groups,
    failures: report.failures,
    notes,
  });

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const jsonPath = path.join(REPORT_DIR, `desktop-${label}.json`);
  const mdPath = path.join(REPORT_DIR, `desktop-${label}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(mdPath, markdown, "utf8");

  if (!quiet) {
    console.log(`report: ${path.relative(REPO_ROOT, mdPath).replace(/\\/g, "/")}`);
  }

  const bundleFailed = bundles ? !allPassed(bundles.checks) : false;
  if (failures.length > 0 || bundleFailed) {
    console.error("");
    for (const failure of report.failures) {
      for (const check of failure.checks) {
        console.error(`BUDGET BREACH ${failure.id}: ${check.metric} ${check.actual.toFixed(2)} > ${check.limit}`);
      }
    }
    if (bundleFailed) {
      for (const check of bundles.checks) {
        if (!check.ok) console.error(`BUDGET BREACH bundle.${check.metric}: ${check.actual} > ${check.limit}`);
      }
    }
    process.exit(1);
  }
}

main();
