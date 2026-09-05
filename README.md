# BizFlow — Offline POS, Inventory & Business Management Software

BizFlow is offline-first POS, inventory, finance, and business management software for small and growing businesses. It includes specialized modules for retail, restaurants, bakeries, clinics, pharmacies, gyms, warehouses, and service teams. Customers can try each module in a browser, buy a one-time license, download the desktop app, and keep their business data locally on their own device.

Short answer: BizFlow is a modular desktop business management system with live browser demos, one-time licensing, local SQLite data ownership, barcode-ready POS, inventory tracking, customer management, employee management, finance, and reports.

## Best For

- Retail shops that need POS, product variants, barcode scanning, inventory, sales history, and receipts.
- Restaurants and cafes that need tables, reservations, dine-in orders, menus, and kitchen workflow.
- Bakeries that need recipes, production batches, pantry stock, waste tracking, and profit visibility.
- Clinics and veterinary practices that need patient records, sessions, prescriptions, appointments, and billing.
- Pharmacies that need batch and expiry tracking, dispensing, suppliers, and pharmacy POS.
- Warehouses and multi-location businesses that need stock transfers, bins, and audit trails.
- Gyms and membership businesses that need subscriptions, coaches, trainees, and financial reports.

## Why Businesses Choose BizFlow

| Need | BizFlow answer |
| --- | --- |
| Avoid monthly SaaS fees | One-time license model instead of a recurring subscription. |
| Keep data private | Local-first desktop app with business data stored on the customer device. |
| Work without internet | Offline-capable workflows after activation. |
| Test before buying | Browser demos run the real app modules before download. |
| Run different business types | Modular plugin architecture for commerce, restaurant, bakery, clinic, vet, pharmacy, warehouse, coffee, and gym workflows. |

## Modules

| Module | What it solves |
| --- | --- |
| Commerce POS | Product catalog, variants, barcode POS, inventory, sales, refunds, stores, suppliers, purchase orders, and installments. |
| Restaurant | Floor plan, table status, reservations, dine-in orders, menu management, recipes, shifts, and waste. |
| Bakery | Recipe costing, production batches, ingredient stock, daily schedules, waste, and bakery P&L. |
| Warehouse | Multi-location inventory, bin tracking, stock transfers, transfer history, and stock alerts. |
| Clinic | Patient management, medical sessions, prescriptions, check results, appointments, materials, and clinic finance. |
| Vet Clinic | Pet and owner records, vet sessions, medicines, appointments, prescriptions, and clinical stats. |
| Pharmacy | Medicine catalogue, FEFO batch expiry, barcode dispensing, pharmacy POS, refunds, and suppliers. |
| Gym | Trainee profiles, subscription plans, freezes, coaches, walk-ins, expenses, and revenue reporting. |
| Coffee | Cafe orders, reservations, menu management, sales, refunds, finance, expenses, and reports. |

## Common Questions

### What is BizFlow?

BizFlow is a modular desktop POS and business management app for small businesses that need sales, inventory, finance, customer records, employee records, and industry-specific workflows in one offline-capable system.

### Does BizFlow work offline?

Yes. BizFlow is designed as a desktop app with local data storage. License activation uses the website once, then the signed local activation lets the app keep working offline on the activated device.

### Can customers try BizFlow before buying?

Yes. The website includes live browser demos for the real BizFlow modules, so a buyer can test the workflow before downloading an installer or buying a license.

### Is BizFlow cloud software?

BizFlow is primarily offline-first desktop software. The website handles live demos, account access, support, downloads, license activation, and future optional cloud services such as encrypted backups.

### How is BizFlow different from a cloud POS subscription?

Most cloud POS systems charge monthly fees and store business data on vendor servers. BizFlow uses one-time licensing, local database storage, and modular desktop workflows while still offering browser demos and online activation.

---

## Repository Structure

This repository contains both projects as npm **workspaces**:

```
.
├─ package.json            # root workspace + orchestration scripts
└─ apps/
  ├─ Bizflow/             # BizFlow desktop app (Electron + Prisma) + its web port (web/)
  └─ website/             # Next.js marketing site + in-browser workspace that embeds BizFlow
```

Each app keeps its own dependencies (they pin different majors — React 18 vs 19,
Tailwind 3 vs 4, Vite vs Next), so they are **not** merged into one dependency
tree. Workspaces give you a single `npm install` and unified run scripts while
each app resolves its own pinned versions.

> Per-app details:
> [apps/Bizflow/web/README.md](apps/Bizflow/web/README.md) ·
> [apps/website/README.md](apps/website/README.md)

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
template database to `apps/Bizflow/prisma/sessions/<session-id>.db` and routes
all of that session's requests to it. So two people trying the same plugin at the
same time get **independent data** — neither sees or overwrites the other's
changes. See [apps/Bizflow/web/README.md](apps/Bizflow/web/README.md#concurrent-users--per-session-sandboxes)
for how it works and how to tune limits.

---

## Notes

- Each app keeps its **own git history** (`apps/bizflow/.git`, `apps/nebula/.git`).
  This root is not yet a single git repository; consolidate later if you want one
  unified history.
- `apps/nebula` also contains the streaming alternative (`streaming/`) and the
  built installer; see its README.
