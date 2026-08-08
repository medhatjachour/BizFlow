"use client";

import { Suspense } from "react";
import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { withBasePath } from "@/lib/site";

export default function AccountResetPage() {
  return (
    <Suspense fallback={<main className="mx-auto min-h-screen w-full max-w-md px-4 py-16" />}>
      <AccountResetForm />
    </Suspense>
  );
}

function AccountResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initialToken = useMemo(() => params.get("token") ?? "", [params]);

  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!token.trim()) {
      setError("Reset token is required.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(withBasePath("/api/account/password/reset"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Password reset failed");
      }

      setMessage("Password reset successful. Redirecting to login...");
      setTimeout(() => {
        router.push(withBasePath("/account/login"));
      }, 1200);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 py-16">
      <h1 className="text-3xl font-black tracking-tight">Reset Password</h1>
      <p className="mt-3 text-sm text-foreground/65">Use the reset link from your email, then set a new password.</p>

      <form onSubmit={onSubmit} className="glass-strong mt-6 space-y-4 rounded-2xl p-5">
        <label className="space-y-1 text-sm">
          <span>Reset token</span>
          <input
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span>New password</span>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span>Confirm password</span>
          <input
            required
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Updating..." : "Reset password"}
        </button>

        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </form>

      <p className="mt-4 text-sm text-foreground/65">
        Back to{" "}
        <Link href={withBasePath("/account/login")} className="font-semibold underline">
          account login
        </Link>
        .
      </p>
    </main>
  );
}
