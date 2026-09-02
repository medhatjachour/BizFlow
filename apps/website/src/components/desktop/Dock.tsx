"use client";

import { motion } from "framer-motion";
import { APPS } from "@/lib/apps";

interface DockProps {
  onLaunch: (appId: string) => void;
  openAppIds: string[];
}

export default function Dock({ onLaunch, openAppIds }: DockProps) {
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
      className="pointer-events-auto fixed bottom-3 left-1/2 z-30 w-[calc(100%-1.5rem)] max-w-max -translate-x-1/2 sm:bottom-4 sm:w-auto"
    >
      <div className="glass-strong no-scrollbar flex max-w-full items-end gap-2 overflow-x-auto rounded-xl px-2 py-2 shadow-2xl shadow-black/50 sm:rounded-2xl sm:px-3">
        {APPS.map((app) => (
          <button
            key={app.id}
            onClick={() => onLaunch(app.id)}
            title={app.title}
            className="group relative flex flex-col items-center"
          >
            <motion.span
              whileHover={{ y: -10, scale: 1.18 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-black shadow-lg sm:h-12 sm:w-12 sm:rounded-xl ${app.accent}`}
            >
              {app.icon}
            </motion.span>
            <span className="pointer-events-none absolute -top-9 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-xs opacity-0 transition group-hover:opacity-100">
              {app.title}
            </span>
            <span
              className={`mt-1 h-1 w-1 rounded-full transition ${
                openAppIds.includes(app.id) ? "bg-aurora-cyan" : "bg-transparent"
              }`}
            />
          </button>
        ))}
      </div>
    </motion.div>
  );
}
