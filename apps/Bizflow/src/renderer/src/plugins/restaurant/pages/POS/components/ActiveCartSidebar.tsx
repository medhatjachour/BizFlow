// src/pages/POS/components/ActiveCartSidebar.tsx
import React from 'react'
import {
  Percent,
  CreditCard,
  Printer,
  Send,
  Trash2,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react'
import { useRestaurant } from '../../../context/RestaurantContext'
import { sounds } from '../../utils/sound'

interface Props {
  onOpenDiscount: () => void
  onOpenPayment: () => void
  onOpenSplitCheck: () => void
  onOpenReceiptPreview: () => void
}

export const ActiveCartSidebar: React.FC<Props> = ({
  onOpenDiscount,
  onOpenPayment,
  onOpenReceiptPreview
}) => {
  const {
      activeTable,
      activeOrderData,
    draftItems,
    activeSeat,
    setActiveSeat,
    updateDraftItemQty,
    removeDraftItem,
    sendDraftsToKitchen,
    isSendingToKitchen,
    returnToFloor
  } = useRestaurant()

  const sentItems = (activeOrderData?.items || []).filter((i: any) => i.status !== 'voided')

  // Calculate live combined subtotal (Sent items in DB + Local Draft items)
  const sentSubtotal = sentItems.reduce((s: number, i: any) => s + (i.totalPrice || i.unitPrice * i.quantity), 0)
  const draftSubtotal = draftItems.reduce((s: number, i: any) => s + i.totalPrice, 0)
  const combinedTotal = (activeOrderData?.total || sentSubtotal) + draftSubtotal

  const handleSend = async () => {
    sounds.playSuccess()
    await sendDraftsToKitchen()
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col h-full overflow-hidden select-none">
      {/* ─── Check Header ─────────────────────────────────────────── */}
      <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={returnToFloor}
              className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              title="Return to floor plan"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <span className="text-xs font-black text-slate-900 dark:text-white block">
                {activeTable ? `Table #${activeTable.number}` : activeOrderData?.orderType?.toUpperCase() || 'Quick Check'}
              </span>
              <span className="text-[10px] text-slate-400">
                Check #{activeOrderData?.orderNumber || '1'} • {activeOrderData?.guestCount || 2} Guests
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenReceiptPreview}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── Seat Selector Strip ──────────────────────────────────── */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          <span className="text-[10px] font-black uppercase text-slate-400 mr-1">Seat:</span>
          {[1, 2, 3, 4, 5, 6].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                sounds.playBump()
                setActiveSeat(st)
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all ${
                activeSeat === st
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              S{st}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Scrollable Items Pad (Drafts + Sent Items) ───────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* TIER 1: UN-SENT DRAFT ITEMS (STAGING) */}
        {draftItems.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Unsent Kitchen Drafts ({draftItems.length})
              </span>
            </div>

            <div className="space-y-1.5">
              {draftItems.map((draft) => (
                <div
                  key={draft.clientId}
                  className="p-2.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-300/80 dark:border-amber-700/60 space-y-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {draft.itemName}
                        </span>
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                          Seat {draft.seatNumber}
                        </span>
                      </div>
                      {draft.modifiers.length > 0 && (
                        <div className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                          ↳ {draft.modifiers.map((m) => m.name).join(', ')}
                        </div>
                      )}
                      {draft.notes && (
                        <div className="text-[10px] text-slate-500 italic">
                          Note: "{draft.notes}"
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        ${draft.totalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-amber-200/60 dark:border-amber-800/40 text-xs">
                    <span className="text-[10px] font-bold text-amber-600 uppercase">
                      {draft.course}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateDraftItemQty(draft.clientId, draft.quantity - 1)}
                        className="w-5 h-5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="font-black text-xs">{draft.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateDraftItemQty(draft.clientId, draft.quantity + 1)}
                        className="w-5 h-5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDraftItem(draft.clientId)}
                        className="p-1 text-rose-500 hover:text-rose-700 ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TIER 2: LOCKED SENT ITEMS (ALREADY IN KITCHEN) */}
        {sentItems.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Sent to Kitchen ({sentItems.length})
            </span>

            <div className="space-y-1.5 opacity-85">
              {sentItems.map((item: any) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {item.quantity}x {item.itemName}
                        </span>
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          Seat {item.seatNumber || 1}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase">
                        {item.status} ({item.station})
                      </span>
                    </div>

                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                      ${(item.unitPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {draftItems.length === 0 && sentItems.length === 0 && (
          <div className="py-16 text-center text-slate-400 text-xs font-semibold">
            Check pad is empty. Tap dishes from the menu to add.
          </div>
        )}
      </div>

      {/* ─── Financial Footer & Action Buttons ──────────────────────── */}
      <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 space-y-2.5">
        <div className="flex justify-between items-baseline">
          <span className="text-xs font-bold text-slate-500">Estimated Total</span>
          <span className="text-xl font-black text-slate-900 dark:text-white">
            ${combinedTotal.toFixed(2)}
          </span>
        </div>

        {/* Big Action: "Send to Kitchen" if drafts exist, or "Pay / Settle" */}
        {draftItems.length > 0 ? (
          <button
            type="button"
            disabled={isSendingToKitchen}
            onClick={handleSend}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <Send className="w-4 h-4" />
            <span>{isSendingToKitchen ? 'Sending...' : `SEND TO KITCHEN (${draftItems.length} ITEMS)`}</span>
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onOpenDiscount}
              className="py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1 hover:bg-slate-100"
            >
              <Percent className="w-3.5 h-3.5 text-amber-500" />
              <span>Discount</span>
            </button>
            <button
              type="button"
              onClick={onOpenPayment}
              className="py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 active:scale-[0.98]"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Settle Check</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}