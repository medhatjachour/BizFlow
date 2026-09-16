// src/pages/POS/components/ActiveCartSidebar.tsx
import React, { useState } from 'react'
import {
  Percent,
  CreditCard,
  Printer,
  Send,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  GitFork,
  Ban,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react'
import { useRestaurant } from '../../../context/RestaurantContext'
import { sounds } from '../../utils/sound'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { VoidReasonModal } from './VoidReasonModal'

interface Props {
  onOpenDiscount: () => void
  onOpenPayment: () => void
  onOpenSplitCheck: () => void
  onOpenReceiptPreview: () => void
}

interface VoidTarget {
  mode: 'item' | 'check'
  itemId?: string
  label?: string
  fired?: boolean
}

const round2 = (n: number): number => Math.round(n * 100) / 100

export const ActiveCartSidebar: React.FC<Props> = ({
  onOpenDiscount,
  onOpenPayment,
  onOpenSplitCheck,
  onOpenReceiptPreview
}) => {
  const { t } = useLanguage()
  const {
    activeTable,
    activeOrderData,
    activeShift,
    setCurrentView,
    draftItems,
    activeSeat,
    setActiveSeat,
    updateDraftItemQty,
    removeDraftItem,
    sendDraftsToKitchen,
    isSendingToKitchen,
    returnToFloor,
    voidLineItem,
    voidActiveOrder
  } = useRestaurant()

  const [voidTarget, setVoidTarget] = useState<VoidTarget | null>(null)
  const [isVoiding, setIsVoiding] = useState(false)

  const allItems: any[] = activeOrderData?.items || []
  const sentItems = allItems.filter((i) => i.status !== 'voided')
  const voidedItems = allItems.filter((i) => i.status === 'voided')

  const orderStatus: string | undefined = activeOrderData?.status
  const isClosed = orderStatus === 'paid' || orderStatus === 'voided'

  const draftSubtotal = round2(draftItems.reduce((s, i) => s + i.totalPrice, 0))
  const paidTotal = round2(
    (activeOrderData?.payments || []).reduce((s: number, p: any) => s + (p.amount || 0), 0)
  )
  const orderSubtotal = round2(activeOrderData?.subtotal ?? 0)
  const discountValue = round2(activeOrderData?.discountAmount ?? 0)
  const taxValue = round2(activeOrderData?.tax ?? 0)
  const serviceValue = round2(activeOrderData?.serviceCharge ?? 0)
  const orderTotal = round2(activeOrderData?.total ?? 0)
  const balanceDue = round2(Math.max(0, orderTotal - paidTotal))
  /** What the guest owes once the un-fired drafts are included. */
  const projectedTotal = round2(orderTotal + draftSubtotal)

  const orderTypeLabel =
    activeOrderData?.orderType === 'takeout'
      ? t('restPosOrderTypeTakeout')
      : activeOrderData?.orderType === 'delivery'
        ? t('restPosOrderTypeDelivery')
        : activeOrderData?.orderType === 'bar_tab'
          ? t('restPosOrderTypeBarTab')
          : t('restPosOrderTypeDineIn')

  const handleSend = async () => {
    sounds.playSuccess()
    await sendDraftsToKitchen()
  }

  const handleVoidConfirm = async (reasonLabel: string) => {
    if (!voidTarget) return
    setIsVoiding(true)
    try {
      const ok =
        voidTarget.mode === 'check'
          ? await voidActiveOrder(reasonLabel)
          : await voidLineItem(voidTarget.itemId as string, reasonLabel)
      if (ok) setVoidTarget(null)
    } finally {
      setIsVoiding(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col h-full overflow-hidden select-none">
      {/* ─── Check Header ─────────────────────────────────────────── */}
      <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={returnToFloor}
              className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              title={t('restPosReturnToFloor')}
              aria-label={t('restPosReturnToFloor')}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <span className="text-xs font-black text-slate-900 dark:text-white block truncate">
                {activeTable ? `${t('restPosTable')} #${activeTable.number}` : orderTypeLabel}
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                {t('restPosCheckLabel', { number: activeOrderData?.orderNumber || '1' })} •{' '}
                {t('restPosGuests', { count: activeOrderData?.guestCount || 2 })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {activeShift ? (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="w-3 h-3" />
                {t('restPosCurrentShift', { name: activeShift.serverName })}
              </span>
            ) : null}
            <button
              type="button"
              onClick={onOpenReceiptPreview}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              title={t('restPosPrintCheck')}
              aria-label={t('restPosPrintCheck')}
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── Seat Selector Strip ──────────────────────────────────── */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          <span className="text-[10px] font-black uppercase text-slate-400 mr-1">
            {t('restPosSeat')}:
          </span>
          {[1, 2, 3, 4, 5, 6].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                sounds.playBump()
                setActiveSeat(st)
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all shrink-0 ${
                activeSeat === st
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
              aria-label={t('restPosSplitSeatOption', { seat: st })}
            >
              S{st}
            </button>
          ))}
        </div>

        {/* A check taken without an open drawer never reaches the Z-report, so
            warn before money is taken rather than after. */}
        {!activeShift && (
          <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 space-y-1.5">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-[11px] font-black text-amber-900 dark:text-amber-300 block">
                  {t('restPosShiftWarningTitle')}
                </span>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400/90 leading-tight block">
                  {t('restPosShiftWarningBody')}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                sounds.playBump()
                setCurrentView('shifts')
              }}
              className="w-full py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black"
            >
              {t('restPosGoToShifts')}
            </button>
          </div>
        )}
      </div>

      {/* ─── Scrollable Items Pad (Drafts + Sent Items) ───────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* TIER 1: UN-SENT DRAFT ITEMS (STAGING) */}
        {draftItems.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                {t('restPosUnsentDrafts', { count: draftItems.length })}
              </span>
            </div>

            <div className="space-y-1.5">
              {draftItems.map((draft) => (
                <div
                  key={draft.clientId}
                  className="p-2.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-300/80 dark:border-amber-700/60 space-y-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {draft.itemName}
                        </span>
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                          {t('restPosSplitSeatOption', { seat: draft.seatNumber })}
                        </span>
                      </div>
                      {draft.modifiers.length > 0 && (
                        <div className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                          ↳ {draft.modifiers.map((m) => m.name).join(', ')}
                        </div>
                      )}
                      {draft.notes && (
                        <div className="text-[10px] text-slate-500 italic">“{draft.notes}”</div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
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
                        aria-label="-1"
                      >
                        -
                      </button>
                      <span className="font-black text-xs">{draft.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateDraftItemQty(draft.clientId, draft.quantity + 1)}
                        className="w-5 h-5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center"
                        aria-label="+1"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDraftItem(draft.clientId)}
                        className="p-1 text-rose-500 hover:text-rose-700 ml-1"
                        aria-label={t('restPosVoidItem')}
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

        {/* TIER 2: SENT ITEMS (ALREADY IN KITCHEN) */}
        {sentItems.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              {t('restPosSentItems', { count: sentItems.length })}
            </span>

            <div className="space-y-1.5">
              {sentItems.map((item: any) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {item.quantity}x {item.itemName}
                        </span>
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {t('restPosSplitSeatOption', { seat: item.seatNumber || 1 })}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase">
                        {item.status} ({item.station})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                        ${round2(item.unitPrice * item.quantity).toFixed(2)}
                      </span>
                      {!isClosed && (
                        <button
                          type="button"
                          onClick={() =>
                            setVoidTarget({
                              mode: 'item',
                              itemId: item.id,
                              label: `${item.quantity}x ${item.itemName}`,
                              fired: item.status !== 'pending'
                            })
                          }
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 hover:text-rose-700"
                          title={t('restPosVoidItem')}
                          aria-label={t('restPosVoidItem')}
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TIER 3: VOIDED LINES — kept visible so the void is auditable at the pass */}
        {voidedItems.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 px-1">
              {t('restPosVoidedItems', { count: voidedItems.length })}
            </span>
            <div className="space-y-1.5 opacity-70">
              {voidedItems.map((item: any) => (
                <div
                  key={item.id}
                  className="p-2 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-rose-900 dark:text-rose-300 line-through">
                      {item.quantity}x {item.itemName}
                    </span>
                    <span className="text-[10px] font-black text-rose-700 dark:text-rose-400">
                      ${round2(item.unitPrice * item.quantity).toFixed(2)}
                    </span>
                  </div>
                  {item.voidReason && (
                    <span className="text-[10px] font-bold text-rose-600/80 dark:text-rose-400/80">
                      {t('restPosVoidedReason', { reason: item.voidReason })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {draftItems.length === 0 && sentItems.length === 0 && voidedItems.length === 0 && (
          <div className="py-16 text-center text-slate-400 text-xs font-semibold">
            {t('restPosEmptyPad')}
          </div>
        )}
      </div>

      {/* ─── Financial Footer & Action Buttons ──────────────────────── */}
      <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 space-y-2.5">
        <div className="space-y-1 text-[11px] font-bold">
          <div className="flex justify-between text-slate-500">
            <span>{t('restPosSubtotal')}</span>
            <span className="font-black text-slate-700 dark:text-slate-300">
              ${orderSubtotal.toFixed(2)}
            </span>
          </div>

          {discountValue > 0 && (
            <div className="flex justify-between text-amber-600 dark:text-amber-400">
              <span>
                {t('restPosDiscount')}
                {activeOrderData?.discountType === 'percentage' ? ' (%)' : ''}
              </span>
              <span className="font-black">-${discountValue.toFixed(2)}</span>
            </div>
          )}

          {serviceValue > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>{t('restPosServiceCharge')}</span>
              <span className="font-black text-slate-700 dark:text-slate-300">
                ${serviceValue.toFixed(2)}
              </span>
            </div>
          )}

          <div className="flex justify-between text-slate-500">
            <span>
              {t('restPosTax')}
              {activeOrderData?.taxRate ? ` (${round2(activeOrderData.taxRate * 100)}%)` : ''}
            </span>
            <span className="font-black text-slate-700 dark:text-slate-300">
              ${taxValue.toFixed(2)}
            </span>
          </div>

          {draftSubtotal > 0 && (
            <div className="flex justify-between text-amber-600 dark:text-amber-400">
              <span>{t('restPosUnsentDraftsTotal')}</span>
              <span className="font-black">+${draftSubtotal.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between items-baseline pt-1 border-t border-slate-200 dark:border-slate-700">
            <span className="text-xs font-black text-slate-700 dark:text-slate-200">
              {t('restPosTotal')}
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-white">
              ${projectedTotal.toFixed(2)}
            </span>
          </div>

          {paidTotal > 0 && (
            <>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>{t('restPosPaid')}</span>
                <span className="font-black">-${paidTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-black text-rose-600 dark:text-rose-400">
                <span>{t('restPosBalanceDue')}</span>
                <span>${round2(balanceDue + draftSubtotal).toFixed(2)}</span>
              </div>
            </>
          )}
        </div>

        {isClosed ? (
          <div className="space-y-2">
            <div
              className={`p-3 rounded-2xl text-[11px] font-bold ${
                orderStatus === 'paid'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
              }`}
            >
              <span className="block font-black">
                {orderStatus === 'paid' ? t('restPosSettledBadge') : t('restPosVoidedBadge')}
              </span>
              <span className="block mt-0.5 leading-tight">
                {orderStatus === 'paid' ? t('restPosSettledHint') : t('restPosVoidedHint')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                sounds.playBump()
                returnToFloor()
              }}
              className="w-full py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black hover:bg-slate-100"
            >
              {t('restPosReturnToFloor')}
            </button>
          </div>
        ) : (
          <>
            {/* Big Action: "Send to Kitchen" if drafts exist, or "Pay / Settle" */}
            {draftItems.length > 0 ? (
              <button
                type="button"
                disabled={isSendingToKitchen}
                onClick={handleSend}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSendingToKitchen
                    ? t('restPosSending')
                    : t('restPosSendToKitchen', { count: draftItems.length })}
                </span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onOpenDiscount}
                  className="py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1 hover:bg-slate-100"
                >
                  <Percent className="w-3.5 h-3.5 text-amber-500" />
                  <span>{t('restPosDiscount')}</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenPayment}
                  className="py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 active:scale-[0.98]"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{t('restPosSettleCheck')}</span>
                </button>
              </div>
            )}

            {/* Secondary actions. Splitting needs at least one fired line and a
                void needs a parent check, so both are gated on sent items. */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={sentItems.length === 0}
                onClick={() => {
                  sounds.playBump()
                  onOpenSplitCheck()
                }}
                className="py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold flex items-center justify-center gap-1.5 hover:bg-slate-100 disabled:opacity-40"
              >
                <GitFork className="w-3.5 h-3.5 text-purple-500" />
                <span>{t('restPosSplitCheck')}</span>
              </button>
              <button
                type="button"
                disabled={sentItems.length === 0}
                onClick={() =>
                  setVoidTarget({
                    mode: 'check',
                    label: t('restPosCheckLabel', {
                      number: activeOrderData?.orderNumber || '1'
                    })
                  })
                }
                className="py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 text-[11px] font-bold flex items-center justify-center gap-1.5 hover:bg-rose-50 disabled:opacity-40"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{t('restPosVoidCheck')}</span>
              </button>
            </div>
          </>
        )}
      </div>

      <VoidReasonModal
        isOpen={Boolean(voidTarget)}
        mode={voidTarget?.mode || 'item'}
        subjectLabel={voidTarget?.label}
        alreadyFired={voidTarget?.fired}
        isSubmitting={isVoiding}
        onClose={() => setVoidTarget(null)}
        onConfirm={handleVoidConfirm}
      />
    </div>
  )
}
