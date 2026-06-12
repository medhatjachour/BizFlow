# BizFlow Web Port

This folder makes **BizFlow run in a normal browser tab** — no Electron, no
Docker, no streaming. It reuses BizFlow's *own* React UI and *own* backend
handlers; only the transport between them changes from Electron IPC to HTTP.

> Status: working. Verified login → dashboard → products in the browser,
> backed by the real Prisma + SQLite database.

---

## Why this works

BizFlow is an Electron app, and Electron is just Chromium (web UI) + Node
(backend) glued by an **IPC** channel:

```
Renderer (React)  ──ipcRenderer.invoke(channel,args)──►  Main (Node: handlers + Prisma/SQLite)
```

Every screen already talks to the backend through `window.api.*`, which calls
`ipcRenderer.invoke('some:channel', ...)`. The backend answers with
`ipcMain.handle('some:channel', fn)`. That clean seam is the whole trick: we
keep both sides unchanged and **swap the wire**.

```
Browser tab                         Node bridge (web/server.ts)
┌──────────────────────────┐        ┌─────────────────────────────────┐
│ Real BizFlow React UI     │        │ Real BizFlow handlers (reused)   │
│ window.api.* (real preload)│       │ ipcMain.handle(...) → registry   │
│   │                        │  HTTP │   │                              │
│   ▼ ipcRenderer.invoke ────┼──────►│ POST /ipc {channel,args}         │
│   (browser electron shim)  │       │   → handler(event,...args)       │
│                            │◄──────┤   → Prisma → SQLite → JSON       │
└──────────────────────────┘        └─────────────────────────────────┘
```

- **Browser shim** ([shims/electron.browser.ts](shims/electron.browser.ts)) —
  `ipcRenderer.invoke` becomes an HTTP `POST /ipc`; `contextBridge` assigns onto
  `window`. The real preload runs unmodified and builds the identical
  `window.api`, so every call keeps its exact argument shape.
- **Node shim** ([shims/electron.node.ts](shims/electron.node.ts)) —
  `ipcMain.handle(channel, fn)` records handlers into a registry the bridge
  dispatches to. `app`, `BrowserWindow`, etc. are inert stubs.
- **Bridge server** ([server.ts](server.ts)) — initialises Prisma/SQLite, seeds
  the setup user, registers the real handlers, and serves `POST /ipc`.
- **Vite config** ([vite.web.config.ts](vite.web.config.ts)) — aliases the
  Electron-only modules to the browser shims and serves BizFlow's real renderer.

No business logic was rewritten. The 200+ IPC handlers are reused as-is.

---

## Run it

From the **repo root** (npm workspaces):

```bash
# 1. One-time: build the DB + generate the Prisma client (all models)
npm run setup

# 2. Start the bridge + UI together (http://localhost:8787 and :5180)
npm run dev:web
```

Per-app equivalents (run inside `apps/bizflow`): `npm run web:setup`,
`npm run web:server`, `npm run web:client`.

Open <http://localhost:5180> and log in with the seeded account:

| Username | Password | Role |
| --- | --- | --- |
| `setup` | `setup123` | admin |

> Change this account after first login (it's a first-run setup user).

---

## How it plugs into Nebula

The Nebula site embeds this web port in its **BizFlow** dock window via
`NEXT_PUBLIC_BIZFLOW_URL` (see `apps/nebula/.env.example`, default
`http://localhost:5180/`). Run `npm run dev` from the repo root to start the
bridge, the UI and the site together, then open Nebula and click **BizFlow**.

---

## What's wired up

| Area | Status | Notes |
| --- | --- | --- |
| Auth / login | ✅ | Real bcrypt check against SQLite |
| Dashboard | ✅ | Renders; one profit metric falls back to 0 (see below) |
| Products / catalog | ✅ | `products:*` commerce handlers |
| Customers, Employees, Users, Finance, Reports, Search | ✅ | Kernel handlers registered |
| Commerce plugin | ✅ | Enabled in the bridge + Vite (`__PLUGIN_COMMERCE__`) |
| All plugins (commerce, bakery, restaurant, warehouse, clinic, vet, gym) | ✅ | All registered in the bridge and enabled via the Vite/esbuild `__PLUGIN_*__` flags |
| Per-session isolation | ✅ | Each browser session gets its own sandbox DB (see *Concurrent users* below) |

### Known issue (BizFlow-internal, not the port)

`dashboard:getMetrics` runs a raw SQL query referencing a `si.cost` column that
isn't in the current schema, so it throws and the dashboard shows `$0` for
profit. This is in BizFlow's own handler code and degrades gracefully; fixing it
is a BizFlow change, out of scope for the port.

---

## Enabling more plugins

1. In [server.ts](server.ts): import and call the plugin's
   `registerXHandlers(prisma)` (and run its `ensureSchema` if its tables aren't
   in the merged DB yet).
2. In [build-server.mjs](build-server.mjs) and
   [vite.web.config.ts](vite.web.config.ts): set the matching
   `__PLUGIN_X__` define to `true`.
3. Restart both processes.

---

## Concurrent users — per-session sandboxes

Two people can use the web demo at the same time without clobbering each
other's data. The bridge gives **every browser session its own isolated copy of
the database**:

- The browser shim sends a stable `session` id with each `POST /ipc` (persisted
  in `sessionStorage`, overridable via `?session=<id>`).
- On a session's first call, the bridge clones a pristine, seeded **template**
  (`prisma/dev.db`) to `prisma/sessions/<id>.db` and opens a PrismaClient for it.
- An `AsyncLocalStorage` carries that client for the request; the real handlers
  (registered against a Proxy `prisma`) transparently read/write the session's
  own database. No handler code changed.

So `setup` / `setup123` works in every session (it's baked into the template),
but any data a visitor creates is visible only to them.

Tuning (env vars on the bridge):

| Variable | Default | Purpose |
| --- | --- | --- |
| `BRIDGE_MAX_SESSIONS` | `50` | Max live sandboxes; least-recently-used are evicted |
| `BRIDGE_SESSION_TTL_MS` | `1800000` | Idle ms before a sandbox is dropped |

Sandboxes live in `prisma/sessions/` (git-ignored) and are wiped when the bridge
restarts. `GET /health` reports the live `sessions` count.

---

## Production notes

This is a dev setup (two processes, Vite dev server, SQLite). For production:

- Build the UI (`vite build`) and serve the static output behind the same origin
  as the bridge (so `/ipc` is same-origin — no CORS).
- Add real **authentication/session** handling (currently the renderer trusts
  the login response; the bridge has no per-request auth). Put it behind your
  own login/JWT before exposing publicly.
- Each browser session already gets its **own isolated SQLite sandbox** (see
  *Concurrent users* above) — ideal for demos/trials. For a shared product where
  people collaborate on the *same* data, move to a hosted DB (Postgres/MySQL)
  with tenant scoping and update the Prisma datasource.
- Run the bridge as a managed Node service.
