# BizFlow — Master Architecture Reference

> **AI INSTRUCTION:** This is the primary reference document. Read this before writing or editing any code in this project. All other docs in this folder expand on specific subsystems.

---

## 1. What Is BizFlow?

BizFlow is an **offline-first Electron desktop application** for small-to-medium business management in Egypt. It is a **multi-plugin platform** — a single deployable `.exe` can be built with one or more business-domain plugins compiled in at build time.

**Target market:** Egyptian SMBs — retail shops, clinics, bakeries, restaurants, warehouses.

**Languages:** English + Arabic (RTL). Language is toggleable at runtime.

**Build for a single client:** The build system supports compiling only the plugins a specific client needs (e.g., `ENABLED_MODULES=clinic` for a medical clinic).

**License expiry:** `APP_EXPIRY_DATE = new Date('2026-08-13T00:00:00')` is hardcoded in `src/renderer/src/pages/login.tsx`. When expired, the whole app shows an `ExpiredScreen` with a LinkedIn contact CTA before the user can log in.

---

## 2. Technology Stack

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Desktop shell | Electron | 26 | IPC, BrowserWindow, app lifecycle |
| Bundler | electron-vite | 1.0.27 | Wraps Vite 4 for Electron |
| Frontend framework | React | 18.2 | Concurrent, lazy loading |
| Language | TypeScript | 5.2 | Strict mode |
| Styling | Tailwind CSS | 3.3 | Dark mode via `class` strategy |
| Database ORM | Prisma | 5.4.2 | SQLite, code-first schema |
| Database | SQLite | (bundled) | Single file, offline |
| Routing | react-router-dom | 6.30 | HashRouter (required for Electron file:// protocol) |
| Charts | recharts | 3.6 | Primary chart library |
| Charts (alt) | react-chartjs-2 | 5.3 | Used in some older components |
| Icons | lucide-react | **0.287.0** | ⚠️ OLD version — many icons missing |
| PDF generation | jspdf + jspdf-autotable | 3.0 / 5.0 | |
| Thermal printing | node-thermal-printer | 4.5 | ESC/POS protocol |
| Email | nodemailer | 6.9 | SMTP, daily reports |
| Barcode | bwip-js | 4.8 | Barcode generation |
| Password hashing | bcryptjs | 2.4 | |
| Scheduled tasks | node-cron | 3.0 | Daily email reports @ 11 PM |
| Logging | electron-log | 5.4 | Auto-writes to OS log directory |
| Auto-update | electron-updater | 6.1 | GitHub Releases |
| Excel export | xlsx | 0.18 | |
| Validation | zod | 3.22 | |
| Virtual lists | react-window | 1.8 | Large list performance |
| Animations | tailwindcss-animate | 1.0 | |
| Tests | vitest | 1.6 | unit + integration |

### ⚠️ Critical: lucide-react Icon Constraints

**Version is 0.287.0** — many modern icons do NOT exist. Always verify an icon exists before using it.

**Known missing icons:** `ReceiptText`, `ReceiptEuro`, `ReceiptPound`, `CircleUserRound`, `CircleUser`

**Working alternatives:** `Receipt`, `User`, `UserCircle`, `FileText`

**Rule:** When adding icons, check with: `node -e "const l = require('lucide-react'); console.log(Object.keys(l).filter(k => k.toLowerCase().includes('YOUR_WORD')))"` in the project root.

---

## 3. Plugin Architecture

### 3.1 How Plugins Work

Plugins are **compiled in at build time** — not loaded dynamically at runtime. The build flag `ENABLED_MODULES` determines which plugins are tree-shaken into the bundle.

```
ENABLED_MODULES=clinic npm run build:clinic:win
```

This creates a Windows installer that only contains clinic functionality (+ kernel).

### 3.2 Build-time Plugin Flags

Defined in `electron.vite.config.ts` and available as global constants in ALL three processes (main, preload, renderer):

```typescript
__PLUGIN_COMMERCE__   // boolean
__PLUGIN_BAKERY__     // boolean
__PLUGIN_RESTAURANT__ // boolean
__PLUGIN_WAREHOUSE__  // boolean
__PLUGIN_CLINIC__     // boolean
```

**Usage pattern:**
```typescript
// Conditional import (renderer)
const Clinic = __PLUGIN_CLINIC__ ? lazy(() => import('./plugins/clinic/pages/index')) : null

// Conditional preload spread
...(typeof __PLUGIN_CLINIC__ !== 'undefined' && __PLUGIN_CLINIC__ ? clinicPreload : {})

// Conditional UI
{__PLUGIN_CLINIC__ && clinicEnabled && <ClinicNav />}
```

### 3.3 Runtime Plugin Enable/Disable

Users can toggle plugins in Settings. State persisted in:
```
<userData>/bizflow-settings.json → { "enabledModules": ["clinic"] }
```

When toggled, `app.relaunch()` is called to reload with updated IPC channel registrations.

Accessed in renderer via `useModuleEnabled(MODULE_IDS.CLINIC)` hook.

### 3.4 Plugin Structure

Every plugin has both a **backend** (`src/plugins/<name>/`) and a **frontend** (`src/renderer/src/plugins/<name>/`) component.

**Backend plugin interface (`src/plugins/<name>/`):**
```
index.ts         # IPlugin implementation: { ensureSchema(), registerHandlers() }
manifest.ts      # Plugin metadata (id, name, description, features)
migrate.ts       # ensureClinicSchema() — idempotent table creation
preload.ts       # IPC channel bindings exported as <name>Preload
schema.prisma    # Plugin models (no datasource/generator block — merged by script)
handlers/        # IPC handler files (one file per domain)
```

**Frontend plugin pages (`src/renderer/src/plugins/<name>/pages/`):**
```
index.tsx        # Main tabbed page component
PatientProfile.tsx (clinic) or similar detail pages
components/      # Tab components, modals, forms
```

### 3.5 Active Plugins

| Plugin | Status | DB Tables | Build Flag | Frontend Route | IPC Prefix |
|---|---|---|---|---|---|
| Commerce | ✅ Active | 0 new (uses kernel) | `__PLUGIN_COMMERCE__` | `/products`, `/pos`, `/inventory`, `/sales`, `/installments` | (flat — see §10.1) |
| Bakery | ✅ Active | 6 | `__PLUGIN_BAKERY__` | `/bakery` | `bakery:` |
| Restaurant | ✅ Active | 5 | `__PLUGIN_RESTAURANT__` | `/restaurant` | `restaurant:` |
| Warehouse | ✅ Active | 4 | `__PLUGIN_WAREHOUSE__` | `/warehouse` | `warehouse:` |
| Clinic | ✅ Active | 8 | `__PLUGIN_CLINIC__` | `/clinic`, `/clinic/patient/:id` | `clinic:` |

### 3.6 How to Add a New Plugin

The `bakeryManifest.ts` file documents the exact 6 wiring points required:

1. `src/plugins/<id>/manifest.ts` — metadata
2. `src/plugins/<id>/handlers/` — `ipcMain.handle()` registrations
3. `src/plugins/<id>/preload.ts` — `ipcRenderer.invoke()` wrappers
4. `src/plugins/<id>/schema.prisma` — Prisma models (NO datasource/generator blocks)
5. `src/plugins/<id>/migrate.ts` — `ensure<Id>Schema()` function
6. `src/renderer/src/plugins/<id>/pages/index.tsx` — main UI page + components/

**Then wire into 6 existing files:**
- `src/preload/index.ts` → add `<id>: <id>Preload` to api object
- `src/main/ipc/handlers/index.ts` → call `register<Id>Handlers(prisma)`
- `src/renderer/src/App.tsx` → add lazy route
- `src/renderer/src/components/layout/RootLayout.tsx` → add nav item
- `src/shared/modules.ts` → add to `MODULE_REGISTRY`
- `scripts/merge-schemas.js` → add plugin schema path
- `electron.vite.config.ts` → add `__PLUGIN_<ID>__` define flag

---

## 4. Process Architecture (Electron)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MAIN PROCESS (Node.js)                       │
│  src/main/index.ts                                                  │
│  ├── BrowserWindow creation                                         │
│  ├── initializeDatabase() — first-run DB setup                      │
│  ├── MigrationManager — schema migration on update                  │
│  ├── registerAllHandlers() — all kernel + plugin IPC handlers       │
│  ├── setupDailyEmailReports() — node-cron @ 11PM                    │
│  └── app auto-updater                                               │
│                                                                     │
│  src/main/ipc/handlers/          (25+ handler files)               │
│  src/main/services/              (business logic services)          │
│  src/main/repositories/          (complex Prisma queries)           │
│  src/main/middleware/authz.ts    (role-based authorization)         │
│  src/main/database/init.ts       (first-run schema creation)        │
└─────────────────────┬───────────────────────────────────────────────┘
                      │ ipcMain.handle() / ipcRenderer.invoke()
                      │ contextBridge (secure, no nodeIntegration)
┌─────────────────────┴───────────────────────────────────────────────┐
│                       PRELOAD SCRIPT (Node.js)                      │
│  src/preload/index.ts                                               │
│  └── Exposes window.api.* to renderer via contextBridge             │
│      ├── window.api.auth.*                                          │
│      ├── window.api.dashboard.*                                     │
│      ├── window.api.employees.*                                     │
│      ├── window.api.customers.*                                     │
│      ├── window.api.finance.*                                       │
│      ├── window.api.expenses.*                                      │
│      ├── window.api.users.*                                         │
│      ├── window.api.stores.*                                        │
│      ├── window.api.reports.*                                       │
│      ├── window.api.settings.*                                      │
│      ├── window.api.receipt.*                                       │
│      ├── ...all commerce APIs (products, sales, inventory, etc.)    │
│      ├── window.api.clinic.*  (if __PLUGIN_CLINIC__)                │
│      ├── window.api.bakery.*  (if __PLUGIN_BAKERY__)                │
│      ├── window.api.restaurant.* (if __PLUGIN_RESTAURANT__)         │
│      └── window.api.warehouse.* (if __PLUGIN_WAREHOUSE__)           │
└─────────────────────┬───────────────────────────────────────────────┘
                      │ window.api.* calls
┌─────────────────────┴───────────────────────────────────────────────┐
│                      RENDERER PROCESS (Browser)                     │
│  src/renderer/src/App.tsx  (HashRouter, lazy-loaded routes)         │
│  ├── AuthContext — user session, role permissions                   │
│  ├── ThemeContext — dark/light mode                                  │
│  ├── LanguageContext — en/ar, RTL                                   │
│  ├── ModuleContext — which plugins are enabled at runtime           │
│  ├── ToastContext — global notifications                             │
│  └── DisplaySettingsContext                                         │
│                                                                     │
│  RootLayout.tsx — sidebar nav + content wrapper                     │
│  pages/          — kernel pages (Dashboard, Finance, Employees…)    │
│  plugins/        — plugin frontend pages                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. IPC Channel Naming Conventions

All IPC channels follow `<namespace>:<resource>:<action>` pattern.

### 5.1 Kernel Channels

```
auth:login                        auth:create
dashboard:getMetrics              dashboard:getSalesChart
dashboard:getTopProducts          dashboard:getRecentActivity          dashboard:getDayStats
categories:getAll                 categories:create                    categories:update                    categories:delete
products:getAll                   products:getById                     products:getVariantById
products:search                   products:create                      products:update                      products:delete
products:batchCreate              products:batchUpdate                 products:batchDelete                 products:getStats
inventory:getProducts             inventory:getAll                     inventory:getMetrics
inventory:getLowStock             inventory:getOutOfStock              inventory:updateStock                inventory:searchByBarcode
sales:getAll                      sales:create                         sales:refund
saleTransactions:create           saleTransactions:getAll              saleTransactions:getById             saleTransactions:refund              saleTransactions:refundItems
stores:getAll                     stores:create                        stores:update                        stores:delete
suppliers:getAll                  suppliers:getById                    suppliers:create                     suppliers:update                     suppliers:delete
suppliers:getProducts             suppliers:addProduct                 suppliers:updateProduct              suppliers:removeProduct
stockMovements:record             stockMovements:getHistory            stockMovements:getProductHistory     stockMovements:getRecent             stockMovements:bulkRecord
deposits:create                   deposits:list                        deposits:getByCustomer               deposits:getBySale                   deposits:linkToSale
installments:create               installments:list                    installments:getByCustomer           installments:getUpcomingReminders    installments:getOverdue
installments:markAsPaid           installments:markOverdueBatch        installments:linkToSale              installments:calculateLateFees
installment-plans:getAll          installment-plans:getActive          installment-plans:create             installment-plans:seedDefaults       installment-plans:calculateSchedule
purchase-orders:getAll            purchase-orders:getById              purchase-orders:create               purchase-orders:receive
reorder:getAlerts                 reorder:dismissAlert                 reorder:generatePurchaseOrder
receipts:generateDeposit          receipts:generateThermal             receipt:print                        receipt:detectPrinters               receipt:testPrint
customers:getAll                  customers:getCount                   customers:getProfile
employees:getAll                  employees:getById                    employees:search                     employees:stats
employees:create                  employees:update                     employees:delete
employees:attendance:upsert       employees:attendance:getRange        employees:attendance:checkIn         employees:attendance:checkOut
employees:payroll:upsert          employees:payroll:getAll             employees:payroll:markPaid           employees:payroll:compute            employees:payroll:getSummary
employees:shifts:add              employees:shifts:getAll              employees:shifts:delete
employees:overtime:add            employees:overtime:approve           employees:overtime:delete
employees:activity:add
users:getAll                      users:getById                        users:create                         users:update                         users:delete
finance:*                         expenses:*                           reports:*
search:products                   barcode:generate
module:getEnabled                 module:setEnabled
backup:*                          log:*
```

### 5.2 Bakery Plugin Channels (`bakery:*`)

```
bakery:getRecipes                 bakery:createRecipe                  bakery:updateRecipe                  bakery:deleteRecipe
bakery:getProductionBatches       bakery:createProductionBatch         bakery:deleteProductionBatch         bakery:getAvailableBatches
bakery:getPantry                  bakery:upsertPantryIngredient        bakery:adjustPantryStock             bakery:deletePantryIngredient        bakery:markPantryReordered
bakery:getWasteLogs               bakery:createWasteLog                bakery:deleteWasteLog                bakery:getWasteSummary
bakery:getSchedule                bakery:createScheduleItem            bakery:updateScheduleItem            bakery:deleteScheduleItem
bakery:getDailyOverview           bakery:getProfitLoss                 bakery:getProfitLossTrend            bakery:getExpiringBatches
bakery:getProductionRequirements  bakery:getEndOfDaySuggestion
```

### 5.3 Restaurant Plugin Channels (`restaurant:*`)

```
restaurant:getTables              restaurant:createTable               restaurant:updateTable               restaurant:deleteTable
restaurant:getReservations        restaurant:createReservation         restaurant:updateReservation         restaurant:deleteReservation
restaurant:getMenuItems           restaurant:createMenuItem            restaurant:updateMenuItem            restaurant:deleteMenuItem
restaurant:getOrders              restaurant:getOrder                  restaurant:openOrder                 restaurant:closeOrder
restaurant:addOrderItem           restaurant:removeOrderItem           restaurant:updateOrderItemStatus
restaurant:getOverview
```

### 5.4 Warehouse Plugin Channels (`warehouse:*`)

```
warehouse:getLocations            warehouse:createLocation             warehouse:updateLocation             warehouse:deleteLocation
warehouse:getStock                warehouse:upsertStock                warehouse:adjustStock                warehouse:deleteStock                warehouse:getLowStock
warehouse:getTransfers            warehouse:createTransfer             warehouse:updateTransferStatus       warehouse:deleteTransfer
warehouse:getOverview
```

### 5.5 Clinic Plugin Channels (`clinic:*`)

```
clinic:patients:getAll            clinic:patients:getById              clinic:patients:create               clinic:patients:update               clinic:patients:delete
clinic:patients:searchLite        clinic:patients:exportPdf
clinic:sessions:getRecent         clinic:sessions:create               clinic:sessions:update               clinic:sessions:delete               clinic:sessions:clearFollowUp
clinic:stats:overview             clinic:stats:topDiagnoses            clinic:stats:visitTrend              clinic:stats:fullTrend               clinic:stats:monthlyTrend
clinic:stats:breakdowns           clinic:stats:patientStats
clinic:checkResults:getByPatient  clinic:checkResults:upload           clinic:checkResults:getBuffer        clinic:checkResults:open             clinic:checkResults:delete
clinic:appointments:getAll        clinic:appointments:getToday         clinic:appointments:getUpcoming      clinic:appointments:getFollowUpReminders
clinic:appointments:getAllFollowUps clinic:appointments:create          clinic:appointments:update           clinic:appointments:delete
clinic:expenses:getAll            clinic:expenses:summary              clinic:expenses:breakdown            clinic:expenses:create               clinic:expenses:update               clinic:expenses:delete
clinic:staff:getAll               clinic:staff:create                  clinic:staff:update                  clinic:staff:delete
clinic:staff:addSalary            clinic:staff:getSalaryHistory
```

---

## 6. Database Architecture

### 6.1 Database File Location

| Environment | Path |
|---|---|
| Production Windows | `%APPDATA%\BizFlow\database.db` |
| Production macOS | `~/Library/Application Support/BizFlow/database.db` |
| Development | `prisma/prisma/dev.db` |

### 6.2 Schema Files

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | **Kernel schema only** — 29 tables. Used for `prisma generate` |
| `prisma/merged.prisma` | **All tables** — kernel + all plugins. Auto-generated by `node scripts/merge-schemas.js`. Used for `prisma db push` |
| `src/plugins/*/schema.prisma` | Per-plugin model definitions (no datasource/generator block) |
| `src/generated/prisma/` | Auto-generated Prisma client. **Do not edit manually** |

### 6.3 First-Run Database Creation

```
App first launch
  └─► Does database.db exist?
        NO → Is resources/prisma/template.db available?
               YES → Copy template.db → database.db  (fast)
               NO  → npx prisma migrate deploy → create from schema
```

### 6.4 Plugin Table Creation (Every Launch)

Each plugin calls `ensureSchema()` on startup:
1. Queries `sqlite_master` for plugin table names
2. If all exist → calls `applyColumnMigrations()` (adds missing columns idempotently)
3. If any missing → runs `npx prisma db push --schema=prisma/merged.prisma`

### 6.5 Table Count Summary

| Configuration | Tables |
|---|---|
| Kernel only | 29 |
| + Commerce | 29 (Commerce uses kernel tables) |
| + Bakery | +6 = 35 |
| + Restaurant | +5 = 40 |
| + Warehouse | +4 = 44 |
| + Clinic | +**8** = 52 |
| All plugins | **52** |

> **Note:** DATABASE.md lists Clinic as 4 tables, but the actual schema has **8** tables: `ClinicPatient`, `ClinicSession`, `ClinicPrescription`, `ClinicCheckResult`, `ClinicAppointment`, `ClinicExpense`, `ClinicStaff`, `ClinicSalaryRecord`.

---

## 7. Authentication & Authorization

### 7.1 Roles

```typescript
enum Role { admin, manager, sales, inventory, finance }
```

| Role | Access |
|---|---|
| `admin` | Everything |
| `manager` | Everything except user management |
| `sales` | POS, customers, basic dashboard |
| `inventory` | Products, inventory, purchase orders |
| `finance` | Finance, expenses, reports |

### 7.2 Auth Flow

1. User enters username/password in `login.tsx`
2. `window.api.auth.login()` → IPC → `auth.handlers.ts` → bcryptjs compare
3. On success: user object stored in React state + `localStorage`
4. `AuthContext` exposes permission helpers: `isAdmin`, `isManager`, `canEdit`, `canDelete`, `canManageInventory`
5. Navigation items filtered by `roles` array in `RootLayout.tsx`

### 7.3 License Expiry

In `src/renderer/src/pages/login.tsx`:

```typescript
const APP_EXPIRY_DATE = new Date('2026-08-13T00:00:00')
const isExpired = Date.now() > APP_EXPIRY_DATE.getTime()

export default function Login() {
  // ...hooks...
  if (isExpired) return <ExpiredScreen />  // ← shown before login form
  // ...rest of login form...
}
```

`ExpiredScreen` component shows a full-screen dark overlay with:
- Red `AlertCircle` icon
- "License Expired" heading
- LinkedIn CTA button: `https://www.linkedin.com/in/medhatjachour`

**To update expiry date:** Change `APP_EXPIRY_DATE` constant in `login.tsx` line ~13.

---

## 8. i18n (Internationalization)

### 8.1 How It Works

- Translation file: `src/renderer/src/i18n/translations.ts`
- Single flat object structure: `{ en: { key: 'value' }, ar: { key: 'قيمة' } }`
- `useLanguage()` hook from `LanguageContext` gives `t(key)`, `language`, `setLanguage`
- Fallback chain: `ar[key] → en[key] → raw key`
- RTL automatically applied: `document.documentElement.dir = 'rtl'` when `language === 'ar'`
- Persisted in `localStorage`

### 8.2 Adding Translation Keys

Add to **both** `en` and `ar` sections in `translations.ts`. Never add a key to only one language.

```typescript
// In en section:
myNewKey: 'My New Value',
// In ar section:
myNewKey: 'قيمتي الجديدة',
```

### 8.3 Common Translation Key Prefixes

| Prefix | Domain |
|---|---|
| `bakery*` | Bakery plugin |
| `restaurant*` | Restaurant plugin |
| `warehouse*` | Warehouse plugin |
| `clinic*` | Clinic plugin |
| `finance*`, `expense*` | Finance/Expenses |
| `employee*` | HR module |
| `product*`, `inventory*` | Inventory |
| `customer*` | Customers |
| (no prefix) | Kernel/global keys |

---

## 9. Navigation & Routing

### 9.1 Router

Uses `HashRouter` — required for Electron's `file://` protocol. All routes use `#/path` format.

### 9.2 Sidebar Navigation

Defined in `src/renderer/src/components/layout/RootLayout.tsx`. Navigation items are filtered by:
1. User role (`roles` array on each nav item)
2. Plugin availability (build-time flags)
3. Runtime plugin enable state (`useModuleEnabled()`)

### 9.3 Conditional Nav Filtering (Example: Clinic)

When clinic is active, the global `/expenses` nav item is hidden:

```typescript
.filter(n =>
  (n.href !== '/customers' || commerceEnabled) &&
  (n.href !== '/expenses'  || !(__PLUGIN_CLINIC__ && clinicEnabled))
)
```

### 9.4 All Routes

| Path | Component | Notes |
|---|---|---|
| `/` | → `/dashboard` redirect | |
| `/dashboard` | `Dashboard/index` | All roles |
| `/employees` | `Employees/index` | admin, manager |
| `/employees/:id` | `Employees/EmployeeProfile` | |
| `/customers` | `Customers/Customers` | Commerce only |
| `/customers/:id` | `Customers/CustomerProfile` | |
| `/reports` | `Reports/Reports` | admin, manager, finance |
| `/finance` | `Finance/index` | admin, manager, finance |
| `/expenses` | `Expenses/index` | Hidden when clinic active |
| `/settings` | `Settings/index` | |
| `/products` | `commerce/pages/Products` | __PLUGIN_COMMERCE__ |
| `/pos` | `commerce/pages/POS` | __PLUGIN_COMMERCE__ |
| `/inventory` | `commerce/pages/Inventory` | __PLUGIN_COMMERCE__ |
| `/sales` | `commerce/pages/Sales` | __PLUGIN_COMMERCE__ |
| `/stores` | `commerce/pages/Stores` | __PLUGIN_COMMERCE__ |
| `/installments` | `commerce/pages/Installments` | __PLUGIN_COMMERCE__ |
| `/bakery` | `bakery/pages/index` | __PLUGIN_BAKERY__ |
| `/restaurant` | `restaurant/pages/index` | __PLUGIN_RESTAURANT__ |
| `/warehouse` | `warehouse/pages/index` | __PLUGIN_WAREHOUSE__ |
| `/clinic` | `clinic/pages/index` | __PLUGIN_CLINIC__ |
| `/clinic/patient/:id` | `clinic/pages/PatientProfile` | __PLUGIN_CLINIC__ |

---

## 10. Plugin Deep-Dives

---

### 10.1 Commerce Plugin

**Build flag:** `__PLUGIN_COMMERCE__`  
**DB tables:** None — uses kernel tables only  
**IPC pattern:** Flat (spread directly onto `window.api.*` — not namespaced)  
**Use case:** Full retail POS, inventory, sales, supplier/PO management

**Backend:** `src/plugins/commerce/handlers/index.ts` → delegates to the kernel handler files in `src/main/ipc/handlers/`

**`window.api` namespaces added by Commerce:**

| Namespace | Key Operations |
|---|---|
| `window.api.products` | CRUD, search, batch ops, stats |
| `window.api.categories` | CRUD |
| `window.api.inventory` | getAll, getMetrics, getLowStock, updateStock, searchByBarcode |
| `window.api.sales` | getAll, create, refund |
| `window.api.saleTransactions` | create, getAll, getById, refund, refundItems, getByDateRange |
| `window.api.stores` | CRUD, getWarehouseLocations |
| `window.api.suppliers` | CRUD + supplier-product linking |
| `window.api.stockMovements` | record, getHistory, bulkRecord |
| `window.api.deposits` | create, list, getByCustomer, getBySale, linkToSale |
| `window.api.installments` | create, list, getUpcomingReminders, getOverdue, markAsPaid, calculateLateFees |
| `window.api.installmentPlans` | CRUD, calculateSchedule, createInstallmentsForSale, seedDefaults |
| `window.api.purchaseOrders` | CRUD, receive |
| `window.api.reorder` | getAlerts, dismissAlert, generatePurchaseOrder |
| `window.api.receipts` | generateDeposit, generateThermal |
| `window.api.thermalReceipts` | print, detectPrinters, testPrint |

**Frontend pages (`src/renderer/src/plugins/commerce/pages/`):**

| Page | Component | Key UI |
|---|---|---|
| `/products` | `Products/index.tsx` | Product catalog with variant management, barcode, images |
| `/pos` | `POS/index.tsx` | Full POS terminal — QuickSale search, cart, payment (cash/card/installments/deposits) |
| `/inventory` | `Inventory/index.tsx` | Stock levels, low-stock alerts, stock movement history |
| `/sales` | `Sales.tsx` | Sales history, refund management |
| `/stores` | `Stores.tsx` | Multi-store / branch management |
| `/installments` | `Installments.tsx` | Installment plan management, overdue tracking |

**POS Sub-Components (`POS/`):**
`ProductSearch`, `QuickSale`, `ShoppingCart`, `PaymentSection`, `PaymentFlowSelector`, `InstallmentForm`, `DepositForm`, `CustomerSelect`, `AddCustomerModal`, `SuccessModal`

---

### 10.2 Bakery Plugin

**Build flag:** `__PLUGIN_BAKERY__`  
**DB tables:** 6 — `Recipe`, `RecipeIngredient`, `ProductionBatch`, `PantryIngredient`, `WasteLog`, `ProductionSchedule`  
**IPC pattern:** Namespaced under `window.api.bakery.*`  
**Use case:** Recipe management, production batches, pantry stock, waste logging, production scheduling, P&L

**Cross-plugin links:**
- `Recipe.outputProductId` → kernel `Product` (recipe output syncs product stock)
- `WasteLog.productId` → kernel `Product` (finished product waste)
- `RecipeIngredient.pantryIngredientId` → `PantryIngredient` (stock-aware costing)

**Backend handlers (`src/plugins/bakery/handlers/`):**

| File | IPC Channels |
|---|---|
| `recipes.ts` | `bakery:getRecipes/create/update/delete` |
| `production.ts` | `bakery:getProductionBatches/create/delete/getAvailableBatches` |
| `pantry.ts` | `bakery:getPantry/upsertPantryIngredient/adjustPantryStock/deletePantryIngredient/markPantryReordered` |
| `waste.ts` | `bakery:getWasteLogs/create/delete/getWasteSummary` |
| `schedule.ts` | `bakery:getSchedule/createScheduleItem/updateScheduleItem/deleteScheduleItem` |
| `analytics.ts` | `bakery:getDailyOverview/getProfitLoss/getProfitLossTrend/getExpiringBatches/getProductionRequirements/getEndOfDaySuggestion` |

**Frontend tabs (`src/renderer/src/plugins/bakery/pages/`):**

Tab type: `'overview' | 'recipes' | 'production' | 'pantry' | 'waste' | 'schedule' | 'profitloss'`

| Tab | Component | Key Feature |
|---|---|---|
| Overview | `DailyOverviewTab` | Today’s batches, expiring items, alerts, what-can-we-make calculator |
| Recipes | `RecipesTab` + `RecipeFormModal` | Recipe CRUD with ingredient list, yield, cost per unit |
| Production | `ProductionTab` + `ProductionConfirmModal` | Log production batches, scaling calculator |
| Pantry | `PantryTab` | Ingredient stock levels, low-stock alerts, reorder marking |
| Waste | `WasteTab` | Waste logging by category (ingredient/product/batch), waste summary |
| Schedule | `ScheduleTab` | Day-based production planning board |
| P&L | `ProfitLossTab` | Revenue vs. cost trend chart, period selector |

**End-of-Day:** `EndOfDayModal` — daily summary: produced/sold/unsold/waste.

---

### 10.3 Restaurant Plugin

**Build flag:** `__PLUGIN_RESTAURANT__`  
**DB tables:** 5 — `RestaurantTable`, `TableReservation`, `MenuItem`, `DineInOrder`, `DineInOrderItem`  
**IPC pattern:** Namespaced under `window.api.restaurant.*`  
**Use case:** Table management, reservations, dine-in order flow, menu management

**Cross-plugin links:** None — fully self-contained. `DineInOrderItem.itemName` is a snapshot string (not FK to `MenuItem`) so order history survives menu changes.

**Backend handlers (`src/plugins/restaurant/handlers/`):**

| File | IPC Channels |
|---|---|
| `tables.ts` | `restaurant:getTables/createTable/updateTable/deleteTable` |
| `reservations.ts` | `restaurant:getReservations/createReservation/updateReservation/deleteReservation` |
| `menu.ts` | `restaurant:getMenuItems/createMenuItem/updateMenuItem/deleteMenuItem` |
| `orders.ts` | `restaurant:getOrders/getOrder/openOrder/addOrderItem/removeOrderItem/updateOrderItemStatus/closeOrder` |
| `overview.ts` | `restaurant:getOverview` |

**Frontend tabs (`src/renderer/src/plugins/restaurant/pages/`):**

Tab type (inferred from components): `'overview' | 'tables' | 'orders' | 'reservations' | 'menu'`

| Tab | Component | Key Feature |
|---|---|---|
| Overview | `OverviewTab` | Active orders count, table occupancy, daily revenue |
| Tables | `TablesTab` | Visual table status grid (available/occupied/reserved/cleaning) |
| Orders | `OrdersTab` | Active dine-in order management: open, add items, update status, close |
| Reservations | `ReservationsTab` | Booking calendar, status tracking (pending → confirmed → seated) |
| Menu | `MenuTab` | Menu item CRUD with categories, price, prep time, availability toggle |

---

### 10.4 Warehouse Plugin

**Build flag:** `__PLUGIN_WAREHOUSE__`  
**DB tables:** 4 — `WarehouseLocation`, `WarehouseStock`, `StockTransfer`, `StockTransferItem`  
**IPC pattern:** Namespaced under `window.api.warehouse.*`  
**Use case:** Multi-location inventory with hierarchical bin tracking and stock transfers

**Cross-plugin links:**
- `WarehouseStock.productId` → kernel `Product` (optional soft link)
- Completing a transfer to an `isStoreLocation` → syncs kernel `ProductVariant.stock`

**Location hierarchy:** `WarehouseLocation` is self-referencing (`parentId`) supporting zone → aisle → shelf → bin tree.

**Backend handlers (`src/plugins/warehouse/handlers/`):**

| File | IPC Channels |
|---|---|
| `locations.ts` | `warehouse:getLocations/createLocation/updateLocation/deleteLocation` |
| `stock.ts` | `warehouse:getStock/upsertStock/adjustStock/deleteStock/getLowStock` |
| `transfers.ts` | `warehouse:getTransfers/createTransfer/updateTransferStatus/deleteTransfer` |
| `overview.ts` | `warehouse:getOverview` |

**Frontend tabs (`src/renderer/src/plugins/warehouse/pages/`):**

| Tab | Component | Key Feature |
|---|---|---|
| Overview | `OverviewTab` | Total locations, total stock value, low-stock items, recent transfers |
| Locations | `LocationsTab` | Hierarchical location tree (zone/aisle/shelf/bin), CRUD |
| Inventory | `InventoryTab` | Stock per location, adjust stock, low-stock filter |
| Transfers | `TransfersTab` | Create and track stock transfers between locations |

---

### 10.5 Clinic Plugin

**Build flag:** `__PLUGIN_CLINIC__`  
**DB tables:** 8 — `ClinicPatient`, `ClinicSession`, `ClinicPrescription`, `ClinicCheckResult`, `ClinicAppointment`, `ClinicExpense`, `ClinicStaff`, `ClinicSalaryRecord`  
**IPC pattern:** Namespaced under `window.api.clinic.*`  
**Use case:** Patient management, medical sessions, prescriptions, appointments, lab results, clinic staff payroll, clinic expenses

**Cross-plugin links:** None. `ClinicStaff.employeeId` is a plain string (soft reference, no FK) to kernel `Employee`.

**Backend handlers (`src/plugins/clinic/handlers/`):**

| File | IPC Channels |
|---|---|
| `patients.ts` | `clinic:patients:*` — CRUD + searchLite (name, phone, nationalId, **folderNumber**) |
| `sessions.ts` | `clinic:sessions:*` — CRUD, clearFollowUp |
| `stats.ts` | `clinic:stats:*` — overview, topDiagnoses, visitTrend, fullTrend, monthlyTrend, breakdowns, patientStats |
| `checkResults.ts` | `clinic:checkResults:*` — upload files to disk, getBuffer, open in OS, delete |
| `appointments.ts` | `clinic:appointments:*` — CRUD, getToday, getUpcoming, getFollowUpReminders, getAllFollowUps |
| `expenses.ts` | `clinic:expenses:*` — CRUD, summary, breakdown (by period/category) |
| `staff.ts` | `clinic:staff:*` — CRUD staff + salary records |
| `pdf.ts` | `clinic:patients:exportPdf` — jspdf patient history PDF |

**Frontend tabs (`src/renderer/src/plugins/clinic/pages/index.tsx`):**

Tab type: `'patients' | 'sessions' | 'stats' | 'appointments' | 'followups' | 'expenses'`

| Tab | Component | Key Feature |
|---|---|---|
| patients | PatientCard list inline | Search, **folderNumber** teal badge, click → PatientProfile |
| sessions | Sessions list | Filter by today/week/month/all, payment status |
| stats | `StatsTab` | recharts charts — tooltip `itemStyle: { color: '#f1f5f9' }` |
| appointments | `AppointmentsTab` | Calendar-style appointment management |
| followups | `FollowUpsTab` | Follow-up reminders from sessions |
| expenses | `ExpensesTab` | Period selector, category filter, 4 KPI cards, category bars, expense list |

**Detail pages:**
- `PatientProfile.tsx` — hero header with folderNumber badge, info cards, session history, prescriptions, check results (file download/view)

**Patient model key fields:**
```typescript
interface Patient {
  id: string; name: string; phone: string
  nationalId?: string | null   // @unique
  folderNumber?: string | null // @unique — clinic folder reference, searchable
  gender?: 'male' | 'female' | 'other' | null
  bloodType?: string | null    // 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-'
  allergies?: string | null; medicalNotes?: string | null
  dateOfBirth?: string | null; email?: string | null; address?: string | null
}
```

---

## 11. State Management Patterns

### 11.1 React Contexts (Global State)

| Context | State | Location |
|---|---|---|
| `AuthContext` | user, login(), logout(), permission flags | `contexts/AuthContext.tsx` |
| `ThemeContext` | theme ('dark'/'light'), toggleTheme() | `contexts/ThemeContext.tsx` |
| `LanguageContext` | language, setLanguage(), t() | `contexts/LanguageContext.tsx` |
| `ModuleContext` | enabled modules list | `contexts/ModuleContext.tsx` |
| `ToastContext` | toast notifications | `contexts/ToastContext.tsx` |
| `DisplaySettingsContext` | UI display preferences | `contexts/DisplaySettingsContext.tsx` |

### 11.2 Local State (useState)

Page-level data (lists, filters, modals, form values) is always local `useState` within page/tab components. No Redux or Zustand — intentionally simple.

### 11.3 Data Fetching Pattern

```typescript
// Standard fetch pattern used across all pages
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await window.api.clinic.patients.getAll()
      setData(result)
    } catch (e) {
      setError(t('errorLoadingData'))
    } finally {
      setLoading(false)
    }
  }
  fetchData()
}, [/* dependencies */])
```

---

## 12. Styling Conventions

### 12.1 Tailwind

- Dark mode: `class` strategy — `dark:` prefix works when `<html>` has `class="dark"`
- RTL: Tailwind classes work with `dir="rtl"` automatically for `text-right`, `ml-*`, `mr-*`
- Custom animations: `tailwindcss-animate` plugin

### 12.2 Color Conventions (by semantic)

| Use | Classes |
|---|---|
| Primary action | `bg-blue-600 hover:bg-blue-700 text-white` |
| Success / positive | `text-green-600 dark:text-green-400`, `bg-green-50 dark:bg-green-900/20` |
| Warning | `text-amber-600 dark:text-amber-400`, `bg-amber-50 dark:bg-amber-900/20` |
| Danger / error | `text-red-600 dark:text-red-400`, `bg-red-50 dark:bg-red-900/20` |
| Clinic teal | `text-teal-700 dark:text-teal-400`, `bg-teal-50 dark:bg-teal-900/20` |
| Card surface | `bg-white dark:bg-slate-800` |
| Page background | `bg-slate-50 dark:bg-slate-900` |
| Table row hover | `hover:bg-slate-50 dark:hover:bg-slate-700/50` |

### 12.3 Chart Tooltip Style (All Charts)

Always use this style object for recharts tooltips to ensure visibility in dark mode:

```typescript
const TOOLTIP_STYLE = {
  contentStyle: {
    fontSize: 12,
    borderRadius: 8,
    border: 'none',
    background: '#1e293b',
    color: '#fff'
  },
  labelStyle: { color: '#94a3b8' },
  itemStyle: { color: '#f1f5f9' }   // ← required for dark tooltip text
}
```

---

## 13. Build Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (all plugins) |
| `npm run dev:clinic` | Dev server (clinic only) |
| `npm run build:clinic:win` | Production build — clinic only, Windows .exe |
| `npm run build:win` | Production build — all plugins, Windows .exe |
| `npm run build:clinic:mac` | macOS .dmg — clinic only |
| `npm run build:linux` | Linux AppImage — all plugins |
| `npm run typecheck` | TypeScript check (both main and renderer) |
| `npm run prisma:generate` | Merge schemas + generate Prisma client |
| `npm run prisma:merge` | Merge plugin schemas → `prisma/merged.prisma` |
| `npm run test` | Run vitest tests |

### Pre-build Process

Every build runs:
1. `node scripts/merge-schemas.js` — merge plugin schemas
2. `npm run prisma:generate` — generate Prisma client from merged schema
3. `npm run create-template-db` — create `prisma/template.db`
4. `node scripts/copy-prisma-binaries.js` — copy binaries to node_modules

---

## 14. Windows-Specific Notes

- Uses `npx.cmd` (not `npx`) when running Prisma commands on Windows
- All child processes spawned with `shell: true` on `process.platform === 'win32'`
- SQLite database URLs use forward slashes even on Windows
- Installer: NSIS, per-user (no admin required), desktop + start menu shortcuts
- Electron `asarUnpack` includes `@prisma/**` and `.prisma/**` for native binary access

---

## 16. Future / Planned Plugins

The platform is designed to accept new plugins. No code changes are needed to the kernel. The 6 wiring points in §3.6 are all that’s required.

### 16.1 Plugin Wishlist / Planned

Plugins that may be added in future versions. Each entry defines what the plugin would need.

| Plugin ID | Use Case | DB Tables Needed | IPC Prefix | Route | Status |
|---|---|---|---|---|---|
| `pharmacy` | Medication inventory, dispensing, prescriptions fulfillment | `PharmacyItem`, `Dispensing`, `DispensingItem`, `PharmaSupplier` | `pharmacy:` | `/pharmacy` | 🟡 Planned |
| `school` | Student management, classes, fees, attendance | `Student`, `Class`, `ClassEnrollment`, `FeeRecord`, `SchoolAttendance` | `school:` | `/school` | 🟡 Planned |
| `hotel` | Room booking, check-in/out, housekeeping | `HotelRoom`, `HotelBooking`, `HotelGuest`, `HousekeepingTask` | `hotel:` | `/hotel` | 🟡 Planned |
| `gym` | Member management, subscriptions, classes | `GymMember`, `Subscription`, `GymClass`, `ClassBooking` | `gym:` | `/gym` | 🟡 Planned |
| `laundry` | Order management, garment tracking, pricing | `LaundryOrder`, `LaundryItem`, `LaundryPriceList` | `laundry:` | `/laundry` | 🟡 Planned |
| `salon` | Appointment booking, services, staff commissions | `SalonAppointment`, `SalonService`, `SalonStaff`, `CommissionRecord` | `salon:` | `/salon` | 🟡 Planned |
| `real_estate` | Property listings, lease/sale tracking, tenant management | `Property`, `Lease`, `Tenant`, `MaintenanceRequest` | `realestate:` | `/realestate` | 🟡 Planned |

### 16.2 Rules When Adding a New Plugin

1. **Schema file** must NOT have `datasource` or `generator` blocks
2. **Tables** should be prefixed with the plugin name (e.g., `ClinicPatient`, `PharmacyItem`) to avoid namespace collisions
3. **IPC channels** must use the plugin’s prefix exclusively (e.g., `pharmacy:*`)
4. **Translation keys** must be prefixed (e.g., `pharmacy*`) in `translations.ts`
5. **Build flag** must be added to `electron.vite.config.ts` define block: `__PLUGIN_PHARMACY__`
6. **Kernel FK links** are optional — use soft string references when crossing DB boundaries
7. **`applyColumnMigrations()`** must be implemented in `migrate.ts` for any future ALTER TABLE needs
8. **Navigation hiding rules** — if plugin has its own expenses/customers, filter kernel nav items in `RootLayout.tsx` (like clinic does for `/expenses`)

### 16.3 Commerce Auto-Dependency

In `electron.vite.config.ts`:
```typescript
const DEPENDS_ON_COMMERCE = ['bakery', 'restaurant', 'warehouse']
```
Any new plugin that references kernel Commerce tables (Product, Customer, SaleTransaction) should be added to `DEPENDS_ON_COMMERCE`.

---

## 15. Key Design Decisions

| Decision | Rationale |
|---|---|
| SQLite (not PostgreSQL) | Offline-first, single-file backup, no server needed |
| HashRouter (not BrowserRouter) | Required for Electron file:// protocol |
| Build-time plugin compilation | Tree-shaking reduces bundle size; simpler than runtime plugins |
| Flat translation keys | Simple to maintain; no nesting complexity |
| No Redux/Zustand | App is simple enough; contexts + local state avoid complexity |
| Template DB bundled | Fast first-run (copy file vs. run migrations) |
| Per-user NSIS install | No admin rights required on Windows client machines |
| Single SQLite file | Easy backup — just copy one file |
