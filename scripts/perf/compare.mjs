#!/usr/bin/env node
/**
 * Compare two or more HTTP perf reports (e.g. the same target at 1, 2, 4 and 10
 * concurrent workers) and print a scaling table.
 *
 *   node scripts/perf/compare.mjs perf-reports/http-prod-c2.json perf-reports/http-prod-load.json
 *   node scripts/perf/compare.mjs perf-reports/http-prod-*.json --out perf-reports/scaling.md
 *
 * The interesting output is where the *knee* is: the concurrency at which p95
 * stops being flat and starts climbing. Past that point the target is
 * saturated, so extra visitors only queue - which is exactly what a load test
 * is supposed to reveal. Raw samples are recombined here rather than averaging
 * the per-scenario percentiles, because a mean of percentiles is not a
 * percentile.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { formatMs, percentile, summarize } from "./lib/stats.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");

function parseArgs(argv) {
  const args = { files: [], out: null, label: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = () => {
      const next = argv[i + 1];
      if (next === undefined) throw new Error(`Missing value for ${arg}`);
      i += 1;
      return next;
    };
    if (arg === "--out") args.out = path.resolve(value());
    else if (arg === "--label") args.label = value();
    else if (arg.startsWith("--")) throw new Error(`Unknown argument: ${arg}`);
    else args.files.push(path.resolve(arg));
  }
  if (args.files.length < 2) throw new Error("Give me at least two report JSON files to compare.");
  return args;
}

function load(file) {
  const report = JSON.parse(fs.readFileSync(file, "utf8"));
  const workers = Number(String(report.concurrency ?? "").match(/\d+/)?.[0] ?? 0);
  const perPath = new Map();
  const all = [];
  for (const row of report.rows) {
    const samples = row.samples ?? [];
    all.push(...samples);
    const key = `${row.method} ${row.path}`;
    const bucket = perPath.get(key) ?? { id: row.id, samples: [] };
    bucket.samples.push(...samples);
    perPath.set(key, bucket);
  }
  return {
    file,
    report,
    workers,
    perPath,
    all,
    // Prefer the label the run was created with, so two repeats of the same
    // profile/concurrency stay distinguishable in the comparison table.
    name:
      report.label ??
      path.basename(file, ".json").replace(/^http-/, "").replace(/^desktop-/, "desktop "),
  };
}

function table(headers, rows) {
  const lines = [`| ${headers.join(" | ")} |`, `|${headers.map(() => "---").join("|")}|`];
  for (const row of rows) lines.push(`| ${row.join(" | ")} |`);
  return lines;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const datasets = args.files.map(load);
  const lines = [];
  const push = (line = "") => lines.push(line);

  push(args.label ? `# ${args.label}` : "# BizFlow scaling comparison");
  push();
  push(`Target: \`${datasets[0].report.target}${datasets[0].report.pathPrefix ?? ""}\``);
  push();
  push(`Generated: ${new Date().toISOString()}`);
  push();

  push("## All requests combined");
  push();
  lines.push(
    ...table(
      ["run", "requests", "wall", "throughput", "p50", "p90", "p95", "p99", "max"],
      datasets.map((dataset) => {
        const summary = summarize(dataset.all, { wallMs: dataset.report.wallMs });
        return [
          dataset.name,
          summary.count,
          formatMs(summary.wallMs),
          `${summary.rps.toFixed(2)} rps`,
          formatMs(summary.p50),
          formatMs(summary.p90),
          formatMs(summary.p95),
          formatMs(summary.p99),
          formatMs(summary.max),
        ];
      }),
    ),
  );
  push();

  const p95Of = (dataset, key) =>
    percentile(
      [...dataset.perPath.get(key).samples].sort((a, b) => a - b),
      95,
    ) ?? 0;

  const shared = [...datasets[0].perPath.keys()].filter((key) =>
    datasets.every((dataset) => dataset.perPath.has(key)),
  );
  const hottest = datasets[datasets.length - 1];
  const ranked = shared.sort((a, b) => p95Of(hottest, b) - p95Of(hottest, a));

  push("## p95 / p99 per path");
  push();
  lines.push(
    ...table(
      ["path", "requests", ...datasets.map((dataset) => dataset.name)],
      ranked.map((key) => [
        `\`${key}\``,
        datasets.reduce((acc, dataset) => acc + dataset.perPath.get(key).samples.length, 0),
        ...datasets.map((dataset) => {
          const sorted = [...dataset.perPath.get(key).samples].sort((a, b) => a - b);
          return `${formatMs(percentile(sorted, 95))} / ${formatMs(percentile(sorted, 99))}`;
        }),
      ]),
    ),
  );
  push();
  push("## Reading this");
  push();
  push(
    "- If throughput stops rising as workers are added, the target is saturated and the extra latency is queueing rather than work.",
  );
  push(
    "- If p95 is flat across worker counts the target still has headroom; the worker count where it starts climbing is the practical capacity of the box.",
  );
  push();

  const text = `${lines.join("\n")}\n`;
  process.stdout.write(text);
  if (args.out) {
    fs.mkdirSync(path.dirname(args.out), { recursive: true });
    fs.writeFileSync(args.out, text);
    process.stdout.write(`written ${path.relative(REPO_ROOT, args.out)}\n`);
  }
}

main();
