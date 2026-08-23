import { PharmacyCustomerItem, CustomerFormData, CustomersMetrics } from './types'

export function computeCustomersMetrics(customers: PharmacyCustomerItem[]): CustomersMetrics {
  return customers.reduce(
    (acc, c) => {
      acc.totalCustomers += 1
      acc.totalRevenue += c.totalSpent || 0
      acc.totalOutstanding += c.outstanding || 0
      if ((c.outstanding || 0) > 0.005) {
        acc.debtorsCount += 1
      }
      return acc
    },
    { totalCustomers: 0, totalRevenue: 0, totalOutstanding: 0, debtorsCount: 0 }
  )
}

export function initialCustomerFormData(initial?: PharmacyCustomerItem | null): CustomerFormData {
  return {
    name: initial?.name ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    address: initial?.address ?? '',
    notes: initial?.notes ?? '',
    defaultDiscount: initial?.defaultDiscount ? String(initial.defaultDiscount) : '',
  }
}

export function exportCustomersToCSV(customers: PharmacyCustomerItem[]) {
  const headers = ['Name', 'Phone', 'Email', 'Address', 'Default Discount (%)', 'Sales Count', 'Total Spent', 'Outstanding Balance']
  const rows = customers.map(c => [
    c.name,
    c.phone || '',
    c.email || '',
    c.address || '',
    c.defaultDiscount || 0,
    c.salesCount || 0,
    (c.totalSpent || 0).toFixed(2),
    (c.outstanding || 0).toFixed(2),
  ])
  return [headers, ...rows]
}