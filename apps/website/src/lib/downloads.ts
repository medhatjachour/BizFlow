/**
 * Download resolution for the "build your version" page.
 *
 * A BizFlow build is one module (or the full suite) packaged for one OS. This
 * resolves the right installer for a (module, OS) pair. When a direct release
 * base is configured (NEXT_PUBLIC_DOWNLOAD_BASE, e.g. a GitHub
 * ".../releases/latest/download" URL) we point straight at the artifact;
 * otherwise we fall back to the releases page so links never 404.
 */
import { PLUGINS, DEFAULT_DOWNLOAD_URL } from "./plugins";

export type OSId = "windows" | "mac" | "linux";

export interface OSMeta {
  id: OSId;
  name: string;
  /** Installer file extension. */
  ext: string;
  /** Friendly installer kind. */
  kind: string;
  emoji: string;
  requirement: string;
}

export const OSES: OSMeta[] = [
  { id: "windows", name: "Windows", ext: "exe", kind: "Installer (.exe)", emoji: "🪟", requirement: "Windows 10 or 11 · 64-bit" },
  { id: "mac", name: "macOS", ext: "dmg", kind: "Disk image (.dmg)", emoji: "🍎", requirement: "macOS 11 Big Sur or later" },
  { id: "linux", name: "Linux", ext: "AppImage", kind: "AppImage", emoji: "🐧", requirement: "Ubuntu 20.04+ / most distros" },
];

export const getOS = (id: OSId) => OSES.find((o) => o.id === id)!;

/** Optional direct-download base (e.g. GitHub ".../releases/latest/download"). */
const DOWNLOAD_BASE = process.env.NEXT_PUBLIC_DOWNLOAD_BASE;

export interface ResolvedDownload {
  url: string;
  /** True when this links straight to an installer file (not the releases page). */
  direct: boolean;
  fileName: string;
  os: OSMeta;
  /** Display name of what's being installed. */
  productName: string;
}

/** Resolve the installer for a module id (or "suite") and an OS. */
export function installerFor(moduleId: string, os: OSId): ResolvedDownload {
  const meta = getOS(os);
  const productName =
    moduleId === "suite"
      ? "BizFlow Suite"
      : `BizFlow ${PLUGINS.find((p) => p.id === moduleId)?.name ?? moduleId}`;
  const slug = moduleId === "suite" ? "Suite" : (PLUGINS.find((p) => p.id === moduleId)?.name ?? moduleId).replace(/\s+/g, "");
  const fileName = `BizFlow-${slug}-${os}.${meta.ext}`;

  if (DOWNLOAD_BASE) {
    return {
      url: `${DOWNLOAD_BASE.replace(/\/$/, "")}/${fileName}`,
      direct: true,
      fileName,
      os: meta,
      productName,
    };
  }
  return { url: DEFAULT_DOWNLOAD_URL, direct: false, fileName, os: meta, productName };
}

/** Best-effort OS detection from the browser. */
export function detectOS(): OSId {
  if (typeof navigator === "undefined") return "windows";
  const s = `${navigator.userAgent} ${navigator.platform}`.toLowerCase();
  if (s.includes("mac")) return "mac";
  if (s.includes("linux") || s.includes("x11") || s.includes("ubuntu")) return "linux";
  return "windows";
}
