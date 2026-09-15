import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The deploy that shipped a stale landing page was green the whole time.
 *
 * `.github/workflows/deploy.yml` synced an allow-list of paths, the list drifted,
 * and 75 tracked files - the entire top-level `apps/website/src/app`, including
 * the landing page and the rebuilt /account dashboard - were never copied to the
 * VPS. The image was then rebuilt from the files that *were* there, and the smoke
 * test passed anyway because it only checked HTTP status codes. Nothing about
 * that is a type error, so the guarantee has to come from scanning the artifacts
 * themselves: the sync has to archive the committed tree instead of listing
 * paths, it has to refuse an incomplete payload, and the smoke test has to check
 * the running build against the commit being deployed.
 *
 * `/api/version` is the endpoint that makes that last check possible, and its
 * value only means anything if it is inlined at image build time - so the whole
 * chain is asserted here: workflow argument -> compose build arg -> Dockerfile
 * ENV -> next.config `env` -> route.
 *
 * The second half of this file guards the shape of the remote commands. The
 * apply step used to hand ssh one enormous double-quoted body, and bash expands
 * backticks inside double quotes *on the runner* - so two backticks in that
 * body's comments ran on the runner (`cp: missing file operand`, then the bare
 * word env, which pulled the whole environment into the remote script and
 * killed the run with exit 127). The body now travels as a tracked script over
 * stdin, and the rule that keeps it that way is asserted directly: no quoted
 * string in the workflow may span more than one line.
 */

const ROOT = path.join(__dirname, "..", "..", "..");

function read(...segments: string[]): string {
  return fs.readFileSync(path.join(ROOT, ...segments), "utf8");
}

/**
 * Lines on which a double-quoted string is still open when the line ends.
 *
 * A quoted body that survives to the next line is what let the runner's bash
 * expand the remote command - backticks and `$(...)` included - before ssh ran.
 * Callers that pass ssh a body now pipe a file instead, which leaves only short
 * single-line argument lists inside quotes.
 */
function linesWithUnclosedQuote(script: string): string[] {
  return script.split(/\r?\n/).filter((line) => {
    let depth = 0;
    for (let i = 0; i < line.length; i += 1) {
      if (line[i] === "\\") {
        i += 1;
      } else if (line[i] === '"') {
        depth += 1;
      }
    }
    return depth % 2 === 1;
  });
}

/**
 * The text of the script as bash sees it, with backslash continuations joined.
 *
 * Steps wrap long `ssh` invocations across lines for readability, which splits a
 * single command over several lines of the file. Matching the raw file text would
 * only assert the wrapping, not the command.
 */
function joined(script: string): string {
  return script.replace(/\\\r?\n\s*/g, " ");
}

describe("the build stamp answers where a running image came from", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reports the commit compiled into the image", async () => {
    vi.stubEnv("BUILD_COMMIT", "abc1234");

    const { GET } = await import("@/app/api/version/route");
    const body = await (await GET()).json();

    expect(body.ok).toBe(true);
    expect(body.commit).toBe("abc1234");
  });

  it("admits it does not know rather than claiming a commit", async () => {
    delete process.env.BUILD_COMMIT;

    const { GET } = await import("@/app/api/version/route");
    const body = await (await GET()).json();

    // The smoke test compares this against the pushed SHA, so "unknown" fails a
    // deploy instead of passing as a plausible-looking value.
    expect(body.commit).toBe("unknown");
  });
});

