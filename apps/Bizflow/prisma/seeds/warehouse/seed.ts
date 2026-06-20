import { PrismaClient } from '../../../src/generated/prisma'

const prisma = new PrismaClient({ log: ['warn', 'error'] })

function daysAgo(n: number): Date {
  const now = new Date()
  return new Date(now.getTime() - n * 24 * 60 * 60 * 1000)
}

async function main() {
  console.log('Warehouse seed started')

  // Clear warehouse-only tables in dependency order.
  await prisma.warehouseAuditLog.deleteMany()
  await prisma.warehouseStockMovement.deleteMany()
  await prisma.warehouseOrderLine.deleteMany()
  await prisma.warehouseOrder.deleteMany()
  await prisma.stockTransferItem.deleteMany()
  await prisma.stockTransfer.deleteMany()
  await prisma.warehouseStock.deleteMany()
  await prisma.warehouseLocation.deleteMany()

  // Location hierarchy for receiving, storage, picking, shipping and quarantine.
  const receivingZone = await prisma.warehouseLocation.create({ data: { name: 'Receiving Zone', code: 'RCV-Z1', type: 'zone' } })
  const storageZone = await prisma.warehouseLocation.create({ data: { name: 'Storage Zone', code: 'STG-Z1', type: 'zone' } })
  const pickingZone = await prisma.warehouseLocation.create({ data: { name: 'Picking Zone', code: 'PKG-Z1', type: 'zone' } })
  const shippingZone = await prisma.warehouseLocation.create({ data: { name: 'Shipping Zone', code: 'SHP-Z1', type: 'zone' } })
  const quarantineZone = await prisma.warehouseLocation.create({ data: { name: 'Quarantine Zone', code: 'QTN-Z1', type: 'zone' } })

  const rcvAisleA = await prisma.warehouseLocation.create({ data: { name: 'Receiving Aisle A', code: 'RCV-A1', type: 'aisle', parentId: receivingZone.id } })
  const stgAisleA = await prisma.warehouseLocation.create({ data: { name: 'Storage Aisle A', code: 'STG-A1', type: 'aisle', parentId: storageZone.id } })
  const stgAisleB = await prisma.warehouseLocation.create({ data: { name: 'Storage Aisle B', code: 'STG-A2', type: 'aisle', parentId: storageZone.id } })
  const pickAisleA = await prisma.warehouseLocation.create({ data: { name: 'Picking Aisle A', code: 'PKG-A1', type: 'aisle', parentId: pickingZone.id } })
  const shipAisleA = await prisma.warehouseLocation.create({ data: { name: 'Shipping Aisle A', code: 'SHP-A1', type: 'aisle', parentId: shippingZone.id } })
  const qtnAisleA = await prisma.warehouseLocation.create({ data: { name: 'Quarantine Aisle A', code: 'QTN-A1', type: 'aisle', parentId: quarantineZone.id } })

  const stgBinA101 = await prisma.warehouseLocation.create({ data: { name: 'Storage Bin A1-01', code: 'STG-A1-B01', type: 'bin', parentId: stgAisleA.id } })
  const stgBinA102 = await prisma.warehouseLocation.create({ data: { name: 'Storage Bin A1-02', code: 'STG-A1-B02', type: 'bin', parentId: stgAisleA.id } })
  const stgBinB101 = await prisma.warehouseLocation.create({ data: { name: 'Storage Bin A2-01', code: 'STG-A2-B01', type: 'bin', parentId: stgAisleB.id } })
  const pickBinA101 = await prisma.warehouseLocation.create({ data: { name: 'Pick Bin A1-01', code: 'PKG-A1-B01', type: 'bin', parentId: pickAisleA.id } })
  const shipBinA101 = await prisma.warehouseLocation.create({ data: { name: 'Ship Bin A1-01', code: 'SHP-A1-B01', type: 'bin', parentId: shipAisleA.id } })
  const qtnBinA101 = await prisma.warehouseLocation.create({ data: { name: 'Quarantine Bin A1-01', code: 'QTN-A1-B01', type: 'bin', parentId: qtnAisleA.id } })
  const rcvDock01 = await prisma.warehouseLocation.create({ data: { name: 'Receiving Dock 01', code: 'RCV-DK01', type: 'bin', parentId: rcvAisleA.id } })

  const stockRows = await Promise.all([
    prisma.warehouseStock.create({
      data: {
        locationId: stgBinA101.id,
        productName: 'Arabica Coffee Beans 1kg',
        sku: 'SKU-COF-001',
        quantity: 240,
        minQuantity: 80,
        unit: 'pcs',
        itemType: 'raw_material',
        barcode: '8901001000011',
        lotNumber: 'LOT-COF-2401',
        batchNumber: 'BATCH-COF-01',
        expiryDate: new Date('2027-02-12'),
        binCode: 'A1-01',
        aisleCode: 'A1',
        palletCode: 'PAL-COF-01',
        weight: 1,
        notes: 'Core inbound raw item'
      }
    }),
    prisma.warehouseStock.create({
      data: {
        locationId: stgBinA102.id,
        productName: 'Paper Cup 12oz',
        sku: 'SKU-PKG-012',
        quantity: 5200,
        minQuantity: 1500,
        unit: 'pcs',
        itemType: 'packaging',
        barcode: '8901001000028',
        batchNumber: 'BATCH-CUP-09',
        binCode: 'A1-02',
        aisleCode: 'A1',
        shelfCode: 'S2',
        palletCode: 'PAL-CUP-02',
        notes: 'Fast-moving packaging'
      }
    }),
    prisma.warehouseStock.create({
      data: {
        locationId: stgBinB101.id,
        productName: 'Energy Bar Box 12pc',
        sku: 'SKU-FG-220',
        quantity: 42,
        minQuantity: 60,
        unit: 'box',
        itemType: 'finished_goods',
        barcode: '8901001000035',
        lotNumber: 'LOT-ENB-2211',
        batchNumber: 'BATCH-ENB-02',
        expiryDate: new Date('2026-12-30'),
        binCode: 'A2-01',
        aisleCode: 'A2',
        shelfCode: 'S1',
        notes: 'Intentionally low stock for alerts'
      }
    }),
    prisma.warehouseStock.create({
      data: {
        locationId: pickBinA101.id,
        productName: 'Vitamin C Serum 30ml',
        sku: 'SKU-BTY-117',
        quantity: 88,
        minQuantity: 25,
        unit: 'pcs',
        itemType: 'finished_goods',
        barcode: '8901001000042',
        serialNumber: 'SER-VCS-00088',
        binCode: 'P1-01',
        aisleCode: 'P1',
        shelfCode: 'S3'
      }
    }),
    prisma.warehouseStock.create({
      data: {
        locationId: qtnBinA101.id,
        productName: 'Protein Shaker Bottle',
        sku: 'SKU-RET-090',
        quantity: 16,
        minQuantity: 0,
        unit: 'pcs',
        itemType: 'returns',
        barcode: '8901001000059',
        batchNumber: 'BATCH-RET-16',
        isQuarantine: true,
        isDamaged: true,
        binCode: 'Q1-01',
        aisleCode: 'Q1',
        notes: 'Waiting QA decision'
      }
    }),
    prisma.warehouseStock.create({
      data: {
        locationId: shipBinA101.id,
        productName: 'Wireless Headphones',
        sku: 'SKU-ELC-410',
        quantity: 30,
        minQuantity: 15,
        unit: 'pcs',
        itemType: 'finished_goods',
        barcode: '8901001000066',
        serialNumber: 'SER-WHP-0030',
        binCode: 'SHP-01',
        aisleCode: 'SHP-A1'
      }
    }),
    prisma.warehouseStock.create({
      data: {
        locationId: rcvDock01.id,
        productName: 'Oatmeal Cookie Mix 5kg',
        sku: 'SKU-RM-501',
        quantity: 18,
        minQuantity: 10,
        unit: 'bag',
        itemType: 'raw_material',
        barcode: '8901001000073',
        lotNumber: 'LOT-CKM-5001',
        batchNumber: 'BATCH-CKM-12',
        expiryDate: new Date('2026-11-10'),
        binCode: 'RCV-01',
        aisleCode: 'RCV-A1'
      }
    })
  ])

  const transferCompleted = await prisma.stockTransfer.create({
    data: {
      fromLocationId: stgBinA101.id,
      toLocationId: pickBinA101.id,
      status: 'completed',
      notes: 'Replenishment for pick face',
      createdBy: 'warehouse.manager',
      completedBy: 'warehouse.operator',
      transferDate: daysAgo(6),
      completedAt: daysAgo(5),
      items: {
        create: [
          { productName: 'Arabica Coffee Beans 1kg', sku: 'SKU-COF-001', quantity: 24, unit: 'pcs', notes: 'Pick-face refill' }
        ]
      }
    },
    include: { items: true }
  })

  const transferInTransit = await prisma.stockTransfer.create({
    data: {
      fromLocationId: stgBinA102.id,
      toLocationId: shipBinA101.id,
      status: 'in_transit',
      notes: 'Packaging feed to shipping lane',
      createdBy: 'warehouse.manager',
      transferDate: daysAgo(1),
      items: {
        create: [
          { productName: 'Paper Cup 12oz', sku: 'SKU-PKG-012', quantity: 500, unit: 'pcs' }
        ]
      }
    }
  })

  const transferDraft = await prisma.stockTransfer.create({
    data: {
      fromLocationId: stgBinB101.id,
      toLocationId: pickBinA101.id,
      status: 'draft',
      notes: 'Pending supervisor approval',
      createdBy: 'warehouse.supervisor',
      transferDate: new Date(),
      items: {
        create: [
          { productName: 'Energy Bar Box 12pc', sku: 'SKU-FG-220', quantity: 12, unit: 'box' }
        ]
      }
    }
  })

  const transferCancelled = await prisma.stockTransfer.create({
    data: {
      fromLocationId: qtnBinA101.id,
      toLocationId: shipBinA101.id,
      status: 'cancelled',
      notes: 'Item blocked due to quality hold',
      createdBy: 'warehouse.supervisor',
      transferDate: daysAgo(3),
      items: {
        create: [
          { productName: 'Protein Shaker Bottle', sku: 'SKU-RET-090', quantity: 5, unit: 'pcs' }
        ]
      }
    }
  })

  const inboundReceiving = await prisma.warehouseOrder.create({
    data: {
      orderNumber: 'WH-INB-240501-01',
      orderType: 'inbound',
      status: 'processing',
      workflowStage: 'receiving',
      sourceRef: 'ASN-240501-110',
      partnerName: 'Global Ingredients Distribution',
      expectedDate: daysAgo(-1),
      locationId: rcvDock01.id,
      priority: 'high',
      notes: 'Dock check in progress',
      createdBy: 'warehouse.manager',
      receivedAt: daysAgo(0),
      receivedBy: 'warehouse.operator',
      lines: {
        create: [
          { productName: 'Arabica Coffee Beans 1kg', sku: 'SKU-COF-001', requestedQty: 120, processedQty: 65, unit: 'pcs', lotNumber: 'LOT-COF-2402' },
          { productName: 'Oatmeal Cookie Mix 5kg', sku: 'SKU-RM-501', requestedQty: 30, processedQty: 12, unit: 'bag', lotNumber: 'LOT-CKM-5002' }
        ]
      }
    }
  })

  const inboundQc = await prisma.warehouseOrder.create({
    data: {
      orderNumber: 'WH-INB-240429-03',
      orderType: 'inbound',
      status: 'processing',
      workflowStage: 'qc',
      sourceRef: 'PO-POW-4501',
      partnerName: 'Packaging World',
      expectedDate: daysAgo(2),
      locationId: rcvDock01.id,
      priority: 'normal',
      notes: 'Sampling in QA station',
      createdBy: 'warehouse.manager',
      receivedAt: daysAgo(2),
      receivedBy: 'warehouse.operator',
      qcCompletedAt: null,
      lines: {
        create: [
          { productName: 'Paper Cup 12oz', sku: 'SKU-PKG-012', requestedQty: 2000, processedQty: 2000, unit: 'pcs' }
        ]
      }
    }
  })

  const inboundPutaway = await prisma.warehouseOrder.create({
    data: {
      orderNumber: 'WH-INB-240426-04',
      orderType: 'inbound',
      status: 'processing',
      workflowStage: 'putaway',
      sourceRef: 'ASN-240426-410',
      partnerName: 'Wellness Bulk Supply',
      expectedDate: daysAgo(4),
      locationId: stgBinB101.id,
      priority: 'normal',
      notes: 'Putaway assignment pending completion',
      createdBy: 'warehouse.supervisor',
      receivedAt: daysAgo(4),
      receivedBy: 'warehouse.operator',
      qcCompletedAt: daysAgo(3),
      qcBy: 'qa.lead',
      lines: {
        create: [
          { productName: 'Energy Bar Box 12pc', sku: 'SKU-FG-220', requestedQty: 90, processedQty: 90, unit: 'box' }
        ]
      }
    }
  })

  const outboundPicking = await prisma.warehouseOrder.create({
    data: {
      orderNumber: 'WH-OUT-240502-08',
      orderType: 'outbound',
      status: 'processing',
      workflowStage: 'picking',
      sourceRef: 'SO-88521',
      partnerName: 'Downtown Retail Hub',
      expectedDate: daysAgo(-1),
      locationId: pickBinA101.id,
      priority: 'urgent',
      notes: 'Priority ship same day',
      createdBy: 'sales.dispatch',
      pickedAt: daysAgo(0),
      pickedBy: 'picker.01',
      lines: {
        create: [
          { productName: 'Wireless Headphones', sku: 'SKU-ELC-410', requestedQty: 12, processedQty: 8, unit: 'pcs' },
          { productName: 'Vitamin C Serum 30ml', sku: 'SKU-BTY-117', requestedQty: 20, processedQty: 20, unit: 'pcs' }
        ]
      }
    }
  })

  const outboundPacking = await prisma.warehouseOrder.create({
    data: {
      orderNumber: 'WH-OUT-240430-19',
      orderType: 'outbound',
      status: 'processing',
      workflowStage: 'packing',
      sourceRef: 'SO-88499',
      partnerName: 'Airport Kiosk Group',
      expectedDate: daysAgo(1),
      locationId: shipBinA101.id,
      priority: 'high',
      notes: 'Packed awaiting label print',
      createdBy: 'sales.dispatch',
      pickedAt: daysAgo(2),
      pickedBy: 'picker.03',
      packedAt: daysAgo(1),
      packedBy: 'packer.01',
      lines: {
        create: [
          { productName: 'Protein Shaker Bottle', sku: 'SKU-RET-090', requestedQty: 8, processedQty: 8, unit: 'pcs' }
        ]
      }
    }
  })

  const outboundShipping = await prisma.warehouseOrder.create({
    data: {
      orderNumber: 'WH-OUT-240428-22',
      orderType: 'outbound',
      status: 'processing',
      workflowStage: 'shipping',
      sourceRef: 'SO-88475',
      partnerName: 'City Wellness Stores',
      expectedDate: new Date(),
      locationId: shipBinA101.id,
      priority: 'normal',
      notes: 'Manifest generated, waiting truck dispatch',
      createdBy: 'sales.dispatch',
      pickedAt: daysAgo(3),
      pickedBy: 'picker.02',
      packedAt: daysAgo(2),
      packedBy: 'packer.01',
      shippedAt: daysAgo(1),
      shippedBy: 'shipper.01',
      lines: {
        create: [
          { productName: 'Wireless Headphones', sku: 'SKU-ELC-410', requestedQty: 10, processedQty: 10, unit: 'pcs' }
        ]
      }
    }
  })

  const completedInbound = await prisma.warehouseOrder.create({
    data: {
      orderNumber: 'WH-INB-240420-07',
      orderType: 'inbound',
      status: 'completed',
      workflowStage: 'done',
      sourceRef: 'ASN-240420-101',
      partnerName: 'Core Beverage Supplier',
      expectedDate: daysAgo(10),
      processedDate: daysAgo(8),
      locationId: stgBinA101.id,
      priority: 'normal',
      notes: 'Fully posted to stock',
      createdBy: 'warehouse.manager',
      processedBy: 'warehouse.operator',
      receivedAt: daysAgo(10),
      receivedBy: 'warehouse.operator',
      qcCompletedAt: daysAgo(9),
      qcBy: 'qa.lead',
      putawayAt: daysAgo(8),
      putawayBy: 'warehouse.operator',
      lines: {
        create: [
          { productName: 'Arabica Coffee Beans 1kg', sku: 'SKU-COF-001', requestedQty: 100, processedQty: 100, unit: 'pcs', lotNumber: 'LOT-COF-2401' }
        ]
      }
    }
  })

  const completedOutbound = await prisma.warehouseOrder.create({
    data: {
      orderNumber: 'WH-OUT-240418-31',
      orderType: 'outbound',
      status: 'completed',
      workflowStage: 'done',
      sourceRef: 'SO-88320',
      partnerName: 'North Retail Point',
      expectedDate: daysAgo(12),
      processedDate: daysAgo(11),
      locationId: shipBinA101.id,
      priority: 'normal',
      notes: 'Delivered successfully',
      createdBy: 'sales.dispatch',
      processedBy: 'shipper.01',
      pickedAt: daysAgo(12),
      pickedBy: 'picker.01',
      packedAt: daysAgo(12),
      packedBy: 'packer.02',
      shippedAt: daysAgo(11),
      shippedBy: 'shipper.01',
      lines: {
        create: [
          { productName: 'Vitamin C Serum 30ml', sku: 'SKU-BTY-117', requestedQty: 14, processedQty: 14, unit: 'pcs' }
        ]
      }
    }
  })

  const cancelledOrder = await prisma.warehouseOrder.create({
    data: {
      orderNumber: 'WH-OUT-240503-44',
      orderType: 'outbound',
      status: 'cancelled',
      workflowStage: 'created',
      sourceRef: 'SO-88610',
      partnerName: 'Cancelled Test Buyer',
      expectedDate: daysAgo(0),
      locationId: pickBinA101.id,
      priority: 'low',
      notes: 'Customer requested cancellation',
      createdBy: 'sales.dispatch',
      lines: {
        create: [
          { productName: 'Energy Bar Box 12pc', sku: 'SKU-FG-220', requestedQty: 4, processedQty: 0, unit: 'box' }
        ]
      }
    }
  })

  const movementRows = [
    {
      movementType: 'in',
      stockId: stockRows[0].id,
      locationId: stgBinA101.id,
      productName: 'Arabica Coffee Beans 1kg',
      sku: 'SKU-COF-001',
      quantity: 100,
      unit: 'pcs',
      beforeQty: 140,
      afterQty: 240,
      sourceType: 'order',
      sourceId: completedInbound.id,
      actedBy: 'warehouse.operator',
      notes: 'Inbound posting',
      createdAt: daysAgo(8)
    },
    {
      movementType: 'adjust',
      stockId: stockRows[2].id,
      locationId: stgBinB101.id,
      productName: 'Energy Bar Box 12pc',
      sku: 'SKU-FG-220',
      quantity: -8,
      unit: 'box',
      beforeQty: 50,
      afterQty: 42,
      sourceType: 'manual',
      sourceId: stockRows[2].id,
      actedBy: 'warehouse.operator',
      notes: 'Cycle count variance',
      createdAt: daysAgo(2)
    },
    {
      movementType: 'transfer_out',
      stockId: stockRows[0].id,
      locationId: stgBinA101.id,
      productName: 'Arabica Coffee Beans 1kg',
      sku: 'SKU-COF-001',
      quantity: -24,
      unit: 'pcs',
      beforeQty: 240,
      afterQty: 216,
      sourceType: 'transfer',
      sourceId: transferCompleted.id,
      actedBy: 'warehouse.operator',
      notes: 'Transfer to pick bin',
      createdAt: daysAgo(5)
    },
    {
      movementType: 'transfer_in',
      stockId: stockRows[3].id,
      locationId: pickBinA101.id,
      productName: 'Arabica Coffee Beans 1kg',
      sku: 'SKU-COF-001',
      quantity: 24,
      unit: 'pcs',
      beforeQty: 0,
      afterQty: 24,
      sourceType: 'transfer',
      sourceId: transferCompleted.id,
      actedBy: 'warehouse.operator',
      notes: 'Transfer received',
      createdAt: daysAgo(5)
    },
    {
      movementType: 'receive',
      stockId: stockRows[6].id,
      locationId: rcvDock01.id,
      productName: 'Oatmeal Cookie Mix 5kg',
      sku: 'SKU-RM-501',
      quantity: 12,
      unit: 'bag',
      beforeQty: 6,
      afterQty: 18,
      sourceType: 'order',
      sourceId: inboundReceiving.id,
      actedBy: 'warehouse.operator',
      notes: 'Partial receive for ASN',
      createdAt: daysAgo(0)
    },
    {
      movementType: 'ship',
      stockId: stockRows[5].id,
      locationId: shipBinA101.id,
      productName: 'Wireless Headphones',
      sku: 'SKU-ELC-410',
      quantity: -10,
      unit: 'pcs',
      beforeQty: 40,
      afterQty: 30,
      sourceType: 'order',
      sourceId: completedOutbound.id,
      actedBy: 'shipper.01',
      notes: 'Shipped on route #4',
      createdAt: daysAgo(11)
    },
    {
      movementType: 'return',
      stockId: stockRows[4].id,
      locationId: qtnBinA101.id,
      productName: 'Protein Shaker Bottle',
      sku: 'SKU-RET-090',
      quantity: 6,
      unit: 'pcs',
      beforeQty: 10,
      afterQty: 16,
      sourceType: 'manual',
      sourceId: stockRows[4].id,
      actedBy: 'returns.agent',
      notes: 'Returned damaged units sent to quarantine',
      createdAt: daysAgo(1)
    }
  ]

  for (const mv of movementRows) {
    await prisma.warehouseStockMovement.create({ data: mv })
  }

  const audits = [
    { entityType: 'location', entityId: receivingZone.id, action: 'location.created', actor: 'warehouse.manager', details: 'Receiving hierarchy initialized', createdAt: daysAgo(20) },
    { entityType: 'stock', entityId: stockRows[2].id, action: 'stock.adjusted', actor: 'warehouse.operator', details: 'Energy Bar Box 12pc variance -8', createdAt: daysAgo(2) },
    { entityType: 'transfer', entityId: transferCompleted.id, action: 'transfer.status.completed', actor: 'warehouse.operator', details: 'Completed replenishment transfer', createdAt: daysAgo(5) },
    { entityType: 'transfer', entityId: transferCancelled.id, action: 'transfer.status.cancelled', actor: 'warehouse.supervisor', details: 'Cancelled due to quality hold', createdAt: daysAgo(3) },
    { entityType: 'order', entityId: inboundReceiving.id, action: 'order.stage.receiving', actor: 'warehouse.operator', details: 'Receiving started at dock', createdAt: daysAgo(0) },
    { entityType: 'order', entityId: inboundQc.id, action: 'order.stage.qc', actor: 'qa.lead', details: 'QC queue assignment', createdAt: daysAgo(2) },
    { entityType: 'order', entityId: inboundPutaway.id, action: 'order.stage.putaway', actor: 'warehouse.supervisor', details: 'Putaway task awaiting close', createdAt: daysAgo(3) },
    { entityType: 'order', entityId: outboundPicking.id, action: 'order.stage.picking', actor: 'picker.01', details: 'Pick started for urgent order', createdAt: daysAgo(0) },
    { entityType: 'order', entityId: outboundPacking.id, action: 'order.stage.packing', actor: 'packer.01', details: 'Packed and queued for shipping', createdAt: daysAgo(1) },
    { entityType: 'order', entityId: outboundShipping.id, action: 'order.stage.shipping', actor: 'shipper.01', details: 'Shipping lane waiting dispatch', createdAt: daysAgo(1) },
    { entityType: 'order', entityId: completedInbound.id, action: 'order.processed', actor: 'warehouse.operator', details: 'Inbound posted to stock', createdAt: daysAgo(8) },
    { entityType: 'order', entityId: completedOutbound.id, action: 'order.processed', actor: 'shipper.01', details: 'Outbound shipped and completed', createdAt: daysAgo(11) },
    { entityType: 'order', entityId: cancelledOrder.id, action: 'order.status.cancelled', actor: 'sales.dispatch', details: 'Cancellation requested by customer', createdAt: daysAgo(0) }
  ]

  for (const audit of audits) {
    await prisma.warehouseAuditLog.create({ data: audit })
  }

  console.log('Warehouse seed completed')
  console.log(`Locations:  ${await prisma.warehouseLocation.count()}`)
  console.log(`Stock rows: ${await prisma.warehouseStock.count()}`)
  console.log(`Transfers:  ${await prisma.stockTransfer.count()}`)
  console.log(`Orders:     ${await prisma.warehouseOrder.count()}`)
  console.log(`Movements:  ${await prisma.warehouseStockMovement.count()}`)
  console.log(`Audits:     ${await prisma.warehouseAuditLog.count()}`)
}

main()
  .catch((error) => {
    console.error('Warehouse seed failed', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
