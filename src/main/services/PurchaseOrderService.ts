import { PurchaseOrderRepository } from '../repositories/PurchaseOrderRepository'
import { SupplierService } from './SupplierService'
import { ProductService } from './ProductService'
import type {
  PurchaseOrderResponseDTO,
  CreatePurchaseOrderDTO,
  UpdatePurchaseOrderDTO,
  PurchaseOrderFilters,
  PurchaseOrderSummaryDTO
} from '../../shared/dtos/purchase-order.dto'

export class PurchaseOrderService {
  constructor(
    private purchaseOrderRepository: PurchaseOrderRepository,
    private supplierService: SupplierService,
    private productService: ProductService,
    private prisma: any
  ) {}

  async getAllPurchaseOrders(filters?: PurchaseOrderFilters): Promise<PurchaseOrderResponseDTO[]> {
    return this.purchaseOrderRepository.findAll(filters)
  }

  async getPurchaseOrderById(id: string): Promise<PurchaseOrderResponseDTO | null> {
    return this.purchaseOrderRepository.findById(id)
  }

  async getPurchaseOrderByPoNumber(poNumber: string): Promise<PurchaseOrderResponseDTO | null> {
    return this.purchaseOrderRepository.findByPoNumber(poNumber)
  }

  async createPurchaseOrder(data: CreatePurchaseOrderDTO, orderedBy: string): Promise<PurchaseOrderResponseDTO> {
    // Validate supplier exists
    const supplier = await this.supplierService.getSupplier(data.supplierId)
    if (!supplier) {
      throw new Error('Supplier not found')
    }

    // Validate all products exist and are supplied by this supplier
    for (const item of data.items) {
      const product = await this.productService.getProduct(item.productId)
      if (!product) {
        throw new Error(`Product ${item.productId} not found`)
      }

      // Check if supplier supplies this product
      const supplierProduct = await this.prisma.supplierProduct.findUnique({
        where: {
          supplierId_productId: {
            supplierId: data.supplierId,
            productId: item.productId
          }
        }
      })
      if (!supplierProduct) {
        throw new Error(`Product ${product.name} is not supplied by ${supplier.name}`)
      }

      // Validate unit cost is reasonable (not negative, not zero)
      if (item.unitCost <= 0) {
        throw new Error(`Invalid unit cost for product ${product.name}`)
      }

      // Validate quantity
      if (item.quantity <= 0) {
        throw new Error(`Invalid quantity for product ${product.name}`)
      }
    }

    return this.purchaseOrderRepository.create(data, orderedBy)
  }

  async updatePurchaseOrder(id: string, data: UpdatePurchaseOrderDTO): Promise<PurchaseOrderResponseDTO> {
    const existingPO = await this.purchaseOrderRepository.findById(id)
    if (!existingPO) {
      throw new Error('Purchase order not found')
    }

    // If receiving the order, update inventory
    if (data.status === 'received' && existingPO.status !== 'received') {
      await this.receivePurchaseOrder(id, data.receivedDate)
    }

    return this.purchaseOrderRepository.update(id, data)
  }

  async deletePurchaseOrder(id: string): Promise<void> {
    const existingPO = await this.purchaseOrderRepository.findById(id)
    if (!existingPO) {
      throw new Error('Purchase order not found')
    }

    // Only allow deletion of draft orders
    if (existingPO.status !== 'draft') {
      throw new Error('Only draft purchase orders can be deleted')
    }

    await this.purchaseOrderRepository.delete(id)
  }

  async receivePurchaseOrder(id: string, receivedDate?: Date): Promise<PurchaseOrderResponseDTO> {
    const po = await this.purchaseOrderRepository.findById(id)
    if (!po) {
      throw new Error('Purchase order not found')
    }

    if (po.status !== 'ordered') {
      throw new Error('Only ordered purchase orders can be received')
    }

    // Update inventory for each item using Prisma transaction
    await this.prisma.$transaction(async (tx: any) => {
      for (const item of po.items) {
        // Update product variant stock
        let variantId = item.variantId
        
        if (!variantId) {
          // For products without variants, find the default variant
          const variants = await tx.productVariant.findMany({
            where: { productId: item.productId }
          })
          
          if (variants.length === 1) {
            variantId = variants[0].id
          } else if (variants.length > 1) {
            // For multiple variants, add to the first one (could be improved)
            variantId = variants[0].id
          }
        }

        if (variantId) {
          // Get current stock before update
          const variant = await tx.productVariant.findUnique({
            where: { id: variantId },
            select: { stock: true }
          })

          const previousStock = variant?.stock || 0
          const newStock = previousStock + item.quantity

          await tx.productVariant.update({
            where: { id: variantId },
            data: { stock: { increment: item.quantity } }
          })

          // Record stock movement
          await tx.stockMovement.create({
            data: {
              variantId,
              type: 'restock',
              quantity: item.quantity,
              reason: `PO-${po.poNumber}`,
              notes: `Purchase order receipt`,
              userId: null,
              previousStock,
              newStock
            }
          })
        }
      }
    })

    // Update the PO status and received date
    return this.purchaseOrderRepository.update(id, {
      status: 'received',
      receivedDate: receivedDate || new Date()
    })
  }

  async getPurchaseOrderSummary(): Promise<PurchaseOrderSummaryDTO> {
    return this.purchaseOrderRepository.getSummary()
  }

  async getOverduePurchaseOrders(): Promise<PurchaseOrderResponseDTO[]> {
    const now = new Date()
    return this.purchaseOrderRepository.findAll({
      status: 'ordered',
      endDate: now // Expected date before now
    })
  }

  async getPendingPurchaseOrders(): Promise<PurchaseOrderResponseDTO[]> {
    return this.purchaseOrderRepository.findAll({
      status: 'ordered'
    })
  }
}