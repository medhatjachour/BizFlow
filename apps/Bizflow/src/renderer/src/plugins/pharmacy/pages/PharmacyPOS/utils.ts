import { CartLine, PharmacyProduct, SaleUnitType } from './types'

export function calculateSubtotal(cart: CartLine[]): number {
  return cart.reduce((acc, line) => acc + line.quantity * line.unitPrice, 0)
}

export function computeStockInUnit(line: CartLine): number {
  if (line.saleUnit === 'sub' && line.ratio) {
    return Math.floor(line.stockBase * line.ratio)
  }
  return line.stockBase
}

export function resolveUnitPrice(product: PharmacyProduct, saleUnit: SaleUnitType): number {
  if (saleUnit === 'sub') {
    if (product.subUnitPrice != null && product.subUnitPrice > 0) {
      return product.subUnitPrice
    }
    if (product.subUnitsPerContainer && product.subUnitsPerContainer > 0) {
      return (product.sellingPrice || 0) / product.subUnitsPerContainer
    }
    return 0
  }
  return product.sellingPrice || 0
}

export function buildCartLine(product: PharmacyProduct): CartLine {
  return {
    productId: product.id,
    name: product.name,
    unit: product.unit,
    subUnit: product.subUnit,
    ratio: product.subUnitsPerContainer,
    subUnitPrice: product.subUnitPrice,
    baseSellingPrice: product.sellingPrice ?? 0,
    saleUnit: 'base',
    unitPrice: product.sellingPrice ?? 0,
    quantity: 1,
    stockBase: product.totalStock,
  }
}