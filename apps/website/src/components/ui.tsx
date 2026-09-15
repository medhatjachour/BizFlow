/**
 * Presentational primitives shared by every signed-in surface — the admin
 * dashboard, its drill-down pages, and the customer account page. Keeping them
 * in one place is what makes those pages look like the same product.
 */

import type { ReactNode } from "react";

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass-strong rounded-2xl p-5 ${className}`}>
      {title || actions ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? <h2 className="text-lg font-black tracking-tight">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-sm text-foreground/55">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={title || actions ? "mt-5" : ""}>{children}</div>
    </section>
  );
}

/** A single headline number. `hint` carries the "so what" underneath it. */
export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const toneCls =
    tone === "good"
      ? "text-emerald-300"
      : tone === "warn"
        ? "text-amber-300"
        : tone === "bad"
          ? "text-rose-300"
          : "text-foreground";
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/45">{label}</p>
      <p className={`mt-1.5 text-2xl font-black tracking-tight ${toneCls}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-foreground/50">{hint}</p> : null}
    </div>
  );
}

const TONES = {
  good: "border-emerald-400/30 bg-emerald-500/15 text-emerald-300",
  warn: "border-amber-400/30 bg-amber-500/15 text-amber-300",
  bad: "border-rose-400/30 bg-rose-500/15 text-rose-300",
  info: "border-biz-400/30 bg-biz-500/15 text-biz-200",
  violet: "border-violet-400/30 bg-violet-500/15 text-violet-300",
  neutral: "border-white/15 bg-white/5 text-foreground/70",
} as const;

export type Tone = keyof typeof TONES;

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function fmtMoney(cents: number, currency = "usd"): string {
  const amount = (cents || 0) / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/45">{label}</p>
      <div className="mt-1 break-words text-sm text-foreground/80">{children}</div>
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-white/12 bg-white/[0.03] px-4 py-6 text-center text-sm text-foreground/50">
      {text}
    </p>
  );
}

export function fmtDate(iso?: string | null): string {
  return iso
    ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";
}

export function fmtDateTime(iso?: string | null): string {
  return iso
    ? new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";
}

export function relativeTime(iso?: string | null): string {
  if (!iso) return "never";
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs)) return "unknown";
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 45) return `${days}d ago`;
  return `${Math.round(days / 30)}mo ago`;
}

export const customerStatusTone = (status: string): Tone => {
  if (status === "ACTIVE") return "good";
  if (status === "SUSPENDED") return "bad";
  return "warn";
};

export const licenseStatusTone = (status: string): Tone => {
  if (status === "ACTIVE") return "good";
  if (status === "REVOKED") return "bad";
  return "warn";
};
