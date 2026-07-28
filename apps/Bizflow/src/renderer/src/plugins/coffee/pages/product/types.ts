// ─── Coffee Products Types ───────────────────────────────────────────────────

export interface Category {
  id: string
  name: string
  description?: string
  color?: string
  icon?: string
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  name: string
  description?: string
  price: number
  cost: number
  unit: string
  stock: number
  reorderPoint: number
  image?: string
  isAvailable: boolean
  displayOrder: number
  notes?: string
  categoryId?: string
  category?: Category
  createdAt: string
  updatedAt: string
}

export interface ProductForm {
  name: string
  description: string
  price: string
  cost: string
  unit: string
  stock: string
  reorderPoint: string
  isAvailable: boolean
  displayOrder: string
  notes: string
  categoryId: string
}

export interface CategoryForm {
  name: string
  color: string
  icon: string
  description?: string
}

export type ProductSubmitData = {
  form: ProductForm
  imageFile: string | null
  clearImage: boolean
}

export type CategorySubmitData = {
  name: string
  color: string
  icon?: string
  description?: string
}

export interface ProductFilters {
  search: string
  categoryId: string | 'all'
}
