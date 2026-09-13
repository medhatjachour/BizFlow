"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { withBasePath } from "@/lib/site";

/**
 * Shared, inline result panel for every user-initiated action on the site.
 *
 * Deliberately not a toast: these panels stay on screen, are reachable by
 * screen readers, and carry the three things a person needs after clicking
 * something — what just happened, a reference they can quote back to us, and
 * plain-language next steps.
 */

export type FeedbackTone = "success" | "error" | "info" | "warning";

export interface FeedbackAction {
  label: string;
  /** Internal path (basePath applied automatically) or an absolute http(s) URL. */
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}

export interface FeedbackDetail {
  label: string;
  value: string;
}

export interface FeedbackProps {
  tone: FeedbackTone;
  title: string;
  message?: ReactNode;
  /** Ticket id, request ref, order/session id, license key… rendered with a copy button. */
  referenceId?: string;
  referenceLabel?: string;
  /** Ordered "what happens next" list. */
  nextSteps?: string[];
  /** Extra labelled values (status, amount, email…). */
  details?: FeedbackDetail[];
  actions?: FeedbackAction[];
  className?: string;
}

const TONES: Record<
  FeedbackTone,
  {
    border: string;
    iconBg: string;
    iconColor: string;
    titleColor: string;
    stepBg: string;
    stepColor: string;
  }
> = {
  success: {
    border: "border-emerald-400/25",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-300",
    titleColor: "text-emerald-200",
    stepBg: "bg-emerald-500/20",
    stepColor: "text-emerald-200",
  },
  error: {
    border: "border-rose-400/30",
    iconBg: "bg-rose-500/15",
    iconColor: "text-rose-300",
    titleColor: "text-rose-200",
    stepBg: "bg-rose-500/20",
    stepColor: "text-rose-200",
  },
  warning: {
    border: "border-amber-400/30",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-300",
    titleColor: "text-amber-200",
    stepBg: "bg-amber-500/20",
    stepColor: "text-amber-200",
  },
  info: {
    border: "border-sky-400/25",
    iconBg: "bg-sky-500/15",
    iconColor: "text-sky-300",
    titleColor: "text-sky-200",
    stepBg: "bg-sky-500/20",
    stepColor: "text-sky-200",
  },
};

function ToneIcon({ tone, className }: { tone: FeedbackTone; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
    focusable: false,
  };

  switch (tone) {
    case "success":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8.5 12.5 2.5 2.5 4.5-5.5" />
        </svg>
      );
    case "error":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m9 9 6 6M15 9l-6 6" />
        </svg>
      );
    case "warning":
      return (
        <svg {...common}>
          <path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
      );
  }
}

const isExternal = (href: string) => /^https?:\/\//i.test(href);

export default function Feedback({
  tone,
  title,
  message,
  referenceId,
  referenceLabel = "Reference",
  nextSteps,
  details,
  actions,
  className = "",
}: FeedbackProps) {
  const t = TONES[tone];
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const copy = useCallback(async () => {
    if (!referenceId) return;
    try {
      await navigator.clipboard.writeText(referenceId);
    } catch {
      // Clipboard API needs a secure context; fall back for the rest.
      const ta = document.createElement("textarea");
      ta.value = referenceId;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* nothing else we can do */
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }, [referenceId]);

  const assertive = tone === "error" || tone === "warning";

  return (
    <div
      role={assertive ? "alert" : "status"}
      aria-live={assertive ? "assertive" : "polite"}
      className={`glass-strong rounded-2xl border p-5 text-sm ${t.border} ${className}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${t.iconBg} ${t.iconColor}`}
        >
          <ToneIcon tone={tone} className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className={`font-semibold ${t.titleColor}`}>{title}</p>
            {message ? <div className="mt-1 text-foreground/70">{message}</div> : null}
          </div>

          {referenceId ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <span className="text-[11px] uppercase tracking-wide text-foreground/50">
                {referenceLabel}
              </span>
              <code className="font-mono text-sm text-biz-300">{referenceId}</code>
              <button
                type="button"
                onClick={copy}
                className="ml-auto rounded-md border border-white/15 px-2 py-1 text-xs font-medium transition hover:bg-white/10"
                aria-label={`Copy ${referenceLabel.toLowerCase()}`}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          ) : null}

          {details?.length ? (
            <dl className="grid gap-x-6 sm:grid-cols-2">
              {details.map((d) => (
                <div
                  key={d.label}
                  className="flex items-baseline justify-between gap-3 border-b border-white/5 py-1.5 last:border-0"
                >
                  <dt className="text-xs text-foreground/50">{d.label}</dt>
                  <dd className="text-right text-xs font-medium text-foreground/80">
                    {d.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {nextSteps?.length ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/50">
                What happens next
              </p>
              <ol className="mt-2 space-y-1.5">
                {nextSteps.map((step, i) => (
                  <li key={i} className="flex gap-2 text-foreground/70">
                    <span
                      className={`mt-[3px] grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold ${t.stepBg} ${t.stepColor}`}
                    >
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {actions?.length ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {actions.map((a) => {
                const cls =
                  a.variant === "secondary"
                    ? "glass rounded-xl px-4 py-2 text-xs font-semibold transition hover:bg-white/10"
                    : "rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90";

                if (a.href) {
                  return isExternal(a.href) ? (
                    <a
                      key={a.label}
                      href={a.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cls}
                    >
                      {a.label}
                    </a>
                  ) : (
                    <Link key={a.label} href={withBasePath(a.href)} className={cls}>
                      {a.label}
                    </Link>
                  );
                }

                return (
                  <button key={a.label} type="button" onClick={a.onClick} className={cls}>
                    {a.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
