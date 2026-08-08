"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { withBasePath } from "@/lib/site";

export default function AccountLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (mode === "register") {
        const registerRes = await fetch(withBasePath("/api/account/register"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, fullName }),
        });

        const registerData = (await registerRes.json()) as { error?: string };
        if (!registerRes.ok) throw new Error(registerData.error ?? "Could not register account");
      }

      const loginRes = await fetch(withBasePath("/api/account/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const loginData = (await loginRes.json()) as { error?: string };
      if (!loginRes.ok) throw new Error(loginData.error ?? "Could not sign in");

      router.push(withBasePath("/account"));
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 py-16">
      <h1 className="text-3xl font-black tracking-tight">Customer Account</h1>
      <p className="mt-3 text-sm text-foreground/65">Use your account to manage licenses and support requests.</p>

      <div className="mt-6 flex gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
            mode === "login" ? "bg-white/20" : "text-foreground/70"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
            mode === "register" ? "bg-white/20" : "text-foreground/70"
          }`}
        >
          Create account
        </button>
      </div>

      <form onSubmit={onSubmit} className="glass-strong mt-4 space-y-4 rounded-2xl p-5">
        {mode === "register" ? (
          <label className="space-y-1 text-sm">
            <span>Full name</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2"
            />
          </label>
        ) : null}

        <label className="space-y-1 text-sm">
          <span>Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span>Password</span>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
        </button>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </form>
    </main>
  );
}
