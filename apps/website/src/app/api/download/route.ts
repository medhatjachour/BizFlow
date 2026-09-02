import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveDownload } from "@/lib/build";
import { OSES, type OSId } from "@/lib/downloads";
import { ACCOUNT_COOKIE, getAccountFromToken, recordAccountActivity } from "@/lib/account-auth";

export const dynamic = "force-dynamic";

const isOS = (v: string | null): v is OSId => !!v && OSES.some((o) => o.id === v);

/**
 * GET /api/download?module=<id|suite>&os=<windows|mac|linux>
 * Polls the artifact status WITHOUT triggering a new build. Used by the client
 * to check whether an in-progress build has finished.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const moduleId = searchParams.get("module") || "suite";
  const os = searchParams.get("os");
  if (!isOS(os)) {
    return NextResponse.json({ error: "Invalid os" }, { status: 400 });
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
  let body: { module?: unknown; os?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const moduleId = typeof body.module === "string" ? body.module : "suite";
  const os = typeof body.os === "string" ? body.os : null;
  if (!isOS(os)) {
    return NextResponse.json({ error: "Invalid os" }, { status: 400 });
  }
  const accountToken = (await cookies()).get(ACCOUNT_COOKIE)?.value;
  const account = accountToken ? await getAccountFromToken(accountToken) : null;
  if (account) {
    await recordAccountActivity(account.customer.id, "download", `Requested ${moduleId} download for ${os}`);
  }
  const result = await resolveDownload(moduleId, os, { triggerBuild: true });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
