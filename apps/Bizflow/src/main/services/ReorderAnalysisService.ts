// The generated Prisma client is module-specific, so commerce models may be
// absent in single-module builds (e.g. vet). Typing it as `any` keeps this
// cross-module code compiling everywhere (matches the plugin-handler convention).
type PrismaClient = any;
import { createLogger } from '../utils/logger';

const log = createLogger('ReorderAnalysis');

export interface ReorderAlert {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  currentStock: number;
  reorderPoint: number;
  suggestedOrderQty: number;
  daysToDepletion: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  lastSoldDate?: Date;
  avgDailySales: number;
  supplierInfo?: {
    supplierName: string;
    cost: number;
    leadTime: number;
  };
}

export interface ReorderAnalysis {
  alerts: ReorderAlert[];
  summary: {
    totalAlerts: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
}

export class ReorderAnalysisService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Analyze inventory levels and generate reorder alerts
   */
  async analyzeReorderNeeds(): Promise<ReorderAnalysis> {
    log.info('Starting reorder analysis');
    // Get all product variants with their current stock and reorder points
    const variants = await this.prisma.productVariant.findMany({
      where: {
        product: {
          isArchived: false
        }
      },
      include: {
        product: {
          include: {
            supplierProducts: {
              where: { isPreferred: true },
              include: { supplier: true },
              take: 1
            }
          }
        },
        stockMovements: {
          where: {
            type: 'SALE',
            createdAt: {
              gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    const alerts: ReorderAlert[] = [];

    for (const variant of variants) {
      const alert = await this.analyzeVariant(variant);
      if (alert) {
        alerts.push(alert);
      }
    }

    // Sort alerts by priority (critical first)
    alerts.sort((a, b) => {
      const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    const summary = {
      totalAlerts: alerts.length,
      criticalCount: alerts.filter(a => a.priority === 'CRITICAL').length,
      highCount: alerts.filter(a => a.priority === 'HIGH').length,
      mediumCount: alerts.filter(a => a.priority === 'MEDIUM').length,
      lowCount: alerts.filter(a => a.priority === 'LOW').length
    };

    log.info('Reorder analysis complete', summary);
    if (summary.criticalCount > 0) {
      const criticalItems = alerts
        .filter(a => a.priority === 'CRITICAL')
        .map(a => `${a.productName} (stock: ${a.currentStock})`)
        .join(', ');
      log.warn(`${summary.criticalCount} CRITICAL reorder alert(s): ${criticalItems}`);
    }

    return { alerts, summary };
  }

  /**
   * Analyze a single product variant for reorder needs
   */
  private async analyzeVariant(variant: any): Promise<ReorderAlert | null> {
    const { product, stockMovements } = variant;

    // Skip if stock is above reorder point
    if (variant.stock > variant.reorderPoint) {
      return null;
    }

    // Calculate average daily sales from last 90 days
    const avgDailySales = this.calculateAvgDailySales(stockMovements);

    // Calculate days to depletion
    const daysToDepletion = avgDailySales > 0 ? Math.floor(variant.stock / avgDailySales) : 999;

    // Determine priority based on stock level and sales velocity
    const priority = this.determinePriority(variant.stock, variant.reorderPoint, daysToDepletion);

    // Calculate suggested order quantity
    const suggestedOrderQty = this.calculateSuggestedOrderQty(variant, avgDailySales);

    // Get supplier information
    const supplierInfo = product.supplierProducts[0] ? {
      supplierName: product.supplierProducts[0].supplier.name,
      cost: product.supplierProducts[0].cost,
      leadTime: product.supplierProducts[0].leadTime || 7 // Default 7 days
    } : undefined;

    // Get last sold date
    const lastSoldDate = stockMovements.length > 0 ? stockMovements[0].createdAt : undefined;

    return {
      productId: product.id,
      variantId: variant.id,
      productName: product.name,
      variantName: this.getVariantName(variant),
      currentStock: variant.stock,
      reorderPoint: variant.reorderPoint,
      suggestedOrderQty,
      daysToDepletion,
      priority,
      lastSoldDate,
      avgDailySales,
      supplierInfo
    };
  }

  /**
   * Calculate average daily sales from stock movements
   */
  private calculateAvgDailySales(stockMovements: any[]): number {
    if (stockMovements.length === 0) return 0;

    const totalSold = stockMovements.reduce((sum, movement) => sum + Math.abs(movement.quantity), 0);
    const daysSpan = 90; // Looking at 90 days

    return totalSold / daysSpan;
  }

  /**
   * Determine alert priority based on stock level and depletion rate
   */
  private determinePriority(currentStock: number, reorderPoint: number, daysToDepletion: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const stockRatio = currentStock / reorderPoint;

    if (currentStock === 0 || daysToDepletion <= 1) {
      return 'CRITICAL';
    } else if (stockRatio <= 0.25 || daysToDepletion <= 3) {
      return 'HIGH';
    } else if (stockRatio <= 0.5 || daysToDepletion <= 7) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  /**
   * Calculate suggested order quantity based on sales velocity and lead time
   */
  private calculateSuggestedOrderQty(variant: any, avgDailySales: number): number {
    // Get preferred supplier lead time
    const leadTime = variant.product.supplierProducts[0]?.leadTime || 7;

    // Calculate demand during lead time
    const demandDuringLeadTime = Math.ceil(avgDailySales * leadTime);

    // Add safety stock (20% of reorder point)
    const safetyStock = Math.ceil(variant.reorderPoint * 0.2);

    // Calculate reorder quantity to reach optimal stock level
    const optimalStock = variant.reorderPoint * 2; // Aim for 2x reorder point
    const reorderQty = Math.max(
      optimalStock - variant.stock + demandDuringLeadTime + safetyStock,
      variant.reorderPoint // Minimum order quantity
    );

    return Math.ceil(reorderQty);
  }

  /**
   * Generate a human-readable variant name
   */
  private getVariantName(variant: any): string {
    if (variant.attributeValues && variant.attributeValues.length > 0) {
      return variant.attributeValues.map((av: any) => av.value).join(' / ')
    }
    return 'Default'
  }

  /**
   * Get reorder alerts for a specific product
   */
  async getProductReorderAlerts(productId: string): Promise<ReorderAlert[]> {
    const analysis = await this.analyzeReorderNeeds();
    return analysis.alerts.filter(alert => alert.productId === productId);
  }

  /**
   * Get alerts by priority level
   */
  async getAlertsByPriority(priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'): Promise<ReorderAlert[]> {
    const analysis = await this.analyzeReorderNeeds();
    return analysis.alerts.filter(alert => alert.priority === priority);
  }

  /**
   * Get alerts that need immediate attention (critical and high priority)
   */
  async getUrgentAlerts(): Promise<ReorderAlert[]> {
    const analysis = await this.analyzeReorderNeeds();
    return analysis.alerts.filter(alert => alert.priority === 'CRITICAL' || alert.priority === 'HIGH');
  }
}