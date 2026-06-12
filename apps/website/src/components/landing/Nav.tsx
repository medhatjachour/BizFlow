"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export default function Nav() {
  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4"
    >
      <nav className="glass-strong flex w-full max-w-6xl items-center justify-between rounded-2xl px-5 py-3 shadow-lg shadow-black/40">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/brand/bizflow-icon.png"
            alt="BizFlow logo"
            width={32}
            height={32}
            className="rounded-lg"
            priority
          />
          <span className="text-lg font-semibold tracking-tight">BizFlow</span>
        </Link>

        <div className="hidden items-center gap-8 text-sm text-foreground/70 md:flex">
          <a href="#plugins" className="transition hover:text-foreground">
            Modules
          </a>
          <a href="#pricing" className="transition hover:text-foreground">
            Pricing
          </a>
          <a href="#request" className="transition hover:text-foreground">
            Custom
          </a>
        </div>

        <Link
          href="/app"
          className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-biz-400 to-biz-600 px-4 py-2 text-sm font-semibold text-white transition hover:shadow-[0_0_24px_rgba(5,121,203,0.6)]"
        >
          Launch App
        </Link>
      </nav>
    </motion.header>
  );
}
