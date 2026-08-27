export type PeriodPreset = 'today' | 'week' | 'month' | 'year' | 'custom'

export interface PeriodRange {
  from?: string
  to?: string
  preset: PeriodPreset
}

export interface VetOverviewStats {
  totalPatients: number
  newPatients: number
  sessionCount: number
  revenue: number
  outstanding: number
  upcomingAppts: number
}

export interface DiagnosisStat {
  diagnosis: string
  count: number
}

export interface SpeciesStat {
  species: string
  count: number
}

export interface VisitTypeStat {
  visitType: string
  count: number
  revenue: number
  avg: number
}

export interface MedSummaryStat {
  saleCount: number
  unitsSold: number
  revenue: number
  costOfGoods: number
  grossProfit: number
  margin: number
  pharmacyOutstanding?: number
  topMedicines: Array<{
    id: string | number
    name: string
    revenue: number
    saleCount: number
  }>
}

export interface ProfitAnalysis {
  sales: {
    expectedRevenue: number
    actualRevenue: number
    expectedProfit: number
    actualProfit: number
    expectedMargin: number
    actualMargin: number
    realizationRate: number
    discountsGiven: number
    cogs: number
  }
  inventory: {
    batchCount: number
    cost: number
    retail: number
    inStockUnits: number
    potentialProfit: number
    potentialMargin: number
    expiredCost: number
  }
  topMedicines: Array<{
    id: string | number
    name: string
    unitsSold: number
    expectedProfit: number
    actualProfit: number
    discountsGiven: number
  }>
}

export interface SalesBreakdown {
  byCategory: Array<{
    category: string
    revenue: number
    saleCount: number
    profit: number
  }>
  byPayment: Array<{
    method: string
    revenue: number
    saleCount: number
  }>
  refunds: {
    count: number
    amount: number
  }
}

export interface MedicineBatch {
  id: string | number
  batchNumber?: string
  expiryDate: string
  quantity: number
  costPerUnit: number
  sellingPrice?: number
  medicineName?: string
  unit?: string
}

export interface MedicineItem {
  id: string | number
  name: string
  totalStock: number
  minimumStock: number
  unit?: string
  isLowStock?: boolean
  batches?: MedicineBatch[]
}

export interface AttentionAlert {
  key: string
  tab: string
  icon: any
  tone: 'red' | 'amber' | 'sky'
  title: string
  sub: string
}