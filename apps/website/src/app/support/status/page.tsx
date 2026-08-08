"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { withBasePath } from "@/lib/site";

type TicketResponse = {
  ok: boolean;
  requestId: string;
  error?: string;
  ticket?: {
    publicId: string;
    email: string;
    subject: string;
    category: string;
    priority: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    messages: Array<{
      senderType: string;
      body: string;
      createdAt: string;
    }>;
  };
};

export default function SupportStatusPage() {
  const [ticketId, setTicketId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TicketResponse | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const id = ticketId.trim().toUpperCase();
      const res = await fetch(withBasePath(`/api/support/tickets/${encodeURIComponent(id)}`), {
        cache: "no-store",
      });
      setResult((await res.json()) as TicketResponse);
    } catch {
      setResult({ ok: false, requestId: "n/a", error: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-16">
      <h1 className="text-3xl font-black tracking-tight">Support Ticket Status</h1>
      <p className="mt-3 text-sm text-foreground/70">
        Enter your ticket ID (for example, BF-ABC123-4F9A) to view current status.
      </p>

      <form onSubmit={onSubmit} className="glass mt-6 flex flex-wrap gap-3 rounded-2xl p-4">
        <input
          required
          value={ticketId}
          onChange={(e) => setTicketId(e.target.value)}
          className="min-w-[240px] flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2"
          placeholder="BF-..."
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Loading..." : "Check status"}
        </button>
      </form>

      {result ? (
        <section className="glass-strong mt-6 rounded-2xl p-5">
          {!result.ok || !result.ticket ? (
            <p className="text-rose-300">{result.error ?? "Ticket not found"}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold">{result.ticket.publicId}</h2>
                <span className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-wide">
                  {result.ticket.status.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-2 text-sm text-foreground/60">{result.ticket.subject}</p>
              <p className="mt-1 text-xs text-foreground/50">
                Last updated {new Date(result.ticket.updatedAt).toLocaleString()}
              </p>
              <div className="mt-4 space-y-3">
                {result.ticket.messages.map((m, i) => (
                  <div key={`${m.createdAt}-${i}`} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-foreground/55">
                      <span>{m.senderType}</span>
                      <span>{new Date(m.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          <p className="mt-3 text-xs text-foreground/50">Request ID: {result.requestId}</p>
        </section>
      ) : null}

      <p className="mt-6 text-sm text-foreground/65">
        Need a new request?{" "}
        <Link href="/support" className="font-semibold underline">
          Open a support ticket
        </Link>
        .
      </p>
    </main>
  );
}
