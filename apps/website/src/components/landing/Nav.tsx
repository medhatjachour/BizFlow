"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { brandIconPath } from "@/lib/site";

const LINKS = [
  { href: "#plugins", label: "Modules" },
  { href: "#whats-new", label: "What's new" },
  { href: "#pricing", label: "Pricing" },
  { href: "/download", label: "Download" },
  { href: "#request", label: "Custom" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4"
    >
      <nav className="glass-strong w-full max-w-6xl rounded-2xl px-5 py-3 shadow-lg shadow-black/40">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src={brandIconPath}
              alt="BizFlow logo"
              width={32}
              height={32}
              className="rounded-lg"
              priority
            />
            <span className="text-lg font-semibold tracking-tight">BizFlow</span>
          </Link>

          <div className="hidden items-center gap-8 text-sm text-foreground/70 md:flex">
            {LINKS.map((l) =>
              l.href.startsWith("/") ? (
                <Link key={l.href} href={l.href} className="transition hover:text-foreground">
                  {l.label}
                </Link>
              ) : (
                <a key={l.href} href={l.href} className="transition hover:text-foreground">
                  {l.label}
                </a>
              )
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/app"
              className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-4 py-2 text-sm font-semibold text-white transition hover:shadow-[0_0_24px_rgba(5,121,203,0.6)]"
            >
              Launch App
            </Link>

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="glass grid h-9 w-9 place-items-center rounded-xl text-foreground/80 transition hover:text-foreground md:hidden"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                {open ? (
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu panel */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id="mobile-menu"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="overflow-hidden md:hidden"
            >
              <div className="mt-3 flex flex-col gap-1 border-t border-white/10 pt-3 text-sm">
                {LINKS.map((l) =>
                  l.href.startsWith("/") ? (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-foreground/80 transition hover:bg-white/5 hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  ) : (
                    <a
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-2.5 text-foreground/80 transition hover:bg-white/5 hover:text-foreground"
                    >
                      {l.label}
                    </a>
                  )
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
}
