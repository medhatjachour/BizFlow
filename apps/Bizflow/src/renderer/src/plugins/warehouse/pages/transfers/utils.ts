import { Transfer, TransferMetrics } from './types'

export function computeTransferMetrics(transfers: Transfer[]): TransferMetrics {
  const total = transfers.length
  const draft = transfers.filter(t => t.status === 'draft').length
  const inTransit = transfers.filter(t => t.status === 'in_transit').length
  const completed = transfers.filter(t => t.status === 'completed').length
  const cancelled = transfers.filter(t => t.status === 'cancelled').length

  const totalItemsMoved = transfers
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => {
      const itemsCount = (t.items ?? []).reduce((acc, item) => acc + (Number(item.quantity) || 0), 0)
      return sum + itemsCount
    }, 0)

  return { total, draft, inTransit, completed, cancelled, totalItemsMoved }
}

export function filterTransfers(
  transfers: Transfer[],
  searchQuery: string,
  statusFilter: string,
  locationMap: Map<string, { name: string; code: string }>
): Transfer[] {
  const q = searchQuery.trim().toLowerCase()

  return transfers.filter(tr => {
    if (statusFilter && statusFilter !== 'all' && tr.status !== statusFilter) {
      return false
    }

    if (!q) return true

    const fromName = tr.fromLocation?.name || locationMap.get(tr.fromLocationId)?.name || ''
    const toName = tr.toLocation?.name || locationMap.get(tr.toLocationId)?.name || ''
    const itemsText = (tr.items ?? [])
      .map(i => `${i.productName} ${i.sku || ''}`)
      .join(' ')
      .toLowerCase()
    const meta = `${tr.id} ${tr.notes || ''} ${tr.status}`.toLowerCase()

    return (
      fromName.toLowerCase().includes(q) ||
      toName.toLowerCase().includes(q) ||
      itemsText.includes(q) ||
      meta.includes(q)
    )
  })
}

export function getNextTransferStatus(currentStatus: string): 'in_transit' | 'completed' | null {
  if (currentStatus === 'draft') return 'in_transit'
  if (currentStatus === 'in_transit') return 'completed'
  return null
}