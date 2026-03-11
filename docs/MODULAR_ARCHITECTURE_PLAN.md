# BizFlow Modular Architecture Plan

> **Status:** 🚧 In Development  
> **Version:** 1.0.0  
> **Last Updated:** March 11, 2026

---

## Overview

BizFlow uses a **modular schema architecture** to support business-specific feature
sets (bakery, restaurant, warehouse, …) without bloating the core application for
customers who don't need those features.

### Key Concepts

| Concept | Description |
|---------|-------------|
| **One Database** | All modules share a single SQLite database — no separate DB per module |
| **Merge at Build Time** | Separate `.prisma` module files are combined into `prisma/merged.prisma` before `prisma generate` |
| **Conditional Handlers** | Module IPC handlers are registered only if the module is enabled in `bizflow-settings.json` |
| **Feature Flags** | UI routes and nav links activate based on which modules are enabled |
| **No Performance Cost** | Empty tables have ~0 overhead in SQLite; unused modules don't slow anything down |

---

## Directory Structure

```
prisma/
├── schema.prisma          ← Core models (User, Product, Sale, …)
├── modules/
│   ├── bakery.prisma      ← Bakery models (Recipe, Batch, Pantry, WasteLog, …)
│   └── (future modules)
└── merged.prisma          ← AUTO-GENERATED — gitignored, rebuilt every time

scripts/
└── merge-schemas.js       ← Combines core + enabled modules → merged.prisma

src/
├── shared/
│   └── modules.ts         ← MODULE_REGISTRY, ModuleId type, isModuleEnabled()
└── main/
    ├── utils/
    │   └── module-settings.ts  ← Read/write <userData>/bizflow-settings.json
    └── ipc/handlers/
        ├── index.ts            ← Conditionally registers module handlers
        └── bakery.handlers.ts  ← Bakery IPC handlers (1120 lines)
```

---

## Available Modules

| Module | ID | Status | Models | Use Case |
|--------|----|--------|--------|----------|
| **Core** | *(built-in)* | ✅ Active | User, Product, Sale, … | Base POS functionality |
| **Bakery** | `bakery` | 🚧 Planned | Recipe, RecipeIngredient, ProductionBatch, PantryIngredient, WasteLog, ProductionSchedule | Production scheduling, recipe management, waste tracking |
| **Restaurant** | `restaurant` | 📋 Planned | Table, Reservation, KitchenOrder | Table service, order routing |
| **Warehouse** | `warehouse` | 📋 Future | Location, Transfer, StockLevel | Multi-location inventory |

---

## How the Merge Works

```
prisma/schema.prisma  ─────┐
                            ├── scripts/merge-schemas.js ──► prisma/merged.prisma
prisma/modules/*.prisma ───┘                                       │
                                                                    ▼
                                                          prisma generate
                                                                    │
                                                                    ▼
                                                     src/generated/prisma/  (client)
```

The merge script (`scripts/merge-schemas.js`):

1. Reads `prisma/schema.prisma` (core).
2. For each enabled module it:
   - **Injects cross-reference fields** into core model blocks (e.g., adds `recipesAsOutput` to `Product`).
   - **Appends the module models** to the combined schema text.
3. Writes the result to `prisma/merged.prisma`.
4. `prisma generate --schema=prisma/merged.prisma` builds the typed client.

### Controlling Which Modules Are Merged

```bash
# Merge all modules in prisma/modules/ (default)
node scripts/merge-schemas.js

# Merge only bakery
node scripts/merge-schemas.js --modules bakery

# Merge via env var
ENABLED_MODULES=bakery,restaurant node scripts/merge-schemas.js
```

---

## Feature Flag — Runtime Conditional Loading

Module handlers are loaded at runtime based on `<userData>/bizflow-settings.json`:

```jsonc
// bizflow-settings.json
{
  "enabledModules": ["bakery"]
}
```

On app startup the main process calls `getEnabledModuleIds()` and only registers
handlers for enabled modules:

