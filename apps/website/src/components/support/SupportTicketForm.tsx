"use client";

import { useState } from "react";
import Feedback from "@/components/Feedback";
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

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  billing: "Billing",
  installation: "Installation",
  bug: "Bug",
  refund: "Refund",
};

const PRIORITY_LABELS: Record<string, string> = {
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
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
            {Object.entries(CATEGORY_LABELS).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span>Priority</span>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2"
          >
            {Object.entries(PRIORITY_LABELS).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
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

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Creating ticket..." : "Create support ticket"}
        </button>
        <p className="text-xs text-foreground/50">
          You&apos;ll get a ticket ID straight away and a copy by email.
        </p>
      </div>

      {result ? (
        result.ok && result.ticket ? (
          <Feedback
            tone="success"
            title={`Ticket ${result.ticket.publicId} created`}
            message={
              <>
                We&apos;ve logged your request. A confirmation is on its way to{" "}
                <span className="font-medium text-foreground/90">{email}</span>.
              </>
            }
            referenceId={result.ticket.publicId}
            referenceLabel="Ticket ID"
            details={[
              { label: "Status", value: result.ticket.status },
              { label: "Priority", value: PRIORITY_LABELS[priority] ?? priority },
              { label: "Category", value: CATEGORY_LABELS[category] ?? category },
              { label: "Request ID", value: result.requestId },
            ]}
            nextSteps={[
              `A confirmation email is sent to ${email} — check spam if it hasn't arrived within a few minutes.`,
              priority === "urgent"
                ? "Urgent tickets are picked up the same working day."
                : "We usually reply within one business day (Mon–Fri).",
              "Keep your ticket ID — you'll need it to check progress or add more detail.",
            ]}
            actions={[
              { label: "Track this ticket", href: "/support/status" },
              {
                label: "Send another ticket",
                variant: "secondary",
                onClick: () => setResult(null),
              },
            ]}
          />
        ) : (
          <Feedback
            tone="error"
            title="We couldn't create your ticket"
            message={
              <>
                {result.error ?? "Something went wrong on our side."} Your message is still
                in the form above — nothing was lost.
              </>
            }
            referenceId={result.requestId !== "n/a" ? result.requestId : undefined}
            referenceLabel="Request ID"
            nextSteps={[
              "Try again in a moment — most failures here are short-lived network blips.",
              "If it keeps failing, email medhatjachour8@gmail.com and we'll open the ticket for you.",
            ]}
            actions={[
              { label: "Retry", variant: "secondary", onClick: () => setResult(null) },
            ]}
          />
        )
      ) : null}
    </form>
  );
}
