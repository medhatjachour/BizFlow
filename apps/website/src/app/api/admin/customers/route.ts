import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  ADMIN_COOKIE,
  readCustomerDetail,
  revokeCustomerSessions,
  setCustomerRole,
  setCustomerStatus,
  verifyToken,
} from "@/lib/admin";

const actions = ["suspend", "activate", "sign_out_all", "set_role"] as const;
type Action = (typeof actions)[number];

const roles = ["CUSTOMER", "SUPPORT", "ADMIN"] as const;

async function authorized(): Promise<boolean> {
  return verifyToken((await cookies()).get(ADMIN_COOKIE)?.value);
}

/** Full account detail for the customer drill-down page. */
export async function GET(request: Request) {
  if (!(await authorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "Missing customer id" }, { status: 400 });

  const detail = await readCustomerDetail(id);
  if (!detail) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  return NextResponse.json(detail);
}

export async function PATCH(request: Request) {
  if (!(await authorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: unknown; action?: unknown; role?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = String(body.id ?? "").trim();
  const action = String(body.action ?? "") as Action;
  if (!id || !actions.includes(action)) {
    return NextResponse.json({ error: "Invalid customer action" }, { status: 400 });
  }

  let ok = false;
  let message = "";

  if (action === "sign_out_all") {
    const count = await revokeCustomerSessions(id);
    ok = true;
    message = count === 1 ? "Signed out 1 session." : `Signed out ${count} sessions.`;
  } else if (action === "set_role") {
    const role = String(body.role ?? "") as (typeof roles)[number];
    if (!roles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    ok = await setCustomerRole(id, role);
    message = `Role set to ${role}.`;
  } else {
    const target = action === "suspend" ? "SUSPENDED" : "ACTIVE";
    const result = await setCustomerStatus(id, target);
    if (!result.ok) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    // A no-op must not be reported as a fresh action: the admin would believe
    // they just suspended someone who was already suspended.
    let outcome: string;
    if (!result.changed) {
      outcome = target === "SUSPENDED" ? "Account was already suspended." : "Account was already active.";
    } else if (target === "SUSPENDED") {
      outcome = "Account suspended and signed out everywhere.";
    } else {
      outcome = result.previousStatus === "PENDING" ? "Account activated." : "Account re-activated.";
    }

    return NextResponse.json({ ok: true, message: outcome });
  }

  if (!ok) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  return NextResponse.json({ ok: true, message });
}
