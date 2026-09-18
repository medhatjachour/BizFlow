import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { OSES, installerFor } from "@/lib/downloads";
import { PLUGINS } from "@/lib/plugins";

/**
 * Two places decide what a module's installer is called, and nothing connects
 * them at build time: the catalog derives `BizFlow-<NameWithoutSpaces>-<os>.<ext>`
 * from the plugin's display name, while CI normalises the electron-builder
 * output through a slug map. Add a module to the catalog and the pipeline keeps
 * building the other ten - the download link then silently falls back to the
 * releases page, where the advertised file does not exist.
 *
 * That drift is invisible to types, so the contract is asserted here: every
 * catalog module has a matrix job on every platform, and each slug map resolves
 * it to exactly the file name the catalog advertises.
 */

const ROOT = path.join(__dirname, "..", "..", "..");

function readWorkflow(name: string): string {
  // Line endings differ between a Windows checkout and CI, so normalise them
  // before scanning: every pattern below assumes \n.
  return fs
    .readFileSync(path.join(ROOT, ".github", "workflows", name), "utf8")
    .replace(/\r\n/g, "\n");
}

const INSTALLERS = readWorkflow("publish-commerce-installers.yml");
const ON_DEMAND = readWorkflow("build-desktop-release.yml");

/** Body of a single job, i.e. everything up to the next 2-space-indented key. */
function jobSection(yaml: string, job: string): string {
  const lines = yaml.split("\n");
  const start = lines.indexOf(`  ${job}:`);
  if (start === -1) throw new Error(`job not found: ${job}`);

  const body: string[] = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^ {2}[A-Za-z0-9_-]+:\s*$/.test(lines[i])) break;
    body.push(lines[i]);
  }
  return body.join("\n");
}

/** Module ids in a job's `strategy.matrix.module` list. */
function matrixModules(yaml: string, job: string): string[] {
  const match = /matrix:\n(?: {6,}.*\n)*? {8}module:\n((?: {10}- [a-z-]+\n)+)/.exec(
    jobSection(yaml, job)
  );
  if (!match) throw new Error(`no module matrix in job ${job}`);

  return match[1]
    .trim()
    .split("\n")
    .map((line) => line.trim().replace(/^- /, ""));
}

/** Every (module, slug) pair in a workflow's normalisation blocks. */
function normalisations(yaml: string): Array<[id: string, slug: string]> {
  const pairs: Array<[string, string]> = [];
  // PowerShell switch: "commerce" { "Commerce" }
  for (const m of yaml.matchAll(/^ +"([a-z-]+)" \{ "([A-Za-z]+)" \}$/gm)) {
    pairs.push([m[1], m[2]]);
  }
  // bash case: commerce) slug="Commerce" ;;
  for (const m of yaml.matchAll(/^ +([a-z-]+)\) slug="([A-Za-z]+)" ;;$/gm)) {
    pairs.push([m[1], m[2]]);
  }
  return pairs;
}

/** The slug half of a resolved installer file name. */
function advertisedSlug(moduleId: string, os: string): string {
  const { fileName } = installerFor(moduleId, os as "windows");
  const suffix = `-${os}.`;
  const start = "BizFlow-".length;
  return fileName.slice(start, fileName.indexOf(suffix, start));
}

const PLATFORMS = ["windows", "mac", "linux"] as const;

describe("installer naming: catalog vs pipeline", () => {
  it("builds every catalog module on every platform", () => {
    for (const platform of PLATFORMS) {
      expect(matrixModules(INSTALLERS, platform)).toEqual(
        expect.arrayContaining(PLUGINS.map((p) => p.id))
      );
    }
  });

  it("advertises only installer names the pipeline actually publishes", () => {
    const pairs = normalisations(INSTALLERS);
    const slugs = new Map(pairs);

    for (const plugin of PLUGINS) {
      for (const os of OSES) {
        expect({ id: plugin.id, os: os.id, slug: slugs.get(plugin.id) }).toEqual({
          id: plugin.id,
          os: os.id,
          slug: advertisedSlug(plugin.id, os.id),
        });
      }
    }
  });

  it("keeps the on-demand workflow in step with the catalog", () => {
    const slugs = new Map(normalisations(ON_DEMAND));

    for (const plugin of PLUGINS) {
      expect(slugs.get(plugin.id)).toBe(advertisedSlug(plugin.id, "windows"));
      expect(ON_DEMAND).toContain(plugin.id);
    }
    expect(slugs.get("suite")).toBe(advertisedSlug("suite", "windows"));
  });

  it("names each module once per platform block", () => {
    // windows + mac + linux in the push pipeline, same three in the dispatch one.
    for (const [name, yaml] of [
      ["publish-commerce-installers.yml", INSTALLERS],
      ["build-desktop-release.yml", ON_DEMAND],
    ] as const) {
      const counts = new Map<string, number>();
      for (const [id] of normalisations(yaml)) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      for (const id of [...PLUGINS.map((p) => p.id), "suite"]) {
        expect({ workflow: name, id, count: counts.get(id) }).toEqual({
          workflow: name,
          id,
          count: PLATFORMS.length,
        });
      }
    }
  });
});
