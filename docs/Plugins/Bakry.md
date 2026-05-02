# Bakery Plugin

> **Module ID:** `bakery` &nbsp;|&nbsp; **Status:** Active &nbsp;|&nbsp; **Depends on:** Core (Product, SaleItem)

The Bakery plugin turns BizFlow into a full production-management platform for bakeries and food manufacturers. It adds five dedicated handler groups — **Recipes, Pantry, Production, Schedule, Waste, Analytics** — and integrates seamlessly with the core POS so finished goods flow straight into stock for sale.

---

## Table of Contents

1. [Data Models](#data-models)
2. [Feature Areas](#feature-areas)
   - [Recipes & Ingredients](#1-recipes--ingredients)
   - [Pantry (Ingredient Stock)](#2-pantry-ingredient-stock)
   - [Production Batches](#3-production-batches)
   - [Production Schedule](#4-production-schedule)
   - [Waste Logging](#5-waste-logging)
   - [Analytics & Profit/Loss](#6-analytics--profitloss)
3. [IPC Handlers Reference](#ipc-handlers-reference)
4. [Code Locations](#code-locations)
5. [Screenshots](#screenshots)

---

## Data Models

| Model | Purpose |
|---|---|
| `Recipe` | Named formula: ingredient list, expected yield, shelf-life, optional link to a Product in stock |
| `RecipeIngredient` | One ingredient line in a Recipe (quantity, unit, cost-per-unit, optional pantry link) |
| `PantryIngredient` | Real-time stock of a raw ingredient with reorder point, low-stock threshold, and supplier info |
| `ProductionBatch` | A completed production run — records quantity, units produced, total cost, and expiry date |
| `ProductionSchedule` | A planned future production run — planned vs. actual quantities and lifecycle status |
| `WasteLog` | Records any waste event: raw ingredient, finished product, or full batch scrapped |

---

## Feature Areas

### 1. Recipes & Ingredients

- **Create & manage recipes** with a name, description, and optional link to a `Product` in the core catalogue.
- **Ingredient list** — each line carries quantity, unit (`g`, `kg`, `ml`, `pcs`, …), cost-per-unit, and an optional supplier name.
- **Auto cost-per-batch** — computed from `Σ(ingredient.quantity × ingredient.costPerUnit)`.
- **Yield configuration** — set how many units (`pcs`, `loaves`, `kg`) the recipe produces per batch.
- **Cost-per-unit** — `totalCost ÷ yieldQty`, shown in real-time in the recipe form.
- **Shelf life** — `expiryDays` field auto-calculates the expiry date when a batch is recorded.
- **Active / inactive toggle** — archived recipes are hidden from production but retain historical data.
- **Pantry link per ingredient** — optionally bind a recipe ingredient to a `PantryIngredient` so stock is deducted automatically when a batch is started.

### 2. Pantry (Ingredient Stock)

- **Pantry registry** — one row per raw ingredient with `currentStock`, `unit`, and `costPerUnit`.
- **Low-stock alerts** — configurable `lowStockThreshold`; highlighted in the UI when breached.
- **Reorder workflow** — `reorderPoint` triggers an alert; `reorderQuantity` suggests how much to buy.
- **Supplier info** — `supplierName` and `lastOrderedDate` per ingredient.
- **Stock deduction** — when a batch is produced, all linked pantry ingredients are decremented by `recipeIngredient.quantity × batchQuantity`.
- **Manual adjustments** — add stock arrivals or corrections at any time.

### 3. Production Batches

- **Record a production run** — select a recipe, enter the number of batches (`quantity`), and confirm.
- **Auto-computed fields on save:**
  - `unitsProduced` = `quantity × recipe.yieldQty`
  - `totalCost` = `Σ ingredient costs × quantity`
  - `expiresAt` = `batchDate + recipe.expiryDays`
- **Pantry deduction** — all linked pantry ingredients are decremented automatically on batch save.
- **Stock injection** — if the recipe has an `outputProductId`, the produced units are added to that product's variant stock, making them immediately available in POS.
- **Expiry date tracking** — batches approaching or past expiry are surfaced in the UI.
- **Batch history** — full log of every production run per recipe with date, cost, and unit output.

### 4. Production Schedule

- **Plan ahead** — create `ProductionSchedule` entries: which recipe, which date, how many batches planned.
- **Lifecycle statuses:** `planned` → `in-progress` → `completed` | `cancelled`.
- **Actual vs. planned** — when a batch is recorded against a schedule, `actualQuantity` is filled in.
- **Daily view** — filter schedules by date to see the day's production plan at a glance.
- **Notes field** — attach instructions or shift notes to any scheduled run.

### 5. Waste Logging

Four waste types, each with different stock effects:

| `wasteType` | What it logs | Stock effect |
|---|---|---|
| `ingredient` | Raw pantry ingredient lost | Deducts `PantryIngredient.currentStock` |
| `finished_product` | Finished product units lost | Deducts product variant stock |
| `production_batch` | Entire batch scrapped | Linked to a `ProductionBatch` |
| `other` | Free-text waste event | No stock deduction |

- Fields: `itemName`, `quantity`, `unit`, `cost` (estimated value lost), `reason`, `wasteDate`, `notes`.
- Can be linked to a recipe, product, pantry ingredient, or batch for full traceability.
- Waste cost flows into the Analytics profit/loss calculation.

### 6. Analytics & Profit/Loss

The `bakery:getProfitLoss` handler aggregates:

| Metric | Source |
|---|---|
| **Production cost** | `Σ ProductionBatch.totalCost` per recipe |
| **Revenue** | `Σ SaleItem.total` where `productId = recipe.outputProductId` |
| **Waste cost** | `Σ WasteLog.cost` per recipe |
| **Gross profit** | `Revenue − ProductionCost − WasteCost` |
| **Units produced** | `Σ ProductionBatch.unitsProduced` |
| **Units sold** | `Σ SaleItem.quantity` for the linked product |

- Filterable by **date range**.
- Per-recipe rows + overall totals.
- Identifies best-sellers and highest-waste products.

---

## IPC Handlers Reference

| Channel | File | Description |
|---|---|---|
| `bakery:getRecipes` | `handlers/recipes.ts` | List all recipes (active or all) |
| `bakery:createRecipe` | `handlers/recipes.ts` | Create recipe with ingredients |
| `bakery:updateRecipe` | `handlers/recipes.ts` | Update recipe and ingredients |
| `bakery:deleteRecipe` | `handlers/recipes.ts` | Soft-delete (set `isActive = false`) |
| `bakery:getPantry` | `handlers/pantry.ts` | List all pantry ingredients |
| `bakery:updatePantryStock` | `handlers/pantry.ts` | Adjust stock for an ingredient |
| `bakery:createPantryIngredient` | `handlers/pantry.ts` | Add new ingredient to pantry |
| `bakery:getProductionBatches` | `handlers/production.ts` | List batches (with optional recipe filter) |
| `bakery:createProductionBatch` | `handlers/production.ts` | Record a batch run (deducts pantry, injects stock) |
| `bakery:getSchedule` | `handlers/schedule.ts` | List scheduled runs by date range |
| `bakery:createSchedule` | `handlers/schedule.ts` | Plan a future production run |
| `bakery:updateScheduleStatus` | `handlers/schedule.ts` | Advance schedule status |
| `bakery:getWasteLogs` | `handlers/waste.ts` | List waste events |
| `bakery:createWasteLog` | `handlers/waste.ts` | Record a waste event (deducts stock if applicable) |
| `bakery:getProfitLoss` | `handlers/analytics.ts` | Profit/loss breakdown per recipe |

---

## Code Locations

```
src/plugins/bakery/
├── schema.prisma          # Models: Recipe, RecipeIngredient, PantryIngredient,
│                          #         ProductionBatch, ProductionSchedule, WasteLog
├── manifest.ts            # Plugin metadata (id, name, version, routes)
├── index.ts               # Registers all handler groups
├── migrate.ts             # Plugin-specific migration runner
├── preload.ts             # Exposes IPC channels to renderer
└── handlers/
    ├── recipes.ts         # CRUD for recipes and their ingredients
    ├── pantry.ts          # Pantry stock management
    ├── production.ts      # Batch recording + stock injection
    ├── schedule.ts        # Production schedule CRUD
    ├── waste.ts           # Waste event logging
    └── analytics.ts       # Profit/loss aggregation
```

Renderer UI lives under `src/renderer/src/plugins/bakery/` (pages, components, hooks).

---

## Screenshots

| Screen | File |
|---|---|
| Bakery overview & batch list | `samples/bakery.png` |
| Recipe builder & cost preview | `samples/recipes.png` |
| Production batch history | `samples/bakeryProduction.png` |
