import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCOUNT_COOKIE, getAccountFromToken, recordAccountActivity } from "@/lib/account-auth";
import { resolveDownload } from "@/lib/build";
import { OSES, type OSId } from "@/lib/downloads";
import { logEvent, requestIdFromHeaders } from "@/lib/observability";
import { PLUGINS } from "@/lib/plugins";
import { clientKey, consume } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const isOS = (v: string | null): v is OSId => !!v && OSES.some((o) => o.id === v);

/**
 * Only real catalogue ids may be requested.
 *
 * `module` used to be passed through untouched and straight into a GitHub
 * workflow dispatch, so an anonymous caller could ask for any string they liked
 * and burn a CI runner each time. "suite" is the bundle; everything else has to
 * be a plugin we actually ship.
 */
const MODULE_IDS = new Set<string>(["suite", ...PLUGINS.map((p) => p.id)]);

const isModule = (v: string | null): v is string => !!v && MODULE_IDS.has(v);

/** Starting a build is expensive; a real visitor starts a handful at most. */
const BUILD_LIMIT = 10;
const BUILD_WINDOW_MS = 10 * 60 * 1000;

/**
 * GET /api/download?module=<id|suite>&os=<windows|mac|linux>
 * Polls the artifact status WITHOUT triggering a new build. Used by the client
 * to check whether an in-progress build has finished.
 */
export async function GET(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);
  const { searchParams } = new URL(request.url);
  const moduleId = searchParams.get("module") || "suite";
  const os = searchParams.get("os");
  if (!isModule(moduleId)) {
    return NextResponse.json({ error: "Unknown module", requestId }, { status: 400 });
  }
  if (!isOS(os)) {
    return NextResponse.json({ error: "Invalid os", requestId }, { status: 400 });
  }
  const result = await resolveDownload(moduleId, os, { triggerBuild: false });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

/**
 * POST /api/download  { module, os }
 * Resolves the download: returns it if ready, otherwise triggers a server build
 * (when configured) and reports "building" so the client can poll via GET.
 */
export async function POST(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);

  let body: { module?: unknown; os?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON", requestId }, { status: 400 });
  }
  const moduleId = typeof body.module === "string" ? body.module : "suite";
  const os = typeof body.os === "string" ? body.os : null;

  if (!isModule(moduleId)) {
    logEvent("warn", "download_unknown_module", { requestId, moduleId });
    return NextResponse.json({ error: "Unknown module", requestId }, { status: 400 });
  }
  if (!isOS(os)) {
    return NextResponse.json({ error: "Invalid os", requestId }, { status: 400 });
  }

  // This is the path that dispatches a CI build. It had no throttle at all, so
  // an unauthenticated loop could start builds without limit.
  const limit = consume(`download:${clientKey(request)}`, BUILD_LIMIT, BUILD_WINDOW_MS);
  if (!limit.allowed) {
    logEvent("warn", "download_rate_limited", { requestId, moduleId, os });
    return NextResponse.json(
      { error: "Too many download requests. Please wait a few minutes and try again.", requestId },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const accountToken = (await cookies()).get(ACCOUNT_COOKIE)?.value;
  const account = accountToken ? await getAccountFromToken(accountToken) : null;
  if (account) {
    await recordAccountActivity(account.customer.id, "download", `Requested ${moduleId} download for ${os}`);
  }
  const result = await resolveDownload(moduleId, os, { triggerBuild: true });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
