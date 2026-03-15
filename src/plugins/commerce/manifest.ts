/**
 * Commerce Plugin – Manifest
 *
 * Central metadata for the Commerce plugin.  Mirrors the pattern used by
 * bakery, restaurant, warehouse and clinic plugins so the Settings UI and
 * module registry treat them all identically.
 *
 * Commerce covers the core retail stack:
 *   Products · Categories · Inventory · POS · Sales · Stores
 *   Suppliers · Purchase Orders · Installments · Deposits · Receipts
 */

export const commerceManifest = {
  id: 'commerce' as const,
  name: 'Commerce',
  nameAr: 'التجارة',
  description:
    'Core retail & commerce features: products, inventory, point of sale, sales, ' +
    'multi-store management, suppliers, purchase orders, and installment payments.',
  icon: '🛒',
  color: 'indigo',
  status: 'active' as const,
  routePrefix: '/products',
  ipcPrefix: 'commerce',
  models: [
    'Category',
    'Product',
    'ProductVariant',
    'ProductImage',
    'ProductAttribute',
    'Store',
    'SaleTransaction',
    'SaleItem',
    'StockMovement',
    'Supplier',
    'SupplierProduct',
    'PurchaseOrder',
    'PurchaseOrderItem',
    'InstallmentPlan',
    'Installment',
    'Deposit',
  ],
  /** Default enabled state for new installations. */
  defaultEnabled: true,
}
