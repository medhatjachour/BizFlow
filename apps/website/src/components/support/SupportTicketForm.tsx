"use client";

import { useState } from "react";
import { withBasePath } from "@/lib/site";

type CreateTicketResponse = {
  ok: boolean;
  requestId: string;
  ticket?: {
    publicId: string;
    status: string;
    createdAt: string;
  };
  error?: string;
};

export default function SupportTicketForm() {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreateTicketResponse | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch(withBasePath("/api/support/tickets"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, subject, category, priority, message }),
      });

      const data = (await res.json()) as CreateTicketResponse;
      setResult(data);
      if (res.ok) {
        setSubject("");
        setMessage("");
      }
    } catch {
      setResult({ ok: false, requestId: "n/a", error: "Network error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="glass-strong mt-6 space-y-4 rounded-2xl p-5">
      <div className="grid gap-4 sm:grid-cols-2">
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
          <span>Subject</span>
          <input
            required
            minLength={4}
            maxLength={160}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2"
          >
            <option value="general">General</option>
            <option value="billing">Billing</option>
            <option value="installation">Installation</option>
            <option value="bug">Bug</option>
            <option value="refund">Refund</option>
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span>Priority</span>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2"
          >
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>
      </div>

      <label className="space-y-1 text-sm">
        <span>Message</span>
        <textarea
          required
          minLength={10}
          maxLength={6000}
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {submitting ? "Creating ticket..." : "Create support ticket"}
      </button>

      {result ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
          {result.ok && result.ticket ? (
            <p>
              Ticket created: <strong>{result.ticket.publicId}</strong> ({result.ticket.status})
            </p>
          ) : (
            <p className="text-rose-300">{result.error ?? "Could not create ticket"}</p>
          )}
          <p className="mt-1 text-xs text-foreground/60">Request ID: {result.requestId}</p>
        </div>
      ) : null}
    </form>
  );
}
