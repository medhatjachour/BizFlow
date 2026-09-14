/**
 * Licence requests.
 *
 * A licence request is not a purchase and not a support ticket: it is a customer
 * (usually prompted by the desktop app when the trial ends) asking us to mint a
 * key. It needs to survive a redeploy, be visible in the admin console, and be
 * replyable in one click — hence a small JSON store next to the other dashboard
 * data, plus the same mail transport the custom-request form already uses.
 *
 * Only ever imported from server code: it touches the filesystem.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

import { dataDir } from "@/lib/data-dir";
import { getPurchasable } from "@/lib/payments";
import { createMailTransport, requestsEmailTarget } from "@/lib/request-mail";

export type LicenseRequestStatus = "new" | "issued" | "declined";

export interface LicenseRequestRecord {
  ref: string;
  receivedAt: string;
  status: LicenseRequestStatus;
  /** How the request arrived. Desktop sends the device details with it. */
  source: "desktop" | "web";
  email: string;
  fullName: string;
  business: string;
  phone: string;
  itemId: string;
  seats: string;
  message: string;
  appVersion: string;
  platform: string;
  deviceName: string;
  deviceFingerprint: string;
  /** Set when an admin issues from the console, for the audit trail. */
  issuedLicenseKey?: string | null;
  handledAt?: string | null;
}

const FILE = path.join(dataDir, "license-requests.json");

/** Human label for an item id, shared by the console and the notification mail. */
export function itemLabel(itemId: string): string {
  return getPurchasable(itemId)?.label ?? itemId;
}

export async function readLicenseRequests(): Promise<LicenseRequestRecord[]> {
  try {
    const parsed = JSON.parse(await fs.readFile(FILE, "utf8"));
    return Array.isArray(parsed) ? (parsed as LicenseRequestRecord[]) : [];
  } catch {
    return [];
  }
}

async function writeLicenseRequests(rows: LicenseRequestRecord[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(rows, null, 2), "utf8");
}

/** Reference the customer can quote, and that the admin can search on. */
export function licenseRequestRef(): string {
  return `LR-${Date.now().toString(36).toUpperCase()}`;
}

export async function appendLicenseRequest(
  record: LicenseRequestRecord
): Promise<LicenseRequestRecord> {
  const rows = await readLicenseRequests();
  rows.unshift(record);
  // Keep the file bounded — this is an inbox, not an archive.
  await writeLicenseRequests(rows.slice(0, 500));
  return record;
}

/** Mark a request handled. Returns false when the ref is unknown. */
export async function setLicenseRequestStatus(
  ref: string,
  status: LicenseRequestStatus,
  patch: { issuedLicenseKey?: string | null } = {}
): Promise<boolean> {
  const rows = await readLicenseRequests();
  const index = rows.findIndex((row) => row.ref === ref);
  if (index === -1) return false;

  rows[index] = {
    ...rows[index],
    status,
    handledAt: new Date().toISOString(),
    ...(patch.issuedLicenseKey !== undefined
      ? { issuedLicenseKey: patch.issuedLicenseKey }
      : {}),
  };
  await writeLicenseRequests(rows);
  return true;
}

/**
 * Tell whoever runs the shop that a licence request arrived.
 *
 * Best effort by design: the request is already stored, so a mail failure must
 * never fail the customer's request. The console is the source of truth.
 */
export async function sendLicenseRequestNotification(
  record: LicenseRequestRecord
): Promise<{ sent: boolean; reason?: string }> {
  const to = requestsEmailTarget();
  const authenticatedFrom =
    process.env.REQUEST_MAIL_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "no-reply@medhatjachour.tech";

  const transport = createMailTransport();
  if (!transport) return { sent: false, reason: "SMTP_NOT_CONFIGURED" };

  const rows: Array<[string, string]> = [
    ["Reference", record.ref],
    ["Received", record.receivedAt],
    ["Source", record.source === "desktop" ? "BizFlow desktop app" : "Website"],
    ["Customer", record.fullName || "(not given)"],
    ["Email", record.email],
    ["Business", record.business || "(not given)"],
    ["Phone", record.phone || "(not given)"],
    ["Product", itemLabel(record.itemId)],
    ["Users / seats", record.seats || "(not given)"],
    ["App version", record.appVersion || "(not given)"],
    ["Platform", record.platform || "(not given)"],
    ["Device", record.deviceName || "(not given)"],
    ["Device ID", record.deviceFingerprint || "(not given)"],
  ];

  try {
    await transport.sendMail({
      from: `"BizFlow licence request" <${authenticatedFrom}>`,
      to,
      replyTo: record.email,
      subject: `BizFlow licence request ${record.ref} — ${itemLabel(record.itemId)}`,
      text: [
        "New BizFlow licence request.",
        "",
        ...rows.map(([label, value]) => `${label}: ${value}`),
        "",
        "Message:",
        record.message || "(empty)",
      ].join("\n"),
      html: `
        <h2>New BizFlow licence request</h2>
        <table cellpadding="6" style="border-collapse:collapse;font-family:system-ui,sans-serif;font-size:14px">
          ${rows
            .map(
              ([label, value]) =>
                `<tr><td style="color:#64748b">${label}</td><td><strong>${escapeHtml(
                  value
                )}</strong></td></tr>`
            )
            .join("")}
        </table>
        <h3>Message</h3>
        <pre style="white-space:pre-wrap;font-family:ui-monospace,Consolas,monospace">${escapeHtml(
          record.message || "(empty)"
        )}</pre>
      `,
    });
    return { sent: true };
  } catch (error) {
    return { sent: false, reason: (error as Error).message };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
