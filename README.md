# BizFlow

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/github/package-json/v/medhatjachour/electron-app)](package.json)

> A modern business management desktop app for retail, bakeries, and more — runs fully offline on Windows, macOS, and Linux.

---

## 📥 Download

**Windows**: [Download Latest Release](https://github.com/medhatjachour/electron-app/releases/latest) (`.exe` installer)

*macOS and Linux builds available from source*

---

## 📸 Screenshots

<div align="center">

### 🏠 Dashboard Overview
![Dashboard](./samples/dashboard.png)
*Real-time business metrics with revenue tracking, sales analytics, and quick insights at a glance*

---

### 💰 Point of Sale (POS)
![POS Interface](./samples/POS.png)
*Fast, professional checkout interface with product search, shopping cart, and quick payment options*

---

### 🛍️ Product Variants in POS
![Product Variants](./samples/viewVierntOFProductIn%20Pos.png)
*Select product variants (colors, sizes) directly in POS with stock visibility and pricing*

---

### ✨ Add New Product
![Add Product](./samples/add_porducts.png)
*Create products with multiple variants, images, categories, and pricing configurations*

---

### 📦 Product Catalog
![Product Management](./samples/products.png)
*Comprehensive product catalog with advanced filtering by category, color, size, and store*

---

### 💵 Price Calculator
![Price Calculator](./samples/calcuate%20Price.png)
*Smart pricing calculator with tax computation and profit margin analysis*

---

### 📊 Sales History
![Sales](./samples/sales.png)
*Complete sales transaction history with payment methods, customer info, and order details*

---

### 🏦 Finance Dashboard
![Finance](./samples/finince.png)
*Financial analytics with revenue, expenses, profit tracking, and performance charts*

---

### 💸 Expense Management
![Expenses](./samples/expense%20Page.png)
*Track business expenses with categories, dates, and detailed descriptions*

---

### 📋 Inventory Tracking
![Inventory](./samples/inventory.png)
*Real-time inventory monitoring with stock levels, low stock alerts, and product movement*

---

### 📈 Report Generation
![Reports](./samples/reportPage.png)
*Generate comprehensive business reports: sales, inventory, financial, and customer analytics*

---

### 📄 View Generated Reports
![Report Viewer](./samples/showRport.png)
*Preview and export reports in PDF or CSV format with customizable date ranges*

---

### 🔐 Secure Login
![Login](./samples/login.png)
*Modern login interface with secure authentication and role-based access control*

</div>

---

## ✨ What it does

BizFlow is an all-in-one desktop POS and business management system. Everything runs locally — no internet required, no monthly subscription, your data stays on your machine.

### Core features

- **Point of Sale** — fast checkout with barcode scanning, product variants, and cart management
- **Inventory** — real-time stock tracking, low-stock alerts, and reorder suggestions
- **Products** — full catalog with variants (color, size), images, categories, and pricing
- **Sales history** — every transaction logged with payment method, customer, and receipt
- **Finance** — revenue, expenses, profit/loss tracking with charts
- **Reports** — export to PDF or CSV (sales, inventory, finance, customer analytics)
- **Customers** — database with loyalty tiers and purchase history
- **Employees** — records, roles, and salary tracking
- **Multi-store** — manage multiple store locations
- **Bilingual** — full Arabic and English UI with RTL support

---

## 🧩 Microkernel / Plugin Architecture

BizFlow is built on a **microkernel** design — the core app is lean and stable, and business-specific features are loaded as isolated plugins.

| Plugin | Status | What it adds |
|--------|--------|-------------|
| 🥐 **Bakery** | ✅ Active | Recipe management, production batches, pantry stock, waste tracking, scheduling, P&L |
| � **Clinic** | ✅ Active | Patient records, session tracking, prescriptions, check results (PDF), financial stats |
| 🍽️ **Restaurant** | ✅ Active | Table management, reservations, kitchen orders, menu management |
| 🏭 **Warehouse** | ✅ Active | Multi-location inventory, bin tracking, stock transfers |

Plugins can be **enabled or disabled** from Settings → Modules. When a plugin is off, its pages and database tables are completely inactive. Each plugin is fully self-contained — its backend logic, UI pages, IPC bridge, and database schema all live inside `src/plugins/<name>/`.

---

## 🚀 Getting Started

### Requirements

- **Node.js** 18+ 
- **npm** 9+

### Install & run

```bash
git clone https://github.com/medhatjachour/electron-app.git
cd electron-app
npm install
npm run dev
```

On first run the app creates and seeds a local SQLite database automatically.

### Default login

| Username | Password | Role |
|----------|----------|------|
| `setup` | `setup123` | Admin |

> Change the default password after first login.

### Build for production

```bash
npm run build:win    # Windows .exe
npm run build:mac    # macOS .dmg
npm run build:linux  # Linux .AppImage / .deb
```

---

## 🔒 Security

- All data stored locally — nothing leaves your machine
- Passwords hashed with bcrypt
- Renderer process sandboxed (no direct Node.js access)
- IPC-only communication between UI and backend

---

## 🏗️ Architecture & Design

### Software Architecture

BizFlow combines two architectural styles:

**Electron Three-Process Model**
```
┌─────────────────────────────────────────────────────┐
│  Main Process  (Node.js)                            │
│  • Database (Prisma + SQLite)                       │
│  • Business logic (Services)                        │
│  • IPC handler registry                             │
│  • Plugin handler registration                      │
└──────────────────┬──────────────────────────────────┘
                   │  IPC (contextBridge)
┌──────────────────┴──────────────────────────────────┐
│  Preload Script  (secure bridge)                    │
│  • Exposes window.api.* to renderer                 │
│  • Each plugin registers its own API namespace      │
└──────────────────┬──────────────────────────────────┘
                   │  window.api.*
┌──────────────────┴──────────────────────────────────┐
│  Renderer Process  (React)                          │
│  • UI pages & components                            │
│  • Plugin pages (lazy loaded)                       │
│  • No direct DB or Node.js access                   │
└─────────────────────────────────────────────────────┘
```

**Microkernel (Plugin System)**

The core app handles authentication, products, sales, finance, and reporting. Business-vertical features (bakery, restaurant, warehouse) are self-contained plugins loaded on top. Each plugin is completely isolated — removing one has zero impact on the rest.

```
src/plugins/<name>/
  handlers/           ← backend IPC handlers (split by domain)
    index.ts          ← registers all plugin handlers
    <entity>.ts       ← per-entity handler file
  preload.ts          ← window.api.<name>.* bindings
  migrate.ts          ← ensures plugin tables exist at runtime
  manifest.ts         ← metadata (id, name, routes, models)
  schema.prisma       ← plugin's own Prisma models

src/renderer/src/plugins/<name>/pages/
  index.tsx           ← main list / overview page
  components/         ← all UI components for this plugin
```

Schemas are merged at build time: `scripts/merge-schemas.js` combines `prisma/schema.prisma` + every enabled plugin's `schema.prisma` → `prisma/merged.prisma`.

---

### Design Patterns

| Pattern | Where used | Purpose |
|---------|-----------|---------|
| **Repository** | `src/main/repositories/` | Abstracts data access — `ProductRepository`, `SupplierRepository`, `PurchaseOrderRepository` |
| **Service Layer** | `src/main/services/` | Business logic separated from DB and transport — `InventoryService`, `InstallmentService`, `ReorderAnalysisService`, etc. |
| **Handler Registry** | `src/main/ipc/handlers/index.ts` | Central file registers all IPC handlers at startup; each domain has its own handler file |
| **Mapper** | `src/shared/mappers/` | Converts between Prisma entities and DTOs — `ProductMapper`, `SupplierMapper` |
| **DTO** | `src/shared/dtos/` | Typed data shapes for IPC transport — `product.dto.ts`, `supplier.dto.ts` |
| **Context Provider** | `src/renderer/src/contexts/` | Global React state — auth, theme, language, toast notifications |
| **Custom Hook** | every page module | Isolates data-fetching and business logic from JSX — `useProducts`, `usePOS`, `useFinance`, etc. |
| **Observer / Event Bus** | `src/shared/events/EventBus.ts` | Decoupled cross-process events |
| **Lazy Loading** | `App.tsx` | Every page is a `React.lazy()` import — only loads when navigated to |
| **Validation Schema** | `src/shared/validation/` | Zod-style schemas for all entity inputs — `product.schema.ts`, `sale.schema.ts`, etc. |
| **Authorization Middleware** | `src/main/middleware/authz.ts` | Role checks applied before IPC handlers execute |
| **Cache-Aside** | `src/main/services/CacheService.ts` | In-memory TTL cache for expensive queries (product stats, dashboard metrics) |

---

### Folder Structure

```
BizFlow/
├── prisma/
│   ├── schema.prisma           # Core database schema
│   ├── merged.prisma           # Auto-generated (core + plugins) — gitignored
│   ├── dev.db                  # Development SQLite database
│   └── template.db             # Pre-seeded template for production first-run
│
├── scripts/
│   └── merge-schemas.js        # Combines core + plugin schemas at build time
│
├── src/
│   ├── main/                   # Electron main process (Node.js)
│   │   ├── index.ts            # App entry — window, lifecycle, handler bootstrap
│   │   ├── database/
│   │   │   ├── init.ts         # DB init: dev uses dev.db, prod copies template
│   │   │   ├── optimization.ts # SQLite pragmas, index creation, ANALYZE
│   │   │   └── seed-production.ts
│   │   ├── ipc/
│   │   │   └── handlers/
│   │   │       ├── index.ts              # Registers ALL handlers at startup
│   │   │       ├── auth.handlers.ts
│   │   │       ├── products.handlers.ts
│   │   │       ├── sales.handlers.ts
│   │   │       ├── sale-transactions.handlers.ts
│   │   │       ├── inventory.handlers.ts
│   │   │       ├── finance.handlers.ts
│   │   │       ├── dashboard.handlers.ts
│   │   │       ├── customers.handlers.ts
│   │   │       ├── employees.handlers.ts
│   │   │       ├── stores.handlers.ts
│   │   │       ├── categories.handlers.ts
│   │   │       ├── reports.handlers.ts
│   │   │       ├── analytics.handlers.ts
│   │   │       ├── search.handlers.ts
│   │   │       ├── user.handlers.ts
│   │   │       ├── deposits.handlers.ts
│   │   │       ├── installments.handlers.ts
│   │   │       ├── receipts.handlers.ts
│   │   │       ├── receipt.handlers.ts   # Thermal printer receipts
│   │   │       ├── barcode.handlers.ts
│   │   │       ├── backup.handlers.ts
│   │   │       ├── reorder.handlers.ts
│   │   │       ├── suppliers.handlers.ts
│   │   │       ├── purchase-orders.handlers.ts
│   │   │       ├── stock-movements.handlers.ts
│   │   │       ├── delete.handlers.ts
│   │   │       ├── email.handlers.ts
│   │   │       ├── log.handlers.ts
│   │   │       └── module.handlers.ts    # Plugin enable/disable IPC
│   │   ├── middleware/
│   │   │   └── authz.ts                  # Role-based authorization
│   │   ├── repositories/                 # Repository pattern — data access layer
│   │   │   ├── ProductRepository.ts
│   │   │   ├── SupplierRepository.ts
│   │   │   └── PurchaseOrderRepository.ts
│   │   ├── services/                     # Service layer — business logic
│   │   │   ├── CacheService.ts
│   │   │   ├── InventoryService.ts
│   │   │   ├── ProductService.ts
│   │   │   ├── DeleteService.ts
│   │   │   ├── DepositService.ts
│   │   │   ├── InstallmentService.ts
│   │   │   ├── InstallmentPlanService.ts
│   │   │   ├── ReceiptService.ts
│   │   │   ├── ReorderAnalysisService.ts
│   │   │   ├── PurchaseOrderService.ts
│   │   │   ├── SupplierService.ts
│   │   │   ├── StoreAnalyticsService.ts
│   │   │   ├── EmailReportService.ts
│   │   │   ├── ImageService.ts
│   │   │   ├── ThermalPrinterService.ts
│   │   │   ├── PredictionService.ts
│   │   │   └── MigrationManager.ts
│   │   └── utils/
│   │       ├── logger.ts                 # Structured logger (electron-log)
│   │       └── module-settings.ts        # Plugin enable/disable persistence
│   │
│   ├── plugins/                          # ── Microkernel plugin layer (backend) ──
│   │   ├── bakery/                       # Bakery plugin (self-contained)
│   │   │   ├── manifest.ts               # id, name, routes, models metadata
│   │   │   ├── handlers/                 # IPC handlers split by domain
│   │   │   │   ├── index.ts              # Registers all bakery handlers
│   │   │   │   ├── recipes.ts
│   │   │   │   ├── production.ts
│   │   │   │   ├── pantry.ts
│   │   │   │   ├── schedule.ts
│   │   │   │   ├── waste.ts
│   │   │   │   └── analytics.ts
│   │   │   ├── preload.ts                # window.api.bakery.* bindings
│   │   │   ├── migrate.ts                # Ensures bakery tables exist at runtime
│   │   │   └── schema.prisma             # Bakery Prisma models
│   │   ├── clinic/                       # Clinic plugin (self-contained)
│   │   │   ├── manifest.ts
│   │   │   ├── handlers/
│   │   │   │   ├── index.ts
│   │   │   │   ├── patients.ts
│   │   │   │   ├── sessions.ts
│   │   │   │   ├── checkResults.ts
│   │   │   │   └── stats.ts
│   │   │   ├── preload.ts                # window.api.clinic.* bindings
│   │   │   ├── migrate.ts
│   │   │   └── schema.prisma
│   │   ├── restaurant/                   # Restaurant plugin (self-contained)
│   │   │   ├── manifest.ts
│   │   │   ├── handlers/
│   │   │   │   ├── index.ts
│   │   │   │   ├── menu.ts
│   │   │   │   ├── orders.ts
│   │   │   │   ├── tables.ts
│   │   │   │   ├── reservations.ts
│   │   │   │   └── overview.ts
│   │   │   ├── preload.ts
│   │   │   ├── migrate.ts
│   │   │   └── schema.prisma
│   │   └── warehouse/                    # Warehouse plugin (self-contained)
│   │       ├── manifest.ts
│   │       ├── handlers/
│   │       │   ├── index.ts
│   │       │   ├── stock.ts
│   │       │   ├── locations.ts
│   │       │   ├── transfers.ts
│   │       │   └── overview.ts
│   │       ├── preload.ts
│   │       ├── migrate.ts
│   │       └── schema.prisma
│   │
│   ├── preload/
│   │   ├── index.ts                      # contextBridge — exposes window.api.*
│   │   └── index.d.ts                    # TypeScript types for window.api
│   │
│   ├── renderer/                         # React application
│   │   └── src/
│   │       ├── App.tsx                   # Router — all routes, lazy imports
│   │       ├── contexts/                 # Global state (Context Provider pattern)
│   │       │   ├── AuthContext.tsx
│   │       │   ├── ThemeContext.tsx
│   │       │   ├── LanguageContext.tsx
│   │       │   └── ToastContext.tsx
│   │       ├── hooks/                    # Shared custom hooks
│   │       │   ├── useModuleEnabled.ts   # Plugin feature-flag hook
│   │       │   └── ...
│   │       ├── components/
│   │       │   ├── layout/               # RootLayout, sidebar, header
│   │       │   └── ui/                   # Shared UI primitives
│   │       ├── pages/                    # Core feature pages
│   │       │   ├── Dashboard/
│   │       │   ├── POS/
│   │       │   ├── Products/
│   │       │   ├── Sales/
│   │       │   ├── Finance/
│   │       │   ├── Inventory/
│   │       │   ├── Customers/
│   │       │   ├── Employees/
│   │       │   ├── Expenses/
│   │       │   ├── Reports/
│   │       │   └── Settings/
│   │       ├── plugins/                  # Plugin UI (mirrors src/plugins/)
│   │       │   ├── bakery/
│   │       │   │   └── pages/            # Bakery pages & components
│   │       │   ├── clinic/
│   │       │   │   └── pages/            # Patient list, PatientProfile, session modals
│   │       │   ├── restaurant/
│   │       │   │   └── pages/            # Restaurant pages & components
│   │       │   └── warehouse/
│   │       │       └── pages/            # Warehouse pages & components
│   │       ├── i18n/
│   │       │   └── translations.ts       # EN + AR strings (bilingual)
│   │       └── services/                 # Frontend-side helpers
│   │
│   └── shared/                           # Code shared by main + renderer
│       ├── modules.ts                    # Plugin registry & ModuleId types
│       ├── types.ts                      # Common type definitions
│       ├── dtos/                         # Data Transfer Objects
│       ├── mappers/                      # Entity ↔ DTO mappers
│       ├── interfaces/                   # IRepository, IService contracts
│       ├── events/EventBus.ts            # Cross-process event bus
│       └── validation/                   # Input validation schemas
```

---

## 📄 License

MIT © [medhatjachour](https://github.com/medhatjachour)

</div>

