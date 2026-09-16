"use client";

import { useState, useEffect ,useMemo} from "react";
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

type FirstRunStep = { title: string; body: string; code?: string };

/**
 * The installers are not signed with commercial certificates yet, so every OS
 * shows its own "unknown publisher" warning on first launch. A visitor who hits
 * that wall without instructions assumes the download is broken or malicious and
 * leaves, so the exact click path is spelled out per platform.
 */
const FIRST_RUN: Record<OSId, { intro: string; steps: FirstRunStep[] }> = {
  windows: {
    intro:
      "The installer isn't signed with a commercial Windows certificate yet, so SmartScreen shows one warning. Here's the exact click path.",
    steps: [
      {
        title: "Run the installer",
        body: "Open the .exe you just downloaded. If Windows shows \u201cWindows protected your PC\u201d, that's the unsigned-build warning, not a virus.",
      },
      {
        title: "Allow it once",
        body: "Click More info, then Run anyway. The install is per-user \u2014 no admin prompt, nothing installed system-wide.",
      },
      {
        title: "Launch BizFlow",
        body: "Open it from the Start menu. Your 14-day trial starts on first launch \u2014 no card, no account.",
      },
    ],
  },
  mac: {
    intro:
      "The .dmg isn't signed with a commercial Apple certificate yet, so macOS blocks the first launch. It takes about a minute to get past.",
    steps: [
      {
        title: "Install",
        body: "Open the .dmg and drag BizFlow into your Applications folder.",
      },
      {
        title: "Open it once",
        body: "Double-clicking may say Apple could not verify BizFlow. Open System Settings \u2192 Privacy & Security, scroll down and click Open Anyway next to BizFlow. On macOS 12 and older: right-click the app \u2192 Open \u2192 Open.",
      },
      {
        title: "If it still refuses",
        body: "Clear the download quarantine flag in Terminal, then open the app again:",
        code: "xattr -dr com.apple.quarantine /Applications/BizFlow.app",
      },
    ],
  },
  linux: {
    intro: "AppImages are a single file you run directly \u2014 no installer and no root access needed.",
    steps: [
      {
        title: "Make it executable",
        body: "AppImage downloads don't carry the execute bit:",
        code: "chmod +x BizFlow-*-linux.AppImage",
      },
      {
        title: "Run it",
        body: "Double-click the file, or launch it from a terminal. Your 14-day trial starts on first launch.",
      },
      {
        title: "If you see a FUSE error",
        body: "Some minimal distros ship without FUSE. Extract and run instead:",
        code: "./BizFlow-*-linux.AppImage --appimage-extract-and-run",
      },
    ],
  },
};

function DownloadPageContent() {
  const searchParams = useSearchParams();
  const prices = usePrices();
  const targets: Target[] = useMemo(() => [
    { id: "suite", name: "Full Suite", icon: "🚀", accent: "from-biz-400 to-biz-600", price: prices.suite, tagline: "Every module, one app" },
    ...PLUGINS.map((p) => ({ id: p.id, name: p.name, icon: p.icon, accent: p.accent, price: prices.modules[p.id] ?? p.price, tagline: p.tagline })),
  ], [prices]);

  const [moduleId, setModuleId] = useState<string>("suite");
  const [os, setOs] = useState<OSId>("windows");
  const autoStart = searchParams.get("autoStart") === "1";

  useEffect(() => {
    (async () => {
      setOs(detectOS());
    })();
  }, []);

  useEffect(() => {
    (async () => {
    const qModule = searchParams.get("module");
    const qOS = searchParams.get("os");

    if (qModule && targets.some((t) => t.id === qModule)) {
      setModuleId(qModule);
    }
    if (qOS && OSES.some((o) => o.id === qOS)) {
      setOs(qOS as OSId);
    }
    })();
  }, [searchParams, targets]);

  const target = targets.find((t) => t.id === moduleId)!;
  const dl = installerFor(moduleId, os);
  const item = moduleId === "suite" ? "suite" : `module:${moduleId}`;
  const firstRun = FIRST_RUN[os];

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

      {/* First launch — getting past the unsigned-build warning */}
      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-biz-500/20 text-xs font-bold text-biz-300">3</span>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/70">
            First launch on {dl.os.name}
          </h2>
        </div>
        <p className="max-w-3xl text-sm text-foreground/60">{firstRun.intro}</p>
        <ol className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {firstRun.steps.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-biz-300">Step {i + 1}</p>
              <p className="mt-1 text-sm font-semibold">{s.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-foreground/55">{s.body}</p>
              {s.code && (
                <code className="mt-2 block break-all rounded-lg bg-black/40 px-2 py-1.5 font-mono text-[11px] text-biz-200">
                  {s.code}
                </code>
              )}
            </li>
          ))}
        </ol>
        <p className="mt-5 text-xs text-foreground/45">
          Commercial code signing is on the roadmap. Until then these warnings are just your operating system
          being cautious about a new publisher — nothing about the download itself.
        </p>
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
