import {
  Plus, RefreshCw, Trash2, ShoppingCart, Package, ArrowDownCircle, ArrowUpCircle,
} from 'lucide-react'

// ── Movement type metadata (for history drawer) ────────────────────────────
export const MOVEMENT_TYPES: {
  value: string
  label: string
  icon: typeof Plus
  color: string
  isIncoming: boolean
}[] = [
  { value: 'initial',    label: 'Initial',    icon: Package,         color: '#6366f1', isIncoming: true  },
  { value: 'restock',    label: 'Restock',    icon: ArrowDownCircle, color: '#16a34a', isIncoming: true  },
  { value: 'adjustment', label: 'Adjustment', icon: RefreshCw,       color: '#0891b2', isIncoming: true  },
  { value: 'sale',       label: 'Sale',       icon: ShoppingCart,    color: '#7c3aed', isIncoming: false },
  { value: 'waste',      label: 'Waste',      icon: Trash2,          color: '#ea580c', isIncoming: false },
  { value: 'write_off',  label: 'Write-off',  icon: ArrowUpCircle,   color: '#dc2626', isIncoming: false },
]

export function movementMeta(value: string) {
  return MOVEMENT_TYPES.find(m => m.value === value) ?? {
    value,
    label: value,
    icon: RefreshCw,
    color: '#64748b',
    isIncoming: false,
  }
}

export function movementLabel(type: string): string {
  return movementMeta(type).label
}

// ── Date range presets for history ─────────────────────────────────────────
export const HISTORY_PERIODS: { value: string; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: '7 Days' },
  { value: '30days',label: '30 Days' },
  { value: '90days',label: '90 Days' },
  { value: 'all',   label: 'All' },
]

export const PAGE_SIZE = 10
