import { ipcMain } from 'electron'

// ─── Period helpers ────────────────────────────────────────────────────────────
function matGetPeriodRange(period: string): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now)
  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0); break
    case 'week': {
      const dow = now.getDay() === 0 ? 6 : now.getDay() - 1
      start.setDate(now.getDate() - dow); start.setHours(0, 0, 0, 0); break
    }
    case 'month':
      start.setDate(1); start.setHours(0, 0, 0, 0); break
    case 'year':
      start.setMonth(0, 1); start.setHours(0, 0, 0, 0); break
    default:
      start.setDate(1); start.setHours(0, 0, 0, 0)
  }
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return { start, end }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
/** Sync material.expiryDate to the nearest active-batch expiry. */
async function syncMaterialExpiry(tx: any, materialId: string) {
  const batches = await tx.clinicMaterialBatch.findMany({
    where: { materialId, isActive: true, expiryDate: { not: null } },
    orderBy: { expiryDate: 'asc' },
  })
  const nearestExpiry: Date | null = batches[0]?.expiryDate ?? null
  await tx.clinicMaterial.update({
    where: { id: materialId },
    data: { expiryDate: nearestExpiry },
  })
}

export function registerMaterialHandlers(prisma: any) {
  // ═══════════════════════════════════════════════════════════════════════
  // MATERIAL CATEGORIES
  // ═══════════════════════════════════════════════════════════════════════

  ipcMain.handle('clinic:materialCategories:getAll', async () => {
    return prisma.clinicMaterialCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
  })

  ipcMain.handle(
    'clinic:materialCategories:create',
    async (_e, data: { name: string; color?: string; sortOrder?: number }) => {
      return prisma.clinicMaterialCategory.create({ data })
    }
  )

  ipcMain.handle(
    'clinic:materialCategories:update',
    async (_e, { id, data }: { id: string; data: { name?: string; color?: string; sortOrder?: number } }) => {
      return prisma.clinicMaterialCategory.update({ where: { id }, data })
    }
  )

  ipcMain.handle('clinic:materialCategories:delete', async (_e, id: string) => {
    return prisma.clinicMaterialCategory.delete({ where: { id } })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // MATERIAL BATCHES
  // ═══════════════════════════════════════════════════════════════════════

  ipcMain.handle('clinic:materialBatches:getByMaterial', async (_e, materialId: string) => {
    return prisma.clinicMaterialBatch.findMany({
      where: { materialId },
      orderBy: [{ isActive: 'desc' }, { receivedAt: 'desc' }],
    })
  })

  ipcMain.handle(
    'clinic:materialBatches:create',
    async (_e, { materialId, data }: { materialId: string; data: any }) => {
      const { expiryDate, quantity = 0, ...rest } = data
      const batch = await prisma.$transaction(async (tx: any) => {
        const created = await tx.clinicMaterialBatch.create({
          data: {
            ...rest,
            materialId,
            quantity,
            expiryDate: expiryDate ? new Date(expiryDate) : null,
          },
        })
        // Increment material stock by the new batch quantity
        if (quantity > 0) {
          await tx.clinicMaterial.update({
            where: { id: materialId },
            data: { quantity: { increment: quantity } },
          })
        }
        await syncMaterialExpiry(tx, materialId)
        return created
      })
      return batch
    }
  )

  ipcMain.handle(
    'clinic:materialBatches:update',
    async (_e, { id, data }: { id: string; data: any }) => {
      return prisma.$transaction(async (tx: any) => {
        const existing = await tx.clinicMaterialBatch.findUnique({ where: { id } })
        if (!existing) throw new Error('BATCH_NOT_FOUND')

        const { expiryDate, quantity, ...rest } = data
        const updated = await tx.clinicMaterialBatch.update({
          where: { id },
          data: {
            ...rest,
            ...(quantity !== undefined ? { quantity } : {}),
            ...(expiryDate !== undefined ? { expiryDate: expiryDate ? new Date(expiryDate) : null } : {}),
          },
        })

        // Adjust material stock by the quantity delta
        if (quantity !== undefined && existing.isActive) {
          const delta = quantity - existing.quantity
          if (delta !== 0) {
            await tx.clinicMaterial.update({
              where: { id: existing.materialId },
              data: { quantity: { increment: delta } },
            })
          }
        }

        await syncMaterialExpiry(tx, existing.materialId)
        return updated
      })
    }
  )

  ipcMain.handle('clinic:materialBatches:delete', async (_e, id: string) => {
    return prisma.$transaction(async (tx: any) => {
      const batch = await tx.clinicMaterialBatch.findUnique({ where: { id } })
      if (!batch) throw new Error('BATCH_NOT_FOUND')

      const usageCount = await tx.clinicSessionMaterial.count({ where: { batchId: id } })
      if (usageCount > 0) throw new Error('BATCH_IN_USE')

      // Decrement material stock by the deleted batch quantity
      if (batch.isActive && batch.quantity > 0) {
        await tx.clinicMaterial.update({
          where: { id: batch.materialId },
          data: { quantity: { decrement: batch.quantity } },
        })
      }

      await tx.clinicMaterialBatch.delete({ where: { id } })
      await syncMaterialExpiry(tx, batch.materialId)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════
  // MATERIALS
  // ═══════════════════════════════════════════════════════════════════════

  // ─── List all materials ────────────────────────────────────────────────
  ipcMain.handle(
    'clinic:materials:getAll',
    async (
      _e,
      params?: {
        search?: string
        category?: string
        isActive?: boolean
        stockStatus?: 'all' | 'in_stock' | 'out_of_stock' | 'low_stock'
        expiryStatus?: 'all' | 'expired' | 'expiring_soon' | 'valid' | 'no_expiry'
        skip?: number
        take?: number
        sortBy?: 'name' | 'quantity' | 'expiryDate' | 'updatedAt'
        sortDir?: 'asc' | 'desc'
      }
    ) => {
      const where: any = {}

      if (params?.isActive !== undefined) where.isActive = params.isActive
      if (params?.category) where.category = params.category
      if (params?.search?.trim()) {
        where.OR = [
          { name: { contains: params.search.trim() } },
          { description: { contains: params.search.trim() } },
          { supplier: { contains: params.search.trim() } },
        ]
      }

      const now = new Date()
      const soon = new Date()
      soon.setDate(now.getDate() + 30)

      // Expiry filtering is done in DB.
      const expiryStatus = params?.expiryStatus ?? 'all'
      if (expiryStatus === 'expired') {
        where.AND = [...(where.AND ?? []), { expiryDate: { not: null, lt: now } }]
      } else if (expiryStatus === 'expiring_soon') {
        where.AND = [...(where.AND ?? []), { expiryDate: { not: null, gte: now, lte: soon } }]
      } else if (expiryStatus === 'valid') {
        where.AND = [...(where.AND ?? []), { expiryDate: { not: null, gt: soon } }]
      } else if (expiryStatus === 'no_expiry') {
        where.AND = [...(where.AND ?? []), { expiryDate: null }]
      }

      const skip = params?.skip ?? 0
      const take = Math.max(1, Math.min(params?.take ?? 20, 100))
      const sortBy = params?.sortBy ?? 'name'
      const sortDir = params?.sortDir ?? 'asc'

      const orderBy: any[] = [{ isActive: 'desc' }]
      if (sortBy === 'name') orderBy.push({ name: sortDir })
      if (sortBy === 'quantity') orderBy.push({ quantity: sortDir }, { name: 'asc' })
      if (sortBy === 'expiryDate') orderBy.push({ expiryDate: sortDir }, { name: 'asc' })
      if (sortBy === 'updatedAt') orderBy.push({ updatedAt: sortDir }, { name: 'asc' })

      const stockStatus = params?.stockStatus ?? 'all'

      // Low stock requires field-to-field comparison (quantity <= minQuantity),
      // which SQLite Prisma where cannot express directly, so we filter in-memory.
      if (stockStatus === 'low_stock') {
        const allCandidates = await prisma.clinicMaterial.findMany({ where, orderBy })
        const filtered = allCandidates.filter((m: any) => m.minQuantity > 0 && m.quantity <= m.minQuantity)
        const paged = filtered.slice(skip, skip + take)
        return {
          data: paged,
          total: filtered.length,
          hasMore: skip + take < filtered.length,
          skip,
          take,
        }
      }

      if (stockStatus === 'in_stock') {
        where.AND = [...(where.AND ?? []), { quantity: { gt: 0 } }]
      } else if (stockStatus === 'out_of_stock') {
        where.AND = [...(where.AND ?? []), { quantity: { lte: 0 } }]
      }

      const [data, total] = await Promise.all([
        prisma.clinicMaterial.findMany({ where, orderBy, skip, take }),
        prisma.clinicMaterial.count({ where }),
      ])

      return {
        data,
        total,
        hasMore: skip + take < total,
        skip,
        take,
      }
    }
  )

  // ─── Get single material ───────────────────────────────────────────────
  ipcMain.handle('clinic:materials:getById', async (_e, id: string) => {
    return prisma.clinicMaterial.findUnique({
      where: { id },
      include: { batches: { orderBy: [{ isActive: 'desc' }, { receivedAt: 'desc' }] } },
    })
  })

  // ─── Create material ───────────────────────────────────────────────────
  // expiryDate and quantity are managed by batches to keep stock consistent.
  ipcMain.handle('clinic:materials:create', async (_e, data: any) => {
    const {
      expiryDate,
      batchNumber,
      quantity: initialQuantityRaw,
      ...rest
    } = data

    const initialQuantity = Math.max(0, Number(initialQuantityRaw) || 0)

    return prisma.$transaction(async (tx: any) => {
      const material = await tx.clinicMaterial.create({
        data: {
          ...rest,
          quantity: 0,
          expiryDate: null,
        },
      })

      if (initialQuantity > 0) {
        await tx.clinicMaterialBatch.create({
          data: {
            materialId: material.id,
            batchNumber: typeof batchNumber === 'string' ? (batchNumber.trim() || null) : null,
            quantity: initialQuantity,
            expiryDate: expiryDate ? new Date(expiryDate) : null,
            costPerUnit: material.costPerUnit,
            supplier: material.supplier,
            isActive: true,
          },
        })

        await tx.clinicMaterial.update({
          where: { id: material.id },
          data: { quantity: { increment: initialQuantity } },
        })

        await syncMaterialExpiry(tx, material.id)
      }

      return material
    })
  })

  // ─── Update material ───────────────────────────────────────────────────
  ipcMain.handle('clinic:materials:update', async (_e, { id, data }: { id: string; data: any }) => {
    const { expiryDate: _expiry, batchNumber: _bn, quantity: _qty, ...rest } = data
    return prisma.clinicMaterial.update({ where: { id }, data: rest })
  })

  // ─── Delete material ───────────────────────────────────────────────────
  ipcMain.handle('clinic:materials:delete', async (_e, id: string) => {
    // Prevent deletion if material is used in any session
    const usageCount = await prisma.clinicSessionMaterial.count({ where: { materialId: id } })
    if (usageCount > 0) {
      throw new Error('MATERIAL_IN_USE')
    }
    return prisma.clinicMaterial.delete({ where: { id } })
  })

  // ─── Adjust stock quantity (e.g. after restocking) ────────────────────
  ipcMain.handle(
    'clinic:materials:adjustStock',
    async (_e, _payload: { id: string; delta: number }) => {
      // Stock must be adjusted via batch-aware handlers to keep
      // ClinicMaterial.quantity in sync with sum(active batch quantities).
      throw new Error('UNSUPPORTED_STOCK_ADJUSTMENT_USE_BATCH_UPDATE')
    }
  )

  // ─── Get session materials (for displaying in session detail) ──────────
  ipcMain.handle('clinic:materials:getBySession', async (_e, sessionId: string) => {
    return prisma.clinicSessionMaterial.findMany({
      where: { sessionId },
      include: { material: true, batch: true },
      orderBy: { createdAt: 'asc' },
    })
  })

  // ─── Set materials used in a session (upsert-style) ────────────────────
  // Accepts: { sessionId, items: Array<{ materialId, quantityUsed, notes?, batchId? }> }
  // Replaces existing session-material records for this session.
  ipcMain.handle(
    'clinic:materials:setSessionMaterials',
    async (_e, { sessionId, items }: {
      sessionId: string
      items: Array<{ materialId: string; quantityUsed: number; notes?: string; batchId?: string }>
    }) => {
      return prisma.$transaction(async (tx: any) => {
        // Fetch previous session materials to reverse stock deductions
        const previous = await tx.clinicSessionMaterial.findMany({ where: { sessionId } })

        // Restore stock for materials previously consumed
        for (const prev of previous) {
          // Restore batch quantity if batch was used
          if (prev.batchId) {
            await tx.clinicMaterialBatch.update({
              where: { id: prev.batchId },
              data: { quantity: { increment: prev.quantityUsed } },
            })
          }
          // Always restore material-level quantity
          await tx.clinicMaterial.update({
            where: { id: prev.materialId },
            data: { quantity: { increment: prev.quantityUsed } },
          })
        }

        // Delete all existing session-material entries
        await tx.clinicSessionMaterial.deleteMany({ where: { sessionId } })

        // Collect affected materialIds for expiry sync
        const affectedMaterialIds = new Set<string>()

        // Create new entries and deduct stock
        for (const item of items) {
          if (item.quantityUsed <= 0) continue

          const mat = await tx.clinicMaterial.findUnique({ where: { id: item.materialId } })
          if (!mat) throw new Error(`MATERIAL_NOT_FOUND:${item.materialId}`)
          if (mat.quantity < item.quantityUsed) throw new Error(`INSUFFICIENT_STOCK:${mat.name}`)

          // Deduct from specific batch if provided
          if (item.batchId) {
            const batch = await tx.clinicMaterialBatch.findUnique({ where: { id: item.batchId } })
            if (!batch) throw new Error(`BATCH_NOT_FOUND:${item.batchId}`)
            if (batch.quantity < item.quantityUsed) throw new Error(`INSUFFICIENT_BATCH_STOCK:${mat.name}`)
            await tx.clinicMaterialBatch.update({
              where: { id: item.batchId },
              data: { quantity: { decrement: item.quantityUsed } },
            })
          }

          // Always deduct from material-level quantity
          await tx.clinicMaterial.update({
            where: { id: item.materialId },
            data: { quantity: { decrement: item.quantityUsed } },
          })

          await tx.clinicSessionMaterial.create({
            data: {
              sessionId,
              materialId: item.materialId,
              batchId: item.batchId ?? null,
              quantityUsed: item.quantityUsed,
              notes: item.notes ?? null,
            },
          })

          affectedMaterialIds.add(item.materialId)
        }

        // Sync expiry for affected materials
        for (const mid of affectedMaterialIds) {
          await syncMaterialExpiry(tx, mid)
        }

        return tx.clinicSessionMaterial.findMany({
          where: { sessionId },
          include: { material: true, batch: true },
          orderBy: { createdAt: 'asc' },
        })
      })
    }
  )

  // ─── Summary stats for dashboard ──────────────────────────────────────
  ipcMain.handle('clinic:materials:stats', async () => {
    const now = new Date()
    const soon = new Date()
    soon.setDate(now.getDate() + 30)

    const [total, lowStock, expired, expiringSoon] = await Promise.all([
      prisma.clinicMaterial.count({ where: { isActive: true } }),
      prisma.clinicMaterial.findMany({ where: { isActive: true, minQuantity: { gt: 0 } } })
        .then((mats: any[]) => mats.filter(m => m.quantity <= m.minQuantity).length),
      prisma.clinicMaterial.count({ where: { isActive: true, expiryDate: { lt: now } } }),
      prisma.clinicMaterial.count({ where: { isActive: true, expiryDate: { gte: now, lte: soon } } }),
    ])

    return { total, lowStock, expired, expiringSoon }
  })

  // ─── Material Finance Summary ─────────────────────────────────────────────
  ipcMain.handle('clinic:materials:financeSummary', async (_e, period = 'month') => {
    const now = new Date()
    const soon = new Date()
    soon.setDate(now.getDate() + 30)
    const { start, end } = matGetPeriodRange(period)

    const MATERIAL_EXPENSE_CATS = ['material_loss', 'material_expiry', 'medical_supplies', 'medications']

    const [activeMaterials, expenseRows] = await Promise.all([
      prisma.clinicMaterial.findMany({
        where: { isActive: true },
        select: { name: true, quantity: true, costPerUnit: true, minQuantity: true, expiryDate: true, category: true, unit: true },
      }),
      prisma.clinicExpense.findMany({
        where: { date: { gte: start, lt: end }, category: { in: MATERIAL_EXPENSE_CATS } },
        select: { category: true, amount: true },
      }),
    ])

    // Inventory stats
    const inventoryValue = activeMaterials.reduce((s: number, m: any) => s + m.costPerUnit * m.quantity, 0)
    const totalMaterials = activeMaterials.length
    const lowStockCount = activeMaterials.filter((m: any) => m.minQuantity > 0 && m.quantity <= m.minQuantity).length
    const expiredCount = activeMaterials.filter((m: any) => m.expiryDate && new Date(m.expiryDate) < now).length
    const expiringSoonCount = activeMaterials.filter((m: any) => m.expiryDate && new Date(m.expiryDate) >= now && new Date(m.expiryDate) <= soon).length

    // Top 8 materials by stock value
    const topMaterials = (activeMaterials as any[])
      .map((m: any) => ({ name: m.name, value: m.costPerUnit * m.quantity, quantity: m.quantity, unit: m.unit ?? '', category: m.category ?? '' }))
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 8)

    // Period expense breakdown
    const lossAmount = expenseRows.filter((e: any) => e.category === 'material_loss').reduce((s: number, e: any) => s + e.amount, 0)
    const expiryAmount = expenseRows.filter((e: any) => e.category === 'material_expiry').reduce((s: number, e: any) => s + e.amount, 0)
    const suppliesSpend = expenseRows
      .filter((e: any) => e.category === 'medical_supplies' || e.category === 'medications')
      .reduce((s: number, e: any) => s + e.amount, 0)
    const totalMaterialExpenses = lossAmount + expiryAmount + suppliesSpend

    return {
      inventoryValue,
      totalMaterials,
      lowStockCount,
      expiredCount,
      expiringSoonCount,
      lossAmount,
      expiryAmount,
      suppliesSpend,
      totalMaterialExpenses,
      topMaterials,
    }
  })

  // ═══════════════════════════════════════════════════════════════════════
  // AUDIT TRAIL: Batch Loss, Expiry, Adjustment
  // ═══════════════════════════════════════════════════════════════════════

  // ─── Log batch loss (damage, spillage, contamination, etc.) ──────────────
  ipcMain.handle('clinic:batches:logLoss', async (_e, {
    batchId,
    materialId,
    quantityLost,
    reason = 'other',
    description = null,
    recordedBy = null,
  }: {
    batchId: string
    materialId: string
    quantityLost: number
    reason?: string
    description?: string | null
    recordedBy?: string | null
  }) => {
    return prisma.$transaction(async (tx: any) => {
      const batch = await tx.clinicMaterialBatch.findUnique({ where: { id: batchId } })
      if (!batch) throw new Error('BATCH_NOT_FOUND')
      if (batch.materialId !== materialId) throw new Error('BATCH_MATERIAL_MISMATCH')

      const requestedLoss = Math.max(0, Number(quantityLost) || 0)
      if (requestedLoss <= 0) throw new Error('INVALID_LOSS_QUANTITY')

      const actualLoss = Math.min(requestedLoss, batch.quantity)
      const newBatchQty = batch.quantity - actualLoss

      await tx.clinicMaterialBatch.update({
        where: { id: batchId },
        data: { quantity: newBatchQty },
      })

      const material = await tx.clinicMaterial.findUnique({ where: { id: materialId } })
      if (!material) throw new Error('MATERIAL_NOT_FOUND')
      const newMaterialQty = Math.max(0, material.quantity - actualLoss)

      await tx.clinicMaterial.update({
        where: { id: materialId },
        data: { quantity: newMaterialQty },
      })

      // Create loss record (audit trail)
      const loss = await tx.clinicMaterialLoss.create({
        data: {
          batchId,
          materialId,
          quantityLost: actualLoss,
          reason,
          description,
          recordedBy,
        },
      })

      // Sync expiry date
      await syncMaterialExpiry(tx, materialId)

      return loss
    })
  })

  // ─── Log batch expiry ────────────────────────────────────────────────────
  ipcMain.handle('clinic:batches:logExpiry', async (_e, {
    batchId,
    materialId,
    quantityExpired,
    expiryDate,
    disposalMethod = null,
    recordedBy = null,
    notes = null,
  }: {
    batchId: string
    materialId: string
    quantityExpired: number
    expiryDate: string
    disposalMethod?: string | null
    recordedBy?: string | null
    notes?: string | null
  }) => {
    return prisma.$transaction(async (tx: any) => {
      const batch = await tx.clinicMaterialBatch.findUnique({ where: { id: batchId } })
      if (!batch) throw new Error('BATCH_NOT_FOUND')
      if (batch.materialId !== materialId) throw new Error('BATCH_MATERIAL_MISMATCH')

      const requestedExpiry = Math.max(0, Number(quantityExpired) || 0)
      if (requestedExpiry <= 0) throw new Error('INVALID_EXPIRY_QUANTITY')

      const actualExpired = Math.min(requestedExpiry, batch.quantity)
      const newBatchQty = batch.quantity - actualExpired

      await tx.clinicMaterialBatch.update({
        where: { id: batchId },
        data: { quantity: newBatchQty },
      })

      const material = await tx.clinicMaterial.findUnique({ where: { id: materialId } })
      if (!material) throw new Error('MATERIAL_NOT_FOUND')
      const newMaterialQty = Math.max(0, material.quantity - actualExpired)

      await tx.clinicMaterial.update({
        where: { id: materialId },
        data: { quantity: newMaterialQty },
      })

      // Create expiry record (audit trail)
      const expiry = await tx.clinicMaterialExpiry.create({
        data: {
          batchId,
          materialId,
          quantityExpired: actualExpired,
          expiryDate: new Date(expiryDate),
          disposalMethod,
          recordedBy,
          notes,
        },
      })

      // Sync expiry date
      await syncMaterialExpiry(tx, materialId)

      return expiry
    })
  })

  // ─── Log batch adjustment (recount, received, etc.) ────────────────────────
  ipcMain.handle('clinic:batches:logAdjustment', async (_e, {
    batchId,
    materialId,
    quantityBefore,
    quantityAfter,
    reason = 'recount',
    description = null,
    adjustedBy = null,
  }: {
    batchId: string
    materialId: string
    quantityBefore: number
    quantityAfter: number
    reason?: string
    description?: string | null
    adjustedBy?: string | null
  }) => {
    return prisma.$transaction(async (tx: any) => {
      const batch = await tx.clinicMaterialBatch.findUnique({ where: { id: batchId } })
      if (!batch) throw new Error('BATCH_NOT_FOUND')
      if (batch.materialId !== materialId) throw new Error('BATCH_MATERIAL_MISMATCH')

      const targetQty = Math.max(0, Number(quantityAfter) || 0)
      const actualBefore = batch.quantity
      const quantityAdjusted = targetQty - actualBefore

      const material = await tx.clinicMaterial.findUnique({ where: { id: materialId } })
      if (!material) throw new Error('MATERIAL_NOT_FOUND')
      const newMaterialQty = Math.max(0, material.quantity + quantityAdjusted)

      // Create adjustment record (audit trail)
      const adjustment = await tx.clinicMaterialAdjustment.create({
        data: {
          batchId,
          materialId,
          quantityBefore: actualBefore,
          quantityAfter: targetQty,
          quantityAdjusted,
          reason,
          description,
          adjustedBy,
        },
      })

      // Update batch quantity
      await tx.clinicMaterialBatch.update({
        where: { id: batchId },
        data: { quantity: targetQty },
      })

      // Update material stock by the delta
      await tx.clinicMaterial.update({
        where: { id: materialId },
        data: { quantity: newMaterialQty },
      })

      // Sync expiry date
      await syncMaterialExpiry(tx, materialId)

      return adjustment
    })
  })
}
