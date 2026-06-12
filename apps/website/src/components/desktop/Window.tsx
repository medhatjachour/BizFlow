"use client";

import { useRef, useState, type ReactNode } from "react";
import { motion, useDragControls, useMotionValue } from "framer-motion";
import type { WindowInstance } from "@/lib/types";

interface WindowProps {
  instance: WindowInstance;
  title: string;
  children: ReactNode;
  constraints: React.RefObject<HTMLElement | null>;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
}

const MIN_W = 240;
const MIN_H = 160;

export default function Window({
  instance,
  title,
  children,
  constraints,
  onFocus,
  onClose,
  onMinimize,
  onToggleMaximize,
}: WindowProps) {
  const controls = useDragControls();
  const x = useMotionValue(instance.x);
  const y = useMotionValue(instance.y);
  const [size, setSize] = useState({
    w: instance.width,
    h: instance.height,
  });

  const maximized = instance.maximized;

  const startResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = size.w;
    const startH = size.h;

    const move = (ev: PointerEvent) => {
      setSize({
        w: Math.max(MIN_W, startW + ev.clientX - startX),
        h: Math.max(MIN_H, startH + ev.clientY - startY),
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <motion.div
      drag={!maximized}
      dragControls={controls}
      dragListener={false}
      dragMomentum={false}
      dragConstraints={constraints}
      onPointerDown={onFocus}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      style={{
        x: maximized ? 0 : x,
        y: maximized ? 0 : y,
        width: maximized ? "100%" : size.w,
        height: maximized ? "100%" : size.h,
        zIndex: instance.z,
      }}
      className="glass-strong absolute left-0 top-0 flex flex-col overflow-hidden rounded-xl shadow-2xl shadow-black/50 ring-1 ring-white/10"
    >
      {/* Title bar */}
      <div
        onPointerDown={(e) => {
          if (!maximized) controls.start(e);
        }}
        onDoubleClick={onToggleMaximize}
        className="flex shrink-0 cursor-grab items-center gap-2 border-b border-white/10 bg-white/5 px-3 py-2 active:cursor-grabbing"
      >
        <div className="flex items-center gap-1.5">
          <button
            onClick={onClose}
            className="group grid cursor-pointer h-3.5 w-3.5 place-items-center rounded-full bg-rose-500"
            aria-label="Close"
          >
            <span className="text-[8px] leading-none text-black/0 group-hover:text-black/70">
              ×
            </span>
          </button>

          <button
            onClick={onToggleMaximize}
            className="group grid cursor-pointer h-3.5 w-3.5 place-items-center rounded-full bg-emerald-400"
            aria-label="Maximize"
          >
            <span className="text-[8px] leading-none text-black/0 group-hover:text-black/70">
              +
            </span>
          </button>
          <button
            onClick={onMinimize}
            className="group grid cursor-pointer h-3.5 w-3.5 place-items-center rounded-full bg-yellow-400"
            aria-label="Minimize"
          >
            <span className="text-[8px] leading-none text-black/0 group-hover:text-black/70">
              −
            </span>
          </button>
        </div>
        <span className="pointer-events-none mx-auto select-none text-xs font-medium text-foreground/70">
          {title}
        </span>
        <span className="w-12" />
      </div>

      {/* Content */}
      <div className="relative min-h-0 flex-1 overflow-auto">{children}</div>

      {/* Resize handle */}
      {!maximized && (
        <div
          onPointerDown={startResize}
          className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
        >
          <span className="absolute bottom-1 right-1 h-2 w-2 border-b-2 border-r-2 border-white/30" />
        </div>
      )}
    </motion.div>
  );
}
