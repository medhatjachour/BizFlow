#!/usr/bin/env node
/**
 * BizFlow HTTP load / stress harness.
 *
 *   node scripts/perf/run.mjs --target https://www.bizflow.medhatjachour.tech --profile load
 *   node scripts/perf/run.mjs --target http://127.0.0.1:3000 --profile stress
 *
 * The generated load is closed-loop: `--concurrency` async workers, each doing
 * one request at a time, so a slow server naturally produces a lower request
 * rate instead of an overwhelmed socket pool. That is the right model here
 * because the thing we are protecting is a single small VPS.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "./lib/http.mjs";
import { formatMs, formatPct, summarize, evaluateBudget, budgetPassed } from "./lib/stats.mjs";
import { renderMarkdown } from "./lib/report.mjs";
import { buildSchedule } from "./lib/schedule.mjs";
import { assertSafeTarget } from "./lib/target.mjs";
import {
  AGGRESSIVE_PROFILES,
  PROFILES,
  USER_JOURNEY,
  buildScenarios,
  defaultExpectation,
} from "./scenarios.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");

/** Turn a human label into a filename-safe slug ("c=10 verify" -> "c10-verify"). */
function slugify(value) {
  return (
    String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "run"
  );
}

function parseArgs(argv) {
  const args = {
    target: "http://127.0.0.1:3000",
    profile: "load",
    concurrency: null,
    durationMs: null,
    journeyRepeats: 5,
    pathPrefix: "",
    out: path.join(REPO_ROOT, "perf-reports"),
    label: null,
    skipJourney: false,
    forceRemote: process.env.PERF_ALLOW_REMOTE_STRESS === "1",
    quiet: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }
      i += 1;
      return value;
    };
    switch (arg) {
      case "--target":
        args.target = next();
        break;
      case "--profile":
        args.profile = next();
        break;
      case "--concurrency":
        args.concurrency = Number(next());
        break;
      case "--duration":
        args.durationMs = Number(next()) * 1000;
        break;
      case "--journey-repeats":
        args.journeyRepeats = Number(next());
        break;
      case "--path-prefix":
        args.pathPrefix = next().replace(/\/$/, "");
        break;
      case "--out":
        args.out = path.resolve(next());
        break;
      case "--label":
        args.label = next();
        break;
      case "--skip-journey":
        args.skipJourney = true;
        break;
      case "--gate-latency":
        args.gateLatency = true;
        break;
      case "--no-latency-gate":
        args.gateLatency = false;
        break;
      case "--force-remote":
        args.forceRemote = true;
        break;
      case "--quiet":
        args.quiet = true;
        break;
      case "--help":
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!PROFILES[args.profile]) {
    throw new Error(
      `Unknown profile "${args.profile}". Known: ${Object.keys(PROFILES).join(", ")}`,
    );
  }
  return args;
}

function printHelp() {
  process.stdout.write(
    [
      "BizFlow load / stress harness",
      "",
      "Usage: node scripts/perf/run.mjs [options]",
      "",
      `Profiles: ${Object.keys(PROFILES).join(", ")}`,
      "",
      "Options:",
      "  --target <url>        target origin (default http://127.0.0.1:3000)",
      "  --profile <name>      smoke | load | stress | spike | soak",
      "  --concurrency <n>     override profile worker count",
      "  --duration <seconds>  override profile measurement window",
      "  --path-prefix <p>     prepend a prefix (the container serves under /bizflow)",
      "  --journey-repeats <n> how many times to replay the end-to-end user journey",
      "  --skip-journey        skip the journey scenario",
      "  --no-latency-gate     enforce the error rate but only *report* latency",
      "  --gate-latency        enforce latency even on a profile that does not",
      "  --force-remote        allow stress/spike/soak against a non-local host",
      "  --out <dir>           report directory (default ./perf-reports)",
      "  --label <name>        label used in the report filenames",
      "",
      `Env: PERF_ALLOW_REMOTE_STRESS=1 is the equivalent of --force-remote.`,
      "",
    ].join("\n"),
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function prefixPath(prefix, target) {
  return `${prefix}${target.path}`;
}

/**
 * Transport-level failures (the socket never carried a request) are not slow
 * responses, they are a broken target. Answering a dead port 60 000 times
 * produces a beautiful 0.11 ms p50 and tells nobody anything, so the runner
 * refuses to start in that state and stops if it happens mid-run.
 */
const FATAL_SOCKET_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ECONNRESET",
  "EPIPE",
  "CERT_HAS_EXPIRED",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
]);

