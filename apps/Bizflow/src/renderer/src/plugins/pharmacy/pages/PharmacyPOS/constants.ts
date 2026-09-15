import { PaymentMethod } from './types'

export const QUICK_CASH_DENOMINATIONS = [5, 10, 20, 50, 100, 200]

export const PAYMENT_METHODS: { id: PaymentMethod; labelKey: string; iconKey: string }[] = [
  { id: 'cash', labelKey: 'phPosCash', iconKey: 'Banknote' },
  { id: 'card', labelKey: 'phPosCard', iconKey: 'CreditCard' },
  { id: 'credit', labelKey: 'phPosStoreCredit', iconKey: 'Clock' },
  { id: 'other', labelKey: 'bakeryWasteTypeOther', iconKey: 'MoreHorizontal' },
]

export const HOTKEYS_HINT = [
  { key: 'F1 / Enter', labelKey: 'phPosHkSearch' },
  { key: 'F2', labelKey: 'phPosHkCash' },
  { key: 'F4', labelKey: 'phPosHkHold' },
  { key: 'Esc', labelKey: 'phPosHkClear' },
]

const PAYMENT_METHOD_LABEL_KEYS: Record<string, string> = {
  cash: 'cash',
  card: 'card',
  credit: 'phPosStoreCredit',
  other: 'phPosOther',
}

/** Persisted payment ids -> dictionary keys, for read-only display sites. */
export function paymentMethodLabelKey(id: string): string {
  return PAYMENT_METHOD_LABEL_KEYS[id] ?? id
}
