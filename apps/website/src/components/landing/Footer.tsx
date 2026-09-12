"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { brandIconPath } from "@/lib/site";

export default function Footer() {
  return (
    <footer
      id="download"
      className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-10"
    >
      {/* CTA Box */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="glass-strong relative overflow-hidden rounded-3xl px-6 py-12 text-center sm:px-8 sm:py-14"
      >
        {/* Decorative Glows (contained by overflow-hidden) */}
        <div 
          aria-hidden="true" 
          className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-biz-600/30 blur-3xl" 
        />
        <div 
          aria-hidden="true" 
          className="pointer-events-none absolute -bottom-24 -right-10 h-64 w-64 rounded-full bg-biz-300/30 blur-3xl" 
        />

        <h2 className="relative text-3xl font-black tracking-tight sm:text-5xl">
          Ready to run your <span className="text-gradient">business</span>?
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-sm sm:text-base text-foreground/70">
          Try BizFlow instantly in your browser, or download the desktop build
          for Windows, macOS and Linux.
        </p>

        <div className="relative mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/app"
            className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-biz-400 to-biz-600 px-7 py-3.5 font-semibold text-white transition hover:scale-[1.03]"
          >
            Try in browser
          </Link>
          <Link
            href="/download"
            className="glass w-full sm:w-auto rounded-2xl px-7 py-3.5 font-semibold transition hover:bg-white/10"
          >
            Download for desktop
          </Link>
        </div>
      </motion.div>

      {/* Bottom Bar */}
      <div className="mt-10 flex flex-col items-center justify-between gap-6 text-sm text-foreground/50 md:flex-row">
        <div className="flex flex-wrap items-center justify-center gap-2 text-center">
          <Image
            src={brandIconPath}
            alt="BizFlow logo"
            width={24}
            height={24}
            className="rounded-md"
          />
          <span>© {new Date().getFullYear()} BizFlow. All rights reserved.</span>
        </div>

        {/* Links with flex-wrap & responsive gap */}
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <a href="#plugins" className="transition hover:text-foreground">
            Modules
          </a>
          <a href="#features" className="transition hover:text-foreground">
            Features
          </a>
          <Link href="/app" className="transition hover:text-foreground">
            Launch
          </Link>
          <Link href="/support" className="transition hover:text-foreground">
            Support
          </Link>
          <Link href="/status" className="transition hover:text-foreground">
            Status
          </Link>
          <Link href="/legal/terms" className="transition hover:text-foreground">
            Terms
          </Link>
          <Link href="/legal/privacy" className="transition hover:text-foreground">
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}