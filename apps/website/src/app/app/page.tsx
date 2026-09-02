import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import AuroraBackground from "@/components/AuroraBackground";
import Desktop from "@/components/desktop/Desktop";

export const metadata: Metadata = {
  title: "BizFlow Workspace",
  description: "Try every BizFlow module live in your browser.",
};

export default function AppPage() {
  return (
    <>
      <AuroraBackground />
      <main className="relative z-10 flex h-screen min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#07111f]/95 px-4 py-3 shadow-lg shadow-black/25 backdrop-blur sm:px-6">
          <Link href="/" className="text-lg font-semibold text-white transition hover:text-biz-200">
            BizFlow
          </Link>
          <nav className="flex items-center gap-2" aria-label="Website navigation">
            <Link href="/" className="rounded-lg px-3 py-2 text-sm font-semibold text-foreground/75 transition hover:bg-white/10 hover:text-white">
              Website
            </Link>
            <Link href="/download" className="rounded-lg bg-biz-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-biz-400">
              Download
            </Link>
          </nav>
        </header>
        <div className="min-h-0 flex-1">
          <Suspense fallback={null}>
            <Desktop />
          </Suspense>
        </div>
      </main>
    </>
  );
}
