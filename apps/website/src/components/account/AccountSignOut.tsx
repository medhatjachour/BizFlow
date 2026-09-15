"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { withBasePath } from "@/lib/site";

/** Ends the account session, then sends the buyer back to the sign-in screen. */
export default function AccountSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await fetch(withBasePath("/api/account/logout"), { method: "DELETE" });
    } catch {
      /* sign out is best-effort — the redirect below still clears the page */
    }
    router.replace(withBasePath("/account/login"));
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-foreground/75 transition hover:border-rose-400/40 hover:text-rose-200 disabled:opacity-50"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
