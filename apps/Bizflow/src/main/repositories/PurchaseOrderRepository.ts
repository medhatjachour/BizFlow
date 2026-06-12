import { PrismaClient } from '../../generated/prisma'
import type {
  PurchaseOrderResponseDTO,
  CreatePurchaseOrderDTO,
  UpdatePurchaseOrderDTO,
  PurchaseOrderFilters,
  PurchaseOrderSummaryDTO
} from '../../shared/dtos/purchase-order.dto'

export class PurchaseOrderRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(filters?: PurchaseOrderFilters): Promise<PurchaseOrderResponseDTO[]> {
    const where: any = {}

    if (filters?.supplierId) {
      where.supplierId = filters.supplierId
    }

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.startDate || filters?.endDate) {
      where.orderDate = {}
      if (filters.startDate) where.orderDate.gte = filters.startDate
      if (filters.endDate) where.orderDate.lte = filters.endDate
    }

    if (filters?.minAmount || filters?.maxAmount) {
      where.totalAmount = {}
      if (filters.minAmount) where.totalAmount.gte = filters.minAmount
      if (filters.maxAmount) where.totalAmount.lte = filters.maxAmount
    }

    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                baseSKU: true,
                description: true,
                basePrice: true,
                baseCost: true,
                hasVariants: true,
                categoryId: true,
                storeId: true,
                createdAt: true,
                updatedAt: true
              }
            }
          }
        }
      },
      orderBy: { orderDate: 'desc' }
    })

    return purchaseOrders.map(po => ({
      ...po,
      status: po.status as 'draft' | 'ordered' | 'received' | 'cancelled',
      supplier: {
        ...po.supplier,
        productCount: 0, // Will be calculated if needed
        totalPurchaseOrders: 0, // Will be calculated if needed
        totalPurchased: 0, // Will be calculated if needed
        createdAt: po.supplier.createdAt.toISOString(),
        updatedAt: po.supplier.updatedAt.toISOString()
      },
      orderDate: po.orderDate,
      expectedDate: po.expectedDate || undefined,
      receivedDate: po.receivedDate || undefined,
      notes: po.notes || undefined,
      approvedBy: po.approvedBy || undefined,
      items: po.items.map(item => ({
        ...item,
        variantId: item.variantId || undefined,
        product: {
          ...item.product,
          description: item.product.description || undefined,
          category: null, // Will be populated if needed
          totalStock: 0, // Will be calculated if needed
          stockValue: 0,
          retailValue: 0,
          suppliers: []
        } as any,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      })),
      createdAt: po.createdAt,
      updatedAt: po.updatedAt
    }))
  }

  async findById(id: string): Promise<PurchaseOrderResponseDTO | null> {
    const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                baseSKU: true,
                description: true,
                basePrice: true,
                baseCost: true,
                hasVariants: true,
                categoryId: true,
                storeId: true,
                createdAt: true,
                updatedAt: true
              }
            }
          }
        }
      }
    })

    if (!purchaseOrder) return null

    return {
      ...purchaseOrder,
      status: purchaseOrder.status as 'draft' | 'ordered' | 'received' | 'cancelled',
      supplier: {
        ...purchaseOrder.supplier,
        productCount: 0, // Will be calculated if needed
        totalPurchaseOrders: 0, // Will be calculated if needed
        totalPurchased: 0, // Will be calculated if needed
        createdAt: purchaseOrder.supplier.createdAt.toISOString(),
        updatedAt: purchaseOrder.supplier.updatedAt.toISOString()
      },
      orderDate: purchaseOrder.orderDate,
      expectedDate: purchaseOrder.expectedDate || undefined,
      receivedDate: purchaseOrder.receivedDate || undefined,
      notes: purchaseOrder.notes || undefined,
      approvedBy: purchaseOrder.approvedBy || undefined,
      items: purchaseOrder.items.map(item => ({
        ...item,
        variantId: item.variantId || undefined,
        product: {
          ...item.product,
          description: item.product.description || undefined,
          category: null,
          totalStock: 0,
          stockValue: 0,
          retailValue: 0,
          suppliers: []
        } as any,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      })),
      createdAt: purchaseOrder.createdAt,
      updatedAt: purchaseOrder.updatedAt
    }
  }

  async findByPoNumber(poNumber: string): Promise<PurchaseOrderResponseDTO | null> {
    const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
      where: { poNumber },
      include: {
        supplier: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                baseSKU: true,
                description: true,
                basePrice: true,
                baseCost: true,
                hasVariants: true,
                categoryId: true,
                storeId: true,
                createdAt: true,
                updatedAt: true
              }
            }
          }
        }
      }
    })

    if (!purchaseOrder) return null

    return {
      ...purchaseOrder,
      status: purchaseOrder.status as 'draft' | 'ordered' | 'received' | 'cancelled',
      supplier: {
        ...purchaseOrder.supplier,
        productCount: 0, // Will be calculated if needed
        totalPurchaseOrders: 0, // Will be calculated if needed
        totalPurchased: 0, // Will be calculated if needed
        createdAt: purchaseOrder.supplier.createdAt.toISOString(),
        updatedAt: purchaseOrder.supplier.updatedAt.toISOString()
      },
      orderDate: purchaseOrder.orderDate,
      expectedDate: purchaseOrder.expectedDate || undefined,
      receivedDate: purchaseOrder.receivedDate || undefined,
      notes: purchaseOrder.notes || undefined,
      approvedBy: purchaseOrder.approvedBy || undefined,
      items: purchaseOrder.items.map(item => ({
        ...item,
        variantId: item.variantId || undefined,
        product: {
          ...item.product,
          description: item.product.description || undefined,
          category: null,
          totalStock: 0,
          stockValue: 0,
          retailValue: 0,
          suppliers: []
        } as any,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      })),
      createdAt: purchaseOrder.createdAt,
      updatedAt: purchaseOrder.updatedAt
    }
  }

  async create(data: CreatePurchaseOrderDTO, orderedBy: string): Promise<PurchaseOrderResponseDTO> {
    // Generate PO number
    const poNumber = await this.generatePoNumber()

    // Calculate total amount
    const totalAmount = data.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0) +
                       (data.taxAmount || 0) + (data.shippingCost || 0)

    const purchaseOrder = await this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: data.supplierId,
        expectedDate: data.expectedDate,
        totalAmount,
        taxAmount: data.taxAmount || 0,
        shippingCost: data.shippingCost || 0,
        notes: data.notes,
        orderedBy,
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.quantity * item.unitCost
          }))
        }
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                baseSKU: true,
                description: true,
                basePrice: true,
                baseCost: true,
                hasVariants: true,
                categoryId: true,
                storeId: true,
                createdAt: true,
                updatedAt: true
              }
            }
          }
        }
      }
    })

    return {
      ...purchaseOrder,
      status: purchaseOrder.status as 'draft' | 'ordered' | 'received' | 'cancelled',
      supplier: {
        ...purchaseOrder.supplier,
        productCount: 0, // Will be calculated if needed
        totalPurchaseOrders: 0, // Will be calculated if needed
        totalPurchased: 0, // Will be calculated if needed
        createdAt: purchaseOrder.supplier.createdAt.toISOString(),
        updatedAt: purchaseOrder.supplier.updatedAt.toISOString()
      },
      orderDate: purchaseOrder.orderDate,
      expectedDate: purchaseOrder.expectedDate || undefined,
      receivedDate: purchaseOrder.receivedDate || undefined,
      notes: purchaseOrder.notes || undefined,
      approvedBy: purchaseOrder.approvedBy || undefined,
      items: purchaseOrder.items.map(item => ({
        ...item,
        variantId: item.variantId || undefined,
        product: {
          ...item.product,
          description: item.product.description || undefined,
          category: null,
          totalStock: 0,
          stockValue: 0,
          retailValue: 0,
          suppliers: []
        } as any,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      })),
      createdAt: purchaseOrder.createdAt,
      updatedAt: purchaseOrder.updatedAt
    }
  }

  async update(id: string, data: UpdatePurchaseOrderDTO): Promise<PurchaseOrderResponseDTO> {
    const updateData: any = {}

    if (data.status) updateData.status = data.status
    if (data.expectedDate !== undefined) updateData.expectedDate = data.expectedDate
    if (data.receivedDate !== undefined) updateData.receivedDate = data.receivedDate
    if (data.taxAmount !== undefined) updateData.taxAmount = data.taxAmount
    if (data.shippingCost !== undefined) updateData.shippingCost = data.shippingCost
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.approvedBy !== undefined) updateData.approvedBy = data.approvedBy

    // Recalculate total if items are updated
    if (data.items) {
      const currentPo = await this.prisma.purchaseOrder.findUnique({
        where: { id },
        include: { items: true }
      })

      if (currentPo) {
        // Delete existing items
        await this.prisma.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: id }
        })

        // Create new items
        const items = data.items.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: item.quantity * item.unitCost,
          receivedQty: item.receivedQty || 0
        }))

        updateData.items = { create: items }
        updateData.totalAmount = items.reduce((sum, item) => sum + item.totalCost, 0) +
                                (data.taxAmount || currentPo.taxAmount) +
                                (data.shippingCost || currentPo.shippingCost)
      }
    }

    const purchaseOrder = await this.prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        supplier: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                baseSKU: true,
                description: true,
                basePrice: true,
                baseCost: true,
                hasVariants: true,
                categoryId: true,
                storeId: true,
                createdAt: true,
                updatedAt: true
              }
            }
          }
        }
      }
    })

    return {
      ...purchaseOrder,
      status: purchaseOrder.status as 'draft' | 'ordered' | 'received' | 'cancelled',
      supplier: {
        ...purchaseOrder.supplier,
        productCount: 0, // Will be calculated if needed
        totalPurchaseOrders: 0, // Will be calculated if needed
        totalPurchased: 0, // Will be calculated if needed
        createdAt: purchaseOrder.supplier.createdAt.toISOString(),
        updatedAt: purchaseOrder.supplier.updatedAt.toISOString()
      },
      orderDate: purchaseOrder.orderDate,
      expectedDate: purchaseOrder.expectedDate || undefined,
      receivedDate: purchaseOrder.receivedDate || undefined,
      notes: purchaseOrder.notes || undefined,
      approvedBy: purchaseOrder.approvedBy || undefined,
      items: purchaseOrder.items.map(item => ({
        ...item,
        variantId: item.variantId || undefined,
        product: {
          ...item.product,
          description: item.product.description || undefined,
          category: null,
          totalStock: 0,
          stockValue: 0,
          retailValue: 0,
          suppliers: []
        } as any,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      })),
      createdAt: purchaseOrder.createdAt,
      updatedAt: purchaseOrder.updatedAt
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.purchaseOrder.delete({
      where: { id }
    })
  }

  async getSummary(): Promise<PurchaseOrderSummaryDTO> {
    const summary = await this.prisma.purchaseOrder.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { totalAmount: true }
    })

    const total = summary.reduce((sum, item) => sum + item._count.id, 0)
    const totalValue = summary.reduce((sum, item) => sum + (item._sum.totalAmount || 0), 0)

    const draft = summary.find(s => s.status === 'draft')?._count.id || 0
    const ordered = summary.find(s => s.status === 'ordered')?._count.id || 0
    const received = summary.find(s => s.status === 'received')?._count.id || 0
    const cancelled = summary.find(s => s.status === 'cancelled')?._count.id || 0

    const pendingOrders = await this.prisma.purchaseOrder.findMany({
      where: { status: { in: ['draft', 'ordered'] } },
      select: { totalAmount: true }
    })

    const pendingValue = pendingOrders.reduce((sum, po) => sum + po.totalAmount, 0)

    return {
      total,
      draft,
      ordered,
      received,
      cancelled,
      totalValue,
      pendingValue
    }
  }

  private async generatePoNumber(): Promise<string> {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')

    // Get the count of POs this month
    const startOfMonth = new Date(year, now.getMonth(), 1)
    const endOfMonth = new Date(year, now.getMonth() + 1, 0, 23, 59, 59)

    const count = await this.prisma.purchaseOrder.count({
      where: {
        orderDate: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    })

    const sequence = String(count + 1).padStart(4, '0')
    return `PO-${year}${month}-${sequence}`
  }
}