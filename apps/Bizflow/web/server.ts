/**
 * BizFlow web bridge server.
 *
 * Reuses BizFlow's real main-process IPC handlers but exposes them over HTTP
 * instead of Electron IPC. The Node `electron` shim records every
 * `ipcMain.handle(channel, fn)` into a registry; this server dispatches
 * POST /ipc { channel, args } to the matching handler.
 *
 * It performs its own Prisma init + seed so it does NOT import
 * src/main/ipc/handlers/index.ts (which statically pulls in every plugin).
 */
import http from "node:http";
import path from "node:path";

import { __handlers, ipcMain } from "./shims/electron.node";
import {
  configureSessionDb,
  createPrismaProxy,
  ensureReady,
  getSessionClient,
  runWithClient,
  sessionCount,
} from "./session-db";

// Kernel handlers (each calls ipcMain.handle internally).
import { registerAuthHandlers } from "../src/main/ipc/handlers/auth.handlers";
import { registerDashboardHandlers } from "../src/main/ipc/handlers/dashboard.handlers";
import { registerFinanceHandlers } from "../src/main/ipc/handlers/finance.handlers";
import { registerEmployeesHandlers } from "../src/main/ipc/handlers/employees.handlers";
import { registerCustomersHandlers } from "../src/main/ipc/handlers/customers.handlers";
import { registerSearchHandlers } from "../src/main/ipc/handlers/search.handlers";
import { registerUserHandlers } from "../src/main/ipc/handlers/user.handlers";
import { registerPermissionsHandlers } from "../src/main/ipc/handlers/permissions.handlers";
import { registerReportsHandlers } from "../src/main/ipc/handlers/reports.handlers";
import { registerAnalyticsHandlers } from "../src/main/ipc/handlers/analytics.handlers";
import { registerModuleHandlers } from "../src/main/ipc/handlers/module.handlers";
import { registerLogHandlers } from "../src/main/ipc/handlers/log.handlers";
// Plugin handlers. Tables already exist from the merged schema push
// (npm run web:setup), so we register handlers directly and skip ensureSchema.
import { registerCommerceHandlers } from "../src/plugins/commerce/handlers/index";
import { registerBakeryHandlers } from "../src/plugins/bakery/handlers/index";
import { registerRestaurantHandlers } from "../src/plugins/restaurant/handlers/index";
import { registerWarehouseHandlers } from "../src/plugins/warehouse/handlers/index";
import { registerClinicHandlers } from "../src/plugins/clinic/handlers/index";
import { registerVetHandlers } from "../src/plugins/vet/handlers/index";
import { registerGymHandlers } from "../src/plugins/gym/handlers/index";
import { registerPharmacyHandlers } from "../src/plugins/pharmacy/handlers/index";
import { seedProductionDatabase } from "../src/main/database/seed-production";

const PORT = Number(process.env.BRIDGE_PORT) || 8787;

/** JSON.stringify that survives BigInt values returned by Prisma raw queries. */
function safeJson(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    typeof v === "bigint" ? Number(v) : v
  );
}

/**
 * Build the pristine *template* database that every session is cloned from.
 * We seed it once (idempotent), fold any WAL data back into a single file
 * (journal_mode = DELETE), then close it so the file is safe to copy — which
 * matters on Windows where an open SQLite handle blocks the copy.
 */
