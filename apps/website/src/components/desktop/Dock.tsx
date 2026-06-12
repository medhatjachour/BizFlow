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
      className="pointer-events-auto fixed bottom-4 left-1/2 z-[9999] -translate-x-1/2"
    >
      <div className="glass-strong flex items-end gap-2 rounded-2xl px-3 py-2 shadow-2xl shadow-black/50">
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
              className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br text-black shadow-lg ${app.accent}`}
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
