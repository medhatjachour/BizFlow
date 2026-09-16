/**
 * Report rendering shared by the HTTP harness and the desktop benchmark.
 *
 * Both producers hand over the same shape - a header of metadata plus rows that
 * carry `summary` (from lib/stats.mjs) and `checks` - so a single renderer
 * keeps the numbers comparable between "the website under load" and "the
 * desktop app on a real database".
 */

import { formatMs, formatPct } from "./stats.mjs";

const SPARK = [" ", ".", ":", "-", "=", "+", "*", "#", "%", "@"];

/** A tiny inline bar so a p95 column is readable at a glance. */
function bar(value, max) {
  if (!Number.isFinite(value) || max <= 0) return "";
  const slots = Math.min(SPARK.length - 1, Math.round((value / max) * SPARK.length));
  return SPARK[Math.max(0, slots)].repeat(Math.max(1, slots));
}

/**
 * @param {{
 *   kind: string,
 *   generatedAt: string,
 *   title?: string,
 *   metadata: Array<[string, string]>,
 *   rows: Array<{ id: string, description?: string, path?: string, method?: string,
 *                 statuses?: Record<string, number>, bytes?: number, errorRate?: number,
 *                 summary: object, checks?: Array<object> }>,
 *   journeys?: Array<{ id: string, description?: string, summary: object, checks?: Array<object>, steps?: Array<object> }>,
 *   notes?: string[],
 *   failures?: Array<{ id: string, checks: Array<object> }>,
 * }} report
 */
