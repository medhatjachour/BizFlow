"use client";

import { useEffect, useState } from "react";
import { OSES, installerFor, detectOS, type OSId } from "@/lib/downloads";

interface ModuleRef {
  id: string;
  name: string;
}

/**
 * Post-purchase panel: shows the license key (copyable) and OS-aware download
 * buttons for every module the customer just bought.
 */
export default function LicensePanel({
  licenseKey,
  modules,
}: {
  licenseKey: string;
  modules: ModuleRef[];
}) {
  const [os, setOs] = useState<OSId>("windows");
  const [copied, setCopied] = useState(false);

  useEffect(() => setOs(detectOS()), []);

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(licenseKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — user can select manually */
    }
  }

  return (
    <div className="mt-8 text-left">
      {/* License key */}
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
        Your license key
      </p>
      <div className="mt-2 flex items-center gap-2">
        <code className="glass flex-1 select-all rounded-xl px-4 py-3 font-mono text-sm tracking-wider">
          {licenseKey}
        </code>
        <button
          type="button"
          onClick={copyKey}
          className="rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-4 py-3 text-sm font-semibold text-white transition hover:scale-[1.03]"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-2 text-xs text-foreground/50">
        Keep this safe — enter it in BizFlow under Settings → License to activate.
      </p>

      {/* OS picker */}
      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-foreground/50">
        Download for
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {OSES.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setOs(o.id)}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
              os === o.id
                ? "bg-gradient-to-r from-biz-400 to-biz-600 text-white"
                : "glass hover:bg-white/10"
            }`}
          >
            <span className="mr-1">{o.emoji}</span>
            {o.name}
          </button>
        ))}
      </div>

      {/* Download buttons */}
      <div className="mt-4 flex flex-col gap-2">
        {modules.map((m) => {
          const dl = installerFor(m.id, os);
          return (
            <a
              key={m.id}
              href={dl.url}
              className="glass-strong flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-white/10"
            >
              <span>Download {m.name}</span>
              <span className="text-foreground/50">{dl.fileName}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
