import nodemailer from "nodemailer";

export type RequestRecord = {
  ref: string;
  receivedAt: string;
  type: string;
  moduleId: string | null;
  complexity: string;
  rush: boolean;
  support: boolean;
  email: string;
  company: string;
  details: string;
  quote: {
    min: number;
    max: number;
    eta: string;
    breakdown: Array<{ label: string; amount: string }>;
  };
};

const DEFAULT_TO = "medhatjachour8@gmail.com";

function extractEmailAddress(v: string): string {
  const trimmed = v.trim();
  const m = trimmed.match(/<([^>]+)>/);
  return (m?.[1] ?? trimmed).trim();
}

function sanitizeHeaderText(v: string): string {
  return v.replace(/[\r\n"]/g, " ").trim();
}

function requesterFromHeader(requesterEmail: string, authenticatedFrom: string): string {
  const mailbox = extractEmailAddress(authenticatedFrom);
  const requester = sanitizeHeaderText(requesterEmail);
  return `"${requester}" <${mailbox}>`;
}

function toInt(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function requestTypeLabel(type: string): string {
  if (type === "update") return "Update existing module";
  if (type === "new-plugin") return "New custom module";
  if (type === "bundle") return "Full suite";
  return type;
}

export function requestsEmailTarget(): string {
  return process.env.REQUEST_MAIL_TO?.trim() || DEFAULT_TO;
}

function createTransport() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  const port = toInt(process.env.SMTP_PORT, 587);
  const secure = String(process.env.SMTP_SECURE ?? "false").toLowerCase() === "true";

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

function shouldUseDirectFallback(): boolean {
  const raw = String(process.env.REQUEST_MAIL_FALLBACK_DIRECT ?? "true").toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

async function sendViaDirectMx(
  record: RequestRecord,
  to: string,
  authenticatedFrom: string
): Promise<{ sent: boolean; reason?: string }> {
  const transport = nodemailer.createTransport({
    host: process.env.REQUEST_MAIL_FALLBACK_HOST?.trim() || "gmail-smtp-in.l.google.com",
    port: toInt(process.env.REQUEST_MAIL_FALLBACK_PORT, 25),
    secure: false,
    name: process.env.REQUEST_MAIL_HELO_NAME?.trim() || "medhatjachour.tech",
  });

  try {
    const fromHeader = requesterFromHeader(record.email, authenticatedFrom);
    await transport.sendMail({
      from: fromHeader,
      sender: extractEmailAddress(authenticatedFrom),
      to,
      replyTo: record.email,
      subject: `BizFlow request ${record.ref} (${requestTypeLabel(record.type)})`,
      text: buildText(record),
      html: buildHtml(record),
    });
    return { sent: true };
  } catch (error) {
    return { sent: false, reason: (error as Error).message };
  }
}

function buildText(r: RequestRecord): string {
  const lines = [
    "New BizFlow custom request received.",
    "",
    `Reference: ${r.ref}`,
    `Received: ${r.receivedAt}`,
    `Type: ${requestTypeLabel(r.type)}`,
    `Module: ${r.moduleId ?? "N/A"}`,
    `Complexity: ${r.complexity}`,
    `Rush: ${r.rush ? "Yes" : "No"}`,
    `Support: ${r.support ? "Yes" : "No"}`,
    `Requester email: ${r.email}`,
    `Company: ${r.company || "N/A"}`,
    `Estimate: $${r.quote.min} - $${r.quote.max}`,
    `ETA: ${r.quote.eta}`,
    "",
    "Details:",
    r.details || "(empty)",
    "",
    "Breakdown:",
    ...r.quote.breakdown.map((b) => `- ${b.label}: ${b.amount}`),
  ];
  return lines.join("\n");
}

function buildHtml(r: RequestRecord): string {
  const breakdown = r.quote.breakdown
    .map((b) => `<li><strong>${b.label}:</strong> ${b.amount}</li>`)
    .join("");

  return `
    <h2>New BizFlow custom request</h2>
    <p><strong>Reference:</strong> ${r.ref}</p>
    <p><strong>Received:</strong> ${r.receivedAt}</p>
    <p><strong>Type:</strong> ${requestTypeLabel(r.type)}</p>
    <p><strong>Module:</strong> ${r.moduleId ?? "N/A"}</p>
    <p><strong>Complexity:</strong> ${r.complexity}</p>
    <p><strong>Rush:</strong> ${r.rush ? "Yes" : "No"}</p>
    <p><strong>Support:</strong> ${r.support ? "Yes" : "No"}</p>
    <p><strong>Requester email:</strong> ${r.email}</p>
    <p><strong>Company:</strong> ${r.company || "N/A"}</p>
    <p><strong>Estimate:</strong> $${r.quote.min} - $${r.quote.max}</p>
    <p><strong>ETA:</strong> ${r.quote.eta}</p>
    <h3>Details</h3>
    <pre style="white-space:pre-wrap;font-family:ui-monospace,Consolas,monospace">${r.details || "(empty)"}</pre>
    <h3>Breakdown</h3>
    <ul>${breakdown}</ul>
  `;
}

export async function sendRequestEmail(record: RequestRecord): Promise<{ sent: boolean; reason?: string }> {
  const to = requestsEmailTarget();
  const authenticatedFrom =
    process.env.REQUEST_MAIL_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "no-reply@medhatjachour.tech";
  const transporter = createTransport();

  if (!transporter) {
    if (!shouldUseDirectFallback()) {
      return { sent: false, reason: "SMTP_NOT_CONFIGURED" };
    }
    return sendViaDirectMx(record, to, authenticatedFrom);
  }

  try {
    const fromHeader = requesterFromHeader(record.email, authenticatedFrom);
    await transporter.sendMail({
      from: fromHeader,
      sender: extractEmailAddress(authenticatedFrom),
      to,
      replyTo: record.email,
      subject: `BizFlow request ${record.ref} (${requestTypeLabel(record.type)})`,
      text: buildText(record),
      html: buildHtml(record),
    });
    return { sent: true };
  } catch (error) {
    if (!shouldUseDirectFallback()) {
      return { sent: false, reason: (error as Error).message };
    }
    const direct = await sendViaDirectMx(record, to, authenticatedFrom);
    if (direct.sent) {
      return { sent: true };
    }
    return {
      sent: false,
      reason: `SMTP failed: ${(error as Error).message}; Direct fallback failed: ${direct.reason ?? "unknown"}`,
    };
  }
}
