import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { estimate, type EstimateInput } from "@/lib/pricing";
import { requestsEmailTarget, sendRequestEmail } from "@/lib/request-mail";
import { dataDir } from "@/lib/data-dir";
import { cookies } from "next/headers";
import { ACCOUNT_COOKIE, getAccountFromToken, recordAccountActivity } from "@/lib/account-auth";

/**
 * Receives a guest request (module update, new custom plugin, or full suite),
 * validates it, computes a server-side estimate, stores it locally and returns
 * a reference number. Replace the file store with email/CRM in production.
 */
const DATA_DIR = dataDir;
const STORE = path.join(DATA_DIR, "requests.json");

const TYPES = ["update", "new-plugin", "bundle"];
const COMPLEXITIES = ["small", "medium", "large"];

function isEmail(v: unknown): v is string {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;
}

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate at the boundary.
  const type = String(body.type ?? "");
  const complexity = String(body.complexity ?? "");
  if (!TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
  }
  if (type !== "bundle" && !COMPLEXITIES.includes(complexity)) {
    return NextResponse.json({ error: "Invalid complexity" }, { status: 400 });
  }
  if (!isEmail(body.email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  const details = str(body.details, 4000);
  if (type !== "bundle" && details.trim().length < 10) {
    return NextResponse.json(
      { error: "Please describe what you need (at least 10 characters)" },
      { status: 400 }
    );
  }

  const input: EstimateInput = {
    type: type as EstimateInput["type"],
    moduleId: str(body.moduleId, 40) || undefined,
    complexity: (type === "bundle" ? "small" : complexity) as EstimateInput["complexity"],
    rush: Boolean(body.rush),
    support: Boolean(body.support),
  };
  const quote = estimate(input);

  const ref = `BF-${Date.now().toString(36).toUpperCase()}`;
  const record = {
    ref,
    receivedAt: new Date().toISOString(),
    type: input.type,
    moduleId: input.moduleId ?? null,
    complexity: input.complexity,
    rush: Boolean(input.rush),
    support: Boolean(input.support),
    email: body.email,
    company: str(body.company, 120),
    details,
    quote,
  };

  const accountToken = (await cookies()).get(ACCOUNT_COOKIE)?.value;
  const account = accountToken ? await getAccountFromToken(accountToken) : null;
  if (account && account.customer.email === body.email.trim().toLowerCase()) {
    await recordAccountActivity(account.customer.id, "custom_request", `Submitted ${input.type} request ${ref}`);
  }

  let notified = false;
  let notifyReason: string | undefined;

  // Best-effort local persistence (gitignored). Never fatal to the response.
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    let existing: unknown[] = [];
    try {
      existing = JSON.parse(await fs.readFile(STORE, "utf8"));
      if (!Array.isArray(existing)) existing = [];
    } catch {
      existing = [];
    }
    existing.push(record);
    await fs.writeFile(STORE, JSON.stringify(existing, null, 2), "utf8");
  } catch (e) {
    console.error("[requests] could not persist:", (e as Error).message);
  }

  // Best-effort email notification to the business owner inbox.
  try {
    const res = await sendRequestEmail(record);
    notified = res.sent;
    notifyReason = res.reason;
    if (!res.sent) {
      console.warn(`[requests] email not sent (${notifyReason ?? "unknown"})`);
    }
  } catch (e) {
    notifyReason = (e as Error).message;
    console.error("[requests] email delivery failed:", notifyReason);
  }

  return NextResponse.json({
    ok: true,
    ref,
    quote,
    notified,
    notificationTarget: requestsEmailTarget(),
    notifyReason: notified ? undefined : notifyReason,
  });
}
