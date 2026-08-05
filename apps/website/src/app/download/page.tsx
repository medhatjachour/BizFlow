"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PLUGINS } from "@/lib/plugins";
import { OSES, detectOS, installerFor, type OSId } from "@/lib/downloads";
import { brandIconPath } from "@/lib/site";
import BuyButton from "@/components/BuyButton";
import DownloadButton from "@/components/DownloadButton";
import { usePrices } from "@/components/usePrices";
import { downloadPageUrlFor } from "@/lib/plugins";

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

type Target = { id: string; name: string; icon: string; accent: string; price: number; tagline: string };

function DownloadPageContent() {
  const searchParams = useSearchParams();
  const prices = usePrices();
  const targets: Target[] = [
    { id: "suite", name: "Full Suite", icon: "🚀", accent: "from-biz-400 to-biz-600", price: prices.suite, tagline: "Every module, one app" },
    ...PLUGINS.map((p) => ({ id: p.id, name: p.name, icon: p.icon, accent: p.accent, price: prices.modules[p.id] ?? p.price, tagline: p.tagline })),
  ];

  const [moduleId, setModuleId] = useState<string>("suite");
  const [os, setOs] = useState<OSId>("windows");
  const autoStart = searchParams.get("autoStart") === "1";

  useEffect(() => {
    setOs(detectOS());
  }, []);

  useEffect(() => {
    const qModule = searchParams.get("module");
    const qOS = searchParams.get("os");

    if (qModule && targets.some((t) => t.id === qModule)) {
      setModuleId(qModule);
    }
    if (qOS && OSES.some((o) => o.id === qOS)) {
      setOs(qOS as OSId);
    }
  }, [searchParams, targets]);

  const target = targets.find((t) => t.id === moduleId)!;
  const dl = installerFor(moduleId, os);
  const item = moduleId === "suite" ? "suite" : `module:${moduleId}`;

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-5xl px-4 pb-24 pt-28">
      {/* Header */}
      <header className="mb-10 text-center">
        <Link href="/" className="mb-6 inline-flex items-center gap-2">
          <Image src={brandIconPath} alt="BizFlow" width={28} height={28} className="rounded-lg" />
          <span className="font-semibold">BizFlow</span>
        </Link>
        <h1 className="bg-gradient-to-r from-white to-foreground/60 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
          Build your download
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-foreground/60">
          Pick the modules you need and your operating system. We&apos;ll hand you the exact installer — no
          sifting through release pages.
        </p>
      </header>

      {/* Step 1 — choose module */}
      <section className="mb-10">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-biz-500/20 text-xs font-bold text-biz-300">1</span>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/70">Choose what to install</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {targets.map((t) => {
            const active = t.id === moduleId;
            return (
              <button
                key={t.id}
                onClick={() => setModuleId(t.id)}
                className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-biz-400/70 bg-biz-500/10 shadow-[0_0_24px_rgba(5,121,203,0.25)]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                }`}
              >
                <div className={`mb-2 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-xl ${t.accent}`}>
                  {t.icon}
                </div>
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-foreground/50">{t.tagline}</p>
                <p className="mt-2 text-xs font-semibold text-biz-300">{usd(t.price)}</p>
                {active && <span className="absolute right-3 top-3 text-biz-300">✓</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 2 — choose OS */}
      <section className="mb-10">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-biz-500/20 text-xs font-bold text-biz-300">2</span>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/70">Choose your system</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {OSES.map((o) => {
            const active = o.id === os;
            return (
              <button
                key={o.id}
                onClick={() => setOs(o.id)}
                className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-biz-400/70 bg-biz-500/10"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                }`}
              >
                <span className="text-2xl">{o.emoji}</span>
                <div>
                  <p className="text-sm font-semibold">{o.name}</p>
                  <p className="text-[11px] text-foreground/50">{o.kind}</p>
                </div>
                {active && <span className="ml-auto text-biz-300">✓</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* Result */}
      <section className="glass-strong rounded-3xl border border-white/10 p-6 sm:p-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">You&apos;re getting</p>
            <h3 className="mt-1 text-2xl font-bold">
              {target.name} <span className="text-foreground/40">·</span> {dl.os.name}
            </h3>
            <p className="mt-1 text-sm text-foreground/60">
              {dl.os.requirement} · {dl.os.kind}
            </p>
            <p className="mt-2 font-mono text-xs text-biz-300">{dl.fileName}</p>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
            <DownloadButton
              moduleId={moduleId}
              os={os}
              productName={target.name}
              autoStart={autoStart}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-6 py-3 text-sm font-semibold text-white transition hover:shadow-[0_0_24px_rgba(5,121,203,0.6)] disabled:opacity-70"
            />
            <BuyButton
              item={item}
              label={`Buy license · ${usd(target.price)}`}
              fallbackUrl={downloadPageUrlFor(moduleId, { os })}
              className="rounded-xl border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-foreground/80 transition hover:bg-white/[0.08]"
            />
          </div>
        </div>

        {!dl.direct && (
          <p className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-xs text-amber-200/80">
            On-demand server builds aren&apos;t configured yet, so this opens the releases page — grab the{" "}
            <span className="font-semibold">{target.name} · {dl.os.name}</span> file there. (Set
            <span className="font-mono"> NEXT_PUBLIC_DOWNLOAD_BASE</span> and the{" "}
            <span className="font-mono">GITHUB_BUILD_*</span> vars to enable one-click builds.)
          </p>
        )}

        <ul className="mt-6 grid grid-cols-1 gap-2 text-xs text-foreground/55 sm:grid-cols-3">
          <li className="flex items-center gap-2">✓ Works 100% offline</li>
          <li className="flex items-center gap-2">✓ Your data stays on your device</li>
          <li className="flex items-center gap-2">✓ Free updates within the version</li>
        </ul>
      </section>

      {/* Try-before-download */}
      <div className="mt-8 text-center text-sm text-foreground/50">
        Not sure yet?{" "}
        <Link href={moduleId === "suite" ? "/app" : `/app?module=${moduleId}`} className="font-semibold text-biz-300 hover:underline">
          Try {target.name} live in your browser →
        </Link>
      </div>
    </main>
  );
}

export default function DownloadPage() {
  return (
    <Suspense fallback={<main className="mx-auto min-h-screen w-full max-w-5xl px-4 pb-24 pt-28" />}>
      <DownloadPageContent />
    </Suspense>
  );
}
