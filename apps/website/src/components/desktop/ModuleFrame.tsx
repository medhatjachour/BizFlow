"use client";

import { useState } from "react";
import Link from "next/link";
import { getPlugin, demoUrlFor, downloadPageUrlFor } from "@/lib/plugins";

/**
 * Renders a single BizFlow module live inside a desktop window: a thin
 * "try / download" bar on top, and the real BizFlow web app (deep-linked to the
 * module's route) in an iframe below. This is the "try it, then download it"
 * experience for one module.
 */
export default function ModuleFrame({ pluginId }: { pluginId: string }) {
  const plugin = getPlugin(pluginId);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );

  if (!plugin) return null;

  return (
    <div className="flex h-full w-full flex-col bg-black">
      {/* Try / download bar */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-white/5 px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className={`grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br text-base ${plugin.accent}`}
          >
            {plugin.icon}
          </span>
          <div className="leading-tight">
            <p className="text-xs font-semibold">{plugin.name}</p>
            <p className="text-[10px] text-foreground/50">
              Live demo · {plugin.tagline}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/app"
            className="rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-semibold text-foreground/70 transition hover:border-white/30 hover:text-white"
          >
            All modules
          </Link>
          <Link
            href={downloadPageUrlFor(plugin.id)}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-biz-400 to-biz-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:scale-[1.03]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Choose installer
          </Link>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-black/30 px-2 py-1.5 text-[11px]">
        <span className="text-foreground/50">Quick install:</span>
        <Link
          href={downloadPageUrlFor(plugin.id, { os: "windows", autoStart: true })}
          className="rounded-md bg-white/10 px-2 py-1 hover:bg-white/20"
        >
          Windows
        </Link>
        <Link
          href={downloadPageUrlFor(plugin.id, { os: "mac", autoStart: true })}
          className="rounded-md bg-white/10 px-2 py-1 hover:bg-white/20"
        >
          macOS
        </Link>
        <Link
          href={downloadPageUrlFor(plugin.id, { os: "linux", autoStart: true })}
          className="rounded-md bg-white/10 px-2 py-1 hover:bg-white/20"
        >
          Linux
        </Link>
      </div>

      {/* Live app */}
      <div className="relative min-h-0 flex-1">
        {status !== "ready" && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/70 text-center">
            {status === "loading" ? (
              <div className="flex flex-col items-center gap-3">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-biz-300 border-t-transparent" />
                <p className="text-sm text-foreground/70">
                  Loading {plugin.name}…
                </p>
              </div>
            ) : (
              <div className="max-w-xs px-6 text-sm text-foreground/70">
                <p className="mb-1 font-semibold text-rose-400">
                  BizFlow isn&apos;t running
                </p>
                <p>
                  Start the web port, then reopen this window:
                  <code className="mt-2 block text-xs text-biz-300">
                    npm run dev:web
                  </code>
                </p>
              </div>
            )}
          </div>
        )}
        <iframe
          title={plugin.name}
          src={demoUrlFor(plugin)}
          onLoad={() => setStatus("ready")}
          onError={() => setStatus("error")}
          allow="clipboard-read; clipboard-write; fullscreen"
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
}
