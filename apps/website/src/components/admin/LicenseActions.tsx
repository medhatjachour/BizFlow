"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { withBasePath } from "@/lib/site";

type Action = "revoke" | "reactivate" | "unlock_device" | "resend_email";

/**
 * Access controls for a single licence, usable straight from the order page.
 *
 * Clearing a device binding is the one action that is safe to repeat and
 * expected to be needed often (customers replace hardware), so it is offered
 * even when the licence is otherwise healthy.
 */
export default function LicenseActions({
  licenseId,
  status,
  bound,
  email,
}: {
  licenseId: string;
  status: string;
  bound: boolean;
  email: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<Action | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const revoked = status !== "ACTIVE";

  async function run(action: Action) {
    if (action === "revoke" && !window.confirm("Revoke this licence? The customer's app stops working on that device.")) {
      return;
    }
    if (action === "unlock_device" && !window.confirm("Release the device binding? The licence becomes free to activate on any machine.")) {
      return;
    }
    if (action === "resend_email" && !window.confirm(`Email the licence key to ${email || "the customer"} again?`)) {
      return;
    }

    setBusy(action);
    setMessage(null);
    try {
      const response = await fetch(withBasePath("/api/admin/licenses"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: licenseId, action }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; emailSent?: boolean };
      if (!response.ok) throw new Error(payload.error ?? "Could not update the licence");

      const ok: Record<Action, string> = {
        revoke: "Licence revoked.",
        reactivate: "Licence re-activated.",
        unlock_device: "Device binding released — the customer can activate on another machine.",
        resend_email: "Licence email sent.",
      };
      setMessage({ tone: "ok", text: ok[action] });
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Could not update the licence" });
    } finally {
      setBusy(null);
    }
  }

  const disabled = busy !== null || pending;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || !bound}
          onClick={() => run("unlock_device")}
          title={bound ? undefined : "This licence is not bound to a device"}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-foreground/75 transition hover:border-biz-400/40 hover:text-foreground disabled:opacity-40"
        >
          {busy === "unlock_device" ? "Releasing…" : "Release device"}
        </button>
        <button
          type="button"
          disabled={disabled || !email}
          onClick={() => run("resend_email")}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-foreground/75 transition hover:border-biz-400/40 hover:text-foreground disabled:opacity-40"
        >
          {busy === "resend_email" ? "Sending…" : "Resend key by email"}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => run(revoked ? "reactivate" : "revoke")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50 ${
            revoked ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-600 hover:bg-rose-500"
          }`}
        >
          {busy === "revoke" || busy === "reactivate" ? "Working…" : revoked ? "Re-activate" : "Revoke licence"}
        </button>
      </div>
      {message ? (
        <p role="status" className={`text-xs ${message.tone === "ok" ? "text-emerald-300" : "text-rose-300"}`}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