async function buildTemplate() {
  const templateDbPath = path.resolve(process.cwd(), "prisma", "dev.db");
  const sessionsDir = path.resolve(process.cwd(), "prisma", "sessions");

  // Load the generated client (built during `npm install` / prisma generate).
  const prismaModulePath = path.resolve(
    process.cwd(),
    "src",
    "generated",
    "prisma"
  );
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient } = require(prismaModulePath);

  const template = new PrismaClient({
    datasources: { db: { url: `file:${templateDbPath}?connection_limit=1` } },
    log: ["error"],
  });

  // Best-effort pragmas; DELETE mode consolidates any pre-existing -wal file.
  for (const pragma of [
    "PRAGMA busy_timeout = 10000;",
    "PRAGMA journal_mode = DELETE;",
    "PRAGMA foreign_keys = ON;",
  ]) {
    try {
      await template.$queryRawUnsafe(pragma);
    } catch {
      /* non-fatal */
    }
  }

  try {
    await seedProductionDatabase(template);
  } catch (e) {
    console.warn("[bridge] seed skipped/failed:", (e as Error).message);
  }

  // Release the file so per-session clones can copy it cleanly.
  await template.$disconnect();

  return { PrismaClient, templateDbPath, sessionsDir };
}

async function main() {
  console.log("[bridge] building template database…");
  const { PrismaClient, templateDbPath, sessionsDir } = await buildTemplate();
  configureSessionDb({ PrismaClient, templateDbPath, sessionsDir });

  // Every handler is registered against a proxy that resolves to the active
  // session's own database at call time (see web/session-db.ts).
  const prisma = createPrismaProxy();

  console.log("[bridge] registering handlers…");
  registerAuthHandlers(prisma);
  registerDashboardHandlers(prisma);
  registerFinanceHandlers(prisma);
  registerEmployeesHandlers(prisma);
  registerCustomersHandlers(prisma);
  registerSearchHandlers(prisma);
  registerUserHandlers(prisma);
  registerPermissionsHandlers(prisma);
  registerReportsHandlers(prisma);
  registerAnalyticsHandlers();
  registerModuleHandlers();
  registerLogHandlers();
  // ── Plugins (all enabled in the web port) ──
  registerCommerceHandlers(prisma);
  registerBakeryHandlers(prisma);
  registerRestaurantHandlers(prisma);
  registerWarehouseHandlers(prisma);
  registerClinicHandlers(prisma);
  registerVetHandlers(prisma);
  registerGymHandlers(prisma);
  registerPharmacyHandlers(prisma);
  console.log(`[bridge] ${__handlers.size} channels registered`);

  // ── Single-module isolation ──────────────────────────────────────────────
  // Override module:getEnabled so a demo embedded with ?only=<id> shows ONLY
  // that module's nav — never another plugin alongside it. All IPC handlers
  // stay registered, so any cross-module data a page reads still works; we only
  // gate which modules appear in the UI. Without `only`, every module is
  // enabled (the full app).
  const ALL_MODULES = [
    "commerce",
    "bakery",
    "restaurant",
    "warehouse",
    "clinic",
    "vet",
    "gym",
    "pharmacy",
  ];
  ipcMain.handle("module:getEnabled", (event: { only?: string } = {}) => {
    const only = event?.only;
    if (!only) return ALL_MODULES;
    return ALL_MODULES.includes(only) ? [only] : ALL_MODULES;
  });

  const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }

    if (req.method === "POST" && req.url === "/ipc") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", async () => {
        const json = (ok: boolean, payload: Record<string, unknown>) => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(safeJson({ ok, ...payload }));
        };
        try {
          const { channel, args = [], only, session } = JSON.parse(
            body || "{}"
          );
          const handler = __handlers.get(channel);
          if (!handler) {
            return json(false, { error: `No handler for channel: ${channel}` });
          }
          // Route this call to the caller's own isolated sandbox database.
          const client = getSessionClient(
            typeof session === "string" ? session : ""
          );
          await ensureReady(client);
          // The fake IPC event carries the requested single-module scope.
          const data = await runWithClient(client, () =>
            handler({ only }, ...args)
          );
          json(true, { data });
        } catch (e) {
          json(false, { error: (e as Error)?.message ?? String(e) });
        }
      });
      return;
    }

    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(
        safeJson({
          ok: true,
          channels: __handlers.size,
          sessions: sessionCount(),
        })
      );
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(PORT, () => {
    console.log(`[bridge] BizFlow web bridge listening on http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  console.error("[bridge] fatal:", e);
  process.exit(1);
});
