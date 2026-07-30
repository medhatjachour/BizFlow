"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { APPS, getApp } from "@/lib/apps";
import type { WindowInstance } from "@/lib/types";
import Window from "./Window";
import Dock from "./Dock";
import MenuBar from "./MenuBar";

export default function Desktop() {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [windows, setWindows] = useState<WindowInstance[]>([]);
  const nextId = useRef(1);
  const topZ = useRef(10);
  const searchParams = useSearchParams();

  const focus = useCallback((id: number) => {
    setWindows((ws) => {
      const top = (topZ.current += 1);
      return ws.map((w) => (w.id === id ? { ...w, z: top } : w));
    });
  }, []);

  const launch = useCallback((appId: string) => {
    const app = getApp(appId);
    if (!app) return;

    setWindows((ws) => {
      // If minimized instance exists, restore + focus it instead of duplicating.
      const existing = ws.find((w) => w.appId === appId && w.minimized);
      if (existing) {
        const top = (topZ.current += 1);
        return ws.map((w) =>
          w.id === existing.id ? { ...w, minimized: false, z: top } : w
        );
      }

      const id = nextId.current++;
      const top = (topZ.current += 1);
      const count = ws.length;
      const win: WindowInstance = {
        id,
        appId,
        x: 80 + count * 28,
        y: 70 + count * 26,
        width: app.defaultSize.width,
        height: app.defaultSize.height,
        z: top,
        minimized: false,
        maximized: false,
      };
      return [...ws, win];
    });
  }, []);

  // Auto-open a module when arriving via /app?module=<id> (from the picker).
  useEffect(() => {
    const moduleId = searchParams.get("module");
    if (moduleId && getApp(moduleId)) launch(moduleId);
  }, [searchParams, launch]);

  const close = useCallback((id: number) => {
    setWindows((ws) => ws.filter((w) => w.id !== id));
  }, []);

  const minimize = useCallback((id: number) => {
    setWindows((ws) =>
      ws.map((w) => (w.id === id ? { ...w, minimized: true } : w))
    );
  }, []);
  
  const toggleMaximize = useCallback((id: number) => {
    setWindows((ws) => {
      const top = (topZ.current += 1); // Bring to front on maximize
      return ws.map((w) =>
        w.id === id ? { ...w, maximized: !w.maximized, z: top } : w
      );
    });
  }, []);

  const openAppIds = windows
    .filter((w) => !w.minimized)
    .map((w) => w.appId);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <MenuBar />

      {/* Desktop surface (window drag bounds) */}
      <div
        ref={surfaceRef}
        className="absolute inset-x-0 bottom-0 top-9 overflow-hidden"
      >
        {/* Welcome hint when no windows are open */}
        <AnimatePresence>
          {windows.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 grid place-items-center"
            >
              <div className="text-center">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-3xl shadow-2xl shadow-biz-700/40"
                >
                  <Image
                    src="/brand/bizflow-icon.png"
                    alt="BizFlow logo"
                    width={80}
                    height={80}
                    className="rounded-3xl"
                    priority
                  />
                </motion.div>
                <h2 className="text-2xl font-bold">Welcome to BizFlow</h2>
                <p className="mt-1 text-foreground/60">
                  Pick a module from the dock to try it live.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {windows.map((w) => {
            if (w.minimized) return null;
            const app = getApp(w.appId);
            if (!app) return null;
            const AppComponent = app.component;
            return (
              <Window
                key={w.id}
                instance={w}
                title={app.title}
                constraints={surfaceRef}
                onFocus={() => focus(w.id)}
                onClose={() => close(w.id)}
                onMinimize={() => minimize(w.id)}
                onToggleMaximize={() => toggleMaximize(w.id)}
              >
                <AppComponent />
              </Window>
            );
          })}
        </AnimatePresence>
      </div>

      <Dock onLaunch={launch} openAppIds={openAppIds} />

      {/* Hidden, but keeps APPS referenced for clarity */}
      <span className="sr-only">{APPS.length} apps available</span>
    </div>
  );
}
