import { NextResponse } from "next/server";
import { getEffectivePrices } from "@/lib/prices";

// Public: effective module + suite prices (base prices merged with admin overrides).
export const dynamic = "force-dynamic";

export async function GET() {
  const prices = await getEffectivePrices();
  return NextResponse.json(prices, {
    headers: { "Cache-Control": "no-store" },
  });
}
