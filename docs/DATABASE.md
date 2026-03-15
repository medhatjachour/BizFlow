# BizFlow Database Architecture

A complete reference for how the SQLite database is structured, created, and extended by plugins.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Database Creation Flow](#2-database-creation-flow)
3. [Core Kernel Tables (Always Present)](#3-core-kernel-tables-always-present)
4. [Entity-Relationship Diagrams](#4-entity-relationship-diagrams)
   - [4.1 Core Schema (No Plugins)](#41-core-schema-no-plugins)
   - [4.2 Full Schema (All Plugins)](#42-full-schema-all-plugins)
5. [Plugin System — How Tables Are Added](#5-plugin-system--how-tables-are-added)
6. [Plugin Schemas](#6-plugin-schemas)
   - [6.1 Bakery Plugin](#61-bakery-plugin)
   - [6.2 Restaurant Plugin](#62-restaurant-plugin)
   - [6.3 Warehouse Plugin](#63-warehouse-plugin)
   - [6.4 Clinic Plugin](#64-clinic-plugin)
   - [6.5 Commerce Plugin](#65-commerce-plugin)
7. [Database by Configuration](#7-database-by-configuration)
8. [SQLite Optimizations Applied](#8-sqlite-optimizations-applied)
9. [Seed Data](#9-seed-data)
10. [Schema Files Reference](#10-schema-files-reference)

---

## 1. Overview

BizFlow uses **SQLite** as its embedded database, managed through **Prisma ORM**.
The database file lives in the user's OS application data directory:

| OS      | Path                                                              |
|---------|-------------------------------------------------------------------|
| Windows | `%APPDATA%\BizFlow\database.db`                                   |
| macOS   | `~/Library/Application Support/BizFlow/database.db`              |
| Linux   | `~/.config/BizFlow/database.db`                                   |

In **development**, the database is located at `prisma/prisma/dev.db`.

The schema is split into two layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                        KERNEL LAYER                             │
│   prisma/schema.prisma  →  29 tables (always present)          │
├─────────────────────────────────────────────────────────────────┤
│                        PLUGIN LAYER                             │
│   prisma/merged.prisma  →  +21 tables (added by enabled plugins)│
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Creation Flow

### First Run (Production)

```
App Launches
     │
     ▼
initializeDatabase()
     │
     ├─► Does database.db exist?
     │        │
     │    YES ─┴──► Continue normally (skip creation)
     │
     └─► NO → First run detected
              │
              ▼
         Does resources/prisma/template.db exist?
              │
         YES ─┼──► Copy template.db → database.db   (fast, ~milliseconds)
              │          │
              │          └──► Template already has full schema + prod seed
              │
         NO ──┴──► createDatabaseWithSchema(dbPath)
                       │
                       └──► Run "prisma migrate deploy"
                            Creates empty tables from schema.prisma
```

### Plugin Schema Extension (Every Run)

```
App Launches
     │
     ▼
registerAllHandlers()
     │
     ├─► Register kernel handlers (always)
     │
     └─► For each compiled-in plugin:
              │
              ▼
         plugin.ensureSchema(prisma, dbUrl, cwd)
              │
              ▼
         Query sqlite_master: do plugin tables exist?
              │
         YES ─┴──► Skip (no-op) ✅
              │
         NO ──┴──► Run "prisma db push --schema=prisma/merged.prisma"
                       │
                       └──► Adds only missing tables, preserves existing data
                            Then: plugin.registerHandlers(prisma)
```

### Development Startup

```
isDev = true
     │
     ▼
Is prisma/prisma/dev.db missing or < 1 KB?
     │
YES ─┴──► initializeDevelopmentDatabase(devDbPath)
              │
              └──► Run migrations to create fresh dev database
     │
NO ──┴──► Use existing dev database (may need manual seeding)
```

---

## 3. Core Kernel Tables (Always Present)

These 29 tables exist in **every** BizFlow installation regardless of which plugins are enabled.

### Identity & Access

| Table                  | Purpose                                              |
|------------------------|------------------------------------------------------|
| `User`                 | App users with roles: `admin`, `manager`, `sales`, `inventory`, `finance` |
| `Store`                | Physical store locations                            |

### Product Catalog (EAV Pattern)

| Table                  | Purpose                                              |
|------------------------|------------------------------------------------------|
| `Category`             | Product categories with icon/color                  |
| `Product`              | Master product with base price, cost, SKU, barcode  |
| `ProductImage`         | One-to-many images per product                      |
| `ProductVariant`       | SKU variants (color, size, etc.) with individual stock |
| `ProductAttribute`     | Attribute definitions per product (e.g. "Color")    |
| `VariantAttributeValue`| EAV values linking variants to attributes           |
| `StockMovement`        | Full audit log of every inventory change            |

### Sales

| Table                  | Purpose                                              |
|------------------------|------------------------------------------------------|
| `SaleTransaction`      | One record per checkout operation                   |
| `SaleItem`             | Individual line items within a transaction          |
| `FinancialTransaction` | General income/expense ledger entries               |

### Customer & Payments

| Table                  | Purpose                                              |
|------------------------|------------------------------------------------------|
| `Customer`             | Customer records with loyalty tier (`Bronze` → `Platinum`) |
| `Deposit`              | Upfront payments linked to sales or standalone      |
| `Installment`          | Scheduled payment installments                      |
| `InstallmentPlan`      | Templates for installment schedules (terms, interest) |

### HR & Employees

| Table                  | Purpose                                              |
|------------------------|------------------------------------------------------|
| `Employee`             | Employee profile, employment type, compensation     |
| `EmployeeAttendance`   | Daily check-in / check-out                         |
| `EmployeeDocument`     | Contracts, certificates, ID copies                 |
| `EmployeeActivityLog`  | Audit trail of HR actions                          |
| `EmployeePayroll`      | Monthly payroll records                             |
| `EmployeeShift`        | Scheduled work shifts                               |
| `EmployeeOvertime`     | Extra hours with approval tracking                 |

### Supply Chain

| Table                  | Purpose                                              |
|------------------------|------------------------------------------------------|
| `Supplier`             | Supplier profiles and payment terms                 |
| `SupplierProduct`      | Links suppliers ↔ products with cost and lead time  |
| `PurchaseOrder`        | Purchase orders with status tracking                |
| `PurchaseOrderItem`    | Line items within purchase orders                   |

### Configuration

| Table                  | Purpose                                              |
|------------------------|------------------------------------------------------|
| `ReceiptTemplate`      | Printable receipt layouts (thermal, A4, etc.)       |
| `EmailReport`          | Email report subscriptions per user                 |

---

## 4. Entity-Relationship Diagrams

### 4.1 Core Schema (No Plugins)

```
┌──────────────┐      ┌──────────────────┐      ┌────────────────────┐
│    User      │      │    Category      │      │      Store         │
│──────────────│      │──────────────────│      │────────────────────│
│ id (PK)      │      │ id (PK)          │      │ id (PK)            │
│ username     │      │ name (unique)    │      │ name               │
│ passwordHash │      │ description      │      │ location           │
│ role         │      │ icon             │      │ phone              │
│ fullName     │      │ color            │      │ status             │
│ email        │      └──────┬───────────┘      └────────────────────┘
│ isActive     │             │ 1                          │ 1
└──────┬───────┘             │                            │
       │ 1                   │ n                          │ n (optional)
       │                     ▼                            ▼
       │             ┌──────────────────┐      ┌────────────────────┐
       │             │    Product       │◄─────┤  ProductImage      │
       │             │──────────────────│  1:n │────────────────────│
       │             │ id (PK)          │      │ id (PK)            │
       │             │ name             │      │ productId (FK)     │
       │             │ baseSKU (unique) │      │ filename           │
       │             │ baseBarcode      │      │ order              │
       │             │ categoryId (FK)  │      └────────────────────┘
       │             │ basePrice        │
       │             │ baseCost         │      ┌────────────────────┐
       │             │ hasVariants      │      │ ProductAttribute   │
       │             │ isArchived       │◄─────┤────────────────────│
       │             └──────┬───────────┘  1:n │ id (PK)           │
       │                    │                  │ productId (FK)    │
       │                    │ 1:n              │ name              │
       │                    ▼                  └──────┬────────────┘
       │          ┌─────────────────────┐             │ 1:n
       │          │  ProductVariant     │             ▼
       │          │─────────────────────│    ┌─────────────────────────┐
       │          │ id (PK)             │    │  VariantAttributeValue  │
       │          │ productId (FK)      │◄───┤─────────────────────────│
       │          │ sku (unique)        │1:n │ id (PK)                 │
       │          │ barcode             │    │ variantId (FK)          │
       │          │ price               │    │ attributeId (FK)        │
       │          │ cost                │    │ value                   │
       │          │ stock               │    └─────────────────────────┘
       │          │ reorderPoint        │
       │          └─────────┬───────────┘
       │                    │ 1:n
       │                    ▼
       │          ┌─────────────────────┐
       └─────────►│  StockMovement      │
            1:n   │─────────────────────│
                  │ id (PK)             │
                  │ variantId (FK)      │
                  │ type                │
                  │ quantity            │
                  │ previousStock       │
                  │ newStock            │
                  │ userId (FK)         │
                  └─────────────────────┘

┌──────────────┐      ┌──────────────────┐      ┌────────────────────┐
│   Customer   │      │  SaleTransaction │      │     SaleItem       │
│──────────────│      │──────────────────│      │────────────────────│
│ id (PK)      │◄─────┤ id (PK)          │◄─────┤ id (PK)            │
│ name         │ 1:n  │ userId (FK)      │  1:n │ transactionId (FK) │
│ email        │      │ customerId (FK)  │      │ productId (FK)     │
│ phone        │      │ paymentMethod    │      │ variantId (FK)     │
│ loyaltyTier  │      │ status           │      │ quantity           │
│ totalSpent   │      │ subtotal         │      │ price              │
│ isArchived   │      │ tax              │      │ finalPrice         │
└──────────────┘      │ total            │      │ discountType       │
                      └──────────────────┘      │ total              │
                                                └────────────────────┘

┌──────────────┐      ┌──────────────────┐
│   Deposit    │      │   Installment    │
│──────────────│      │──────────────────│
│ customerId   │      │ customerId (FK)  │
│ saleId       │      │ saleId (FK)      │
│ amount       │      │ planId (FK) ─────┼──► InstallmentPlan
│ method       │      │ amount           │    (templates)
│ status       │      │ dueDate          │
└──────────────┘      │ status           │
                      └──────────────────┘

┌──────────────────┐      ┌──────────────────┐      ┌──────────────────────┐
│    Supplier      │      │ SupplierProduct  │      │   PurchaseOrder      │
│──────────────────│      │──────────────────│      │──────────────────────│
│ id (PK)          │◄─────┤ supplierId (FK)  │      │ supplierId (FK) ─────┼─►Supplier
│ name             │  1:n │ productId (FK)──►│Product│ poNumber (unique)   │
│ contactName      │      │ cost             │      │ status               │
│ paymentTerms     │      │ leadTime         │      │ totalAmount          │
│ isActive         │      │ isPreferred      │      └──────────┬───────────┘
└──────────────────┘      └──────────────────┘                 │ 1:n
                                                               ▼
                                                    ┌──────────────────────┐
                                                    │  PurchaseOrderItem   │
                                                    │──────────────────────│
                                                    │ productId (FK)       │
                                                    │ variantId (FK)       │
                                                    │ quantity             │
                                                    │ unitCost             │
                                                    │ receivedQty          │
                                                    └──────────────────────┘

┌──────────────┐    ┌──────────────────┐    ┌────────────────────────┐
│   Employee   │    │EmployeeAttendance│    │   EmployeePayroll      │
│──────────────│    │──────────────────│    │────────────────────────│
│ id (PK)      │◄───┤ employeeId (FK)  │    │ employeeId (FK) ───────┼─► Employee
│ name         │1:n │ date             │    │ month / year           │
│ role         │    │ checkIn/Out      │    │ baseSalary             │
│ salary       │    │ status           │    │ bonuses / deductions   │
│ status       │    └──────────────────┘    │ netPay / status        │
└──────┬───────┘                            └────────────────────────┘
       │ 1:n each  ┌──────────────────┐    ┌────────────────────────┐
       ├──────────►│EmployeeDocument  │    │   EmployeeShift        │
       ├──────────►│EmployeeActivityLog    │   EmployeeOvertime     │
       └──────────►└──────────────────┘    └────────────────────────┘
```

---

### 4.2 Full Schema (All Plugins)

> The complete schema when **all 5 plugins** are enabled (50 tables total).

```
╔══════════════════════════════════════════════════════════════════════╗
║                      KERNEL LAYER (29 tables)                       ║
║  User  Category  Product  ProductVariant  ProductAttribute           ║
║  VariantAttributeValue  ProductImage  StockMovement                 ║
║  SaleTransaction  SaleItem  FinancialTransaction                    ║
║  Customer  Deposit  Installment  InstallmentPlan                    ║
║  Employee  EmployeeAttendance  EmployeeDocument                     ║
║  EmployeeActivityLog  EmployeePayroll  EmployeeShift                ║
║  EmployeeOvertime  Store  Supplier  SupplierProduct                 ║
║  PurchaseOrder  PurchaseOrderItem  ReceiptTemplate  EmailReport     ║
╚══════════════════╦═══════════════════════════════════════════════════╝
                   ║  (shared via Product FK, optional cross-referencing)
       ┌───────────╬──────────────────────┬─────────────────────────┐
       │           │                      │                         │
       ▼           ▼                      ▼                         ▼
┌─────────────┐ ┌──────────────────┐ ┌────────────────┐ ┌──────────────────┐
│  🍞 BAKERY  │ │  🍽️ RESTAURANT   │ │  🏭 WAREHOUSE  │ │  🏥 CLINIC       │
│  (6 tables) │ │  (5 tables)      │ │  (4 tables)    │ │  (4 tables)      │
│─────────────│ │──────────────────│ │────────────────│ │──────────────────│
│ Recipe      │ │ RestaurantTable  │ │WarehouseLocation│ │ ClinicPatient   │
│ RecipeIngred│ │ TableReservation │ │WarehouseStock  │ │ ClinicSession   │
│ ProductionBa│ │ MenuItem         │ │ StockTransfer  │ │ClinicPrescription│
│ PantryIngred│ │ DineInOrder      │ │StockTransferIte│ │ClinicCheckResult│
│ WasteLog    │ │ DineInOrderItem  │ │                │ └──────────────────┘
│ ProductionSc│ │                  │ │                │
└─────────────┘ └──────────────────┘ └────────────────┘
│ Links to:   │ │ Links to:        │ │ Links to:      │ │ Links to:        │
│ Product     │ │ (self-contained) │ │ Product        │ │ (independent)    │
│ (outputProd)│ │                  │ │ (via stock)    │ │                  │
└─────────────┘ └──────────────────┘ └────────────────┘ └──────────────────┘
```

---

## 5. Plugin System — How Tables Are Added

### Architecture

Plugins are **compiled in** at build time, not loaded at runtime. The build flag `ENABLED_MODULES` determines which plugins are treeshaken into the final app bundle.

```
electron.vite.config.ts
         │
         ▼  define flags:
    __PLUGIN_BAKERY__     = true/false
    __PLUGIN_RESTAURANT__ = true/false
    __PLUGIN_WAREHOUSE__  = true/false
    __PLUGIN_CLINIC__     = true/false
    __PLUGIN_COMMERCE__   = true/false
         │
         ▼
Only plugins with flag=true are included in the bundle.
Dead-code elimination removes the rest entirely.
```

### Plugin Interface

Every plugin implements `IPlugin`:

```typescript
interface IPlugin {
  id: string                        // e.g. "bakery"
  ensureSchema(
    prisma: PrismaClient,
    dbUrl: string,
    cwd: string
  ): Promise<void>                  // Create tables if missing
  registerHandlers(
    prisma: PrismaClient
  ): void                           // Register ipcMain.handle() channels
}
```

### Table Creation Sequence

```
app startup
    │
    ▼
for each plugin in ALL_PLUGINS:
    │
    ▼
plugin.ensureSchema(prisma, dbUrl, cwd)
    │
    ├─► Check sqlite_master: SELECT name FROM sqlite_master
    │        WHERE type='table' AND name='<PluginTable>'
    │
    │   All tables exist?
    │        YES ──► "✅ tables already exist — skip"
    │
    │   Any missing?
    │        │
    │        ▼
    │   npx prisma db push
    │        --schema=prisma/merged.prisma
    │        --skip-generate
    │        --accept-data-loss
    │        DATABASE_URL=file:<dbPath>
    │        │
    │        └──► SQLite applies only the missing CREATE TABLE statements
    │             Existing data in all other tables is untouched
    │
    ▼
plugin.registerHandlers(prisma)
    └──► ipcMain.handle('bakery:getRecipes', ...)
         ipcMain.handle('bakery:getProfitLoss', ...)
         ... etc
```

### Enabling / Disabling Plugins at Runtime

Users can toggle plugins in Settings. The state is stored in:

```
<userData>/bizflow-settings.json
{
  "enabledModules": ["bakery", "restaurant"]
}
```

After toggling, the app **relaunches** (`app.relaunch()`) to pick up the new active plugin set. IPC channels are only registered for enabled plugins — the renderer receives `null` or empty arrays if it tries to access a disabled plugin's API.

---

## 6. Plugin Schemas

### 6.1 Bakery Plugin

**Tables:** `Recipe`, `RecipeIngredient`, `ProductionBatch`, `PantryIngredient`, `WasteLog`, `ProductionSchedule`

```
┌──────────────────────────────────────────────────────────────────────┐
│                          BAKERY PLUGIN                               │
└──────────────────────────────────────────────────────────────────────┘

 KERNEL: Product ◄──────────────────────────────────────────────────────────┐
                                                                             │ (optional)
┌────────────────────┐  1:n  ┌──────────────────────┐                       │
│      Recipe        │◄──────┤  RecipeIngredient    │                       │
│────────────────────│       │──────────────────────│  pantryIngredientId   │
│ id (PK)            │       │ id (PK)              │◄──────┐               │
│ name               │       │ recipeId (FK)        │       │               │
│ outputProductId ───┼───────┼──────────────────────┼───────┼───────────────┘
│ yieldQty           │       │ name                 │       │
│ yieldUnit          │       │ quantity             │       │
│ expiryDays         │       │ unit                 │       │
│ isActive           │       │ costPerUnit          │       │
└────────┬───────────┘       │ supplierName         │       │
         │                   └──────────────────────┘       │
         │ 1:n                                              │
         │         ┌──────────────────────┐                │
         ├────────►│  ProductionBatch     │                │
         │         │──────────────────────│                │
         │         │ id (PK)              │                │
         │         │ recipeId (FK)        │                │
         │         │ batchDate            │                │
         │         │ quantity             │                │
         │         │ unitsProduced        │                │
         │         │ totalCost            │                │
         │         │ expiresAt            │                │
         │         └──────────────────────┘                │
         │                                                  │
         │ 1:n     ┌──────────────────────┐                │
         ├────────►│  ProductionSchedule  │                │
         │         │──────────────────────│                │
         │         │ id (PK)              │                │
         │         │ recipeId (FK)        │                │
         │         │ scheduledDate        │                │
         │         │ plannedQuantity      │                │
         │         │ status               │                │
         │         └──────────────────────┘                │
         │                                                  │
         │ 1:n     ┌──────────────────────────────────┐    │
         └────────►│      WasteLog                    │    │
                   │──────────────────────────────────│    │
                   │ id (PK)                          │    │
                   │ wasteType (ingredient/product/   │    │
                   │           batch/other)           │    │
                   │ recipeId (FK, optional)          │    │
                   │ productId (FK, optional) ────────┼────┼──► KERNEL: Product
                   │ pantryIngredientId (FK, opt) ────┼────┘
                   │ quantity / unit / cost           │
                   │ reason / wasteDate               │
                   └──────────────────────────────────┘

┌────────────────────────┐
│   PantryIngredient     │◄── referenced by RecipeIngredient & WasteLog
│────────────────────────│
│ id (PK)                │
│ name (unique)          │
│ currentStock           │
│ unit / costPerUnit     │
│ lowStockThreshold      │
│ reorderPoint           │
│ supplierName           │
└────────────────────────┘
```

**Cross-plugin links:**
- `Recipe.outputProductId` → `Product` (kernel) — recipe output syncs product inventory
- `WasteLog.productId` → `Product` (kernel) — finished product waste tracking
- `RecipeIngredient.pantryIngredientId` → `PantryIngredient` (bakery)

---

### 6.2 Restaurant Plugin

**Tables:** `RestaurantTable`, `TableReservation`, `MenuItem`, `DineInOrder`, `DineInOrderItem`

```
┌──────────────────────────────────────────────────────────────────────┐
│                        RESTAURANT PLUGIN                             │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐  1:n  ┌──────────────────────┐
│   RestaurantTable    │◄──────┤   TableReservation   │
│──────────────────────│       │──────────────────────│
│ id (PK)              │       │ id (PK)              │
│ number (unique)      │       │ tableId (FK)         │
│ capacity             │       │ customerName         │
│ status               │       │ customerPhone        │
│   available          │       │ partySize            │
│   occupied           │       │ date                 │
│   reserved           │       │ status               │
│   cleaning           │       │   pending            │
│ section              │       │   confirmed          │
│ isActive             │       │   seated             │
└──────────┬───────────┘       │   completed          │
           │                   │   cancelled          │
           │ 1:n               └──────────────────────┘
           ▼
┌──────────────────────┐  1:n  ┌──────────────────────┐
│     DineInOrder      │◄──────┤  DineInOrderItem     │
│──────────────────────│       │──────────────────────│
│ id (PK)              │       │ id (PK)              │
│ tableId (FK)         │       │ orderId (FK)         │
│ status               │       │ menuItemId (FK) ─────┼──► MenuItem
│   open               │       │ itemName (snapshot)  │
│   ready              │       │ quantity             │
│   paid               │       │ unitPrice            │
│   voided             │       │ status               │
│ subtotal / tax / total       │   pending            │
│ openedAt / closedAt  │       │   preparing          │
│ serverName           │       │   ready              │
└──────────────────────┘       │   served             │
                               └──────────────────────┘

┌──────────────────────┐
│      MenuItem        │
│──────────────────────│
│ id (PK)              │
│ name                 │
│ category             │
│ price / cost         │
│ preparationTime      │
│ isAvailable          │
│ displayOrder         │
└──────────────────────┘
```

**Cross-plugin links:**
- Restaurant is **self-contained** — no FK references to kernel tables.
  `DineInOrderItem.itemName` stores a snapshot of the menu item name so historical orders are preserved even if the `MenuItem` is deleted.

---

### 6.3 Warehouse Plugin

**Tables:** `WarehouseLocation`, `WarehouseStock`, `StockTransfer`, `StockTransferItem`

```
┌──────────────────────────────────────────────────────────────────────┐
│                         WAREHOUSE PLUGIN                             │
└──────────────────────────────────────────────────────────────────────┘

 KERNEL: Product / ProductVariant ◄─────────────────────────────────────────┐
                                                                             │
┌─────────────────────────────┐                                             │
│      WarehouseLocation      │  (self-referencing hierarchy)               │
│─────────────────────────────│                                             │
│ id (PK)                     │◄──────┐ parentId (self FK)                 │
│ name                        │       │                                     │
│ code (unique)               │       │                                     │
│ type                        │   ┌───┴─────────────────────┐              │
│   zone / aisle / shelf / bin│   │ WarehouseLocation       │              │
│ parentId (FK, self)         │   │ (parent)                │              │
│ isActive                    │   └─────────────────────────┘              │
│ isStoreLocation             │                                             │
│   true → syncs              │        ┌──────────────────────┐            │
│   ProductVariant.stock      │        │   WarehouseStock     │            │
└────────────┬────────────────┘        │──────────────────────│            │
             │                         │ id (PK)              │            │
             │ 1:n                     │ locationId (FK)      │            │
             └────────────────────────►│ productName          │            │
                                       │ sku                  │            │
             │ transfersFrom 1:n       │ quantity             │            │
             └────────────────────────►│ unit                 │            │
                                       │ minQuantity          │            │
             │ transfersTo 1:n         └──────────────────────┘            │
             └──────────────────────────────────────────────────────►StockTransfer
                                                                            │
┌──────────────────────────────┐  1:n  ┌──────────────────────┐           │
│       StockTransfer          │◄──────┤  StockTransferItem   │           │
│──────────────────────────────│       │──────────────────────│           │
│ id (PK)                      │       │ id (PK)              │           │
│ fromLocationId (FK) ─────────┼───────┤ transferId (FK)      │           │
│ toLocationId (FK) ───────────┼──►WL  │ productName          │           │
│ status                       │       │ sku                  │           │
│   pending / in_transit /     │       │ quantity             │           │
│   completed / cancelled      │       │ unit                 │           │
│ notes / createdAt            │       └──────────────────────┘           │
└──────────────────────────────┘
```

**Cross-plugin links:**
- `WarehouseLocation.isStoreLocation = true` → completing a `StockTransfer` to this location automatically syncs `ProductVariant.stock` (kernel table) — the warehouse becomes the source of truth for store stock.

---

### 6.4 Clinic Plugin

**Tables:** `ClinicPatient`, `ClinicSession`, `ClinicPrescription`, `ClinicCheckResult`

```
┌──────────────────────────────────────────────────────────────────────┐
│                          CLINIC PLUGIN                               │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐  1:n  ┌──────────────────────────┐
│    ClinicPatient     │◄──────┤      ClinicSession       │
│──────────────────────│       │──────────────────────────│
│ id (PK)              │       │ id (PK)                  │
│ name                 │       │ patientId (FK)           │
│ dateOfBirth          │       │ visitDate                │
│ gender               │       │ visitType                │
│ phone                │       │   first_visit            │
│ email                │       │   follow_up              │
│ nationalId (unique)  │       │   routine                │
│ bloodType            │       │   emergency              │
│ allergies            │       │ doctorName               │
│ medicalNotes         │       │ chiefComplaint           │
└──────────┬───────────┘       │ vitals (JSON)            │
           │                   │ diagnosis                │
           │ 1:n               │ amountCharged            │
           └──────────────────►│ paymentStatus            │
                               └──────────┬───────────────┘
                                          │ 1:n
                                          ▼
                               ┌──────────────────────────┐
                               │   ClinicPrescription     │
                               │──────────────────────────│
                               │ id (PK)                  │
                               │ sessionId (FK)           │
                               │ medicineName             │
                               │ dosage / frequency       │
                               │ duration / quantity      │
                               │ instructions             │
                               └──────────────────────────┘

┌──────────────────────────────────┐
│       ClinicCheckResult          │◄── directly linked to ClinicPatient
│──────────────────────────────────│
│ patientId (FK)                   │
│ title / description              │
│ fileName / filePath / fileSize   │ (lab results, X-rays, etc.)
│ resultDate                       │
└──────────────────────────────────┘
```

**Cross-plugin links:**
- Clinic is fully **independent** from all kernel tables.
  Patient billing is handled via `ClinicSession.amountCharged` and `paymentStatus` directly — no integration with `SaleTransaction`.

---

### 6.5 Commerce Plugin

The Commerce plugin does not add new tables. It uses the full kernel schema (`Product`, `ProductVariant`, `SaleTransaction`, `SaleItem`, `Customer`, `Supplier`, `PurchaseOrder`, etc.) and provides enhanced Commerce-specific IPC handlers and UI on top of the existing kernel data.

---

## 7. Database by Configuration

### No Plugins Enabled

```
Total tables: 29 (kernel only)

Tables present:
  User, Category, Product, ProductImage, ProductVariant
  ProductAttribute, VariantAttributeValue, StockMovement
  SaleTransaction, SaleItem, FinancialTransaction
  Store, Employee, EmployeeAttendance, EmployeeDocument
  EmployeeActivityLog, EmployeePayroll, EmployeeShift, EmployeeOvertime
  Customer, Deposit, Installment, InstallmentPlan
  Supplier, SupplierProduct, PurchaseOrder, PurchaseOrderItem
  ReceiptTemplate, EmailReport
```

### + Bakery Plugin

```
Total tables: 35 (+6)

Added:
  Recipe, RecipeIngredient, ProductionBatch
  PantryIngredient, WasteLog, ProductionSchedule

Cross-links to kernel:
  Recipe.outputProductId → Product
  WasteLog.productId → Product
```

### + Restaurant Plugin

```
Total tables: 40 (+5)

Added:
  RestaurantTable, TableReservation, MenuItem
  DineInOrder, DineInOrderItem

Cross-links to kernel:
  None (self-contained)
```

### + Warehouse Plugin

```
Total tables: 44 (+4)

Added:
  WarehouseLocation, WarehouseStock
  StockTransfer, StockTransferItem

Cross-links to kernel:
  completing transfer to isStoreLocation → syncs ProductVariant.stock
```

### + Clinic Plugin

```
Total tables: 48 (+4)

Added:
  ClinicPatient, ClinicSession
  ClinicPrescription, ClinicCheckResult

Cross-links to kernel:
  None (independent patient management)
```

### All 5 Plugins Enabled

```
Total tables: 50 (29 kernel + 6 bakery + 5 restaurant + 4 warehouse + 4 clinic + 0 commerce)

┌─────────────┬──────────────────┬─────────────────────────────────────────┐
│  Plugin     │  Tables Added    │  Kernel Tables Referenced               │
├─────────────┼──────────────────┼─────────────────────────────────────────┤
│ (none)      │ 29 kernel        │ —                                       │
│ Bakery      │ +6               │ Product (outputProductId, wasteLogs)    │
│ Restaurant  │ +5               │ None                                    │
│ Warehouse   │ +4               │ ProductVariant (stock sync on transfer) │
│ Clinic      │ +4               │ None                                    │
│ Commerce    │ +0               │ Full kernel (enhanced read/write)       │
├─────────────┼──────────────────┼─────────────────────────────────────────┤
│ Total       │ 50               │                                         │
└─────────────┴──────────────────┴─────────────────────────────────────────┘
```

---

## 8. SQLite Optimizations Applied

On every startup, after the Prisma client connects, these PRAGMAs are applied:

```sql
PRAGMA journal_mode = WAL;        -- Write-Ahead Logging: readers don't block writers
PRAGMA synchronous   = NORMAL;    -- Balance between safety and performance
PRAGMA cache_size    = -65536;    -- 64 MB page cache in memory
PRAGMA temp_store    = MEMORY;    -- Temp tables/indexes stay in RAM
PRAGMA mmap_size     = 536870912; -- 512 MB memory-mapped I/O
PRAGMA busy_timeout  = 10000;     -- Wait up to 10 s before "database is locked"
PRAGMA foreign_keys  = ON;        -- Enforce FK constraints
PRAGMA optimize;                  -- Let SQLite auto-tune query planner stats
```

Prisma connection string also sets:
```
connection_limit=1     (avoid connection pool deadlocks with SQLite)
timeout=60000          (60 second query timeout)
```

Prisma transaction options:
```
maxWait: 30,000 ms    (time to acquire a transaction slot)
timeout: 30,000 ms    (max time a transaction may run)
isolationLevel: Serializable
```

---

## 9. Seed Data

### Production Seed (`prisma/seed-production.ts`)

Run automatically on first app launch. Creates a minimal starting state:

```
Users:
  - setup / setup123  (role: admin)

Everything else: empty, ready for real business data
```

### Development Seed (`prisma/seed-development.ts`)

Run manually via `npm run prisma:seed:dev`. Simulates 4 years of real business data:

```
Users:
  setup    / setup123  (admin)
  admin    / admin123  (admin)
  manager  / manager123 (manager)

Products:      50,000  (added progressively over 3 years)
Sales:      1,000,000  (distributed over 4 years, seasonal variation)
Customers:     10,000  (with loyalty tiers: Bronze → Platinum)
Stores:             3
Financial transactions included

Category distribution:
  Electronics       15%
  Clothing          25%
  Home & Kitchen    20%
  Sports & Fitness  10%
  Books & Media      8%
  Food & Beverages  12%
  Beauty & Health   10%
```

Estimated seeding time: 10–30 minutes depending on hardware.

---

## 10. Schema Files Reference

| File                          | Purpose                                              |
|-------------------------------|------------------------------------------------------|
| `prisma/schema.prisma`        | **Kernel schema only** — 29 core tables. Used by `prisma generate` to build the TypeScript client. |
| `prisma/merged.prisma`        | **All tables** — kernel + all 5 plugins (50 tables). Used by `prisma db push` when plugins need to add their tables. Auto-generated by `node scripts/merge-schemas.js`. |
| `prisma/prisma/dev.db`        | SQLite database used in development mode.            |
| `src/generated/prisma/`       | Auto-generated Prisma client TypeScript code (from `schema.prisma`). Do not edit manually. |
| `src/plugins/*/migrate.ts`    | Per-plugin schema migration logic (`ensureSchema`).  |
| `src/main/database/init.ts`   | Database initialization on first run (production).  |
| `src/main/database/seed-production.ts` | Minimal production seed logic.            |
| `<userData>/bizflow-settings.json` | Plugin enable/disable settings stored here.    |

---

*This document is auto-maintained. Last updated: 2026.*
