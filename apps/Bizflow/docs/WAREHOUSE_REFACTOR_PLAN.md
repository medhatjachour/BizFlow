# Warehouse Refactor Plan

Date: 2026-05-25

## Objective
Build a serious WMS foundation focused on:
- inbound and outbound product flow
- operational order list visibility
- full action accountability (who did what)

## What Was Implemented (Phase 1 + Phase 2 Start)

### 1) Operational Data Foundation
Added warehouse entities to support traceability and order-driven operations:
- `WarehouseOrder`
- `WarehouseOrderLine`
- `WarehouseStockMovement`
- `WarehouseAuditLog`

Also extended existing entities:
- `WarehouseStock`: item type, lot/batch/serial, expiry, barcode, dimensions/weight/volume, bin/aisle/shelf/pallet, quarantine/damaged flags
- `StockTransfer`: `createdBy`, `completedBy`

### 2) Backend Operations APIs
Added and wired handlers for:
- `warehouse:getOrders`
- `warehouse:createOrder`
- `warehouse:updateOrderStatus`
- `warehouse:processOrder`
- `warehouse:getMovements`
- `warehouse:getAuditLogs`

Enhanced existing handlers:
- stock upsert/adjust/delete now write movement + audit records
- transfer create/status now write movement + audit records
- overview now includes active orders + inbound/outbound pending + recent movement activity

### 3) Renderer UX Upgrade
Added `Operations` tab under warehouse pages:
- pending inbound/outbound order list
- process-order action
- recent stock movements feed
- audit feed for "who did what"

Inventory and transfer UI now pass actor metadata for better traceability.

## Current Coverage vs Requested Direction

Covered now:
- Order list and execution flow (inbound/outbound)
- Product movement timeline
- Actor/accountability trail
- Real-time operational KPIs in overview

Partially covered:
- richer item master attributes (core fields added, not full workflow yet)
- location/bin-aware stock structure (data fields added, advanced slotting pending)

Not yet covered (next phases):
- ASN workflow, QC workflow, FEFO/FIFO strategy engine
- wave/batch/zone picking workflows
- returns/RMA workflow
- task assignment and labor productivity KPIs
- heat map and 2D/3D map UI
- advanced integrations (carriers/ERP/e-commerce/ETA)
- compliance-specific rule engines (HACCP/GMP/temperature checks)

## Next Recommended Build Order
1. Receiving pipeline: ASN -> Receive -> QC -> Putaway tasks
2. Outbound pipeline: Pick list -> Pack -> Ship manifest + carrier labels
3. Counting and reconciliation: cycle count sessions + variance approval
4. Slotting optimization: ABC + directed movement suggestions
5. Integrations and compliance modules

## Phase 2 Started (This Update)

### 1) Guided Journey Stages
Added workflow stage handling for warehouse orders:
- `created`
- `receiving`
- `qc`
- `putaway`
- `picking`
- `packing`
- `shipping`
- `done`

And stage timestamps/actors for accountability:
- `receivedAt`, `receivedBy`
- `qcCompletedAt`, `qcBy`
- `putawayAt`, `putawayBy`
- `pickedAt`, `pickedBy`
- `packedAt`, `packedBy`
- `shippedAt`, `shippedBy`

### 2) New Operations APIs
Added:
- `warehouse:getJourneyBoard` for control-tower KPI counters
- `warehouse:advanceOrderStage` for step-by-step journey progression

Updated:
- `createOrder` initializes default stage by order type
- `processOrder` finalizes stage to `done`

### 3) Full Operations UX Upgrade
Rebuilt Operations page into a smooth multi-view journey:
- Control Tower
- Receiving Journey
- Outbound Journey
- Activity Feed

With:
- queue-by-stage cards
- single-click next action per order
- richer create-order modal with multi-line order lines
- search + location filters
- stage-aware KPIs and progress chips
