// src/pages/POS/index.tsx
import { useState } from 'react'
import { useMenuCatalog } from './hooks/useMenuCatalog'
import { CategoryChips } from './components/CategoryChips'
import { MenuItemCard } from './components/MenuItemCard'
import { ActiveCartSidebar } from './components/ActiveCartSidebar'
import { ModifierSelectionModal } from './components/ModifierSelectionModal'
import { PaymentSplitModal } from './components/PaymentSplitModal'
import { SplitCheckModal } from './components/SplitCheckModal'
import { DiscountModal } from './components/DiscountModal'
import { ReceiptThermalPreview } from './components/ReceiptThermalPreview'
import { useRestaurant } from '../../context/RestaurantContext'
import { PosMenuItem } from './types'
import { sounds } from '../utils/sound'
import { CheckCircle2, Printer, ArrowLeft } from 'lucide-react'

export default function PosOrderPadPage() {
  const {
    activeOrderData,
    activeSeat,
    addDraftItem,
    processOrderPayment,
    applyOrderDiscount,
    refreshActiveOrder,
    clearActiveSession,
    returnToFloor
  } = useRestaurant()

  const { items, categories, selectedCategory, setSelectedCategory, searchQuery, setSearchQuery } =
    useMenuCatalog()

  // Modal States
  const [configuringItem, setConfiguringItem] = useState<PosMenuItem | null>(null)
  const [showDiscount, setShowDiscount] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showSplitCheck, setShowSplitCheck] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)

  // Settlement Success Banner State
  const [settledChangeDue, setSettledChangeDue] = useState<number | null>(null)

  const handleDishCardClick = (item: PosMenuItem) => {
    sounds.playBump()
    if (item.modifierGroups && item.modifierGroups.length > 0) {
      setConfiguringItem(item)
    } else {
      addDraftItem(item, 1, 'main', activeSeat, [], '')
    }
  }

  const handleSettlementCompleted = (change: number) => {
    setSettledChangeDue(change)
  }

  const handleFinishSettlement = () => {
    setSettledChangeDue(null)
    clearActiveSession()
    returnToFloor()
  }

  return (
    <div className="h-[calc(100vh-140px)] grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 select-none">
      {/* Left Column: Menu Catalog (8 Cols) */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col space-y-3 min-h-0">
        <CategoryChips
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={(c) => {
            sounds.playBump()
            setSelectedCategory(c)
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Menu Cards */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {items.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                onAddDirect={handleDishCardClick}
                onConfigureModifiers={setConfiguringItem}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: 2-Tier Order Pad (4 Cols) */}
      <div className="lg:col-span-5 xl:col-span-4 h-full min-h-0">
        <ActiveCartSidebar
          onOpenDiscount={() => setShowDiscount(true)}
          onOpenPayment={() => setShowPayment(true)}
          onOpenSplitCheck={() => setShowSplitCheck(true)}
          onOpenReceiptPreview={() => setShowReceipt(true)}
        />
      </div>

      {/* ─── Settlement Success Screen ────────────────────────────── */}
      {settledChangeDue !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Check Settled Successfully!
              </h3>
              <p className="text-xs text-slate-400 mt-1">Payment processed and table cleared.</p>
            </div>

            {settledChangeDue > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700">
                <span className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-300 tracking-wider block">
                  Change Due to Patron
                </span>
                <span className="text-2xl font-black text-amber-700 dark:text-amber-400 block mt-0.5">
                  ${settledChangeDue.toFixed(2)}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReceipt(true)}
                className="py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-black flex items-center justify-center gap-1.5 hover:bg-slate-200"
              >
                <Printer className="w-4 h-4" />
                <span>Print Check</span>
              </button>

              <button
                type="button"
                onClick={handleFinishSettlement}
                className="py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Floor</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modals Suite ─────────────────────────────────────────── */}
      <ModifierSelectionModal
        isOpen={Boolean(configuringItem)}
        onClose={() => setConfiguringItem(null)}
        item={configuringItem}
        activeSeat={activeSeat}
        onConfirm={addDraftItem}
      />

      <SplitCheckModal
        isOpen={showSplitCheck}
        onClose={() => setShowSplitCheck(false)}
        order={activeOrderData}
        onSplitBySeats={async (seats) => {
          if (activeOrderData) {
            await window.api.restaurant.splitCheckBySeat({ orderId: activeOrderData.id, seatNumbers: seats })
            await refreshActiveOrder()
          }
        }}
      />

      <DiscountModal
        isOpen={showDiscount}
        onClose={() => setShowDiscount(false)}
        onApply={async (type, amt) => {
          await applyOrderDiscount(type, amt)
        }}
      />

      <PaymentSplitModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        order={activeOrderData}
        onProcessPayment={processOrderPayment}
        onSettlementSuccess={handleSettlementCompleted}
      />

      <ReceiptThermalPreview
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        order={activeOrderData}
      />
    </div>
  )
}