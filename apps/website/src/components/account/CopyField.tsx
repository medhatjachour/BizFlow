"use client";

import { useState } from "react";

/**
 * Licence key / device-id field with copy-to-clipboard.
 *
 * Buyers routinely need to paste the key into the desktop app's Settings screen,
 * so copy has to be one click and must fall back gracefully when the Clipboard
 * API is unavailable (older browsers, non-secure origins).
 */
export default function CopyField({
  label,
  value,
  hint,
  mono = true,
}: {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
}) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("error");
    }
    setTimeout(() => setState("idle"), 1800);
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/45">{label}</p>
        <button
          type="button"
          onClick={copy}
          className="rounded-lg border border-white/15 px-2 py-1 text-[11px] font-semibold text-foreground/70 transition hover:border-biz-400/40 hover:text-foreground"
        >
          {state === "copied" ? "Copied ✓" : state === "error" ? "Select manually" : "Copy"}
        </button>
      </div>
      <p className={`mt-1.5 select-all break-all text-sm ${mono ? "font-mono tracking-wide" : ""}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-foreground/50">{hint}</p> : null}
    </div>
  );
}