/** One request against the first scenario, before any load is applied. */
async function probeTarget({ client, schedule, prefix }) {
  const first = schedule[0];
  const result = await client.request({
    method: first.method ?? "GET",
    path: prefixPath(prefix, first),
    headers: first.headers,
    body: first.body,
  });
  const expected = first.expect ?? defaultExpectation(first);
  return { result, first, reachable: result.error === undefined && expected.includes(result.status) };
}

/**
 * Run one scenario set closed-loop for `durationMs`.
 *
 * Returns per-scenario samples plus the wall-clock window so RPS is honest.
 */
async function runClosedLoop({ client, schedule, concurrency, durationMs, warmupMs, rampMs, prefix }) {
  const stats = new Map();
  // Shared abort flag: one worker hitting a dead socket stops all of them.
  const fatal = { code: null, message: null };

  for (const scenario of schedule) {
    if (!stats.has(scenario.id)) {
      stats.set(scenario.id, {
        scenario,
        samples: [],
        ttfbSamples: [],
        coldSamples: [],
        warmSamples: [],
        statuses: new Map(),
        errors: [],
        bytes: 0,
        freshSockets: 0,
      });
    }
  }

  let stopAt = Infinity;
  const worker = async (index) => {
    // Ramp: worker `i` waits proportionally so the load climbs instead of
    // hitting the server with every socket in the same millisecond.
    if (rampMs > 0 && concurrency > 1) {
      await sleep((rampMs / concurrency) * index);
    }
    let cursor = index % schedule.length;
    let transportFailures = 0;
    while (Date.now() < stopAt) {
      const scenario = schedule[cursor % schedule.length];
      cursor += 1;
      // Once warmup is over the whole loop stops recording; individual
      // requests already in flight still finish normally.
      const result = await client.request({
        method: scenario.method ?? "GET",
        path: prefixPath(prefix, scenario),
        headers: scenario.headers,
        body: scenario.body,
      });
      if (result.errorCode && FATAL_SOCKET_CODES.has(result.errorCode)) {
        transportFailures += 1;
        // Give a transient blip a chance, then stop the whole run rather than
        // record 60 000 sub-millisecond "responses" that never left the box.
        if (transportFailures >= 20 && !fatal.code) {
          fatal.code = result.errorCode;
          fatal.message = result.error ?? result.errorCode;
          stopAt = 0;
        }
      } else {
        transportFailures = 0;
      }
      const bucket = stats.get(scenario.id);
      const expected = scenario.expect ?? defaultExpectation(scenario);
      const ok = result.error === undefined && expected.includes(result.status);
      bucket.samples.push(result.ms);
      bucket.ttfbSamples.push(result.ttfbMs ?? result.ms);
      bucket.statuses.set(result.status, (bucket.statuses.get(result.status) ?? 0) + 1);
      bucket.bytes += result.bytes;
      if (result.reusedSocket === false) {
        bucket.freshSockets += 1;
        bucket.coldSamples.push(result.ms);
      } else {
        bucket.warmSamples.push(result.ms);
      }
      if (!ok) {
        if (bucket.errors.length < 20) {
          bucket.errors.push(result.error ?? `HTTP ${result.status}`);
        }
      }
    }
  };

  // Warm-up: same workload, samples thrown away. This is what makes the first
  // cold Next.js render not count as a "p95".
  if (warmupMs > 0) {
    const warmStop = Date.now() + warmupMs;
    const warmWorker = async (index) => {
      let cursor = index % schedule.length;
      while (Date.now() < warmStop) {
        const scenario = schedule[cursor % schedule.length];
        cursor += 1;
        await client.request({
          method: scenario.method ?? "GET",
          path: prefixPath(prefix, scenario),
          headers: scenario.headers,
          body: scenario.body,
        });
      }
    };
    await Promise.all(Array.from({ length: Math.max(1, Math.floor(concurrency / 2)) }, (_, i) => warmWorker(i)));
  }

  const started = Date.now();
  stopAt = started + durationMs;
  await Promise.all(Array.from({ length: concurrency }, (_, i) => worker(i)));
  const wallMs = Date.now() - started;

  if (fatal.code) {
    const error = new Error(
      `target stopped accepting connections (${fatal.code}: ${fatal.message}) ` +
        `after ${wallMs} ms - is the server running?`,
    );
    error.fatal = true;
    throw error;
  }

  return { stats, wallMs };
}