```ts
// src/main/ipc/handlers/index.ts (excerpt)
const enabledModuleIds = getEnabledModuleIds()
if (isModuleEnabled(enabledModuleIds, MODULE_IDS.BAKERY)) {
  const { registerBakeryHandlers } = require('./bakery.handlers')
  registerBakeryHandlers(prisma)
}
```

The renderer reads the same setting to conditionally render nav links and route
registration for module pages.

---

## Roadmap

### ✅ Phase 1 — Setup (Done)
- [x] Design modular schema architecture
- [x] Create `prisma/modules/` directory
- [x] Create `prisma/modules/bakery.prisma` with all bakery models
- [x] Create `scripts/merge-schemas.js`
- [x] Update `package.json` scripts (`prisma:merge`, `prisma:generate`, `prisma:migrate`)
- [x] Gitignore `prisma/merged.prisma`
- [x] Create `src/shared/modules.ts` — module registry + types
- [x] Create `src/main/utils/module-settings.ts` — settings persistence
- [x] Copy `bakery.handlers.ts` from branch `67-ingreadinat-option`
- [x] Wire bakery handlers conditionally in `handlers/index.ts`
- [x] Run merge + `prisma generate` — client updated with bakery models

### 🔲 Phase 2–4 — First Migration & Verification (4 hrs)
- [ ] Create migration: `npm run prisma:migrate -- --name add_bakery_module`
- [ ] Verify all bakery tables created correctly
- [ ] Update `seed-production.ts` to seed test bakery data
- [ ] Write integration tests for bakery handlers

### 🔲 Phase 5–6 — Conditional UI Loading (9 hrs)
- [ ] Add module-check hook `useModuleEnabled(moduleId)` in renderer
- [ ] Gate bakery nav link in `RootLayout.tsx` behind hook
- [ ] Register `<Route path="/bakery" …>` conditionally in `App.tsx`
- [ ] Port bakery page components from branch `67-ingreadinat-option`
- [ ] Add module toggle IPC handler (`module:setEnabled`)

### 🔲 Phase 7 — Module Settings UI (4 hrs)
- [ ] Add "Modules" section to Settings page
- [ ] Toggle cards per `MODULE_REGISTRY` entry (status badge, description, icon)
- [ ] Restart-required notice when toggling (handlers need re-registration)

### 🔲 Phase 8 — Bakery Module Polish (12 hrs)
- [ ] Daily overview with sales vs production reconciliation
- [ ] Pantry low-stock alerts
- [ ] End-of-day modal with waste capture
- [ ] Profit/loss tab (ingredient cost vs revenue)

---

## Adding a New Module

### Step 1 – Schema file
```
prisma/modules/<name>.prisma
```
Add only `model` blocks — no `generator` or `datasource`.

### Step 2 – Register in `scripts/merge-schemas.js`
```js
const MODULE_REGISTRY = {
  // existing...
  mymodule: {
    file: 'mymodule.prisma',
    injectFields: {
      Product: ['  myModuleRelation MyModel[] @relation("MyRelation")']
    }
  }
}
```

### Step 3 – Register in `src/shared/modules.ts`
```ts
export const MODULE_IDS = {
  // existing...
  MY_MODULE: 'mymodule'
}

export const MODULE_REGISTRY = {
  // existing...
  mymodule: {
    id: 'mymodule',
    name: 'My Module',
    // ...
  }
}
```

### Step 4 – IPC handlers
Create `src/main/ipc/handlers/mymodule.handlers.ts` and wire it in `index.ts`.

### Step 5 – UI
Create `src/renderer/src/pages/MyModule/` and guard with `useModuleEnabled`.

---

## Benefits

- ✅ **No Performance Cost** — Empty tables have ~0 overhead in SQLite
- ✅ **Easy to Add Features** — New modules never touch core code
- ✅ **Customer-Specific Builds** — Enable only what each business needs
- ✅ **Simplified Migrations** — One schema, one migration path
- ✅ **Full Type Safety** — Prisma generates typed client from merged schema
- ✅ **Reversible** — Disable a module → its handlers don't load, UI hides it
