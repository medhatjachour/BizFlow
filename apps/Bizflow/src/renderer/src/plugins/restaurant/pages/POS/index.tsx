// src/pages/POS/index.tsx
import { useState, useEffect } from 'react'
import { useMenuCatalog } from './hooks/useMenuCatalog'
import { useActiveOrder } from './hooks/useActiveOrder'
import { PosHeader } from './components/PosHeader'
import { CategoryChips } from './components/CategoryChips'
import { MenuItemCard } from './components/MenuItemCard'
import { ActiveCartSidebar } from './components/ActiveCartSidebar'
import { ModifierSelectionModal } from './components/ModifierSelectionModal'
import { PaymentSplitModal } from './components/PaymentSplitModal'
import { SplitCheckModal } from './components/SplitCheckModal'
import { DiscountModal } from './components/DiscountModal'
import { ReceiptThermalPreview } from './components/ReceiptThermalPreview'
import { PosMenuItem, PosOrder } from './types'
import { sounds } from '../utils/sound'

interface Props {
  selectedTableOrder?: PosOrder | null
  onBackToFloor?: () => void
}

export default function PosOrderPadPage({ selectedTableOrder, onBackToFloor }: Props) {
  const [allOpenOrders, setAllOpenOrders] = useState<PosOrder[]>([])

  const {
    items,
    categories,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery
  } = useMenuCatalog()

  const {
    order,
    setOrder,
    activeSeat,
    setActiveSeat,
    addItemToOrder,
    updateItemQty,
    fireCourse,
    splitBySeats,
    applyDiscount,
    processPayment
  } = useActiveOrder(selectedTableOrder?.id)

  const loadOpenTickets = async () => {
    try {
      const list = await window.api.restaurant.getOrders({ status: 'open' })
      setAllOpenOrders(list || [])
      if (!order && list?.length) {
        setOrder(list[0])
      }
    } catch {}
  }

  useEffect(() => {
    loadOpenTickets()
  }, [])

  // Modals
  const [configuringItem, setConfiguringItem] = useState<PosMenuItem | null>(null)
  const [showDiscount, setShowDiscount] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showSplitCheck, setShowSplitCheck] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)

  return (
    <div className="space-y-3 h-[calc(100vh-140px)] flex flex-col select-none">
      {/* Top POS Header */}
      <PosHeader
        order={order}
        allOrders={allOpenOrders}
        onSelectOrder={(ord) => {
          sounds.playBump()
          setOrder(ord)
        }}
        onBackToFloor={onBackToFloor}
      />

      {/* Main 2-Column POS Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        {/* Left Column: Menu Browsing & Category Filters (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col space-y-3 min-h-0">
          <div className="flex items-center justify-between gap-2">
            <CategoryChips
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => {
                sounds.playBump()
                setSelectedCategory(cat)
              }}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />

            {/* Quick Active Seat Switcher */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0">
              <span className="text-[10px] font-black uppercase text-slate-400 px-2">Seat:</span>
              {[1, 2, 3, 4].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    sounds.playBump()
                    setActiveSeat(st)
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all ${
                    activeSeat === st
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  #{st}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Catalog Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {items.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onAddDirect={(it) => {
                    sounds.playSuccess()
                    addItemToOrder(it, 1, 'main', activeSeat)
                  }}
                  onConfigureModifiers={(it) => {
                    sounds.playBump()
                    setConfiguringItem(it)
                  }}
                />
              ))}

              {items.length === 0 && (
                <div className="col-span-full py-16 text-center text-slate-400 text-xs font-semibold">
                  No dishes found matching your selection
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Guest Pad (4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 h-full min-h-0">
          <ActiveCartSidebar
            order={order}
            activeSeat={activeSeat}
            onSelectSeat={setActiveSeat}
            onUpdateQty={updateItemQty}
            onFireCourse={fireCourse}
            onOpenDiscount={() => setShowDiscount(true)}
            onOpenPayment={() => setShowPayment(true)}
            onOpenSplitCheck={() => setShowSplitCheck(true)}
            onOpenReceiptPreview={() => setShowReceipt(true)}
          />
        </div>
      </div>

      {/* Modals Suite */}
      <ModifierSelectionModal
        isOpen={Boolean(configuringItem)}
        onClose={() => setConfiguringItem(null)}
        item={configuringItem}
        activeSeat={activeSeat}
        onConfirm={addItemToOrder}
      />

      <SplitCheckModal
        isOpen={showSplitCheck}
        onClose={() => setShowSplitCheck(false)}
        order={order}
        onSplitBySeats={splitBySeats}
      />

      <DiscountModal
        isOpen={showDiscount}
        onClose={() => setShowDiscount(false)}
        onApply={applyDiscount}
      />

      <PaymentSplitModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        order={order}
        onProcessPayment={processPayment}
      />

      <ReceiptThermalPreview
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        order={order}
      />
    </div>
  )
}