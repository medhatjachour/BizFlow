/**
 * Settings Domain Types
 * Type definitions for application settings
 */

export interface StoreSettings {
  storeName: string
  storePhone: string
  storeEmail: string
  storeAddress: string
  currency: string
  timezone: string
}

export interface TaxReceiptSettings {
  taxRate: number
  receiptHeader: string
  receiptFooter: string
  autoPrint: boolean
  includeLogo: boolean
  refundPeriodDays: number // Number of days allowed for refunds/returns
  // Discount settings
  allowDiscounts: boolean
  maxDiscountPercentage: number
  maxDiscountAmount: number
  requireDiscountReason: boolean
  // COGS calculation setting
  includeCOGSInCalculations: boolean
  // Store information for receipt
  storeName: string
  storeAddress: string
  storePhone: string
  storeEmail: string
  taxNumber: string // Egyptian tax number (الرقم الضريبي)
  commercialRegister: string // Commercial register number
  // Printer settings
  printerType: 'none' | 'usb' | 'network' | 'html'
  printerName: string // USB printer name or network printer name
  printerIP: string // For network printers
  paperWidth: '58mm' | '80mm'
  receiptBottomSpacing: number // Number of blank lines at bottom of receipt (for tearing)
  printLogo: boolean
  printQRCode: boolean
  printBarcode: boolean
  openCashDrawer: boolean
  receiptLanguage: 'en' | 'ar'
}

export interface NotificationSettings {
  notifications: boolean
  lowStockAlert: boolean
  lowStockThreshold: number
  salesNotifications: boolean
  emailNotifications: boolean
  emailAddress?: string
}

export interface PaymentMethodSettings {
  cash: boolean
  credit: boolean
  debit: boolean
  mobile: boolean
  giftCard: boolean
}

export interface UserProfileSettings {
  firstName: string
  lastName: string
  email: string
  phone?: string
  avatar?: string
}

export interface SecuritySettings {
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
  twoFactorEnabled: boolean
  sessionTimeout: number
}

export interface BackupSettings {
  autoBackup: boolean
  backupFrequency: 'daily' | 'weekly' | 'monthly'
  backupLocation?: string
  keepBackups: number
}

export interface DisplaySettings {
  showImagesInProductCards: boolean
  showImagesInPOSCards: boolean
  showImagesInInventory: boolean
}

export interface Category {
  id: string
  name: string
  description?: string
}

export interface CategorySettings {
  categories: Category[]
}

export interface AllSettings {
  store: StoreSettings
  taxReceipt: TaxReceiptSettings
  notifications: NotificationSettings
  paymentMethods: PaymentMethodSettings
  userProfile: UserProfileSettings
  security: SecuritySettings
  backup: BackupSettings
  display: DisplaySettings
  categories: CategorySettings
}

export type SettingsTab = 
  | 'general' 
  | 'display'
  | 'categories'
  | 'store' 
  | 'user'
  | 'users'
  | 'payments' 
  | 'tax' 
  | 'notifications' 
  | 'email'
  | 'security' 
  | 'backup'
  | 'archive'
