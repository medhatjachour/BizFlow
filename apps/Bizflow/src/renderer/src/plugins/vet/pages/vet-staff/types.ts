export interface VetStaff {
  id: string
  name: string
  role: string
  phone: string
  email?: string | null
  employmentType: 'full_time' | 'part_time' | 'contract' | string
  status: 'active' | 'inactive' | string
  baseSalary: number
  salaryType: 'monthly' | 'hourly' | string
  hourlyRate?: number | null
  hireDate?: string | null
}

export interface VetStaffFormData {
  name: string
  phone: string
  email: string
  employmentType: string
  status: string
  baseSalary: string
  salaryType: string
  hourlyRate: string
  hireDate: string
}

export interface VetStaffStats {
  total: number
  completed: number
  totalCharged: number
  totalPaid: number
  outstanding: number
  upcoming: number
  uniquePatients: number
}

export type StaffSortField = 'name' | 'hireDate' | 'baseSalary' | 'status'
export type StaffViewMode = 'grid' | 'table'