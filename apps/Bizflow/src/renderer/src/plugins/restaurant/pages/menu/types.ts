export interface ModifierOptionData {
  id?: string
  name: string
  priceDelta: number
}

export interface ModifierGroupData {
  id?: string
  title: string
  minSelect: number
  maxSelect: number
  options: ModifierOptionData[]
}

export interface MenuItemData {
  id: string
  name: string
  category: string
  description?: string | null
  price: number
  cost: number
  preparationTime: number
  station: string
  isAvailable: boolean
  displayOrder: number
  colorTag?: string | null
  notes?: string | null
  modifierGroups?: ModifierGroupData[]
  createdAt: string
  updatedAt: string
}

export interface MenuItemFormData {
  name: string
  category: string
  description: string
  price: string
  cost: string
  preparationTime: string
  station: string
  colorTag: string
  notes: string
  modifierGroups: ModifierGroupData[]
}