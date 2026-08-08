"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { withBasePath } from "@/lib/site";

interface Resolution {
  state: "ready" | "building" | "fallback";
  url: string;
  fileName: string;
  productName: string;
}

interface Props {
  moduleId: string;
  os: string;
  productName: string;
  autoStart?: boolean;
  className?: string;
  children?: React.ReactNode;
}

type Phase = "idle" | "working" | "building" | "ready" | "error";

const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 180; // ~15 min ceiling

/**
 * Downloads a desktop build, building it on the server first if it doesn't
 * exist yet. Clicking POSTs to /api/download; if the build is in progress we
 * poll until the artifact is ready, then start the download automatically.
 */
export default function DownloadButton({
  moduleId,
  os,
  productName,
  autoStart = false,
  className,
  children,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollsRef = useRef(0);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Reset to idle if the selection changes mid-flight.
  useEffect(() => {
    (async () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollsRef.current = 0;
      autoStartedRef.current = false;
      setPhase("idle");
      setMessage(null);
    })();
  }, [moduleId, os]);

  const startDownload = useCallback((url: string) => {
    track("download_start", { module: moduleId, os });
    // Navigate to the artifact; the file's headers trigger the save.
    window.location.href = url;
  }, [moduleId, os]);

  const openFallback = useCallback((url: string, forceSameTab = false) => {
    track("download_fallback", { module: moduleId, os });
    if (forceSameTab) {
      window.location.href = url;
      return;
    }

    const popup = window.open(url, "_blank", "noopener,noreferrer");
    // Some browsers block popups unless opened from a direct click.
    if (!popup) {
      window.location.href = url;
    }
  }, [moduleId, os]);

  const beginPolling = useCallback(() => {
    setPhase("building");
    setMessage("Preparing your build on the server… this can take a few minutes.");
    pollsRef.current = 0;
    pollRef.current = setInterval(async () => {
      pollsRef.current += 1;
      if (pollsRef.current > MAX_POLLS) {
        if (pollRef.current) clearInterval(pollRef.current);
        setPhase("error");
        setMessage("Build is taking longer than expected. Please try again shortly.");
        return;
      }
      try {
        const res = await fetch(
          withBasePath(
            `/api/download?module=${encodeURIComponent(moduleId)}&os=${encodeURIComponent(os)}`
          ),
          { cache: "no-store" }
        );
        const data = (await res.json()) as Resolution;
        if (data.state === "ready") {
          if (pollRef.current) clearInterval(pollRef.current);
          setPhase("ready");
          setMessage("Your build is ready — starting download.");
          startDownload(data.url);
        }
      } catch {
        /* keep polling */
      }
    }, POLL_INTERVAL_MS);
  }, [moduleId, os, startDownload]);

  const onClick = useCallback(async () => {
    setPhase("working");
    setMessage(null);
    track("download_request", { module: moduleId, os });
    try {
      const res = await fetch(withBasePath("/api/download"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: moduleId, os }),
      });
      const data = (await res.json()) as Resolution;

      if (data.state === "ready") {
        setPhase("ready");
        startDownload(data.url);
      } else if (data.state === "building") {
        beginPolling();
      } else {
        // Fallback: open the releases page so the link never dead-ends.
        setPhase("idle");
        openFallback(data.url, autoStart);
      }
    } catch {
      setPhase("error");
      setMessage("Couldn't start the download. Please try again.");
    }
  }, [autoStart, beginPolling, moduleId, openFallback, os, startDownload]);

  useEffect(() => {
    (async () => {
      if (!autoStart || autoStartedRef.current) return;
      if (phase !== "idle") return;
      autoStartedRef.current = true;
      void onClick();
    })();
  }, [autoStart, onClick, phase]);

  const busy = phase === "working" || phase === "building";
  const label =
    phase === "working"
      ? "Preparing…"
      : phase === "building"
        ? "Building…"
        : phase === "ready"
          ? "Downloading…"
          : children ?? `Download ${productName}`;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        aria-busy={busy}
        className={className}
      >
        {busy && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        )}
        {label}
      </button>
      {message && (
        <p
          className={`text-xs ${
            phase === "error" ? "text-rose-300" : "text-foreground/55"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
