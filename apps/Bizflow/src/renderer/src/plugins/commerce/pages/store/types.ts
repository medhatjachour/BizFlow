export type StoreStatus = 'active' | 'inactive'

export type Store = {
  id: string
  name: string
  location: string
  phone: string
  hours: string
  manager: string
  status: StoreStatus | string
}

export type StoreFormData = {
  name: string
  location: string
  phone: string
  hours: string
  manager: string
  status: string
}