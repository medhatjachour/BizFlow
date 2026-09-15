import { NextResponse } from "next/server";

/**
 * Deploy provenance.
 *
 * The deploy workflow's smoke test calls this and refuses to pass unless the
 * running container names the commit that was pushed. That check exists because
 * the smoke test used to verify status codes only, and those cannot tell a fresh
 * image from one rebuilt out of stale sources: a landing page missing its newest
 * section answered every check correctly, and the drift sat in production for
 * several deploys (see the "Sync files to VPS" step in deploy.yml).
 *
 * `BUILD_COMMIT` is inlined at build time by `next.config.ts` from the Docker
 * build arg of the same name, so it is a property of the image, not of whatever
 * environment the container is later started with - an old image cannot claim to
 * be a new build. `"unknown"` is answered honestly for a hand-built image.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "bizflow-website",
    commit: process.env.BUILD_COMMIT ?? "unknown",
  });
}
