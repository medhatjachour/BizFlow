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
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [requestingReset, setRequestingReset] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResetMessage(null);

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

  async function requestReset() {
    setError(null);
    setResetMessage(null);

    if (!email.trim()) {
      setError("Enter your email first, then request a reset link.");
      return;
    }

    setRequestingReset(true);
    try {
      const res = await fetch(withBasePath("/api/account/password/request-reset"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not request password reset");

      setResetMessage("If this email exists, a reset link has been sent.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRequestingReset(false);
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

        {mode === "login" ? (
          <button
            type="button"
            onClick={requestReset}
            disabled={requestingReset}
            className="text-left text-xs font-semibold text-foreground/75 underline disabled:opacity-60"
          >
            {requestingReset ? "Sending reset link..." : "Forgot password? Send reset link"}
          </button>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
        </button>

        {resetMessage ? <p className="text-sm text-emerald-300">{resetMessage}</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </form>
    </main>
  );
}
