import { useState, useEffect } from 'react'
import { useMenuCatalog } from './hooks/useMenuCatalog'
import { useActiveOrder } from './hooks/useActiveOrder'
import { PosHeader } from './components/PosHeader'
import { CategoryChips } from './components/CategoryChips'
import { MenuItemCard } from './components/MenuItemCard'
import { ActiveCartSidebar } from './components/ActiveCartSidebar'
import { ModifierSelectionModal } from './components/ModifierSelectionModal'
import { PaymentSplitModal } from './components/PaymentSplitModal'
import { DiscountModal } from './components/DiscountModal'
import { ReceiptThermalPreview } from './components/ReceiptThermalPreview'
import { PosMenuItem, PosOrder } from './types'

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
    setSearchQuery,
    
  } = useMenuCatalog()

  const {
    order,
    setOrder,
    addItemToOrder,
    updateItemQty,
    updateItemStatus,
    fireCourse,
    applyDiscount,
    processPayment,
    voidOrder
  } = useActiveOrder(selectedTableOrder?.id)

  // Load all open tickets for switching
  const loadOpenTickets = async () => {
    try {
      const list = await window.api.restaurant.getOrders({ status: 'open' })
      setAllOpenOrders(list || [])
      if (!order && list?.length) {
        setOrder(list[0])
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadOpenTickets()
  }, [])

  // Modals
  const [configuringItem, setConfiguringItem] = useState<PosMenuItem | null>(null)
  const [showDiscount, setShowDiscount] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)

  return (
    <div className="space-y-3 h-[calc(100vh-140px)] flex flex-col">
      {/* Top POS Header with Table Switcher */}
      <PosHeader
        order={order}
        allOrders={allOpenOrders}
        onSelectOrder={setOrder}
        onBackToFloor={onBackToFloor}
      />

      {/* Main 2-Column POS Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        {/* Left Column: Menu Catalog Browser (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col space-y-3 min-h-0">
          <CategoryChips
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          {/* Menu Items Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {items.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onAddDirect={(it) => addItemToOrder(it, 1, 'main')}
                  onConfigureModifiers={setConfiguringItem}
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

        {/* Right Column: Ticket Pad & Calculations (4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 h-full min-h-0">
          <ActiveCartSidebar
            order={order}
            onUpdateQty={updateItemQty}
            onUpdateStatus={updateItemStatus}
            onFireCourse={fireCourse}
            onOpenDiscount={() => setShowDiscount(true)}
            onOpenPayment={() => setShowPayment(true)}
            onVoidOrder={() => voidOrder('Voided by cashier')}
            onOpenReceiptPreview={() => setShowReceipt(true)}
          />
        </div>
      </div>

      {/* Modals */}
      <ModifierSelectionModal
        isOpen={Boolean(configuringItem)}
        onClose={() => setConfiguringItem(null)}
        item={configuringItem}
        onConfirm={addItemToOrder}
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