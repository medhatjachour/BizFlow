import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { ActivationCertificate } from "@/lib/license";

/**
 * Lock the activation-certificate contract between the website (which signs) and
 * the desktop app (which verifies).
 *
 * The two halves live in separate projects and are only ever tested apart, so
 * nothing caught the regression that made every renewal silently fail: the
 * desktop verifies an Ed25519 signature over `JSON.stringify(certificate)`, and
 * `JSON.stringify` preserves *insertion order*. Returning the new `expiresAt`
 * without re-signing therefore produced a certificate the desktop rejected, and
 * because the failure was silent the validity window never rolled forward —
 * customers were locked out at day 44 while revalidating perfectly.
 *
 * Signing and verification both happen over a serialised object here, so the
 * field *order* is load-bearing and is asserted against the desktop's own
 * interface rather than a copy of it.
 */

const keyPair = crypto.generateKeyPairSync("ed25519");
const privateKeyPem = keyPair.privateKey.export({ type: "pkcs8", format: "pem" }) as string;
const publicKeyPem = keyPair.publicKey.export({ type: "spki", format: "pem" }) as string;

// `lib/license.ts` reads this at module scope, so it has to be set before the
// import is evaluated. A throwaway keypair keeps real key material out of git.
process.env.LICENSE_SIGNING_PRIVATE_KEY = privateKeyPem;

const { LICENSE_VALIDITY_DAYS, licenseExpiryFrom, signActivationCertificate } = await import("@/lib/license");

const DESKTOP_ACTIVATION_SOURCE = path.join(
  __dirname,
  "..",
  "..",
  "Bizflow",
  "src",
  "main",
  "ipc",
  "handlers",
  "license.handlers.ts",
);

/**
 * Field order of the desktop's `LocalActivation`, read straight from its source
 * so that adding or reordering a field there fails this suite instead of
 * silently breaking every renewal in production.
 */
function desktopActivationFields(): string[] {
  const source = fs.readFileSync(DESKTOP_ACTIVATION_SOURCE, "utf8");
  const body = /interface LocalActivation \{([\s\S]*?)\n\}/.exec(source)?.[1];
  if (!body) throw new Error("Could not locate `interface LocalActivation` in license.handlers.ts");

  return body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//") && !line.startsWith("/*") && !line.startsWith("*"))
    .map((line) => /^([A-Za-z_$][\w$]*)\??:/.exec(line)?.[1])
    .filter((name): name is string => Boolean(name) && name !== "signature");
}

/**
 * Exactly the certificate `POST /api/license/validate` returns.
 *
 * It is also handed to `desktopVerifies`, which models the desktop's JSON bag, so
 * the return type has to satisfy both. The explicit annotation is load-bearing:
 * without it object-literal widening turns `version` into `number`, and `version: 2`
 * is part of the signed payload's contract.
 */
function buildCertificate(
  overrides: Partial<ActivationCertificate> = {},
): ActivationCertificate & Record<string, unknown> {
  const now = new Date();
  return {
    version: 2,
    email: "customer@example.com",
    licenseKey: "BIZ-0B74R-0DEFC-CZXAA-FVT9F",
    itemId: "module:commerce",
    deviceFingerprint: "D7574401769BD1EF3F85AB6704BBFEF667802838AE14982CF01CFECF3AD00009",
    deviceName: "mga (win32-x64)",
    issuedAt: "2026-09-14T14:26:04.954Z",
    expiresAt: licenseExpiryFrom(now),
    lastValidatedAt: now.toISOString(),
    ...overrides,
  };
}

/**
 * The desktop's `signatureIsValid()`: verify the payload minus `signature`.
 *
 * Built by copying entries rather than destructuring the signature away so the
 * serialisation order stays identical to the certificate's own order — the
 * signature is over the serialised bytes, so an accidental reorder has to be
 * caught here rather than tolerated.
 */
function desktopVerifies(certificate: Record<string, unknown>, signature: string): boolean {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(certificate)) {
    if (key === "signature") continue;
    payload[key] = value;
  }

  return crypto.verify(null, Buffer.from(JSON.stringify(payload)), publicKeyPem, Buffer.from(signature, "base64"));
}

describe("license activation certificate", () => {
  it("carries exactly the fields the desktop interface declares, in the same order", () => {
    expect(Object.keys(buildCertificate())).toEqual(desktopActivationFields());
  });

  it("uses a 30 day validity window measured from the given instant", () => {
    const now = new Date("2026-09-14T14:26:04.954Z");

    expect(LICENSE_VALIDITY_DAYS).toBe(30);
    expect(licenseExpiryFrom(now)).toBe("2026-10-14T14:26:04.954Z");
    expect(new Date(licenseExpiryFrom(now)).getTime() - now.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("signs a certificate the desktop accepts", () => {
    const certificate = buildCertificate();

    expect(desktopVerifies(certificate, signActivationCertificate(certificate))).toBe(true);
  });

  it("rejects a certificate whose expiry was rewritten after signing", () => {
    const certificate = buildCertificate();
    const signature = signActivationCertificate(certificate);

    // What the desktop used to be told to do: keep the old signature and store a
    // new expiry. This must fail, because this is how renewals broke.
    certificate.expiresAt = licenseExpiryFrom(new Date("2026-11-13T00:00:00.000Z"));

    expect(desktopVerifies(certificate, signature)).toBe(false);
  });

  it("produces a distinct signature when the window rolls forward, and accepts it", () => {
    const first = buildCertificate();
    const second = buildCertificate({
      expiresAt: new Date(new Date(first.expiresAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const secondSignature = signActivationCertificate(second);

    expect(secondSignature).not.toBe(signActivationCertificate(first));
    expect(desktopVerifies(second, secondSignature)).toBe(true);
    expect(new Date(second.expiresAt).getTime()).toBeGreaterThan(new Date(first.expiresAt).getTime());
  });
});
