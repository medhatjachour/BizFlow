import { ipcMain } from 'electron'
import { createLogger } from '../../../main/utils/logger'
import { writeWarehouseAudit, writeWarehouseMovement } from './audit'

const log = createLogger('Warehouse:Operations')

type JourneyStage = 'created' | 'receiving' | 'qc' | 'putaway' | 'picking' | 'packing' | 'shipping' | 'done'

function normalizeStage(orderType: string, stage?: string | null): JourneyStage {
  if (stage && ['created', 'receiving', 'qc', 'putaway', 'picking', 'packing', 'shipping', 'done'].includes(stage)) {
    return stage as JourneyStage
  }

  if (orderType === 'inbound' || orderType === 'return') return 'receiving'
  if (orderType === 'outbound') return 'picking'
  return 'created'
}

function stageDataPatch(stage: JourneyStage, actor?: string | null) {
  const now = new Date()
  switch (stage) {
    case 'receiving':
      return { workflowStage: stage, status: 'processing', receivedAt: now, receivedBy: actor ?? null }
    case 'qc':
      return { workflowStage: stage, status: 'processing', qcCompletedAt: now, qcBy: actor ?? null }
    case 'putaway':
      return { workflowStage: stage, status: 'processing', putawayAt: now, putawayBy: actor ?? null }
    case 'picking':
      return { workflowStage: stage, status: 'processing', pickedAt: now, pickedBy: actor ?? null }
    case 'packing':
      return { workflowStage: stage, status: 'processing', packedAt: now, packedBy: actor ?? null }
    case 'shipping':
      return { workflowStage: stage, status: 'processing', shippedAt: now, shippedBy: actor ?? null }
    case 'done':
      return { workflowStage: stage, status: 'completed', processedDate: now, processedBy: actor ?? null }
    default:
      return { workflowStage: stage, status: 'pending' }
  }
}

function makeOrderNumber(orderType: string) {
  const type = (orderType || 'ORD').slice(0, 3).toUpperCase()
  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  return `WH-${type}-${stamp}`
}

