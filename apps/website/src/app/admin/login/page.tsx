"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AuroraBackground from "@/components/AuroraBackground";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Login failed");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Network error — try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AuroraBackground />
      <main className="grid min-h-screen place-items-center px-4">
        <form
          onSubmit={onSubmit}
          className="glass-strong w-full max-w-sm rounded-3xl p-8"
        >
          <div className="mb-6 flex flex-col items-center text-center">
            <Image
              src="/brand/bizflow-icon.png"
              alt="BizFlow"
              width={56}
              height={56}
              className="mb-3 rounded-2xl"
              priority
            />
            <h1 className="text-2xl font-black">Manager sign-in</h1>
            <p className="mt-1 text-sm text-foreground/60">
              Licenses, orders &amp; custom requests.
            </p>
          </div>

          <label className="block text-xs font-semibold uppercase tracking-wide text-foreground/50">
            Password
          </label>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-biz-400"
            placeholder="••••••••"
          />

          {error && (
            <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !password}
            className="mt-5 w-full rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-6 py-3 text-sm font-semibold text-white transition hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </main>
    </>
  );
}
