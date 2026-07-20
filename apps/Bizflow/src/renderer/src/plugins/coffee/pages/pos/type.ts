export interface Category { id: string; name: string; color?: string; icon?: string }
export interface Product  { id: string; name: string; price: number; image?: string; categoryId?: string; category?: Category; stock: number; isAvailable: boolean }
export interface CartItem { productId: string; productName: string; unitPrice: number; salePrice: number; quantity: number; notes?: string }
export interface CoffeeTable { id: string; number: number; name?: string; status: string; section?: string }
export interface CoffeeCustomer { id: string; name: string; phone?: string; email?: string; notes?: string }
export interface ReceiptSettings {
  storeName: string
  storeAddress: string
  storePhone: string
  storeEmail?: string
  taxNumber: string
  commercialRegister?: string
  printerType: 'none' | 'usb' | 'network' | 'html'
  printerName?: string
  printerIP?: string
  paperWidth: '58mm' | '80mm'
  receiptBottomSpacing?: number
  printLogo?: boolean
  printQRCode?: boolean
  printBarcode?: boolean
  receiptLanguage?: 'en' | 'ar'
  openCashDrawer?: boolean
}

export type OrderType     = 'dine_in' | 'takeaway' | 'delivery'
export type PaymentMethod = 'cash' | 'card' | 'vodafone_cash'
export type ViewMode      = 'grid' | 'quick'