describe("the deploy syncs the committed tree instead of a path list", () => {
  const workflow = read(".github", "workflows", "deploy.yml");

  it("archives HEAD rather than enumerating paths", () => {
    expect(workflow).toContain("git archive --format=tar HEAD");
    // The allow-list is the bug. Any reintroduction of it is what this catches.
    expect(workflow).not.toMatch(/^\s*PATHS=\(/m);
  });

  it("fails the run when the payload arrives incomplete", () => {
    expect(workflow).toContain("git ls-files | wc -l");
    expect(workflow).toMatch(/expected=\$\(git ls-files/);
    expect(workflow).toMatch(/actual=\$\(\$SSH \$REMOTE "find \$BASE -type f \| wc -l"\)/);
    expect(workflow).toMatch(/if \[ "\$actual" != "\$expected" \]/);
  });

  it("clears the website source so a deleted route cannot keep being served", () => {
    const script = read("scripts", "apply-deploy.sh");

    expect(script).toMatch(/rm -rf apps\/website\/src apps\/website\/tests\n/);
    expect(script).toContain('cp -a "$PAYLOAD_DIR/." .');
    // Clearing the trees before discovering the payload is missing would leave
    // the checkout unusable until the next sync, so the check comes first.
    expect(script).toMatch(/\[ ! -d "\$PAYLOAD_DIR" \]/);
    expect(script.indexOf('[ ! -d "$PAYLOAD_DIR" ]')).toBeLessThan(
      script.indexOf("rm -rf apps/website/src")
    );
  });

  it("refuses an image that does not name the pushed commit", () => {
    expect(workflow).toContain('check "$BASE/api/version"');
    expect(workflow).toContain('running=$(curl -s "$BASE/api/version"');
    expect(workflow).toMatch(/if \[ "\$running" != "\$\{\{ github\.sha \}\}" \]/);
  });
});

describe("the remote bodies are shipped as scripts instead of quoted into ssh", () => {
  const workflow = read(".github", "workflows", "deploy.yml");

  it("never lets a quoted string span lines, where the runner would expand it", () => {
    // The bug this replaces: `ssh host "…"` with a multi-line body, whose
    // backticks bash expanded on the runner. Nothing inside a single-line quote
    // can reach a second line's worth of remote script.
    expect(linesWithUnclosedQuote(workflow)).toEqual([]);
  });

  it("applies the payload by piping the script in with the commit as its argument", () => {
    expect(joined(workflow)).toMatch(
      /ssh [^\n]*"bash -s -- '\$\{\{ github\.sha \}\}'"\s+< scripts\/apply-deploy\.sh/
    );
  });

  it("rolls back by piping a script in too", () => {
    expect(joined(workflow)).toMatch(/ssh [^\n]*'bash -s'\s+< scripts\/rollback-deploy\.sh/);

    const script = read("scripts", "rollback-deploy.sh");
    expect(script).toContain("docker compose up -d --no-build --force-recreate bizflow-app");
    expect(script).toContain("ROLLBACK_STATUS=");
    // Pointless rollback if the previous tag would be replaced by the same image.
    expect(script).toContain("if ! docker image inspect bizflow-bizflow-app:previous");
  });

  it("runs the script somewhere other than the VPS under APP_DIR/PAYLOAD_DIR", () => {
    // These overrides are what make the script exercisable in a scratch
    // directory with docker stubbed, which is how it is tested off the VPS.
    const script = read("scripts", "apply-deploy.sh");

    expect(script).toContain('APP_DIR="${APP_DIR:-/home/medhat/bizflow}"');
    expect(script).toContain('PAYLOAD_DIR="${PAYLOAD_DIR:-/tmp/bizflow-ci-deploy}"');
    expect(script).toContain("set -euo pipefail");
    // Traces name the file and line, which the inline form never could.
    expect(script).toContain("PS4='+ ${SCRIPT_NAME##*/}:${LINENO}: '");
  });

  it("does not let an unset BASH_SOURCE abort the remote script", () => {
    // The workflow runs these with `bash -s`, and BASH_SOURCE is only set when
    // bash executes a file - not when it reads the script from stdin. The first
    // version expanded it bare in PS4 and died on the VPS with
    // "BASH_SOURCE: unbound variable", under `set -u`, before doing any work.
    for (const name of ["apply-deploy.sh", "rollback-deploy.sh"]) {
      const script = read("scripts", name);

      expect(script).toContain(`\${BASH_SOURCE[0]:-${name}}`);
      expect(script).not.toMatch(/\$\{BASH_SOURCE##/);
    }
  });

  it("keeps a harness that runs both bodies through the stdin transport", () => {
    // The stdin-only failure above got through because the scripts were
    // verified as files. The harness has to keep feeding them the way the
    // workflow does, and it has to keep docker unreachable so it can never
    // touch a real container.
    const harness = read("scripts", "selftest-deploy-scripts.sh");

    expect(harness).toContain('timeout 30 bash -s -- deadbeef < "$APPLY"');
    expect(harness).toContain('timeout 60 bash -s < "$APPLY"');
    expect(harness).toContain('timeout 60 bash -s < "$ROLLBACK"');
    // Five bounded stdin runs: missing payload, the real apply, the env
    // fallback, and both rollback cases - plus the file-mode run in section E.
    expect(harness.match(/timeout \d+ bash -s/g) ?? []).toHaveLength(5);
    expect(harness).toContain('RUNPATH="$WORK/bin:/usr/bin:/bin"');
    expect(harness).toContain("no BASH_SOURCE failure under bash -s");
    expect(harness).toContain("PAYLOAD_DIR=");
    expect(harness).toContain("APP_DIR=");
  });
});

describe("the commit reaches the bundle through the image build", () => {
  it("is exported by the deploy script before the compose build", () => {
    const script = read("scripts", "apply-deploy.sh");

    // The argument the workflow passes in becomes the build stamp.
    expect(script).toMatch(/commit="\$\{1:-\$\{BUILD_COMMIT:-unknown\}\}"/);
    expect(script).toContain('export BUILD_COMMIT="$commit"');
    // Ordering matters: compose interpolates the arg from the shell environment,
    // so the export has to happen before `docker compose up -d --build`.
    expect(script.indexOf('export BUILD_COMMIT="$commit"')).toBeLessThan(
      script.indexOf("docker compose up -d --build")
    );
  });

  it("is declared as a compose build arg and forwarded into the image", () => {
    const compose = read("docker-compose.yml");
    const dockerfile = read("Dockerfile");

    expect(compose).toMatch(/BUILD_COMMIT: \$\{BUILD_COMMIT:-unknown\}/);
    expect(dockerfile).toMatch(/^ARG BUILD_COMMIT=/m);
    expect(dockerfile).toMatch(/BUILD_COMMIT=\$\{BUILD_COMMIT\}/);
    // The builder stage is where `next build` runs, so the ENV has to precede it.
    expect(dockerfile.indexOf("BUILD_COMMIT=${BUILD_COMMIT}")).toBeLessThan(
      dockerfile.indexOf("RUN npm run build:site")
    );
  });

  it("is inlined at build time rather than read from the runtime environment", () => {
    const nextConfig = read("apps", "website", "next.config.ts");

    expect(nextConfig).toMatch(/env:\s*\{\s*BUILD_COMMIT: process\.env\.BUILD_COMMIT \?\? "unknown",?\s*\}/);
  });
});
