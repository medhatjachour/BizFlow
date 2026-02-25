import React, { useEffect, useState } from 'react'
import { X, Printer } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'
import logger from '../../../../shared/utils/logger'

interface ReceiptPreviewModalProps {
  transaction: any
  onClose: () => void
}

export function ReceiptPreviewModal({ transaction, onClose }: ReceiptPreviewModalProps) {
  const { success, error } = useToast()
  const [settings, setSettings] = useState<any>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [autoPrintTriggered, setAutoPrintTriggered] = useState(false)

  // Load settings on mount
  useEffect(() => {
    // Load settings from localStorage
    const storeName = localStorage.getItem('storeName') || 'My Store'
    const storeAddress = localStorage.getItem('storeAddress') || ''
    const storePhone = localStorage.getItem('storePhone') || ''
    const storeEmail = localStorage.getItem('storeEmail') || ''
    const taxNumber = localStorage.getItem('taxNumber') || ''
    const commercialRegister = localStorage.getItem('commercialRegister') || ''
    const printerType = localStorage.getItem('printerType') || 'html'
    const printerName = localStorage.getItem('printerName') || ''
    const printerIP = localStorage.getItem('printerIP') || ''
    const paperWidth = localStorage.getItem('paperWidth') || '80mm'
    const receiptBottomSpacing = parseInt(localStorage.getItem('receiptBottomSpacing') || '4')
    const printLogo = localStorage.getItem('printLogo') === 'true'
    const printQRCode = localStorage.getItem('printQRCode') === 'true'
    const printBarcode = localStorage.getItem('printBarcode') === 'true'
    const autoPrint = localStorage.getItem('autoPrint') === 'true'
    const taxRate = parseFloat(localStorage.getItem('taxRate') || '10')

    const loadedSettings = {
      storeName,
      storeAddress,
      storePhone,
      storeEmail,
      taxNumber,
      commercialRegister,
      printerType,
      printerName,
      printerIP,
      paperWidth,
      receiptBottomSpacing,
      printLogo,
      printQRCode,
      printBarcode,
      autoPrint,
      taxRate
    }
    
    setSettings(loadedSettings)
  }, [])

  // Auto-print disabled - user should manually click Print button
  // useEffect(() => {
  //   if (settings && settings.autoPrint && !autoPrintTriggered && settings.printerType) {
  //     setAutoPrintTriggered(true)
  //     // Small delay to ensure modal is fully rendered
  //     setTimeout(() => {
  //       handlePrint()
  //     }, 300)
  //   }
  // }, [settings, autoPrintTriggered])

  const handlePrint = async () => {
    if (!settings) return
    
    setIsPrinting(true)
    try {
      // Prepare receipt data
      const receiptData = {
        // Store info
        storeName: settings.storeName,
        storeAddress: settings.storeAddress,
        storePhone: settings.storePhone,
        storeEmail: settings.storeEmail,
        taxNumber: settings.taxNumber,
        commercialRegister: settings.commercialRegister,

        // Transaction info
        receiptNumber: transaction.id.substring(0, 8).toUpperCase(),
        date: new Date(transaction.createdAt),
        paymentMethod: transaction.paymentMethod === 'cash' ? 'Cash' : 
                      transaction.paymentMethod === 'card' ? 'Card' : 
                      transaction.paymentMethod === 'installment' ? 'Installment' : 'Other',

        // User who made the sale
        username: transaction.user?.username || transaction.user?.fullName || 'Unknown',

        // Customer
        customerName: transaction.Customer?.name || transaction.customerName || 'Walk-in Customer',        customerPhone: transaction.Customer?.phone || transaction.customer?.phone || null,
        // Items
        items: (transaction.items || []).map((item: any) => ({
          name: item.product?.name || item.ProductVariant?.Product?.name || 'Unknown Product',
          quantity: item.quantity,
          price: item.price,
          total: item.quantity * item.price,
          discountType: item.discountType,
          discountValue: item.discountValue,
          finalPrice: item.finalPrice
        })),

        // Totals
        subtotal: transaction.subtotal,
        tax: transaction.tax,
        taxRate: settings.taxRate,
        total: transaction.total,
        
        // Installments
        installments: transaction.installments?.map((inst: any) => ({
          amount: inst.amount,
          dueDate: new Date(inst.dueDate),
          status: inst.status
        })),
        depositAmount: transaction.deposits?.[0]?.amount
      }

      const shouldForceThermal = settings.printerType === 'none' || settings.printerType === 'html'
      const effectiveSettings = shouldForceThermal
        ? { ...settings, printerType: 'usb' }
        : settings

      // Print via IPC (auto-detect thermal on first print or fallback)
      const result = await window.api.thermalReceipts.print({
        receiptData,
        settings: effectiveSettings
      })

      if (result.success) {
        // If printer was auto-detected, save it to localStorage
        if (result.detectedPrinter) {
          localStorage.setItem('printerName', result.detectedPrinter)
          localStorage.setItem('printerType', 'usb')
          success(result.message || 'Receipt printed successfully (printer auto-detected)')
        } else {
          if (shouldForceThermal) {
            localStorage.setItem('printerType', 'usb')
          }
          success('Receipt printed successfully')
        }
      } else {
        error(result.error || 'Failed to print receipt')
        if (shouldForceThermal) {
          handleBrowserPrint()
        }
      }
    } catch (err: any) {
      logger.error('Print error:', err)
      error(err.message || 'Failed to print receipt')
      if (settings.printerType === 'none' || settings.printerType === 'html') {
        handleBrowserPrint()
      }
    } finally {
      setIsPrinting(false)
    }
  }

  const handleBrowserPrint = () => {
    window.print()
  }

  // Don't render until settings are loaded
  if (!settings) {
    return (
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-center mt-4 text-slate-600 dark:text-slate-400">Loading receipt...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Receipt Preview</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors text-slate-600 dark:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900">
          <div 
            className="bg-white shadow-lg mx-auto p-6 text-sm font-mono text-black"
            style={{ width: settings.paperWidth === '80mm' ? '302px' : '203px' }}
            id="receipt-preview"
          >
            {/* Store Name */}
            <div className="text-center mb-4">
              <h1 className="text-xl font-bold mb-1">{settings.storeName}</h1>
              <p className="text-xs">{settings.storeAddress}</p>
              <p className="text-xs">Tel: {settings.storePhone}</p>
              {settings.storeEmail && <p className="text-xs">{settings.storeEmail}</p>}
            </div>

            {/* Tax Info */}
            <div className="border-t border-b border-gray-300 py-2 mb-3 text-xs">
              <p>Tax No: {settings.taxNumber}</p>
              {settings.commercialRegister && <p>Comm Reg: {settings.commercialRegister}</p>}
            </div>

            {/* Receipt Details */}
            <div className="mb-3 text-xs space-y-1">
              <p>Receipt #: {transaction.id.substring(0, 8).toUpperCase()}</p>
              <p>Date: {new Date(transaction.createdAt).toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}</p>
              <p>Cashier: {transaction.user?.username || transaction.user?.fullName || 'Unknown'}</p>
              <p>Customer: {transaction.Customer?.name || transaction.customerName || 'Walk-in Customer'}</p>              {(transaction.Customer?.phone || transaction.customer?.phone) && (
                <p>Phone: {transaction.Customer?.phone || transaction.customer?.phone}</p>
              )}            </div>

            {/* Items Table */}
            <div className="border-t border-b border-gray-300 py-2 mb-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left pb-1">Item</th>
                    <th className="text-center pb-1">Qty</th>
                    <th className="text-center pb-1">Price</th>
                    <th className="text-right pb-1">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(transaction.items || []).map((item: any, idx: number) => {
                    const hasDiscount = item.discountType && item.discountType !== 'NONE' && item.discountValue > 0
                    
                    // item.price is the FINAL price after discount
                    // Calculate original price based on discount type
                    let originalPrice = item.price
                    let itemDiscount = 0
                    
                    if (hasDiscount) {
                      if (item.discountType === 'PERCENTAGE') {
                        // If final = original * (1 - discount%), then original = final / (1 - discount%)
                        originalPrice = item.price / (1 - item.discountValue / 100)
                        itemDiscount = (originalPrice * item.quantity) - (item.price * item.quantity)
                      } else {
                        // Fixed discount: original = final + discount
                        originalPrice = item.price + (item.discountValue / item.quantity)
                        itemDiscount = item.discountValue
                      }
                    }
                    
                    const originalTotal = originalPrice * item.quantity
                    const finalTotal = item.price * item.quantity
                    
                    return (
                      <React.Fragment key={idx}>
                        <tr className="border-b border-dashed border-gray-200">
                          <td className="text-left py-1">{item.product?.name || item.ProductVariant?.Product?.name || 'Unknown Product'}</td>
                          <td className="text-center py-1">{item.quantity}</td>
                          <td className="text-center py-1">{originalPrice.toFixed(2)}</td>
                          <td className="text-right py-1">{originalTotal.toFixed(2)} EGP</td>
                        </tr>
                        {hasDiscount && (
                          <tr className="border-b border-dashed border-gray-200 text-red-600">
                            <td className="text-left py-1 text-xs">After Discount: {finalTotal.toFixed(2)} EGP</td>
                            <td colSpan={2} className="text-center py-1 text-xs italic">
                              {item.discountType === 'PERCENTAGE' ? `${item.discountValue}% off` : 'Fixed Discount'}
                            </td>
                            <td className="text-right py-1">-{itemDiscount.toFixed(2)} EGP</td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="text-xs space-y-1 mb-3">
              <div className="flex justify-between">
                <span className="font-bold">Subtotal:</span>
                <span>{transaction.subtotal.toFixed(2)} EGP</span>
              </div>
              <div className="flex justify-between">
                <span>VAT ({settings.taxRate }%):</span>
                <span>{transaction.tax.toFixed(2)} EGP</span>
              </div>
              <div className="flex justify-between border-t border-gray-300 pt-1 text-base font-bold">
                <span>TOTAL:</span>
                <span>{transaction.total.toFixed(2)} EGP</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="text-center text-xs mb-3">
              <p>Payment: {
                transaction.paymentMethod === 'cash' ? 'Cash' :
                transaction.paymentMethod === 'card' ? 'Card' :
                transaction.paymentMethod === 'installment' ? 'Installment' : 'Other'
              }</p>
            </div>

            {/* Installment Details */}
            {transaction.installments && transaction.installments.length > 0 && (
              <div className="border-t border-gray-300 pt-3 mb-3">
                <p className="text-xs font-bold mb-2 text-center">INSTALLMENT PLAN</p>
                {transaction.deposits && transaction.deposits.length > 0 && (
                  <div className="text-xs mb-2 bg-gray-100 p-2 rounded">
                    <div className="flex justify-between">
                      <span>Deposit Paid:</span>
                      <span className="font-bold">{transaction.deposits[0].amount.toFixed(2)} EGP</span>
                    </div>
                  </div>
                )}
                <div className="text-xs space-y-1">
                  {transaction.installments.map((inst: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center py-1 border-b border-dashed border-gray-200">
                      <span>Payment {idx + 1}: {new Date(inst.dueDate).toLocaleDateString()}</span>
                      <span className={`font-bold ${inst.status === 'paid' ? 'text-green-600' : inst.status === 'overdue' ? 'text-red-600' : ''}`}>
                        {inst.amount.toFixed(2)} EGP {inst.status === 'paid' ? '✓' : ''}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 font-bold">
                    <span>Remaining:</span>
                    <span>{transaction.installments.filter((i: any) => i.status !== 'paid').reduce((sum: number, i: any) => sum + i.amount, 0).toFixed(2)} EGP</span>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-xs border-t border-gray-300 pt-3">
              <p>Thank you for your visit!</p>
              <p>We appreciate your business</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleBrowserPrint}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded transition-colors font-medium"
          >
            <Printer className="w-4 h-4" />
            Print (Browser)
          </button>
          
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white rounded transition-colors font-medium"
          >
            <Printer className="w-4 h-4" />
            {isPrinting ? 'Printing...' : 'Print (Thermal)'}
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-preview, #receipt-preview * {
            visibility: visible;
          }
          #receipt-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
