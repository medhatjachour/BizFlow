/**
 * useSettings Hook
 * Manages settings state with localStorage persistence
 */

import { useState, useCallback } from 'react'
import type { 
  StoreSettings, 
  TaxReceiptSettings, 
  NotificationSettings, 
  PaymentMethodSettings, 
  UserProfileSettings, 
  BackupSettings,
  DisplaySettings
} from './types'

export function useSettings() {
  // Store Settings
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => ({
    storeName: localStorage.getItem('storeName') || 'My Store',
    storePhone: localStorage.getItem('storePhone') || '',
    storeEmail: localStorage.getItem('storeEmail') || '',
    storeAddress: localStorage.getItem('storeAddress') || '',
    currency: localStorage.getItem('currency') || 'USD',
    timezone: localStorage.getItem('timezone') || 'UTC'
  }))

  // Tax & Receipt Settings
  const [taxReceiptSettings, setTaxReceiptSettings] = useState<TaxReceiptSettings>(() => {
    // Initialize allowDiscounts if not set
    if (localStorage.getItem('allowDiscounts') === null) {
      localStorage.setItem('allowDiscounts', 'true')
    }
    
    return {
      taxRate: parseFloat(localStorage.getItem('taxRate') || '10'),
      receiptHeader: localStorage.getItem('receiptHeader') || '',
      receiptFooter: localStorage.getItem('receiptFooter') || 'Thank you for your business!',
      autoPrint: localStorage.getItem('autoPrint') === 'true',
      includeLogo: localStorage.getItem('includeLogo') === 'true',
      refundPeriodDays: parseInt(localStorage.getItem('refundPeriodDays') || '30'),
      allowDiscounts: localStorage.getItem('allowDiscounts') === 'true',
      maxDiscountPercentage: parseFloat(localStorage.getItem('maxDiscountPercentage') || '50'),
      maxDiscountAmount: parseFloat(localStorage.getItem('maxDiscountAmount') || '100'),
      requireDiscountReason: true, // Always require reason
      includeCOGSInCalculations: localStorage.getItem('includeCOGSInCalculations') !== 'false', // Default to true
      // Store information for receipt
      storeName: localStorage.getItem('receiptStoreName') || localStorage.getItem('storeName') || 'My Store',
      storeAddress: localStorage.getItem('receiptStoreAddress') || localStorage.getItem('storeAddress') || '',
      storePhone: localStorage.getItem('receiptStorePhone') || localStorage.getItem('storePhone') || '',
      storeEmail: localStorage.getItem('receiptStoreEmail') || localStorage.getItem('storeEmail') || '',
      taxNumber: localStorage.getItem('taxNumber') || '',
      commercialRegister: localStorage.getItem('commercialRegister') || '',
      // Printer settings
      printerType: (localStorage.getItem('printerType') as 'none' | 'usb' | 'network' | 'html') || 'none',
      printerName: localStorage.getItem('printerName') || '',
      printerIP: localStorage.getItem('printerIP') || '',
      paperWidth: (localStorage.getItem('paperWidth') as '58mm' | '80mm') || '80mm',
      receiptBottomSpacing: parseInt(localStorage.getItem('receiptBottomSpacing') || '4'),
      printLogo: localStorage.getItem('printLogo') === 'true',
      printQRCode: localStorage.getItem('printQRCode') === 'true',
      printBarcode: localStorage.getItem('printBarcode') === 'true',
      openCashDrawer: localStorage.getItem('openCashDrawer') === 'true',
      receiptLanguage: (localStorage.getItem('receiptLanguage') as 'en' | 'ar') || 'en'
    }
  })

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() => ({
    notifications: localStorage.getItem('notifications') !== 'false',
    lowStockAlert: localStorage.getItem('lowStockAlert') === 'true',
    lowStockThreshold: parseInt(localStorage.getItem('lowStockThreshold') || '10'),
    salesNotifications: localStorage.getItem('salesNotifications') !== 'false',
    emailNotifications: localStorage.getItem('emailNotifications') !== 'false',
    emailAddress: localStorage.getItem('emailAddress') || undefined
  }))

  // Payment Methods
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSettings>(() => {
    const stored = localStorage.getItem('paymentMethods')
    return stored ? JSON.parse(stored) : {
      cash: true,
      credit: true,
      debit: true,
      mobile: true,
      giftCard: true
    }
  })

  // User Profile
  const [userProfile, setUserProfile] = useState<UserProfileSettings>(() => ({
    firstName: localStorage.getItem('firstName') || 'Admin',
    lastName: localStorage.getItem('lastName') || 'User',
    email: localStorage.getItem('userEmail') || 'admin@example.com',
    phone: localStorage.getItem('userPhone') || undefined,
    avatar: localStorage.getItem('avatar') || undefined
  }))

  // Backup Settings
  const [backupSettings, setBackupSettings] = useState<BackupSettings>(() => ({
    autoBackup: localStorage.getItem('autoBackup') !== 'false',
    backupFrequency: (localStorage.getItem('backupFrequency') as 'daily' | 'weekly' | 'monthly') || 'daily',
    backupLocation: localStorage.getItem('backupLocation') || undefined,
    keepBackups: parseInt(localStorage.getItem('keepBackups') || '7')
  }))

  // Display Settings
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(() => ({
    showImagesInProductCards: localStorage.getItem('showImagesInProductCards') !== 'false',
    showImagesInPOSCards: localStorage.getItem('showImagesInPOSCards') !== 'false',
    showImagesInInventory: localStorage.getItem('showImagesInInventory') !== 'false'
  }))

  // Save all settings to localStorage
  const saveSettings = useCallback(() => {
    // Store settings
    Object.entries(storeSettings).forEach(([key, value]) => {
      localStorage.setItem(key, String(value))
    })

    // Tax & Receipt settings
    Object.entries(taxReceiptSettings).forEach(([key, value]) => {
      localStorage.setItem(key, String(value))
    })

    // Notification settings
    Object.entries(notificationSettings).forEach(([key, value]) => {
      localStorage.setItem(key, String(value))
    })

    // Payment methods
    localStorage.setItem('paymentMethods', JSON.stringify(paymentMethods))

    // User profile
    Object.entries(userProfile).forEach(([key, value]) => {
      localStorage.setItem(key, String(value))
    })

    // Backup settings
    localStorage.setItem('autoBackup', String(backupSettings.autoBackup))
    localStorage.setItem('backupFrequency', backupSettings.backupFrequency)
    if (backupSettings.backupLocation) {
      localStorage.setItem('backupLocation', backupSettings.backupLocation)
    }
    localStorage.setItem('keepBackups', String(backupSettings.keepBackups))

    // Display settings
    localStorage.setItem('showImagesInProductCards', String(displaySettings.showImagesInProductCards))
    localStorage.setItem('showImagesInPOSCards', String(displaySettings.showImagesInPOSCards))
    localStorage.setItem('showImagesInInventory', String(displaySettings.showImagesInInventory))

    return true
  }, [storeSettings, taxReceiptSettings, notificationSettings, paymentMethods, userProfile, backupSettings, displaySettings])

  return {
    storeSettings,
    setStoreSettings,
    taxReceiptSettings,
    setTaxReceiptSettings,
    notificationSettings,
    setNotificationSettings,
    paymentMethods,
    setPaymentMethods,
    userProfile,
    setUserProfile,
    backupSettings,
    setBackupSettings,
    displaySettings,
    setDisplaySettings,
    saveSettings
  }
}
