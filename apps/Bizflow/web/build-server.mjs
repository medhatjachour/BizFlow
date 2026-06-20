/**
 * Bundles the BizFlow web bridge server with esbuild, aliasing Electron-only
 * modules to Node shims, then runs it. Heavy/native optional deps are left
 * external so they load from node_modules at runtime only if actually used.
 *
 * Usage:  node web/build-server.mjs        (build + run)
 *         node web/build-server.mjs --watch (rebuild on change + run)
 */
import esbuild from "esbuild";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url)); // .../web
const proj = path.resolve(here, ".."); // apps/bizflow (the BizFlow app root)
const outfile = path.join(here, ".dist", "server.cjs");

const aliasShim = (rel) => path.join(here, "shims", rel);

const buildOptions = {
  entryPoints: [path.join(here, "server.ts")],
  outfile,
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node18",
  sourcemap: true,
  logLevel: "info",
  alias: {
    electron: aliasShim("electron.node.ts"),
    "electron-log/main": aliasShim("electron-log.node.ts"),
    "electron-log/preload": aliasShim("electron-log.node.ts"),
    "electron-log": aliasShim("electron-log.node.ts"),
  },
  // Plugin build flags — all plugins are wired into the web bridge.
  define: {
    __PLUGIN_COMMERCE__: "true",
    __PLUGIN_BAKERY__: "true",
    __PLUGIN_RESTAURANT__: "true",
    __PLUGIN_WAREHOUSE__: "true",
    __PLUGIN_CLINIC__: "true",
    __PLUGIN_VET__: "true",
    __PLUGIN_GYM__: "true",
    __PLUGIN_PHARMACY__: "true",
  },
  // Loaded at runtime from node_modules (native or heavy, not needed to bundle).
  external: [
    "@prisma/client",
    "xlsx",
    "jspdf",
    "jspdf-autotable",
    "node-thermal-printer",
    "nodemailer",
    "node-cron",
    "bwip-js",
    "sharp",
    "exceljs",
  ],
};

function run() {
  const child = spawn(process.execPath, [outfile], {
    cwd: proj, // so require('src/generated/prisma') and prisma/dev.db resolve
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "development" },
  });
  child.on("exit", (code) => process.exit(code ?? 0));
  return child;
}

await esbuild.build(buildOptions);
run();
