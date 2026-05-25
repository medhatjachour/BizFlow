export async function writeWarehouseAudit(prisma: any, data: {
  entityType: string
  entityId: string
  action: string
  actor?: string | null
  details?: string | null
}) {
  try {
    await prisma.warehouseAuditLog.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        actor: data.actor ?? null,
        details: data.details ?? null
      }
    })
  } catch {
    // Keep business operations resilient even if audit writing fails.
  }
}

export async function writeWarehouseMovement(prisma: any, data: {
  movementType: string
  stockId?: string | null
  locationId?: string | null
  productId?: string | null
  productName: string
  sku?: string | null
  quantity: number
  unit?: string | null
  beforeQty?: number | null
  afterQty?: number | null
  sourceType?: string | null
  sourceId?: string | null
  actedBy?: string | null
  notes?: string | null
}) {
  try {
    await prisma.warehouseStockMovement.create({
      data: {
        movementType: data.movementType,
        stockId: data.stockId ?? null,
        locationId: data.locationId ?? null,
        productId: data.productId ?? null,
        productName: data.productName,
        sku: data.sku ?? null,
        quantity: Number(data.quantity),
        unit: data.unit ?? 'pcs',
        beforeQty: data.beforeQty ?? null,
        afterQty: data.afterQty ?? null,
        sourceType: data.sourceType ?? null,
        sourceId: data.sourceId ?? null,
        actedBy: data.actedBy ?? null,
        notes: data.notes ?? null
      }
    })
  } catch {
    // Keep business operations resilient even if movement writing fails.
  }
}
