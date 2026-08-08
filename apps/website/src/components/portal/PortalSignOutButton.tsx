"use client";

import { withBasePath } from "@/lib/site";

export default function PortalSignOutButton() {
  async function signOut() {
    await fetch(withBasePath("/api/portal/login"), { method: "DELETE" });
    window.location.href = withBasePath("/portal/login");
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="glass rounded-xl px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10"
    >
      Sign out
    </button>
  );
}
