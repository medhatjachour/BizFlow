import { PaymentMethod } from './types'

export const QUICK_CASH_DENOMINATIONS = [5, 10, 20, 50, 100, 200]

export const PAYMENT_METHODS: { id: PaymentMethod; label: string; iconKey: string }[] = [
  { id: 'cash', label: 'Cash (F2)', iconKey: 'Banknote' },
  { id: 'card', label: 'Card (F3)', iconKey: 'CreditCard' },
  { id: 'credit', label: 'Store Credit', iconKey: 'Clock' },
  { id: 'other', label: 'Other', iconKey: 'MoreHorizontal' },
]

export const HOTKEYS_HINT = [
  { key: 'F1 / Enter', label: 'Search/Scan Barcode' },
  { key: 'F2', label: 'Cash Checkout' },
  { key: 'F4', label: 'Park/Hold Sale' },
  { key: 'Esc', label: 'Clear Search/Close' },
]