import "server-only";
import { installerFor, type OSId } from "@/lib/downloads";
import { DEFAULT_DOWNLOAD_URL } from "@/lib/plugins";

/**
 * Server-side build orchestration for on-demand desktop builds.
 *
 * A BizFlow desktop build is one module (or the suite) packaged for one OS with
 * electron-builder — that requires a real build host with the native toolchain
 * and signing certs, which cannot run inside a serverless request. So we use a
 * CI pipeline (GitHub Actions) as the build backend:
 *
 *   1. We compute the expected artifact URL for (module, OS).
 *   2. If that artifact already exists (HEAD 200), the download is ready now.
 *   3. If it doesn't, and a build workflow is configured, we trigger it
 *      (workflow_dispatch) and report "building" so the client can poll until
 *      the artifact appears, then download it.
 *   4. With nothing configured, we fall back to the public releases page so
 *      links never dead-end.
 *
 * Everything here is env-gated — the site works without any of it, and lights
 * up the moment the build infra is configured.
 */

// GitHub repo that hosts the build workflow + releases, e.g. "owner/bizflow".
const BUILD_REPO = process.env.GITHUB_BUILD_REPO;
// Workflow file name or id that builds an installer, e.g. "build-desktop.yml".
const BUILD_WORKFLOW = process.env.GITHUB_BUILD_WORKFLOW;
// Git ref to build from (branch/tag). Defaults to "main".
const BUILD_REF = process.env.GITHUB_BUILD_REF || "main";
// Fine-grained PAT / app token with "actions: write" on the build repo.
const BUILD_TOKEN = process.env.GITHUB_BUILD_TOKEN;

/** True when on-demand server builds can be triggered. */
export function isBuildConfigured(): boolean {
  return Boolean(BUILD_REPO && BUILD_WORKFLOW && BUILD_TOKEN);
}

export type BuildState = "ready" | "building" | "fallback";

export interface DownloadResolution {
  state: BuildState;
  /** Direct artifact URL when ready; releases page when fallback. */
  url: string;
  fileName: string;
  productName: string;
  os: OSId;
  moduleId: string;
}

/** HEAD-check whether a built artifact already exists at a URL. */
async function artifactExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

/** Trigger the CI build for (module, OS) via workflow_dispatch. Best-effort. */
async function dispatchBuild(moduleId: string, os: OSId): Promise<boolean> {
  if (!isBuildConfigured()) return false;
  try {
    const res = await fetch(
      `https://api.github.com/repos/${BUILD_REPO}/actions/workflows/${BUILD_WORKFLOW}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${BUILD_TOKEN}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: BUILD_REF, inputs: { module: moduleId, os } }),
        cache: "no-store",
      }
    );
    // 204 = accepted.
    return res.status === 204;
  } catch {
    return false;
  }
}

/**
 * Resolve a download for (module, OS): return the artifact if it exists,
 * otherwise trigger a server build (when configured) and report "building",
 * else fall back to the releases page.
 */
export async function resolveDownload(
  moduleId: string,
  os: OSId,
  { triggerBuild = true }: { triggerBuild?: boolean } = {}
): Promise<DownloadResolution> {
  const dl = installerFor(moduleId, os);
  const base = {
    fileName: dl.fileName,
    productName: dl.productName,
    os,
    moduleId,
  };

  // Only a configured direct base yields a checkable artifact URL.
  if (dl.direct) {
    if (await artifactExists(dl.url)) {
      return { state: "ready", url: dl.url, ...base };
    }
    if (triggerBuild && isBuildConfigured()) {
      await dispatchBuild(moduleId, os);
      return { state: "building", url: dl.url, ...base };
    }
  }

  // No artifact and no build backend — link to the releases page.
  return { state: "fallback", url: DEFAULT_DOWNLOAD_URL, ...base };
}
