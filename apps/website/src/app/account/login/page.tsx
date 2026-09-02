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
    <main className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-14">
      <section className="order-2 lg:order-1 lg:pr-8">
        <a href={withBasePath("/")} className="inline-flex items-center gap-2 text-sm font-bold text-biz-200 transition hover:text-white">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-biz-400 text-xs text-white">B</span>
          BizFlow
        </a>
        <p className="mt-10 text-xs font-bold uppercase tracking-[0.18em] text-biz-300">Customer workspace</p>
        <h1 className="mt-3 max-w-md text-4xl font-black leading-tight tracking-tight sm:text-5xl">Everything you own, in one place.</h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-foreground/65">Keep your licenses, downloads, custom requests, and support history organized around one secure BizFlow account.</p>
        <dl className="mt-10 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <AccountBenefit number="01" title="Your licenses" text="View keys and device activations." />
          <AccountBenefit number="02" title="Your activity" text="Track downloads, orders, and requests." />
          <AccountBenefit number="03" title="Your support" text="Keep every conversation in context." />
        </dl>
      </section>

      <section className="glass-strong order-1 rounded-2xl p-5 shadow-2xl shadow-black/30 sm:p-8 lg:order-2">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-biz-300">BizFlow account</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight">Welcome back</h2>
        <p className="mt-2 text-sm leading-6 text-foreground/60">Sign in to manage your BizFlow products and support.</p>

        <a
          href={withBasePath("/api/account/google")}
          className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl border border-white/20 bg-white px-4 py-3 text-sm font-bold text-slate-900 transition hover:-translate-y-0.5 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-biz-300"
        >
          <span className="font-sans text-lg font-black text-[#4285f4]">G</span>
          Continue with Google
        </a>

        <div className="my-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/40">
          <span className="h-px flex-1 bg-white/10" />
          <span>or email</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/15 p-1">
        <button
          type="button"
          onClick={() => setMode("login")}
            className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              mode === "login" ? "bg-biz-500 text-white shadow-sm" : "text-foreground/60 hover:text-foreground"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
            className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              mode === "register" ? "bg-biz-500 text-white shadow-sm" : "text-foreground/60 hover:text-foreground"
          }`}
        >
          Create account
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        {mode === "register" ? (
          <label className="block space-y-1.5 text-sm font-medium">
            <span className="text-foreground/75">Full name</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/15 px-3.5 py-3 outline-none transition placeholder:text-foreground/30 focus:border-biz-400 focus:ring-2 focus:ring-biz-400/15"
            />
          </label>
        ) : null}

        <label className="block space-y-1.5 text-sm font-medium">
          <span className="text-foreground/75">Email address</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-xl border border-white/10 bg-black/15 px-3.5 py-3 outline-none transition placeholder:text-foreground/30 focus:border-biz-400 focus:ring-2 focus:ring-biz-400/15"
          />
        </label>

        <label className="block space-y-1.5 text-sm font-medium">
          <span className="text-foreground/75">Password</span>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full rounded-xl border border-white/10 bg-black/15 px-3.5 py-3 outline-none transition placeholder:text-foreground/30 focus:border-biz-400 focus:ring-2 focus:ring-biz-400/15"
          />
        </label>

        {mode === "login" ? (
          <button
            type="button"
            onClick={requestReset}
            disabled={requestingReset}
            className="text-left text-xs font-semibold text-biz-200 underline underline-offset-4 disabled:opacity-60"
          >
            {requestingReset ? "Sending reset link..." : "Forgot password? Send reset link"}
          </button>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-biz-600/20 transition hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {submitting ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
        </button>

        {resetMessage ? <p role="status" className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{resetMessage}</p> : null}
        {error ? <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p> : null}
      </form>
      <p className="mt-6 text-center text-xs leading-5 text-foreground/45">By continuing, you acknowledge BizFlow&apos;s <a href={withBasePath("/legal/privacy")} className="font-semibold text-biz-200 underline underline-offset-2">Privacy Policy</a>.</p>
      </section>
    </main>
  );
}

function AccountBenefit({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="border-l border-biz-400/40 pl-4"><dt className="text-xs font-bold text-biz-300">{number}</dt><dd className="mt-1 font-bold">{title}</dd><dd className="mt-1 text-sm text-foreground/55">{text}</dd></div>;
}
