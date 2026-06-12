# BizFlow + Nebula — Monorepo

One repository containing both projects as npm **workspaces**:

```
.
├─ package.json            # root workspace + orchestration scripts
└─ apps/
   ├─ bizflow/             # BizFlow desktop app (Electron + Prisma) + its web port (web/)
   └─ nebula/              # Next.js marketing site + in-browser workspace that embeds BizFlow
```

Each app keeps its own dependencies (they pin different majors — React 18 vs 19,
Tailwind 3 vs 4, Vite vs Next), so they are **not** merged into one dependency
tree. Workspaces give you a single `npm install` and unified run scripts while
each app resolves its own pinned versions.

> Per-app details:
> [apps/bizflow/web/README.md](apps/bizflow/web/README.md) ·
> [apps/nebula/README.md](apps/nebula/README.md)

---

## Quick start

```bash
# 1. Install everything (both workspaces + tooling) from the repo root
set ELECTRON_SKIP_BINARY_DOWNLOAD=1   # PowerShell: $env:ELECTRON_SKIP_BINARY_DOWNLOAD=1
npm install

# 2. One-time: build the BizFlow database + Prisma client (all modules)
npm run setup

# 3. Run everything (bridge + BizFlow UI + Nebula site) in one terminal
npm run dev
```

| Process | What | Port | Root script |
| --- | --- | --- | --- |
| Bridge (backend) | BizFlow IPC handlers over HTTP | 8787 | `npm run dev:bridge` |
| BizFlow UI | The real BizFlow renderer (web) | 5180 | `npm run dev:ui` |
| Nebula site | Marketing + in-browser workspace | 3000 | `npm run dev:site` |

- `npm run dev` — start all three together.
- `npm run dev:web` — start just the BizFlow bridge + UI.
- Open <http://localhost:3000> (site) or <http://localhost:5180> (BizFlow direct).
  Seeded login: `setup` / `setup123`.

Other scripts: `npm run lint`, `npm run typecheck`, `npm run build:site`.

---

## Multiple people using the app at once (per-session sandboxes)

The BizFlow web bridge gives **each browser session its own isolated copy of the
database**. When a visitor first calls the backend, the bridge clones a pristine
template database to `apps/bizflow/prisma/sessions/<session-id>.db` and routes
all of that session's requests to it. So two people trying the same plugin at the
same time get **independent data** — neither sees or overwrites the other's
changes. See [apps/bizflow/web/README.md](apps/bizflow/web/README.md#concurrent-users--per-session-sandboxes)
for how it works and how to tune limits.

---

## Notes

- Each app keeps its **own git history** (`apps/bizflow/.git`, `apps/nebula/.git`).
  This root is not yet a single git repository; consolidate later if you want one
  unified history.
- `apps/nebula` also contains the streaming alternative (`streaming/`) and the
  built installer; see its README.
