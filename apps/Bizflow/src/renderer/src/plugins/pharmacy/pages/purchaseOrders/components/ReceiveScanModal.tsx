import React from 'react'
import { ScanLine, X, PackageCheck, AlertTriangle, Plus, Minus, Check, Loader2 } from 'lucide-react'
import { PurchaseOrderItem } from '../types'
import { inputCls } from '../../components/_shared'
import { Button } from '../../components/ui'
import { useReceiveVerification } from '../hooks/useReceiveVerification'

interface ReceiveScanModalProps {
  order: PurchaseOrderItem
  onClose: () => void
  onReceived: () => void
  toast: any
  t: (k: string) => string
}

export const ReceiveScanModal: React.FC<ReceiveScanModalProps> = ({
  order,
  onClose,
  onReceived,
  toast,
  t,
}) => {
  const {
    items,
    barcodeQuery,
    loading,
    busy,
    linesVerifiedCount,
    isFullyVerified,
    inputScanRef,
    setBarcodeQuery,
    orderedQtyFor,
    scannedQtyFor,
    adjustScanned,
    handleScanBarcode,
    commitReceiveIntoStock,
  } = useReceiveVerification(order, toast, t, onReceived)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2">
            <ScanLine size={17} className="text-emerald-500" />
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                Receive & Verify Shipment
              </h2>
              <p className="text-[11px] text-slate-400">
                PO #{order.orderNumber} · {linesVerifiedCount}/{items.length} lines verified
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {/* Scan Barcode Input Toolbar */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 bg-emerald-50/20 dark:bg-emerald-950/10">
          <div className="relative">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              ref={inputScanRef}
              value={barcodeQuery}
              onChange={e => setBarcodeQuery(e.target.value)}
              onKeyDown={handleScanBarcode}
              autoFocus
              placeholder="Scan medicine barcode (Enter) to verify..."
              className={`${inputCls} pl-9 text-xs font-semibold`}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Scan physical barcodes on boxes. Quantities will increment automatically.
          </p>
        </div>

        {/* Verification Lines List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 text-xs">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500 mb-1" />
              <p className="text-xs">Loading order lines...</p>
            </div>
          ) : items.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-10">This order contains no items.</p>
          ) : (
            items.map(it => {
              const ord = orderedQtyFor(it)
              const got = scannedQtyFor(it)
              const isComplete = got >= ord
              const isOver = got > ord

              return (
                <div
                  key={it.id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                    isComplete
                      ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40'
                  }`}
                >
                  <span
                    className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                      isComplete
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {isComplete ? <Check size={12} strokeWidth={3} /> : <span className="text-[10px] font-bold">{got}</span>}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{it.productName}</p>
                    <p className="text-[10px] text-slate-400">
                      Scanned: <strong className="text-slate-700 dark:text-slate-200">{got}</strong> / {ord} ordered
                      {isOver && <span className="text-amber-500 font-bold ml-1">(Over received)</span>}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => adjustScanned(it, -1)}
                      className="p-1 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <Minus size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustScanned(it, 1)}
                      className="p-1 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
          {!isFullyVerified && items.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
              <AlertTriangle size={13} className="shrink-0" />
              <span>Some items remain unverified. You can still accept full shipment into stock.</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              icon={PackageCheck}
              loading={busy}
              disabled={loading}
              onClick={commitReceiveIntoStock}
            >
              Receive into Inventory
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}