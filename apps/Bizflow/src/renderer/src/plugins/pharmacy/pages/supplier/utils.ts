import { PharmacySupplierItem, SupplierFormData, SuppliersMetrics } from './types'

export function computeSuppliersMetrics(suppliers: PharmacySupplierItem[]): SuppliersMetrics {
  return suppliers.reduce(
    (acc, s) => {
      acc.totalSuppliers += 1
      acc.activeOrdersCount += s.orderCount || 0
      acc.totalBatchesSourced += s.batchCount || 0
      if (s.phone || s.email) acc.directContactCount += 1
      return acc
    },
    { totalSuppliers: 0, activeOrdersCount: 0, totalBatchesSourced: 0, directContactCount: 0 }
  )
}

export function initialSupplierFormData(initial?: PharmacySupplierItem | null): SupplierFormData {
  return {
    name: initial?.name ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    address: initial?.address ?? '',
    notes: initial?.notes ?? '',
  }
}

export function exportSuppliersToCSV(suppliers: PharmacySupplierItem[]) {
  const headers = ['Supplier Name', 'Phone', 'Email', 'Address', 'Orders Sourced', 'Batches Delivered', 'Notes']
  const rows = suppliers.map(s => [
    s.name,
    s.phone || '',
    s.email || '',
    s.address || '',
    s.orderCount || 0,
    s.batchCount || 0,
    s.notes || '',
  ])
  return [headers, ...rows]
}