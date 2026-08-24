export interface WasteLogEntry {
  id: string
  ingredientId?: string | null
  itemName: string
  quantity: number
  unit: string
  costLoss: number
  reason: string
  loggedBy?: string | null
  notes?: string | null
  createdAt: string
  ingredient?: {
    name: string
    category: string
  }
}

export interface WasteFormData {
  ingredientId?: string | null
  itemName: string
  quantity: string
  unit: string
  reason: string
  loggedBy: string
  notes?: string | null
}