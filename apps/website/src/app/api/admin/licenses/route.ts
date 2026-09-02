import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ADMIN_COOKIE, updateLicenseAccess, verifyToken } from "@/lib/admin";

const actions = ["revoke", "reactivate", "unlock_device"] as const;
type LicenseAction = (typeof actions)[number];

export async function PATCH(request: Request) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifyToken(token)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { id?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = String(body.id ?? "").trim();
  const action = String(body.action ?? "") as LicenseAction;
  if (!id || !actions.includes(action)) return NextResponse.json({ error: "Invalid license action" }, { status: 400 });

  const updated = await updateLicenseAccess({ id, action });
  if (!updated) return NextResponse.json({ error: "License not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}