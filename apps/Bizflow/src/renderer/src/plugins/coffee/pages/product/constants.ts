// ─── Coffee Products Constants ───────────────────────────────────────────────

export const PRESET_COLORS = [
  '#f59e0b', '#f97316', '#ef4444', '#ec4899',
  '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6',
  '#06b6d4', '#14b8a6', '#10b981', '#84cc16',
  '#a16207', '#78716c', '#64748b', '#1e293b',
]

export const CAFE_ICONS = [
  '🍰','🎂','🧁','🥧','🍮','🥮',
  '☕','🫖','🍵','🧋','🥤','🧃',
  '🍫','🍬','🍭','🍪','🍩','🥐',
  '🥖','🧇','🥞','🍞','🧀','🥪',
  '🍨','🍦','🍧','🥛','🍷','🍸',
  '🍹','🍺','🍯','🥥','🍓','🍒',
]

export const PRODUCT_UNITS = [
  { value: 'piece', label: 'Piece', symbol: 'pcs', decimals: 0, step: '1' },
  { value: 'kg', label: 'Kilogram', symbol: 'kg', decimals: 3, step: '0.001' },
  { value: 'g', label: 'Gram', symbol: 'g', decimals: 0, step: '1' },
  { value: 'liter', label: 'Liter', symbol: 'L', decimals: 3, step: '0.001' },
  { value: 'ml', label: 'Milliliter', symbol: 'ml', decimals: 0, step: '1' },
  { value: 'box', label: 'Box', symbol: 'box', decimals: 0, step: '1' },
  { value: 'pack', label: 'Pack', symbol: 'pack', decimals: 0, step: '1' },
  { value: 'dozen', label: 'Dozen', symbol: 'dz', decimals: 0, step: '1' },
  { value: 'portion', label: 'Portion', symbol: 'port', decimals: 0, step: '1' },
  { value: 'serving', label: 'Serving', symbol: 'srv', decimals: 0, step: '1' },
] as const

export const DEFAULT_UNIT = 'piece'

export const EMPTY_PRODUCT_FORM = {
  name: '',
  description: '',
  price: '',
  cost: '0',
  unit: DEFAULT_UNIT,
  stock: '0',
  reorderPoint: '5',
  isAvailable: true,
  displayOrder: '0',
  notes: '',
  categoryId: ''
}

export const EMPTY_CATEGORY_FORM = {
  name: '',
  color: '#f59e0b',
  icon: '🍰',
  description: ''
}
