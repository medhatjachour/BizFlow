import type { ComponentType, ReactNode } from "react";

/** Static metadata describing an installable Nebula app. */
export interface AppMeta {
  id: string;
  title: string;
  /** Tailwind gradient classes used for the icon tile background. */
  accent: string;
  icon: ReactNode;
  defaultSize: { width: number; height: number };
  component: ComponentType;
}

/** A live window instance on the desktop. */
export interface WindowInstance {
  id: number;
  appId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
}
