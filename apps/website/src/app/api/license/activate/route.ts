import { NextResponse } from "next/server";

import { activateLicenseForDevice } from "@/lib/commerce-db";
import { signActivationCertificate } from "@/lib/license";
import { logEvent, requestIdFromHeaders } from "@/lib/observability";

const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const failedAttempts = new Map<string, { count: number; resetAt: number }>();

function attemptKey(request: Request, email: string): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return `${forwardedFor}:${email}`;
}

function retryAfterSeconds(key: string): number | null {
  const attempt = failedAttempts.get(key);
  if (!attempt) return null;
  if (attempt.resetAt <= Date.now()) {
    failedAttempts.delete(key);
    return null;
  }
  if (attempt.count < MAX_FAILED_ATTEMPTS) return null;
  return Math.max(1, Math.ceil((attempt.resetAt - Date.now()) / 1000));
}

function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const existing = failedAttempts.get(key);
  if (!existing || existing.resetAt <= now) {
    failedAttempts.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return;
  }
  existing.count += 1;
}

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
  const key = attemptKey(request, email);
  const retryAfter = retryAfterSeconds(key);

  if (retryAfter) {
    return NextResponse.json(
      { error: "Too many failed activation attempts. Try again later.", requestId },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

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
    recordFailedAttempt(key);
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

  failedAttempts.delete(key);

  logEvent("info", "license_device_activated", {
    requestId,
    email,
    licenseKey,
    itemId: result.itemId,
    activatedNow: result.activatedNow,
    deviceName: result.deviceName,
  });

  const issuedAt = new Date().toISOString();
  const activation = {
    version: 1 as const,
    email,
    licenseKey,
    itemId: result.itemId,
    deviceFingerprint: result.deviceFingerprint,
    deviceName: result.deviceName ?? deviceName,
    issuedAt,
  };

  try {
    return NextResponse.json({
      ok: true,
      requestId,
      activation,
      signature: signActivationCertificate(activation),
    });
  } catch (error) {
    logEvent("error", "license_activation_signing_failed", { requestId, error: (error as Error).message });
    return NextResponse.json({ error: "License activation is unavailable", requestId }, { status: 503 });
  }
}