export function registerWarehouseOperationsHandlers(prisma: any) {
  ipcMain.handle('warehouse:getOrders', async (_e, params?: {
    orderType?: string
    status?: string
    workflowStage?: string
    locationId?: string
    search?: string
    skip?: number
    take?: number
  }) => {
    try {
      const where: any = {}
      if (params?.orderType) where.orderType = params.orderType
      if (params?.status) where.status = params.status
      if (params?.workflowStage) where.workflowStage = params.workflowStage
      if (params?.locationId) where.locationId = params.locationId
      if (params?.search?.trim()) {
        const q = params.search.trim()
        where.OR = [
          { orderNumber: { contains: q } },
          { sourceRef: { contains: q } },
          { partnerName: { contains: q } },
          { notes: { contains: q } }
        ]
      }

      const skip = Number(params?.skip ?? 0)
      const take = Number(params?.take ?? 100)

      const [data, total] = await Promise.all([
        prisma.warehouseOrder.findMany({
          where,
          include: {
            location: { select: { id: true, name: true, code: true } },
            lines: true,
            _count: { select: { lines: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take
        }),
        prisma.warehouseOrder.count({ where })
      ])

      return { data, total, hasMore: skip + data.length < total }
    } catch (err) {
      log.error('getOrders error', err)
      throw err
    }
  })

  ipcMain.handle('warehouse:getJourneyBoard', async (_e) => {
    try {
      const [activeOrders, receiving, qc, putaway, picking, packing, shipping] = await Promise.all([
        prisma.warehouseOrder.count({ where: { status: { in: ['pending', 'processing'] } } }),
        prisma.warehouseOrder.count({ where: { workflowStage: 'receiving', status: { in: ['pending', 'processing'] } } }),
        prisma.warehouseOrder.count({ where: { workflowStage: 'qc', status: { in: ['pending', 'processing'] } } }),
        prisma.warehouseOrder.count({ where: { workflowStage: 'putaway', status: { in: ['pending', 'processing'] } } }),
        prisma.warehouseOrder.count({ where: { workflowStage: 'picking', status: { in: ['pending', 'processing'] } } }),
        prisma.warehouseOrder.count({ where: { workflowStage: 'packing', status: { in: ['pending', 'processing'] } } }),
        prisma.warehouseOrder.count({ where: { workflowStage: 'shipping', status: { in: ['pending', 'processing'] } } })
      ])

      return { activeOrders, receiving, qc, putaway, picking, packing, shipping }
    } catch (err) {
      log.error('getJourneyBoard error', err)
      throw err
    }
  })

  ipcMain.handle('warehouse:createOrder', async (_e, data: {
    orderType: string
    sourceRef?: string
    partnerName?: string
    expectedDate?: string
    locationId?: string
    priority?: string
    notes?: string
    createdBy?: string
    lines: Array<{
      productId?: string
      productName: string
      sku?: string
      barcode?: string
      requestedQty: number
      unit?: string
      lotNumber?: string
      batchNumber?: string
      serialNumber?: string
      expiryDate?: string
      notes?: string
    }>
  }) => {
    try {
      if (!Array.isArray(data.lines) || data.lines.length === 0) {
        throw new Error('Order lines are required')
      }

      const row = await prisma.warehouseOrder.create({
        data: {
          orderNumber: makeOrderNumber(data.orderType),
          orderType: data.orderType,
          status: 'pending',
          workflowStage: normalizeStage(data.orderType),
          sourceRef: data.sourceRef || null,
          partnerName: data.partnerName || null,
          expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
          locationId: data.locationId || null,
          priority: data.priority || 'normal',
          notes: data.notes || null,
          createdBy: data.createdBy || null,
          lines: {
            create: data.lines.map((line) => ({
              productId: line.productId || null,
              productName: line.productName,
              sku: line.sku || null,
              barcode: line.barcode || null,
              requestedQty: Number(line.requestedQty),
              unit: line.unit || 'pcs',
              lotNumber: line.lotNumber || null,
              batchNumber: line.batchNumber || null,
              serialNumber: line.serialNumber || null,
              expiryDate: line.expiryDate ? new Date(line.expiryDate) : null,
              notes: line.notes || null
            }))
          }
        },
        include: { lines: true, location: true }
      })

      await writeWarehouseAudit(prisma, {
        entityType: 'order',
        entityId: row.id,
        action: 'order.created',
        actor: data.createdBy,
        details: `${row.orderNumber} (${row.orderType}) with ${row.lines.length} line(s)`
      })

      return row
    } catch (err) {
      log.error('createOrder error', err)
      throw err
    }
  })

  ipcMain.handle('warehouse:updateOrderStatus', async (_e, data: { id: string; status: string; actedBy?: string; notes?: string }) => {
    try {
      const row = await prisma.warehouseOrder.update({
        where: { id: data.id },
        data: {
          status: data.status,
          workflowStage: data.status === 'completed' ? 'done' : undefined,
          notes: data.notes ?? undefined,
          processedBy: data.status === 'completed' ? (data.actedBy || null) : undefined,
          processedDate: data.status === 'completed' ? new Date() : undefined
        }
      })

      await writeWarehouseAudit(prisma, {
        entityType: 'order',
        entityId: row.id,
        action: `order.status.${data.status}`,
        actor: data.actedBy,
        details: row.orderNumber
      })

      return row
    } catch (err) {
      log.error('updateOrderStatus error', err)
      throw err
    }
  })

  ipcMain.handle('warehouse:advanceOrderStage', async (_e, data: {
    id: string
    stage: JourneyStage
    actedBy?: string
    notes?: string
  }) => {
    try {
      const order = await prisma.warehouseOrder.findUnique({ where: { id: data.id } })
      if (!order) throw new Error('Order not found')

      const patch = stageDataPatch(data.stage, data.actedBy ?? null)
      const updated = await prisma.warehouseOrder.update({
        where: { id: data.id },
        data: {
          ...patch,
          notes: data.notes ?? undefined
        }
      })

      await writeWarehouseAudit(prisma, {
        entityType: 'order',
        entityId: updated.id,
        action: `order.stage.${data.stage}`,
        actor: data.actedBy,
        details: `${updated.orderNumber} -> ${data.stage}`
      })

      return updated
    } catch (err) {
      log.error('advanceOrderStage error', err)
      throw err
    }
  })

  ipcMain.handle('warehouse:processOrder', async (_e, data: {
    orderId: string
    locationId: string
    actedBy?: string
    notes?: string
    lines?: Array<{ lineId: string; processedQty: number }>
  }) => {
    try {
      return await prisma.$transaction(async (tx: any) => {
        const order = await tx.warehouseOrder.findUnique({
          where: { id: data.orderId },
          include: { lines: true }
        })
        if (!order) throw new Error('Order not found')
        if (!['pending', 'processing'].includes(order.status)) throw new Error('Order is not processable')

        const lineMap = new Map<string, number>()
        if (Array.isArray(data.lines)) {
          for (const line of data.lines) lineMap.set(line.lineId, Number(line.processedQty))
        }

        for (const line of order.lines) {
          const qty = lineMap.has(line.id) ? Number(lineMap.get(line.id)) : Number(line.requestedQty)
          if (qty <= 0) continue

          const existing = await tx.warehouseStock.findUnique({
            where: { locationId_productName: { locationId: data.locationId, productName: line.productName } }
          })

          const beforeQty = Number(existing?.quantity ?? 0)
          const isInbound = order.orderType === 'inbound' || order.orderType === 'return'
          const delta = isInbound ? qty : -qty
          const nextQty = beforeQty + delta

          if (!isInbound && nextQty < 0) {
            throw new Error(`Insufficient stock for ${line.productName}`)
          }

          const stock = await tx.warehouseStock.upsert({
            where: { locationId_productName: { locationId: data.locationId, productName: line.productName } },
            create: {
              locationId: data.locationId,
              productId: line.productId,
              productName: line.productName,
              sku: line.sku,
              barcode: line.barcode,
              quantity: isInbound ? qty : 0,
              unit: line.unit || 'pcs',
              lotNumber: line.lotNumber,
              batchNumber: line.batchNumber,
              serialNumber: line.serialNumber,
              expiryDate: line.expiryDate
            },
            update: {
              quantity: { increment: delta },
              sku: line.sku || undefined,
              barcode: line.barcode || undefined,
              lotNumber: line.lotNumber || undefined,
              batchNumber: line.batchNumber || undefined,
              serialNumber: line.serialNumber || undefined,
              expiryDate: line.expiryDate || undefined
            }
          })

          await tx.warehouseOrderLine.update({
            where: { id: line.id },
            data: { processedQty: Number(line.processedQty) + qty }
          })

          await writeWarehouseMovement(tx, {
            movementType: isInbound ? 'receive' : 'ship',
            stockId: stock.id,
            locationId: data.locationId,
            productId: line.productId,
            productName: line.productName,
            sku: line.sku,
            quantity: delta,
            unit: line.unit,
            beforeQty,
            afterQty: Number(stock.quantity),
            sourceType: 'order',
            sourceId: order.id,
            actedBy: data.actedBy,
            notes: data.notes || order.notes
          })
        }

        const updated = await tx.warehouseOrder.update({
          where: { id: order.id },
          data: {
            status: 'completed',
            workflowStage: 'done',
            locationId: data.locationId,
            processedBy: data.actedBy || null,
            processedDate: new Date(),
            notes: data.notes ?? order.notes ?? null
          },
          include: { lines: true }
        })

        await writeWarehouseAudit(tx, {
          entityType: 'order',
          entityId: updated.id,
          action: 'order.processed',
          actor: data.actedBy,
          details: `${updated.orderNumber} processed at ${data.locationId}`
        })

        return updated
      })
    } catch (err) {
      log.error('processOrder error', err)
      throw err
    }
  })
}
