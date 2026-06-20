/**
 * Per-session SQLite sandboxes for the BizFlow web bridge.
 *
 * Problem: the bridge serves the real BizFlow handlers against a single SQLite
 * database. If two people use the web demo at the same time they would share —
 * and overwrite — each other's data.
 *
 * Solution: give every browser session its own isolated copy of the database.
 * A pristine *template* DB (seeded once at boot) is cloned to
 * `prisma/sessions/<id>.db` the first time a session calls the backend. An
 * `AsyncLocalStorage` carries the active session's PrismaClient for the
 * duration of each request, and a Proxy stands in for `prisma` at handler
 * registration time so the real handlers — which call `prisma.*` at call time —
 * transparently hit the right database. No handler code changes.
 *
 * Tunables (env): BRIDGE_MAX_SESSIONS (default 50),
 *                 BRIDGE_SESSION_TTL_MS (default 30 min).
 */
import { AsyncLocalStorage } from "node:async_hooks";
import fs from "node:fs";
import path from "node:path";

// The generated Prisma client is loaded dynamically by the server, so we type
// it loosely here.
type PrismaClient = any; // eslint-disable-line @typescript-eslint/no-explicit-any
type PrismaClientCtor = new (opts: unknown) => PrismaClient;

interface SessionEntry {
  client: PrismaClient;
  dbPath: string;
  lastUsed: number;
}

const als = new AsyncLocalStorage<PrismaClient>();
const sessions = new Map<string, SessionEntry>();
/** Clients that have already had their startup PRAGMAs applied. */
const warmed = new WeakSet<object>();

const DEFAULT_SESSION = "default";
const MAX_SESSIONS = Math.max(1, Number(process.env.BRIDGE_MAX_SESSIONS) || 50);
const SESSION_TTL_MS = Math.max(
  60_000,
  Number(process.env.BRIDGE_SESSION_TTL_MS) || 30 * 60_000
);

let PrismaCtor: PrismaClientCtor;
let templateDbPath = "";
let sessionsDir = "";
let fallbackClient: PrismaClient | null = null;

function makeClient(dbPath: string): PrismaClient {
  return new PrismaCtor({
    datasources: {
      db: { url: `file:${dbPath}?connection_limit=1&journal_mode=WAL` },
    },
    log: ["error"],
  });
}

/** Keep ids filesystem-safe; never let a request name a file outside the dir. */
function sanitizeId(raw: string): string {
  const clean = String(raw ?? "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 64);
  return clean || DEFAULT_SESSION;
}

export interface ConfigureOpts {
  /** The generated PrismaClient constructor. */
  PrismaClient: PrismaClientCtor;
  /** Path to the seeded, self-contained template DB to clone per session. */
  templateDbPath: string;
  /** Directory where per-session DB files live. */
  sessionsDir: string;
}

/**
 * Wire up the sandbox factory. Wipes any stale sandboxes from a previous run
 * and pre-creates the shared fallback client. Must be called after the template
 * DB exists.
 */
export function configureSessionDb(opts: ConfigureOpts): void {
  PrismaCtor = opts.PrismaClient;
  templateDbPath = opts.templateDbPath;
  sessionsDir = opts.sessionsDir;

  fs.rmSync(sessionsDir, { recursive: true, force: true });
  fs.mkdirSync(sessionsDir, { recursive: true });

  // The fallback covers the rare case of `prisma.*` being touched outside an
  // active request (it is its own sandbox, so it never pollutes the template).
  fallbackClient = getSessionClient(DEFAULT_SESSION);
}

function disposeEntry(id: string, entry: SessionEntry): void {
  sessions.delete(id);
  entry.client.$disconnect?.().catch(() => {});
  for (const suffix of ["", "-wal", "-shm", "-journal"]) {
    fs.rm(entry.dbPath + suffix, { force: true }, () => {});
  }
}

/** Drop expired sessions and, if over the cap, the least-recently-used ones. */
function evict(): void {
  const now = Date.now();
  for (const [id, entry] of sessions) {
    if (id === DEFAULT_SESSION) continue;
    if (now - entry.lastUsed > SESSION_TTL_MS) disposeEntry(id, entry);
  }
  while (sessions.size > MAX_SESSIONS) {
    let oldestId: string | null = null;
    let oldest = Infinity;
    for (const [id, entry] of sessions) {
      if (id === DEFAULT_SESSION) continue;
      if (entry.lastUsed < oldest) {
        oldest = entry.lastUsed;
        oldestId = id;
      }
    }
    if (!oldestId) break;
    disposeEntry(oldestId, sessions.get(oldestId)!);
  }
}

/** Get (or lazily clone+open) the PrismaClient for a session id. Synchronous. */
export function getSessionClient(rawId: string): PrismaClient {
  const id = sanitizeId(rawId);
  let entry = sessions.get(id);
  if (!entry) {
    const dbPath = path.join(sessionsDir, `${id}.db`);
    fs.copyFileSync(templateDbPath, dbPath); // clone the pristine template
    entry = { client: makeClient(dbPath), dbPath, lastUsed: Date.now() };
    sessions.set(id, entry);
    evict();
  }
  entry.lastUsed = Date.now();
  return entry.client;
}

/**
 * Apply connection PRAGMAs once per client (WAL + busy timeout) before its
 * first real query, so the renderer's parallel calls don't hit "database is
 * locked" on a single connection.
 */
export async function ensureReady(client: PrismaClient): Promise<void> {
  if (warmed.has(client)) return;
  warmed.add(client);
  for (const pragma of [
    "PRAGMA busy_timeout = 10000;",
    "PRAGMA journal_mode = WAL;",
    "PRAGMA foreign_keys = ON;",
  ]) {
    try {
      await client.$queryRawUnsafe(pragma);
    } catch {
      /* non-fatal */
    }
  }
}

/** Run `fn` with `client` set as the active session client for this async flow. */
export function runWithClient<T>(client: PrismaClient, fn: () => T): T {
  return als.run(client, fn);
}

/** Number of live sandboxes (for /health). */
export function sessionCount(): number {
  return sessions.size;
}

/**
 * A Prisma stand-in passed to every handler at registration. Property access is
 * resolved at CALL time to the active session's client (or the shared
 * fallback), so `prisma.user.findMany()` inside a handler hits the right DB.
 */
export function createPrismaProxy(): PrismaClient {
  const resolve = (): PrismaClient => als.getStore() || fallbackClient;
  return new Proxy(
    {},
    {
      get(_target, prop) {
        const client = resolve();
        if (!client) return undefined;
        const value = (client as Record<PropertyKey, unknown>)[prop];
        return typeof value === "function"
          ? (value as (...a: unknown[]) => unknown).bind(client)
          : value;
      },
      has(_target, prop) {
        const client = resolve();
        return client ? prop in (client as object) : false;
      },
    }
  ) as PrismaClient;
}
