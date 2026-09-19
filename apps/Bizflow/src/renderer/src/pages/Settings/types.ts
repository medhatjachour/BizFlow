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
  /** Uploaded logo as a data URL. Empty when no logo has been chosen. */
  receiptLogo: string
  printQRCode: boolean
  printBarcode: boolean
  openCashDrawer: boolean
  receiptLanguage: 'en' | 'ar'
  /**
   * `bitmap` rasterises the receipt, which is the only way Arabic can print on
   * printers without an Arabic font ROM. `codepage` uses the printer's own font.
   */
  receiptArabicMode: 'bitmap' | 'codepage'
  /**
   * Code page for `codepage` mode: `cp864` (shaped forms), `win1256` (base
   * letters), or `auto` to let the app pick the page with the fewest gaps.
   */
  receiptArabicEncoding: 'cp864' | 'win1256' | 'auto'
  // Receipt design
  /** Overall receipt look: `classic`, `compact` (tighter, more lines) or `modern`. */
  receiptTemplate: 'classic' | 'compact' | 'modern'
  /** Line drawn between sections. */
  receiptDivider: 'dashed' | 'solid' | 'double' | 'none'
  /** Text size multiplier for the whole receipt (0.8 – 1.4). */
  receiptFontScale: number
  /** Logo width as a percentage of the paper width. */
  receiptLogoSize: number
  /** Print the logo as black and white instead of greyscale. */
  receiptLogoMono: boolean
  /** Print the address, phone, email and tax numbers under the store name. */
  receiptShowStoreDetails: boolean
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
  | 'modules'