export function renderMarkdown(report) {
  const lines = [];
  lines.push(`# ${report.title ?? "BizFlow performance report"}`);
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push("");
  for (const [key, value] of report.metadata) {
    lines.push(`- **${key}:** ${value}`);
  }
  lines.push("");

  const rows = report.rows ?? [];
  const maxP95 = Math.max(1, ...rows.map((row) => row.summary.p95));
  // The desktop benchmark identifies rows by workload id and needs a
  // human-readable description column; the HTTP harness encodes everything in
  // the scenario id, so the column only appears when a row provides one.
  const showDescription = rows.some((row) => row.description);
  // Rows with a cold/warm split came from a run where some requests had to
  // open a fresh socket. Showing both makes the difference between "the server
  // is slow" and "the connection setup is slow" readable in the report.
  const showConnectionSplit = rows.some((row) => row.cold);
  // Server think time: rows produced by the HTTP harness carry a TTFB summary,
  // which separates "the server took a second to answer" from "the response
  // body was slow to arrive".
  const showTtfb = rows.some((row) => row.ttfb);
  lines.push("## Scenarios");
  lines.push("");
  lines.push(
    "The bar beside **p95** is a relative scale against the slowest scenario in this table, " +
      "so the shape of the row is readable at a glance; the budget verdict is the `Result` column.",
  );
  lines.push("");
  const header = ["Scenario"];
  if (showDescription) header.push("Workload");
  header.push("Requests", "RPS", "p50", "p75", "p90", "p95", "p99", "max");
  if (showTtfb) header.push("TTFB p95");
  if (showConnectionSplit) header.push("cold p95", "warm p95");
  header.push("Errors", "Result");
  const align = ["---"];
  if (showDescription) align.push("---");
  align.push(...Array.from({ length: 8 }, () => "---:"));
  if (showTtfb) align.push("---:");
  if (showConnectionSplit) align.push("---:", "---:");
  align.push("---:", "---");
  lines.push(`| ${header.join(" | ")} |`);
  lines.push(`|${align.join("|")}|`);
  for (const row of rows) {
    const cells = [`\`${row.id}\``];
    if (showDescription) cells.push(row.description ?? "");
    cells.push(
      String(row.summary.count),
      row.summary.rps.toFixed(1),
      formatMs(row.summary.p50),
      formatMs(row.summary.p75),
      formatMs(row.summary.p90),
      `**${formatMs(row.summary.p95)}** ${bar(row.summary.p95, maxP95)}`,
      formatMs(row.summary.p99),
      formatMs(row.summary.max),
    );
    if (showTtfb) cells.push(row.ttfb ? formatMs(row.ttfb.p95) : "-");
    if (showConnectionSplit) {
      cells.push(row.cold ? formatMs(row.cold.p95) : "-", row.warm ? formatMs(row.warm.p95) : "-");
    }
    cells.push(formatPct(row.errorRate ?? 0), row.checks && !allPassed(row.checks) ? "FAIL" : "PASS");
    lines.push(`| ${cells.join(" | ")} |`);
  }
  lines.push("");

  if (rows.some((row) => row.path)) {
    const showFresh = rows.some((row) => row.freshSocketRate !== undefined);
    lines.push("### Request detail");
    lines.push("");
    lines.push(`| Scenario | Method | Path | Statuses | Bytes (avg) |${showFresh ? " New sockets |" : ""}`);
    lines.push(`|---|---|---|---|---:|${showFresh ? "---:|" : ""}`);
    for (const row of rows) {
      const statuses = Object.entries(row.statuses ?? {})
        .map(([code, count]) => `${code}x${count}`)
        .join(", ");
      const avgBytes = row.summary.count > 0 ? Math.round((row.bytes ?? 0) / row.summary.count) : 0;
      const fresh = showFresh
        ? ` ${row.freshSockets ?? 0} / ${row.summary.count} (${formatPct(row.freshSocketRate ?? 0)}) |`
        : "";
      lines.push(
        `| \`${row.id}\` | ${row.method ?? "GET"} | \`${row.path ?? ""}\` | ${statuses} | ${avgBytes} |${fresh}`,
      );
    }
    lines.push("");
  }

  for (const journey of report.journeys ?? []) {
    lines.push(`## ${journey.description ?? journey.id}`);
    lines.push("");
    lines.push(
      `End-to-end: ${journey.summary.count} replays, p50 ${formatMs(journey.summary.p50)}, ` +
        `**p95 ${formatMs(journey.summary.p95)}**, p99 ${formatMs(journey.summary.p99)}, ` +
        `max ${formatMs(journey.summary.max)}, errors ${formatPct(journey.errorRate ?? 0)}.`,
    );
    lines.push("");
    if (journey.steps?.length) {
      lines.push("| Step | Requests | p50 | p95 | p99 | Errors |");
      lines.push("|---|---:|---:|---:|---:|---:|");
      for (const step of journey.steps) {
        lines.push(
          `| \`${step.id}\` | ${step.summary.count} | ${formatMs(step.summary.p50)} | ${formatMs(
            step.summary.p95,
          )} | ${formatMs(step.summary.p99)} | ${formatPct(step.errorRate ?? 0)} |`,
        );
      }
      lines.push("");
    }
  }

  if (report.groups?.length) {
    lines.push("## Group roll-up");
    lines.push("");
    lines.push("| Group | Requests | p95 | p99 | Errors |");
    lines.push("|---|---:|---:|---:|---:|");
    for (const group of report.groups) {
      lines.push(
        `| ${group.name} | ${group.summary.count} | ${formatMs(group.summary.p95)} | ${formatMs(
          group.summary.p99,
        )} | ${formatPct(group.errorRate ?? 0)} |`,
      );
    }
    lines.push("");
  }

  const failures = report.failures ?? [];
  if (failures.length > 0) {
    lines.push("## Budget breaches");
    lines.push("");
    for (const failure of failures) {
      for (const check of failure.checks) {
        lines.push(
          `- \`${failure.id}\`: ${check.metric} was ${check.actual.toFixed(2)} against a limit of ${check.limit}`,
        );
      }
    }
    lines.push("");
  } else if (rows.length > 0) {
    lines.push("All scenarios stayed inside their budgets.");
    lines.push("");
  }

  if (report.notes?.length) {
    lines.push("## Notes");
    lines.push("");
    for (const note of report.notes) lines.push(`- ${note}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

export function allPassed(checks) {
  return checks.every((check) => check.ok);
}

/** Console one-liner used by the desktop benchmark between phases. */
export function printRow(row) {
  const errors = row.errorRate > 0 ? `  err=${formatPct(row.errorRate)}` : "";
  return `${row.id.padEnd(38)} p50 ${formatMs(row.summary.p50).padStart(9)}  p95 ${formatMs(
    row.summary.p95,
  ).padStart(9)}  p99 ${formatMs(row.summary.p99).padStart(9)}  n=${row.summary.count}${errors}`;
}
