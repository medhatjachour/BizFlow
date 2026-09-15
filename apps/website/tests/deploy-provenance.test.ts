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
 * chain is asserted here: workflow export -> compose build arg -> Dockerfile ENV
 * -> next.config `env` -> route.
 */

const ROOT = path.join(__dirname, "..", "..", "..");

function read(...segments: string[]): string {
  return fs.readFileSync(path.join(ROOT, ...segments), "utf8");
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
    expect(workflow).toMatch(/rm -rf apps\/website\/src apps\/website\/tests\r?\n/);
    expect(workflow).toContain("cp -a /tmp/bizflow-ci-deploy/. .");
  });

  it("refuses an image that does not name the pushed commit", () => {
    expect(workflow).toContain('check "$BASE/api/version"');
    expect(workflow).toContain('running=$(curl -s "$BASE/api/version"');
    expect(workflow).toMatch(/if \[ "\$running" != "\$\{\{ github\.sha \}\}" \]/);
  });
});

describe("the commit reaches the bundle through the image build", () => {
  it("is exported by the deploy workflow before the compose build", () => {
    const workflow = read(".github", "workflows", "deploy.yml");

    expect(workflow).toContain("export BUILD_COMMIT='${{ github.sha }}'");
    // Ordering matters: compose interpolates the arg from the shell environment,
    // so the export has to happen before `docker compose up -d --build`.
    expect(workflow.indexOf("export BUILD_COMMIT=")).toBeLessThan(
      workflow.indexOf("docker compose up -d --build")
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
