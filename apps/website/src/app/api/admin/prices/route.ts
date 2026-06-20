import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyToken } from "@/lib/admin";
import { getEffectivePrices, getPriceOverrides, setPriceOverrides } from "@/lib/prices";

// Admin-only: read & update per-module price overrides.
export const dynamic = "force-dynamic";

async function isAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return verifyToken(token);
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [overrides, effective] = await Promise.all([
    getPriceOverrides(),
    getEffectivePrices(),
  ]);
  return NextResponse.json({ overrides, effective });
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { prices?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const input: Record<string, number> = {};
  const raw = body.prices;
  if (raw && typeof raw === "object") {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === "number") input[k] = v;
    }
  }

  const overrides = await setPriceOverrides(input);
  const effective = await getEffectivePrices();
  return NextResponse.json({ ok: true, overrides, effective });
}
