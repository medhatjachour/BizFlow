import { useState } from 'react'
import { X, Printer, Loader2 } from 'lucide-react'
import type { ReceiptData } from '../utils'
import {
  formatMoney,
  formatReceiptDate,
  getLabels,
  orderTypeLabelLocalized,
  paymentLabelLocalized,
  PAPER_CONFIG,
  truncateText,
} from '../utils'

interface Props {
  open: boolean
  data: ReceiptData | null
  onClose: () => void
  onPrint: () => void
  printing?: boolean
}

export function ReceiptPreview({ open, data, onClose, onPrint, printing }: Props) {
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm')

  if (!open || !data) return null

  const isAr = data.receiptLanguage === 'ar'
  const t = getLabels(data.receiptLanguage)
  const isRtl = isAr
  const config = PAPER_CONFIG[paperWidth]
  const charsPerLine = config.chars
  const previewWidth = config.previewWidth

  const isDelivery = data.orderType === 'delivery'
  const hasCustomer = data.customerName || data.customerPhone

  const qtyWidth = 4
  const amountWidth = 12
  const itemWidth = charsPerLine - qtyWidth - amountWidth
  const separator = '-'.repeat(charsPerLine)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {t.receiptPreview}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              #{data.receiptNumber}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Paper width toggle */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setPaperWidth('80mm')}
                className={`px-2 py-1 text-[10px] font-mono rounded transition-colors ${
                  paperWidth === '80mm'
                    ? 'bg-amber-500 text-white'
                    : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                80mm
              </button>
              <button
                onClick={() => setPaperWidth('58mm')}
                className={`px-2 py-1 text-[10px] font-mono rounded transition-colors ${
                  paperWidth === '58mm'
                    ? 'bg-amber-500 text-white'
                    : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                58mm
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Receipt paper */}
        <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 p-6 flex justify-center">
          <div
            dir={isRtl ? 'rtl' : 'ltr'}
            className="bg-white text-black shadow-lg px-4 py-3"
            style={{
              width: `${previewWidth}px`,
              fontFamily: "'Courier New', 'Courier', monospace",
              fontSize: '11px',
              lineHeight: '1.5',
            }}
          >
            {/* Logo */}
            {data.printLogo && data.storeLogo && (
              <div className="flex justify-center mb-2">
                <img
                  src={data.storeLogo}
                  alt="logo"
                  className="max-h-16 object-contain"
                  style={{ filter: 'grayscale(100%) contrast(1.2)' }}
                />
              </div>
            )}

            {/* Store name */}
            <div className="text-center font-bold text-sm uppercase tracking-wide">
              {data.storeName}
            </div>

            {/* Store info */}
            {data.storeAddress && (
              <div className="text-center text-[10px]">{data.storeAddress}</div>
            )}
            {data.storePhone && (
              <div className="text-center text-[10px]">
                {t.tel}: {data.storePhone}
              </div>
            )}
            {data.storeEmail && (
              <div className="text-center text-[10px]">{data.storeEmail}</div>
            )}

            {/* Tax info */}
            {(data.taxNumber || data.commercialRegister) && (
              <div className="text-center text-[10px] mt-1">
                {data.taxNumber && `${t.taxLabel}: ${data.taxNumber}`}
                {data.taxNumber && data.commercialRegister && ' · '}
                {data.commercialRegister && `${t.crLabel}: ${data.commercialRegister}`}
              </div>
            )}

            {/* Separator */}
            <div className="text-center my-1">{separator}</div>

            {/* Receipt meta */}
            <div>{data.receiptNumber}</div>
            <div>{formatReceiptDate(data.date)}</div>
            <div>
              {t.cashier}: {data.cashier}
            </div>

            {/* Order type badge */}
            <div className="text-center font-bold my-1 py-0.5 bg-black text-white">
              {orderTypeLabelLocalized(data.orderType, data.receiptLanguage)}
              {data.tableName && ` · ${t.table} ${data.tableName}`}
            </div>

            {/* Customer info */}
            {(hasCustomer || isDelivery) && (
              <div className="my-1">
                <div className="font-bold">
                  {isDelivery ? t.deliveryTo : t.customer}
                </div>
                {data.customerName && <div>{data.customerName}</div>}
                {data.customerPhone && <div>{data.customerPhone}</div>}
                {isDelivery && data.deliveryAddress && (
                  <div>{data.deliveryAddress}</div>
                )}
              </div>
            )}

            {/* Separator */}
            <div className="text-center my-1">{separator}</div>

            {/* Items header */}
            <div className="flex">
              <span style={{ width: `${qtyWidth}ch` }}>{t.qty}</span>
              <span style={{ flex: 1 }}>{t.item}</span>
              <span className="text-right" style={{ width: `${amountWidth}ch` }}>
                {t.amount}
              </span>
            </div>

            {/* Items */}
            {data.items.map((item, i) => {
              const itemName = truncateText(item.name, itemWidth - 1)
              const itemTotal = formatMoney(item.total)
              const hasPriceOverride = item.price !== item.total / item.quantity

              return (
                <div key={i} className="flex">
                  <span style={{ width: `${qtyWidth}ch` }}>{item.quantity}</span>
                  <span style={{ flex: 1 }}>
                    {itemName}
                    {hasPriceOverride && (
                      <span className="text-[9px] block">
                        @ {formatMoney(item.price)}
                      </span>
                    )}
                  </span>
                  <span className="text-right" style={{ width: `${amountWidth}ch` }}>
                    {itemTotal}
                  </span>
                </div>
              )
            })}

            {/* Separator */}
            <div className="text-center my-1">{separator}</div>

            {/* Totals */}
            <div className="flex justify-between">
              <span>{t.subtotal}</span>
              <span>{formatMoney(data.subtotal)}</span>
            </div>

            {data.discount > 0 && (
              <div className="flex justify-between">
                <span>{t.discount}</span>
                <span>−{formatMoney(data.discount)}</span>
              </div>
            )}

            {data.tax > 0 && (
              <div className="flex justify-between">
                <span>
                  {t.tax} ({data.taxRate}%)
                </span>
                <span>{formatMoney(data.tax)}</span>
              </div>
            )}

            {/* TOTAL — double height */}
            <div className="flex justify-between font-bold text-sm mt-1">
              <span>{t.total}</span>
              <span>{formatMoney(data.total)}</span>
            </div>

            {/* Payment */}
            <div className="text-center font-bold my-1 py-0.5 bg-black text-white">
              {t.paidVia} {paymentLabelLocalized(data.paymentMethod, data.receiptLanguage)}
            </div>

            {/* Notes */}
            {data.notes && (
              <div className="mt-1">
                <div className="font-bold">{t.notes}</div>
                <div>{data.notes}</div>
              </div>
            )}

            {/* Separator */}
            <div className="text-center my-1">{separator}</div>

            {/* Footer */}
            <div className="text-center mt-1">
              {isAr ? data.footerAr || t.thankYou : data.footer || t.thankYou}
            </div>

            {isAr && data.footer && (
              <div className="text-center text-[10px]">{data.footer}</div>
            )}

            {/* QR Code */}
            {data.printQRCode && (
              <div className="text-center mt-2 text-[10px]">
                <div>▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓</div>
                <div>▓▓ QR CODE ▓▓</div>
                <div>▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓</div>
              </div>
            )}

            {/* Barcode */}
            {data.printBarcode && (
              <div className="text-center mt-2 text-[10px]">
                <div>||||||| |||| ||||| || ||||| |||||</div>
                <div>{data.receiptNumber}</div>
              </div>
            )}

            {/* Powered by */}
            <div className="text-center text-[9px] mt-2 opacity-60">
              {t.poweredBy}
            </div>

            {/* Bottom spacing */}
            {Array.from({ length: data.receiptBottomSpacing || 4 }).map((_, i) => (
              <div key={i} className="text-[10px]">
                &nbsp;
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-3 p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={onPrint}
            disabled={printing}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            {printing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t.printing}
              </>
            ) : (
              <>
                <Printer size={16} />
                {t.printReceipt}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
