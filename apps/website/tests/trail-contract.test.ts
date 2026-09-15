import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ACTIVITY_ACTIONS, ACTIVITY_META, activityMeta } from "@/lib/activity-actions";
import { AUDIT_EVENTS, AUDIT_LABELS, auditLabel } from "@/lib/audit-events";

/**
 * Lock the two "write a trail entry" contracts: the order audit trail and the
 * customer activity feed.
 *
 * Both had already drifted silently in production. `AUDIT_LABELS` carried four
 * events that nothing ever wrote and was missing the one event the manual-issue
 * path did write, so the dashboard printed raw event names; and every admin
 * action on a licence (revoke / re-activate / release the device / re-send the
 * key) recorded nothing at all, so an order page showed a revoked licence whose
 * last recorded event was the checkout.
 *
 * Nothing about that is a type error: a `Record<string, ...>` label map accepts
 * any keys, and a missing write is just an absence. So the guarantee has to come
 * from scanning the source the way the licence-certificate contract scans the
 * desktop's interface — a new event or verb that is written without a label, or
 * declared without ever being written, fails here.
 */

const SRC = path.join(__dirname, "..", "src");

/**
 * The module that *defines* `recordAccountActivity`, which the call-site scan
 * would otherwise read as a call whose second argument is `action: string`.
 */
const ACTIVITY_DEFINITION_FILE = path.join("lib", "account-auth.ts");

function sourceFiles(dir = SRC): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/**
 * Splits the argument list of a call starting at the character *after* its `(`.
 *
 * A regex cannot do this: the arguments contain nested calls, ternaries with
 * string literals, and template literals containing `?`/`:` and quotes, all of
 * which an expression-shaped pattern either misses or over-reads.
 */
