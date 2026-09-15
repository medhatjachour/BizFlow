"use client";

import { useState } from "react";

import { withBasePath } from "@/lib/site";

/**
 * Emails a one-time password reset link for the signed-in account.
 *
 * The reset endpoint answers `ok` even for unknown addresses, so the UI must not
 * pretend to know whether the mail went out — it reports that we tried.
 */
export default function SendResetLink({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");

  async function send() {
    setState("busy");
    try {
      const response = await fetch(withBasePath("/api/account/password/request-reset"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setState(response.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={send}
        disabled={state === "busy" || state === "sent"}
        className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold transition hover:bg-white/10 disabled:opacity-60"
      >
        {state === "busy" ? "Sending…" : state === "sent" ? "Link sent ✓" : "Send reset link"}
      </button>
      {state === "sent" ? (
        <p className="mt-2 text-xs text-emerald-300">
          If {email} has an account, a reset link is on its way. Check the spam folder too.
        </p>
      ) : null}
      {state === "error" ? (
        <p className="mt-2 text-xs text-rose-300">
          Could not send the link right now. Try again, or email support@bizflow.app.
        </p>
      ) : null}
    </div>
  );
}
