import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// This app lives in a monorepo (apps/nebula) with lockfiles at both the repo
// root and each workspace. Pin the workspace root so Turbopack doesn't have to
// guess it from the nearest lockfile.
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  // Inlined at build time, so it describes the image rather than the environment
  // the container happens to be started with: /api/version reports it and the
  // deploy smoke test requires it to equal the commit that was pushed. Fed by the
  // BUILD_COMMIT Docker build arg.
  env: {
    BUILD_COMMIT: process.env.BUILD_COMMIT ?? "unknown",
  },
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  images: basePath
    ? {
        path: `${basePath}/_next/image`,
      }
    : undefined,
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;
