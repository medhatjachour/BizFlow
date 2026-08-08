"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import AuroraBackground from "@/components/AuroraBackground";
import { withBasePath } from "@/lib/site";

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch(withBasePath("/api/portal/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, licenseKey }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || "Login failed");
      }
      router.push(withBasePath("/portal"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <AuroraBackground />
      <main className="grid min-h-screen place-items-center px-4">
        <div className="glass-strong w-full max-w-md rounded-3xl p-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-biz-300">Buyer Portal</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Sign in to your licenses</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Use the email and license key from your purchase confirmation.
          </p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground/55">
                Email
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass w-full rounded-xl px-3 py-2.5 text-sm outline-none ring-0 transition focus:bg-white/10"
                placeholder="you@company.com"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground/55">
                License Key
              </span>
              <input
                type="text"
                required
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                className="glass w-full rounded-xl px-3 py-2.5 font-mono text-sm uppercase outline-none ring-0 transition focus:bg-white/10"
                placeholder="BIZ-XXXXX-XXXXX-XXXXX-XXXXX"
              />
            </label>

            {error && (
              <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-4 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? "Signing in..." : "Open Dashboard"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