/** Replay the marketing-site journey step by step. */
async function runJourney({ client, concurrency, repeats, prefix }) {
  const perStep = new Map(
    USER_JOURNEY.steps.map((step) => [
      step.id,
      { step, samples: [], ttfbSamples: [], coldSamples: [], warmSamples: [], statuses: new Map(), errors: [], freshSockets: 0 },
    ]),
  );
  const journeys = [];
  const wallStart = Date.now();

  const worker = async (index) => {
    for (let i = index; i < repeats; i += concurrency) {
      const journeyStart = Date.now();
      let failed = false;
      for (const step of USER_JOURNEY.steps) {
        const result = await client.request({
          method: step.method ?? "GET",
          path: prefixPath(prefix, step),
          headers: step.headers,
          body: step.body,
        });
        const bucket = perStep.get(step.id);
        const expected = defaultExpectation(step);
        bucket.samples.push(result.ms);
        bucket.ttfbSamples.push(result.ttfbMs ?? result.ms);
        bucket.statuses.set(result.status, (bucket.statuses.get(result.status) ?? 0) + 1);
        if (result.reusedSocket === false) {
          bucket.freshSockets += 1;
          bucket.coldSamples.push(result.ms);
        } else {
          bucket.warmSamples.push(result.ms);
        }
        if (result.error !== undefined || !expected.includes(result.status)) {
          failed = true;
          if (bucket.errors.length < 10) bucket.errors.push(result.error ?? `HTTP ${result.status}`);
        }
      }
      journeys.push({ ms: Date.now() - journeyStart, failed });
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, (_, i) => worker(i)));

  return {
    perStep: [...perStep.values()],
    journeys,
    wallMs: Date.now() - wallStart,
  };
}

function summarizeBuckets(buckets, wallMs) {
  return buckets.map((bucket) => {
    const summary = summarize(bucket.samples, { wallMs });
    const errors = [...bucket.statuses.entries()]
      .filter(([status]) => status === 0 || status >= 400)
      .reduce((acc, [, count]) => acc + count, 0);
    const total = bucket.samples.length || 1;
    return {
      id: bucket.scenario.id,
      description: bucket.scenario.description,
      path: bucket.scenario.path,
      method: bucket.scenario.method ?? "GET",
      statuses: Object.fromEntries([...bucket.statuses.entries()].sort((a, b) => a[0] - b[0])),
      bytes: bucket.bytes,
      errors: bucket.errors,
      errorRate: errors / total,
      // A sample that had to open a new TCP/TLS socket is not pure server time.
      // Tracking it per scenario is how we tell "Next.js is slow" apart from
      // "the connection was torn down and re-handshaked".
      freshSocketRate: bucket.freshSockets / total,
      freshSockets: bucket.freshSockets,
      cold: bucket.coldSamples?.length ? summarize(bucket.coldSamples) : null,
      warm: bucket.warmSamples?.length ? summarize(bucket.warmSamples) : null,
      ttfb: bucket.ttfbSamples?.length ? summarize(bucket.ttfbSamples) : null,
      summary,
      checks: evaluateBudget(summary, bucket.scenario.budget ?? {}, { errorRate: errors / total }),
      samples: bucket.samples.map((ms) => Math.round(ms * 100) / 100),
    };
  });
}

