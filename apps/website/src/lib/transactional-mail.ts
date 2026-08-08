import nodemailer from "nodemailer";

import { siteUrl, withBasePath } from "@/lib/site";

const DEFAULT_FROM = "no-reply@medhatjachour.tech";
const DEFAULT_SUPPORT_TO = "medhatjachour8@gmail.com";

function toInt(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function createTransport() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port: toInt(process.env.SMTP_PORT, 587),
    secure: String(process.env.SMTP_SECURE ?? "false").toLowerCase() === "true",
    auth: { user, pass },
  });
}

function senderAddress(): string {
  return process.env.ACCOUNT_MAIL_FROM?.trim() || process.env.REQUEST_MAIL_FROM?.trim() || process.env.SMTP_USER?.trim() || DEFAULT_FROM;
}

function supportInbox(): string {
  return process.env.SUPPORT_MAIL_TO?.trim() || process.env.REQUEST_MAIL_TO?.trim() || DEFAULT_SUPPORT_TO;
}

export async function sendLicenseDeliveryEmail(params: {
  to: string;
  itemLabel: string;
  licenseKey: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const transport = createTransport();
  if (!transport) {
    return { sent: false, reason: "SMTP_NOT_CONFIGURED" };
  }

  const from = senderAddress();
  const downloadUrl = `${siteUrl}${withBasePath("/download")}`;
  const portalUrl = `${siteUrl}${withBasePath("/portal/login")}`;

  try {
    await transport.sendMail({
      from,
      to: params.to,
      subject: `Your BizFlow license key for ${params.itemLabel}`,
      text: [
        "Thanks for your purchase.",
        "",
        `Product: ${params.itemLabel}`,
        `License key: ${params.licenseKey}`,
        "",
        `Download: ${downloadUrl}`,
        `Manage licenses: ${portalUrl}`,
        "",
        "Keep this license key private and store it safely.",
      ].join("\n"),
      html: `
        <h2>BizFlow License Delivery</h2>
        <p>Thanks for your purchase.</p>
        <p><strong>Product:</strong> ${params.itemLabel}</p>
        <p><strong>License key:</strong> <code>${params.licenseKey}</code></p>
        <p><a href="${downloadUrl}">Download BizFlow</a></p>
        <p><a href="${portalUrl}">Manage your licenses</a></p>
        <p>Keep this license key private and store it safely.</p>
      `,
    });
    return { sent: true };
  } catch (error) {
    return { sent: false, reason: (error as Error).message };
  }
}

export async function sendPasswordResetEmail(params: {
  to: string;
  token: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const transport = createTransport();
  if (!transport) {
    return { sent: false, reason: "SMTP_NOT_CONFIGURED" };
  }

  const resetUrl = `${siteUrl}${withBasePath("/account/reset")}?token=${encodeURIComponent(params.token)}`;

  try {
    await transport.sendMail({
      from: senderAddress(),
      to: params.to,
      subject: "BizFlow password reset",
      text: [
        "We received a password reset request for your BizFlow account.",
        "",
        `Reset link: ${resetUrl}`,
        "",
        "This link expires in 30 minutes.",
        "If you did not request this, you can ignore this email.",
      ].join("\n"),
      html: `
        <h2>BizFlow Password Reset</h2>
        <p>We received a password reset request for your BizFlow account.</p>
        <p><a href="${resetUrl}">Reset your password</a></p>
        <p>This link expires in 30 minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
    });

    return { sent: true };
  } catch (error) {
    return { sent: false, reason: (error as Error).message };
  }
}

export async function sendSupportTicketEmails(params: {
  ticketId: string;
  customerEmail: string;
  subject: string;
  category: string;
  priority: string;
  message: string;
}): Promise<{ supportSent: boolean; customerSent: boolean; reason?: string }> {
  const transport = createTransport();
  if (!transport) {
    return { supportSent: false, customerSent: false, reason: "SMTP_NOT_CONFIGURED" };
  }

  const from = senderAddress();
  const supportTo = supportInbox();
  const statusUrl = `${siteUrl}${withBasePath("/support/status")}`;

  let supportSent = false;
  let customerSent = false;
  const reasons: string[] = [];

  try {
    await transport.sendMail({
      from,
      to: supportTo,
      replyTo: params.customerEmail,
      subject: `Support ticket ${params.ticketId} (${params.priority})`,
      text: [
        "New support ticket received.",
        "",
        `Ticket: ${params.ticketId}`,
        `Customer: ${params.customerEmail}`,
        `Category: ${params.category}`,
        `Priority: ${params.priority}`,
        `Subject: ${params.subject}`,
        "",
        "Message:",
        params.message,
      ].join("\n"),
      html: `
        <h2>New Support Ticket</h2>
        <p><strong>Ticket:</strong> ${params.ticketId}</p>
        <p><strong>Customer:</strong> ${params.customerEmail}</p>
        <p><strong>Category:</strong> ${params.category}</p>
        <p><strong>Priority:</strong> ${params.priority}</p>
        <p><strong>Subject:</strong> ${params.subject}</p>
        <h3>Message</h3>
        <pre style="white-space:pre-wrap;font-family:ui-monospace,Consolas,monospace">${params.message}</pre>
      `,
    });
    supportSent = true;
  } catch (error) {
    reasons.push(`support:${(error as Error).message}`);
  }

  try {
    await transport.sendMail({
      from,
      to: params.customerEmail,
      subject: `We received your support request (${params.ticketId})`,
      text: [
        "Thanks for contacting BizFlow support.",
        "",
        `Your ticket ID: ${params.ticketId}`,
        `Track status: ${statusUrl}`,
        "",
        "Please keep this ticket ID for follow-up.",
      ].join("\n"),
      html: `
        <h2>BizFlow Support</h2>
        <p>Thanks for contacting support.</p>
        <p><strong>Your ticket ID:</strong> ${params.ticketId}</p>
        <p><a href="${statusUrl}">Track your ticket status</a></p>
      `,
    });
    customerSent = true;
  } catch (error) {
    reasons.push(`customer:${(error as Error).message}`);
  }

  return {
    supportSent,
    customerSent,
    reason: reasons.length ? reasons.join("; ") : undefined,
  };
}
