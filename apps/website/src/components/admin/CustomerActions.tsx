"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { withBasePath } from "@/lib/site";

const ROLES = ["CUSTOMER", "SUPPORT", "ADMIN"] as const;

/**
 * Account-level controls for one customer.
 *
 * Every action is destructive-ish or hard to undo (suspension kills live
 * sessions, a role change grants staff access), so each one is confirmed and the
 * result is reported inline rather than in a modal that can be missed.
 */
export default function CustomerActions({
  customerId,
  status,
  role,
  email,
}: {
  customerId: string;
  status: string;
  role: string;
  email: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  // PENDING is a sign-up that never completed verification; SUSPENDED is an
  // account an admin closed. Both need the same "let them back in" button, and
  // ACTIVE is the only state that offers suspension.
  const canActivate = status !== "ACTIVE";
  const primaryLabel = !canActivate
    ? "Suspend account"
    : status === "PENDING"
      ? "Activate account"
      : "Re-activate account";

  async function run(action: "suspend" | "activate" | "sign_out_all" | "set_role", extra?: string) {
    if (action === "suspend" && !window.confirm(`Suspend ${email}? Every open session is signed out immediately.`)) {
      return;
    }
    if (action === "set_role" && !window.confirm(`Change ${email}'s role to ${extra}? Staff roles can read every customer's data.`)) {
      return;
    }

    setBusy(action);
    setMessage(null);
    try {
      const response = await fetch(withBasePath("/api/admin/customers"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: customerId, action, role: extra }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not update the account");
      setMessage({ tone: "ok", text: payload.message ?? "Account updated." });
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Could not update the account" });
    } finally {
      setBusy(null);
    }
  }

  const disabled = busy !== null || pending;

  return (
    <div className="flex w-full flex-col items-stretch gap-2 lg:w-auto lg:items-end">
      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <a
          href={`mailto:${email}`}
          className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-foreground/75 transition hover:border-biz-400/40 hover:text-foreground"
        >
          Email customer
        </a>
        <button
          type="button"
          disabled={disabled}
          onClick={() => run("sign_out_all")}
          className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-foreground/75 transition hover:border-biz-400/40 hover:text-foreground disabled:opacity-50"
        >
          {busy === "sign_out_all" ? "Signing out…" : "Sign out everywhere"}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => run(canActivate ? "activate" : "suspend")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${
            canActivate
              ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:scale-[1.02]"
              : "bg-gradient-to-r from-rose-500 to-rose-600 hover:scale-[1.02]"
          }`}
        >
          {busy === "suspend" || busy === "activate" ? "Working…" : primaryLabel}
        </button>
      </div>

      <label className="flex items-center gap-2 text-xs text-foreground/50 lg:justify-end">
        <span className="uppercase tracking-wide">Role</span>
        <select
          value={role}
          disabled={disabled}
          onChange={(event) => run("set_role", event.target.value)}
          className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-xs font-semibold text-foreground outline-none focus:border-biz-400 disabled:opacity-50"
        >
          {ROLES.map((value) => (
            <option key={value} value={value} className="bg-slate-900">
              {value}
            </option>
          ))}
        </select>
      </label>

      {message ? (
        <p
          role="status"
          className={`text-xs lg:text-right ${message.tone === "ok" ? "text-emerald-300" : "text-rose-300"}`}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
