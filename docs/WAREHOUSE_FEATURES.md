# Warehouse Features Documentation

Date: 2026-05-25

## 1. Scope

The Warehouse module provides multi-location inventory control, transfer workflows, inbound and outbound order execution, full movement history, and action-level auditability.

This document describes features currently implemented in the codebase.

## 2. Core Data Model

Warehouse data model is defined in:
- src/plugins/warehouse/schema.prisma

### 2.1 Location Structure
- WarehouseLocation
- Hierarchical structure via parent and children
- Types: zone, aisle, shelf, bin
- Active flag and notes

### 2.2 Inventory Structure
- WarehouseStock
- Unique key: locationId + productName
- Core fields: productName, sku, quantity, unit, minQuantity
- Extended WMS fields:
  - itemType (raw_material, finished_goods, packaging, returns, damaged, quarantine)
  - barcode, lotNumber, batchNumber, serialNumber, expiryDate
  - dimensions, weight, volume
  - binCode, aisleCode, shelfCode, palletCode
  - isQuarantine, isDamaged

### 2.3 Transfer Structure
- StockTransfer
- StockTransferItem
- Status lifecycle: draft, in_transit, completed, cancelled
- Accountability fields: createdBy, completedBy, completedAt

### 2.4 Operational Orders
- WarehouseOrder
- WarehouseOrderLine
- Order types: inbound, outbound, return, work_order
- Order status: draft, pending, processing, completed, cancelled

### 2.5 Phase 2 Workflow Stages
- Workflow stage values:
  - created
  - receiving
  - qc
  - putaway
  - picking
  - packing
  - shipping
  - done
- Stage accountability fields:
  - receivedAt, receivedBy
  - qcCompletedAt, qcBy
  - putawayAt, putawayBy
  - pickedAt, pickedBy
  - packedAt, packedBy
  - shippedAt, shippedBy

### 2.6 Traceability Tables
- WarehouseStockMovement
- WarehouseAuditLog

Movement includes:
- movementType (in, out, adjust, transfer_in, transfer_out, receive, ship, return)
- beforeQty and afterQty
- sourceType and sourceId
- actedBy and notes

Audit log includes:
- entityType
- entityId
- action
- actor
- details

## 3. Backend Features

Warehouse handlers are registered from:
- src/plugins/warehouse/handlers/index.ts

### 3.1 Location APIs
- warehouse:getLocations
- warehouse:createLocation
- warehouse:updateLocation
- warehouse:deleteLocation

### 3.2 Inventory APIs
- warehouse:getStock
- warehouse:upsertStock
- warehouse:adjustStock
- warehouse:deleteStock
- warehouse:getLowStock
- warehouse:getMovements
- warehouse:getAuditLogs

Inventory behavior highlights:
- Upsert and adjustment write movement and audit logs
- Rich query support for location, search, itemType
- Low-stock detection based on quantity and minQuantity

### 3.3 Transfer APIs
- warehouse:getTransfers
- warehouse:createTransfer
- warehouse:updateTransferStatus
- warehouse:deleteTransfer

Transfer behavior highlights:
- Completion updates stock quantities
- Completion writes transfer_out and transfer_in movement records
- Transfer lifecycle writes audit records

### 3.4 Operational Order APIs
- warehouse:getOrders
- warehouse:getJourneyBoard
- warehouse:createOrder
- warehouse:updateOrderStatus
- warehouse:advanceOrderStage
- warehouse:processOrder

Order behavior highlights:
- Default stage assignment by order type
- Stage progression through receiving and outbound lanes
- Process action posts stock impact and closes order
- Full movement and audit trail coverage

### 3.5 Overview API
- warehouse:getOverview

Overview data includes:
- totalLocations
- totalSKUs
- pendingTransfers
- lowStockCount
- activeOrders
- inboundPending
- outboundPending
- recentTransfers
- recentMovements

## 4. Frontend Features

Warehouse page entry:
- src/renderer/src/plugins/warehouse/pages/index.tsx

Tabs:
- Overview
- Operations
- Locations
- Inventory
- Transfers

### 4.1 Overview Tab
File:
- src/renderer/src/plugins/warehouse/pages/components/OverviewTab.tsx

Features:
- KPI cards
- Operations snapshot summary
- Recent transfer stream
- Latest activity stream
- Skeleton loading state

### 4.2 Operations Tab (Phase 2)
File:
- src/renderer/src/plugins/warehouse/pages/components/OperationsTab.tsx

Features:
- Control tower board with queue counts
- Receiving and outbound journey views
- Activity feed for movements and audit trail
- Order creation modal (multi-line)
- Stage-aware primary action button per order
- Search and location filtering
- Skeleton loading state

### 4.3 Locations Tab
File:
- src/renderer/src/plugins/warehouse/pages/components/LocationsTab.tsx

Features:
- Hierarchical location tree view
- Add and edit location modal
- Search and location type filtering
- Optimistic delete behavior
- Skeleton loading state

### 4.4 Inventory Tab
File:
- src/renderer/src/plugins/warehouse/pages/components/InventoryTab.tsx

Features:
- Location and low-stock mode switch
- Search by product and SKU
- Summary KPI cards
- Quick plus and minus quantity adjustments
- Add and edit stock modal
- Optimistic updates for add, adjust, delete
- Skeleton loading rows

### 4.5 Transfers Tab
File:
- src/renderer/src/plugins/warehouse/pages/components/TransfersTab.tsx

Features:
- Status filters
- Search for routes and items
- Transfer KPI cards
- Inline status advancement actions
- Transfer creation modal with multiple lines
- Optimistic status and delete updates
- Skeleton loading cards

## 5. Preload Contract

Preload mapping:
- src/plugins/warehouse/preload.ts

Typing contract:
- src/preload/index.d.ts

The following groups are exposed:
- Location methods
- Stock methods
- Transfer methods
- Operations methods
- Overview method

## 6. Traceability and Accountability

The module provides two complementary histories:

1. Stock movements
- Quantitative history with before and after values
- Tied to source entities like order or transfer

2. Audit logs
- Semantic event history for entity actions
- Includes actor and readable detail text

This combination supports operational forensics and accountability requirements.

## 7. Micro-Interactions Implemented

Phase includes:
- Toast confirmations and errors
- Optimistic updates in key actions
- Keyboard shortcuts:
  - Ctrl or Cmd + N for create actions
  - Slash for quick search focus
  - Escape for modal dismissal
- Skeleton loading states on key warehouse screens

## 8. Seed Data Coverage

Warehouse seed file:
- prisma/seeds/warehouse/seed.ts

Seed script:
- prisma:seed:warehouse

Seed coverage includes:
- Full location hierarchy
- Diverse stock records with lot, batch, serial, expiry, quarantine and damaged flags
- Transfers in all major states
- Inbound and outbound orders across all relevant workflow stages
- Completed and cancelled lifecycle examples
- Movement records for all core movement types
- Audit records across stock, transfer, location and order entities

## 9. Recommended Verification Checklist

After seeding:
1. Open warehouse Overview and confirm KPI population.
2. Open Operations and verify receiving and outbound queues are populated.
3. Open Inventory and verify low-stock highlights and search behavior.
4. Open Transfers and verify draft, in_transit, completed, cancelled examples.
5. Open Activity feeds and verify movements and who-did-what entries.