function callArguments(source: string, openParenIndex: number): string[] {
  const args: string[] = [];
  let current = "";
  let depth = 0;
  let quote: string | null = null;

  for (let i = openParenIndex; i < source.length; i += 1) {
    const char = source[i];

    if (quote) {
      current += char;
      if (char === "\\") {
        current += source[i + 1] ?? "";
        i += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      current += char;
      continue;
    }

    if (char === "(" || char === "[" || char === "{") depth += 1;
    if (char === ")" || char === "]" || char === "}") {
      if (depth === 0 && char === ")") {
        args.push(current.trim());
        break;
      }
      depth -= 1;
    }

    if (char === "," && depth === 0) {
      args.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  return args;
}

/** Every `callee(...)` argument list in `src`, tagged with the file it came from. */
function callSites(callee: string): { file: string; args: string[] }[] {
  const pattern = new RegExp(`${callee.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\(`, "g");

  return sourceFiles().flatMap((file) => {
    const relative = path.relative(SRC, file);
    if (relative === ACTIVITY_DEFINITION_FILE && callee === "recordAccountActivity") return [];

    const source = fs.readFileSync(file, "utf8");
    return [...source.matchAll(pattern)].map((match) => ({
      file: relative,
      args: callArguments(source, match.index + match[0].length),
    }));
  });
}

/** Same scanner as `callArguments`, for splitting one expression on a top-level separator. */
function splitTopLevel(expression: string, separator: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  let quote: string | null = null;

  for (let i = 0; i < expression.length; i += 1) {
    const char = expression[i];

    if (quote) {
      current += char;
      if (char === "\\") {
        current += expression[i + 1] ?? "";
        i += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      current += char;
      continue;
    }

    if (char === "(" || char === "[" || char === "{") depth += 1;
    if (char === ")" || char === "]" || char === "}") depth -= 1;

    if (char === separator && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  parts.push(current.trim());
  return parts;
}

/**
 * The possible values of an expression passed where a verb is expected: a plain
 * reference, or the two branches of a ternary such as
 * `status === "SUSPENDED" ? ACTIVITY_ACTIONS.accountSuspended : ACTIVITY_ACTIONS.accountReactivated`.
 */
function verbBranches(expression: string): string[] {
  const [condition, ...rest] = splitTopLevel(expression, "?");
  if (rest.length === 0) return [condition];

  return splitTopLevel(rest.join("?"), ":");
}

describe("audit event contract", () => {
  it("labels exactly the events that exist, with no orphans on either side", () => {
    const events = Object.values(AUDIT_EVENTS);

    expect(new Set(events).size).toBe(events.length);
    expect(Object.keys(AUDIT_LABELS).sort()).toEqual([...events].sort());
  });

  it("gives every event a distinct, human label", () => {
    const labels = Object.values(AUDIT_LABELS);

    expect(labels.every((label) => label.trim().length > 0)).toBe(true);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels.some((label) => label.includes("."))).toBe(false);
  });

  it("falls back to the raw event name so an unexpected row is still readable", () => {
    expect(auditLabel(AUDIT_EVENTS.licenseRevoked)).toBe("Licence revoked");
    expect(auditLabel("license.something.new")).toBe("license.something.new");
  });

  it("routes every audit write through the contract instead of a raw string", () => {
    const writes = callSites("prisma.orderAudit.create");

    expect(writes.length).toBeGreaterThan(0);
    for (const write of writes) {
      const args = write.args.join(",");
      expect(args, `${write.file} writes an audit event through the contract`).toMatch(
        /event:\s*(AUDIT_EVENTS\.[A-Za-z]+|[A-Za-z_$][\w$]*\.event)/
      );

      // Reading the event out of a shared map is only safe while that map is
      // typed as `AuditEvent`; otherwise the indirection would be a place the
      // contract can be bypassed.
      const indirect = /([A-Za-z_$][\w$]*)\.event/.exec(args);
      if (indirect) {
        expect(fs.readFileSync(path.join(SRC, write.file), "utf8")).toMatch(/event:\s*AuditEvent\b/);
      }
    }
  });

  it("never declares an event that nothing writes", () => {
    const source = sourceFiles()
      .map((file) =>
        path.join(SRC, "lib", "audit-events.ts") === file ? "" : fs.readFileSync(file, "utf8")
      )
      .join("\n");

    for (const [name, value] of Object.entries(AUDIT_EVENTS)) {
      expect(source.includes(`AUDIT_EVENTS.${name}`), `AUDIT_EVENTS.${name} (${value}) is written`).toBe(
        true
      );
    }
  });
});

describe("customer activity contract", () => {
  it("labels exactly the verbs that exist, with no orphans on either side", () => {
    const verbs = Object.values(ACTIVITY_ACTIONS);

    expect(new Set(verbs).size).toBe(verbs.length);
    expect(Object.keys(ACTIVITY_META).sort()).toEqual([...verbs].sort());
  });

  it("falls back to the raw verb rather than printing nothing", () => {
    expect(activityMeta(ACTIVITY_ACTIONS.licenseRevoked)).toEqual({
      label: "Licence revoked",
      tone: "bad",
    });
    expect(activityMeta("some_future_verb")).toEqual({ label: "some_future_verb", tone: "neutral" });
  });

  it("routes every activity write through the contract instead of a raw string", () => {
    const writes = callSites("recordAccountActivity");

    expect(writes.length).toBeGreaterThan(0);
    for (const write of writes) {
      const verb = write.args[1] ?? "";
      for (const branch of verbBranches(verb)) {
        expect(branch, `${write.file} passes an activity verb that is not a raw string`).not.toMatch(
          /^["'`]/
        );
        expect(branch, `${write.file} passes a known activity verb`).toMatch(
          /^(ACTIVITY_ACTIONS\.[A-Za-z]+|[A-Za-z_$][\w$]*\.activity)$/
        );
      }
    }
  });

  it("never declares a verb that nothing writes", () => {
    const source = sourceFiles()
      .map((file) =>
        path.join(SRC, "lib", "activity-actions.ts") === file ? "" : fs.readFileSync(file, "utf8")
      )
      .join("\n");

    for (const [name, value] of Object.entries(ACTIVITY_ACTIONS)) {
      expect(
        source.includes(`ACTIVITY_ACTIONS.${name}`),
        `ACTIVITY_ACTIONS.${name} (${value}) is written`
      ).toBe(true);
    }
  });
});