function printTable(rows, { quiet, latencyEnforced = true }) {
  if (quiet) return;
  const header = ["scenario", "reqs", "rps", "p50", "p95", "p99", "ttfb95", "max", "err", "new%", "result"];
  const widths = header.map((h) => h.length);
  const body = rows.map((row) => {
    const verdict = budgetPassed(row.checks)
      ? "PASS"
      : latencyEnforced
        ? "FAIL"
        : "over*";
    return [
      row.id,
      String(row.summary.count),
      row.summary.rps.toFixed(1),
      formatMs(row.summary.p50),
      formatMs(row.summary.p95),
      formatMs(row.summary.p99),
      formatMs(row.ttfb?.p95 ?? row.summary.p95),
      formatMs(row.summary.max),
      formatPct(row.errorRate),
      formatPct(row.freshSocketRate ?? 0),
      verdict,
    ];
  });
  for (const line of body) {
    line.forEach((cell, i) => {
      widths[i] = Math.max(widths[i], cell.length);
    });
  }
  const render = (line) => line.map((cell, i) => cell.padEnd(widths[i])).join("  ");
  process.stdout.write(`${render(header)}\n`);
  process.stdout.write(`${widths.map((w) => "-".repeat(w)).join("  ")}\n`);
  for (const line of body) process.stdout.write(`${render(line)}\n`);
  if (!latencyEnforced && body.some((line) => line[line.length - 1] === "over*")) {
    process.stdout.write(
      `\n* over budget but not enforced by this run - latency is reported only (see the Budgets row).\n`,
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const profile = PROFILES[args.profile];
  const concurrency = args.concurrency ?? profile.concurrency;
  const durationMs = args.durationMs ?? profile.durationMs;
  // An error rate over budget is always fatal - a 5xx is a bug, not noise.
  // A latency budget is only enforced where the window is long enough to be a
  // meaningful p95 (see PROFILES.smoke.gatesLatency), and `--no-latency-gate`
  // downgrades it further for a shared CI runner whose TTFB varies by seconds.
  const latencyEnforced = args.gateLatency ?? profile.gatesLatency !== false;
  const { host, local } = assertSafeTarget(args, AGGRESSIVE_PROFILES);

  const scenarios = buildScenarios();
  const client = createClient(args.target, { maxSockets: Math.max(concurrency + 8, 32) });

  process.stdout.write(
    [
      `BizFlow perf harness`,
      `  target      ${args.target}${args.pathPrefix}`,
      `  profile     ${args.profile} - ${profile.description}`,
      `  concurrency ${concurrency} workers`,
      `  duration    ${(durationMs / 1000).toFixed(0)}s (+${(profile.warmupMs / 1000).toFixed(0)}s warm-up)`,
      `  host        ${host}${local ? " (local)" : " (remote, read-only workload)"}`,
      "",
    ].join("\n"),
  );

  const schedule = buildSchedule(scenarios);
  const probe = await probeTarget({ client, schedule, prefix: args.pathPrefix });
  if (!probe.reachable) {
    const transportError = probe.result.error !== undefined;
    const detail = transportError
      ? `${probe.result.errorCode ?? "transport error"}: ${probe.result.error}`
      : `HTTP ${probe.result.status} on ${probe.first.path}`;
    // Distinguish "no socket" from "a socket, but the wrong answer": the first
    // means nothing is listening, the second means something is and it is
    // unhealthy, which is a different thing to go and look at.
    const headline = transportError
      ? `${args.target} is unreachable`
      : `${args.target} answered unexpectedly`;
    throw Object.assign(new Error(`${headline} (${detail}).`), { fatal: true });
  }
  process.stdout.write(
    `  probe       ${probe.first.method ?? "GET"} ${prefixPath(args.pathPrefix, probe.first)} -> ${probe.result.status} (${probe.result.ms.toFixed(0)} ms)\n\n`,
  );

  const { stats, wallMs } = await runClosedLoop({
    client,
    schedule,
    concurrency,
    durationMs,
    warmupMs: profile.warmupMs,
    rampMs: profile.rampMs,
    prefix: args.pathPrefix,
  });

  const rows = summarizeBuckets([...stats.values()], wallMs);
  rows.sort((a, b) => b.summary.p95 - a.summary.p95);
  printTable(rows, { ...args, latencyEnforced });

  let journeyRows = [];
  let journeySummary = null;
  if (!args.skipJourney) {
    const journey = await runJourney({
      client,
      concurrency: Math.max(1, Math.min(4, Math.floor(concurrency / 4) || 1)),
      repeats: args.journeyRepeats,
      prefix: args.pathPrefix,
    });
    journeySummary = summarize(
      journey.journeys.map((item) => item.ms),
      { wallMs: journey.wallMs },
    );
    const failed = journey.journeys.filter((item) => item.failed).length;
    journeySummary.errorRate = journey.journeys.length ? failed / journey.journeys.length : 0;
    journeySummary.checks = evaluateBudget(
      journeySummary,
      USER_JOURNEY.budget,
      { errorRate: journeySummary.errorRate },
    );
    journeyRows = summarizeBuckets(
      journey.perStep.map(
        ({ step, samples, ttfbSamples, coldSamples, warmSamples, statuses, errors, freshSockets }) => ({
          scenario: step,
          samples,
          ttfbSamples,
          coldSamples,
          warmSamples,
          statuses,
          errors,
          freshSockets,
        }),
      ),
      journey.wallMs,
    );
    journeyRows.sort((a, b) => b.summary.p95 - a.summary.p95);
    if (!args.quiet) {
      process.stdout.write(`\nUser journey (${journey.journeys.length} full replays)\n`);
      process.stdout.write(
        `  end-to-end p50 ${formatMs(journeySummary.p50)}  p95 ${formatMs(journeySummary.p95)}  p99 ${formatMs(journeySummary.p99)}\n\n`,
      );
      printTable(journeyRows, args);
    }
  }

  const allRows = [...rows, ...journeyRows];
  // Connection accounting: a measured request that had to build a fresh
  // socket includes a TCP (and usually TLS) handshake, so it is not server
  // time. Reporting the share of such requests is what makes a latency number
  // interpretable instead of mysterious.
  const socketStats = client.connectionStats();
  const handshakes = summarize(socketStats.connectSamples);
  const measuredRequests = allRows.reduce((acc, row) => acc + row.summary.count, 0);
  const freshSockets = allRows.reduce((acc, row) => acc + (row.freshSockets ?? 0), 0);
  const freshSocketRate = measuredRequests > 0 ? freshSockets / measuredRequests : 0;
  // An error rate over budget is always fatal - a 5xx is a bug, not noise.
  // A latency budget is only enforced where the run is long enough to measure
  // latency: a 10 s run with no warm-up measures the client's DNS/TCP/TLS
  // start-up far more than the server.
  const failingChecks = (checks) =>
    (checks ?? []).filter((check) => !check.ok && (latencyEnforced || check.metric === "errorRate"));
  const overBudget = latencyEnforced
    ? []
    : rows.filter(
        (row) =>
          failingChecks(row.checks).length === 0 &&
          (row.checks ?? []).some((check) => !check.ok && check.metric !== "errorRate"),
      );
  const failed = [
    ...rows.filter((row) => failingChecks(row.checks).length > 0),
    ...(journeySummary && failingChecks(journeySummary.checks).length > 0
      ? [
          {
            id: USER_JOURNEY.id,
            description: "full user journey (end-to-end)",
            path: "multi-step",
            method: "MIXED",
            statuses: {},
            bytes: 0,
            errors: [],
            errorRate: journeySummary.errorRate,
            summary: journeySummary,
            checks: journeySummary.checks,
          },
        ]
      : []),
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    kind: "http",
    title: "BizFlow website / demo HTTP load test",
    metadata: [
      ["Target", `${args.target}${args.pathPrefix}`],
      ["Profile", `${args.profile} - ${profile.description}`],
      ["Concurrency", `${concurrency} closed-loop workers`],
      ["Duration", `${(durationMs / 1000).toFixed(0)}s measured, ${(profile.warmupMs / 1000).toFixed(0)}s warm-up`],
      ["Host", `${host}${local ? " (local)" : " (remote)"}`],
      ["Workload", "read-only (GET pages/APIs + licence revalidation read path)"],
      [
        "Budgets",
        latencyEnforced
          ? "enforced (p95/p99 + error rate)"
          : `latency reported only${args.gateLatency === false ? " (--no-latency-gate)" : ` (${args.profile} is too short to gate)`}; error rate still enforced`,
      ],
      [
        "Sockets",
        `${socketStats.newSockets} new TCP/TLS socket(s), handshake p50 ${formatMs(handshakes.p50)} / mean ${formatMs(handshakes.mean)}`,
      ],
      ["Fresh sockets", `${formatPct(freshSocketRate)} of measured requests`],
      ["Percentiles", "linear interpolation (PERCENTILE.INC)"],
    ],
    target: args.target,
    pathPrefix: args.pathPrefix,
    profile: args.profile,
    label: args.label,
    concurrency,
    durationMs,
    wallMs,
    host,
    local,
    connections: {
      newSockets: socketStats.newSockets,
      handshakeP50Ms: handshakes.p50,
      handshakeMeanMs: handshakes.mean,
      freshSockets,
      measuredRequests,
      freshSocketRate,
    },
    rows,
    journey: journeySummary ? { ...journeySummary, steps: journeyRows } : null,
    journeys: journeySummary
      ? [
          {
            id: USER_JOURNEY.id,
            description: "End-to-end user journey: demo -> evaluate -> download -> licence -> activate",
            summary: journeySummary,
            errorRate: journeySummary.errorRate,
            steps: journeyRows,
          },
        ]
      : [],
    failures: failed.map((row) => ({ id: row.id, checks: row.checks.filter((c) => !c.ok) })),
    notes: [
      "Every request in this run is read-only. Write endpoints (licence request, custom-feature request, checkout, download build) are deliberately never generated.",
      "Percentiles use linear interpolation over all recorded samples; `max` is the slowest single request seen.",
      "Keep-alive is on; the `new%` column is the share of measured requests that nonetheless had to open a fresh TCP/TLS socket, and those samples include the handshake cost.",
      ...(latencyEnforced
        ? []
        : [
            `Latency budgets are reported, not enforced, in this run${
              args.gateLatency === false
                ? " because `--no-latency-gate` was passed (a shared CI runner's DNS/TCP/TLS start-up varies by seconds)"
                : ` because the ${args.profile} profile (${(durationMs / 1000).toFixed(0)}s, ${(profile.warmupMs / 1000).toFixed(0)}s warm-up) is too short: the first requests of a run pay the client's own DNS/TCP/TLS start-up`
            }. Latency breaches below are informational; the exit code reflects errors and transport failures only.`,
          ]),
    ],
  };

  fs.mkdirSync(args.out, { recursive: true });
  const label = args.label ?? `${new URL(args.target).hostname}-${args.profile}`;
  const slug = slugify(label);
  const jsonPath = path.join(args.out, `http-${slug}.json`);
  const mdPath = path.join(args.out, `http-${slug}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(mdPath, renderMarkdown(report), "utf8");

  if (!args.quiet) {
    process.stdout.write(`\nJSON ${path.relative(REPO_ROOT, jsonPath)}\n`);
    process.stdout.write(`Markdown ${path.relative(REPO_ROOT, mdPath)}\n`);
    if (overBudget.length > 0) {
      process.stdout.write(
        `\n${overBudget.length} scenario(s) over budget but not enforced by this run${args.gateLatency === false ? " (--no-latency-gate)" : ` (the ${args.profile} profile does not gate latency)`}:\n`,
      );
      for (const row of overBudget) {
        for (const check of row.checks.filter((c) => !c.ok && c.metric !== "errorRate")) {
          process.stdout.write(`  - ${row.id}: ${check.metric} ${formatMs(check.actual)} vs ${formatMs(check.limit)}\n`);
        }
      }
    }
    if (failed.length > 0) {
      process.stdout.write(`\n${failed.length} scenario(s) over budget:\n`);
      for (const row of failed) {
        for (const check of failingChecks(row.checks)) {
          const unit = check.metric === "errorRate" ? formatPct(check.actual) : formatMs(check.actual);
          const limit =
            check.metric === "errorRate" ? formatPct(check.limit) : formatMs(check.limit);
          process.stdout.write(`  - ${row.id}: ${check.metric} ${unit} vs budget ${limit}\n`);
        }
      }
    }
  }

  client.close();
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((error) => {
  // A fatal target problem is an operational error, not a stack trace: say what
  // is wrong in one line and exit 2 so CI can tell it apart from a budget breach.
  if (error?.fatal) {
    process.stderr.write(`\ncannot run: ${error.message}\n`);
    process.exit(2);
  }
  process.stderr.write(`\nperf harness failed: ${error?.stack ?? error}\n`);
  process.exit(2);
});
