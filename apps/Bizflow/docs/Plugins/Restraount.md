# Restaurant Plugin

> **Module ID:** `restaurant` &nbsp;|&nbsp; **Status:** Active &nbsp;|&nbsp; **Depends on:** Core (Employee, Finance)

The Restaurant plugin adds full dine-in operations to BizFlow — visual table layout, reservation management, per-table order taking with live kitchen-status tracking, digital menu management, and a restaurant-level overview dashboard. It ships five handler groups: **Tables, Reservations, Menu, Orders, Overview**.

---

## Table of Contents

1. [Data Models](#data-models)
2. [Feature Areas](#feature-areas)
   - [Tables & Floor Management](#1-tables--floor-management)
   - [Reservations](#2-reservations)
   - [Menu Management](#3-menu-management)
   - [Dine-In Orders](#4-dine-in-orders)
   - [Overview Dashboard](#5-overview-dashboard)
3. [IPC Handlers Reference](#ipc-handlers-reference)
4. [Code Locations](#code-locations)
5. [Screenshots](#screenshots)

---

## Data Models

| Model | Purpose |
|---|---|
| `RestaurantTable` | A physical table: number, capacity, section, live status |
| `TableReservation` | A booking tied to a table: guest info, party size, date/time, status |
| `MenuItem` | A menu item: name, category, price, cost, prep time, availability |
| `DineInOrder` | An open or closed order for a table: totals, server, status |
| `DineInOrderItem` | One line in an order: snapshot of item name, price, quantity, kitchen status |

---

## Feature Areas

### 1. Tables & Floor Management

- **Table registry** — create tables with a number, capacity, and optional section label (`Indoor`, `Outdoor`, `Bar`, `Terrace`, …).
- **Live status per table:** `available` | `occupied` | `reserved` | `cleaning`.
- **Status transitions** — opening an order flips the table to `occupied`; closing/paying flips it back to `available`.
- **Active / inactive flag** — deactivate a table (e.g. out of service) without deleting its history.
- **Section filtering** — the floor-plan view can filter by section for large restaurants with multiple zones.
- **Overview counts** — the dashboard instantly shows totals for available, occupied, reserved, and cleaning tables.

### 2. Reservations

- **Book a table** — select table, enter guest name, phone, party size, date & time, and optional notes.
- **Lifecycle statuses:** `pending` → `confirmed` → `seated` → `completed` | `cancelled`.
- **Confirmation flow** — front-of-house staff confirm pending reservations; status shown on the floor plan.
- **No-show handling** — mark a reservation as `cancelled` if the guest does not arrive.
- **Today's reservations count** — the overview dashboard shows how many confirmed/pending reservations are scheduled for the current day.
- **Table-level reservation list** — view all past and upcoming reservations for a specific table.

### 3. Menu Management

- **Menu items** — each item has: name, category, description, selling price, cost price, preparation time (minutes), display order, and notes.
- **Categories** — free-text category (`Starters`, `Mains`, `Drinks`, `Desserts`, …) with display-order sorting.
- **Availability toggle** — mark an item as unavailable (86'd) in one click; it is hidden from the order screen immediately.
- **Cost tracking** — `cost` field enables per-item margin reporting.
- **Preparation time** — used for kitchen timing estimates (default 15 minutes).
- **Display order** — control the sequence items appear in the menu and order screens.

### 4. Dine-In Orders

Orders are per-table and carry a full lifecycle:

#### Order lifecycle

```
open  →  (items served)  →  ready  →  paid
                          ↘  voided
```

| Status | Meaning |
|---|---|
| `open` | Order is active; items can be added or modified |
| `ready` | All items served; awaiting payment |
| `paid` | Bill settled; table freed |
| `voided` | Order cancelled without payment |

#### Order-item kitchen statuses

| Status | Meaning |
|---|---|
| `pending` | Sent to kitchen, not started |
| `preparing` | Kitchen is working on it |
| `ready` | Ready at the pass |
| `served` | Delivered to the table |

#### Key behaviours

- **Per-table order** — one open order per table at a time; multiple orders per table over time are stored historically.
- **Item snapshot** — `itemName` and `unitPrice` are snapshotted on the order item so menu changes don't affect historical records.
- **Auto totals** — `subtotal`, `tax`, and `total` are recalculated by the backend (`recalcOrderTotals`) every time an item is added, removed, or quantity is changed.
- **Server name** — optional field to track which staff member took the order.
- **Item-level notes** — guest modifications ("no onions", "well done") stored per item.
- **Kitchen view** — staff can filter open orders by item status to manage the kitchen queue.
- **Close & bill** — closing an order records `closedAt`, flips status to `paid`, and releases the table.

### 5. Overview Dashboard

The `restaurant:getOverview` handler returns a single snapshot object:

| Field | Value |
|---|---|
| `totalTables` | Total active tables |
| `available` | Tables currently free |
| `occupied` | Tables with an open order |
| `reserved` | Tables with a confirmed reservation right now |
| `cleaning` | Tables in the cleaning state |
| `openOrders` | Count of orders with status `open` |
| `todayReservations` | Confirmed/pending reservations for today |
| `availableMenuItems` | Count of menu items currently set to available |

All counts are live — no caching; the handler runs fresh queries on every call.

---

## IPC Handlers Reference

| Channel | File | Description |
|---|---|---|
| `restaurant:getTables` | `handlers/tables.ts` | List all active tables |
| `restaurant:createTable` | `handlers/tables.ts` | Add a new table |
| `restaurant:updateTable` | `handlers/tables.ts` | Update table details or status |
| `restaurant:deleteTable` | `handlers/tables.ts` | Deactivate a table |
| `restaurant:getReservations` | `handlers/reservations.ts` | List reservations (filter by date/table/status) |
| `restaurant:createReservation` | `handlers/reservations.ts` | Book a table |
| `restaurant:updateReservationStatus` | `handlers/reservations.ts` | Advance reservation status |
| `restaurant:getMenuItems` | `handlers/menu.ts` | List menu items (filter by category/availability) |
| `restaurant:createMenuItem` | `handlers/menu.ts` | Add a menu item |
| `restaurant:updateMenuItem` | `handlers/menu.ts` | Update item details or toggle availability |
| `restaurant:deleteMenuItem` | `handlers/menu.ts` | Remove a menu item |
| `restaurant:getOrders` | `handlers/orders.ts` | List orders (filter by table/status/date) |
| `restaurant:createOrder` | `handlers/orders.ts` | Open a new order for a table |
| `restaurant:addOrderItem` | `handlers/orders.ts` | Add an item to an open order (triggers recalc) |
| `restaurant:updateOrderItemStatus` | `handlers/orders.ts` | Advance kitchen status of an item |
| `restaurant:removeOrderItem` | `handlers/orders.ts` | Remove an item from an order (triggers recalc) |
| `restaurant:closeOrder` | `handlers/orders.ts` | Mark order as paid and free the table |
| `restaurant:voidOrder` | `handlers/orders.ts` | Void an open order |
| `restaurant:getOverview` | `handlers/overview.ts` | Live table/order/reservation summary |

---

## Code Locations

```
src/plugins/restaurant/
├── schema.prisma          # Models: RestaurantTable, TableReservation,
│                          #         MenuItem, DineInOrder, DineInOrderItem
├── manifest.ts            # Plugin metadata (id, name, version, routes)
├── index.ts               # Registers all handler groups
├── migrate.ts             # Plugin-specific migration runner
├── preload.ts             # Exposes IPC channels to renderer
└── handlers/
    ├── tables.ts          # Table CRUD + status management
    ├── reservations.ts    # Reservation booking & lifecycle
    ├── menu.ts            # Menu item CRUD + availability toggle
    ├── orders.ts          # Order & order-item management + auto-totals
    └── overview.ts        # Live dashboard aggregation
```

Renderer UI lives under `src/renderer/src/plugins/restaurant/` (pages, components, hooks).

---

## Screenshots

| Screen | File |
|---|---|
| Table floor plan & live statuses | `samples/restaruant.png` |
| Digital menu management | `samples/restaraunt menu.png` |
