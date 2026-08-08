import { NextResponse } from "next/server";

import { activateLicenseForDevice } from "@/lib/commerce-db";
import { logEvent, requestIdFromHeaders } from "@/lib/observability";

function isEmail(v: unknown): v is string {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;
}

export async function POST(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON", requestId }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const licenseKey = String(body.licenseKey ?? "").trim().toUpperCase();
  const deviceFingerprint = String(body.deviceFingerprint ?? "").trim();
  const deviceName = String(body.deviceName ?? "").trim();

  if (!isEmail(email)) {
    return NextResponse.json({ error: "Valid email is required", requestId }, { status: 400 });
  }
  if (!licenseKey || licenseKey.length < 10) {
    return NextResponse.json({ error: "Valid license key is required", requestId }, { status: 400 });
  }
  if (!deviceFingerprint || deviceFingerprint.length < 16) {
    return NextResponse.json({ error: "Valid device fingerprint is required", requestId }, { status: 400 });
  }

  const result = await activateLicenseForDevice({
    email,
    licenseKey,
    deviceFingerprint,
    deviceName,
  });

  if (!result.ok) {
    if (result.reason === "LOCKED_TO_OTHER_DEVICE") {
      return NextResponse.json(
        {
          error: "License is already activated on another device",
          requestId,
          code: result.reason,
          currentDeviceName: result.currentDeviceName ?? undefined,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "No paid license found for this email and key", requestId, code: result.reason },
      { status: 404 }
    );
  }

  logEvent("info", "license_device_activated", {
    requestId,
    email,
    licenseKey,
    itemId: result.itemId,
    activatedNow: result.activatedNow,
    deviceName: result.deviceName,
  });

  return NextResponse.json({
    ok: true,
    requestId,
    activation: {
      email,
      licenseKey,
      itemId: result.itemId,
      deviceFingerprint: result.deviceFingerprint,
      deviceName: result.deviceName,
      activatedNow: result.activatedNow,
      activatedAt: new Date().toISOString(),
    },
  });
}
