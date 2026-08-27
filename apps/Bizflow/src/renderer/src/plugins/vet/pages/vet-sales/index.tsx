import React, { useState, useEffect } from 'react'
import { PanelRightOpen } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'

import { useVetCatalog } from './hooks/useVetCatalog'
import { useVetCart } from './hooks/useVetCart'
import { useCustomerSearch } from './hooks/useCustomerSearch'
import type { MedicineLite, CartItem, SaleSubmitPayload } from './types'
import { getFefoBatch } from './utils'

import { CatalogToolbar } from './components/CatalogToolbar'
import { MedicineGrid } from './components/MedicineGrid'
import { CartSidebar } from './components/CartSidebar'
import { ItemConfigModal } from './components/ItemConfigModal'
import VetOwnerFormModal from '../vet-owners/components/VetOwnerFormModal'

export default function VetSalesTab({
  onCartCountChange
}: {
  onCartCountChange?: (count: number) => void
}) {
  const toast = useToast()
  const { t } = useLanguage()

  // Catalog State
  const {
    filteredMedicines,
    medicines,
    categories,
    categoryCounts,
    loading,
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    quickFilter,
    setQuickFilter,
    viewMode,
    setViewMode,
    refreshCatalog
  } = useVetCatalog()

  // Cart State
  const {
    cart,
    quickAdd,
    upsertItem,
    removeItem,
    adjustQty,
    clearCart,
    totals,
    getCommittedBatchQty
  } = useVetCart()

  // Customer State
  const {
    customerSearch,
    setCustomerSearch,
    selectedCustomer,
    setSelectedCustomer,
    customerResults,
    searching: customerSearching,
    dropdownOpen: customerDropdownOpen,
    setDropdownOpen: setCustomerDropdownOpen,
    clearCustomer
  } = useCustomerSearch()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [configuringMed, setConfiguringMed] = useState<MedicineLite | null>(null)
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null)
  const [showOwnerModal, setShowOwnerModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    onCartCountChange?.(cart.length)
  }, [cart.length, onCartCountChange])

  // Prevent accidental close with non-empty cart
  useEffect(() => {
    if (cart.length === 0) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [cart.length])

  // Global Keyboard Shortcuts (F2 Focus Search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        document.querySelector<HTMLInputElement>('input[placeholder*="Search"]')?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSelectMedicine = (med: MedicineLite) => {
    const fefo = getFefoBatch(med.batches)
    const hasSubUnit = Boolean(med.subUnit && med.subUnitsPerContainer)

    if (!hasSubUnit && fefo && fefo.quantity >= 1) {
      const added = quickAdd(med, fefo)
      if (added) {
        toast.success(`${med.name} added`)
      } else {
        toast.error('Insufficient stock in earliest batch')
      }
      return
    }

    setEditingCartItem(null)
    setConfiguringMed(med)
  }

  const handleCheckoutSubmit = async (payload: SaleSubmitPayload) => {
    if (cart.length === 0) {
      toast.error('Your cart is empty')
      return
    }

    setSubmitting(true)
    try {
      await (window as any).api?.vet?.medicines?.sellCombo({
        ...payload,
        items: cart.map(ci => ({
          medicineId: ci.medicine.id,
          batchId: ci.batch.id,
          quantity: parseFloat(ci.quantity),
          unitPrice: parseFloat(ci.unitPrice) || 0,
          discount: parseFloat(ci.discount) || 0,
          saleUnit: ci.saleUnit
        }))
      })

      toast.success(t('vetSaleRecorded') || 'Sale completed successfully')
      clearCart()
      clearCustomer()
      refreshCatalog()
    } catch (err: any) {
      toast.error(err?.message || 'Sale execution failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden bg-slate-100/60 dark:bg-slate-950">
      {/* ── Left Column: Pharmacy Catalog ─────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        <CatalogToolbar
          search={search}
          onSearchChange={setSearch}
          categories={categories}
          categoryCounts={categoryCounts}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          quickFilter={quickFilter}
          onQuickFilterChange={setQuickFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          totalShowing={filteredMedicines.length}
          totalAll={medicines.length}
        />

        <MedicineGrid
          medicines={filteredMedicines}
          cart={cart}
          loading={loading}
          viewMode={viewMode}
          onSelectMedicine={handleSelectMedicine}
        />
      </div>

      {/* ── Collapsed Cart Tab Trigger ─────────────────────────────────── */}
      {!sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="w-12 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center justify-center gap-2 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors shrink-0"
        >
          <PanelRightOpen className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          {cart.length > 0 && (
            <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-[11px] font-black flex items-center justify-center shadow-xs">
              {cart.length}
            </span>
          )}
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 [writing-mode:vertical-rl] rotate-180">
            Open Cart
          </span>
        </button>
      )}

      {/* ── Right Column: POS Cart & Checkout Hub ─────────────────────── */}
      {sidebarOpen && (
        <CartSidebar
          cart={cart}
          cartTotals={totals}
          isSubmitting={submitting}
          selectedCustomer={selectedCustomer}
          customerSearch={customerSearch}
          customerResults={customerResults}
          customerSearching={customerSearching}
          customerDropdownOpen={customerDropdownOpen}
          onEditItem={item => {
            setEditingCartItem(item)
            setConfiguringMed(item.medicine)
          }}
          onRemoveItem={removeItem}
          onAdjustQty={adjustQty}
          onClearCart={clearCart}
          onHideSidebar={() => setSidebarOpen(false)}
          onCustomerSearchChange={setCustomerSearch}
          onSelectCustomer={c => {
            setSelectedCustomer(c)
            setCustomerSearch('')
            setCustomerDropdownOpen(false)
          }}
          onClearCustomer={clearCustomer}
          setCustomerDropdownOpen={setCustomerDropdownOpen}
          onOpenNewCustomerModal={() => setShowOwnerModal(true)}
          onSubmitSale={handleCheckoutSubmit}
        />
      )}

      {/* ── Modals ────────────────────────────────────────────────────── */}
      {configuringMed && (
        <ItemConfigModal
          medicine={configuringMed}
          editingItem={editingCartItem}
          committedBatchQty={getCommittedBatchQty(
            editingCartItem?.batch?.id ?? '',
            editingCartItem?.saleUnit ?? 'container',
            configuringMed.subUnitsPerContainer ?? 1,
            editingCartItem?.id
          )}
          onSave={item => {
            upsertItem(item)
            setConfiguringMed(null)
            setEditingCartItem(null)
          }}
          onClose={() => {
            setConfiguringMed(null)
            setEditingCartItem(null)
          }}
        />
      )}

      {showOwnerModal && (
        <VetOwnerFormModal
          onSave={owner => {
            setSelectedCustomer({ id: owner.id, name: owner.name, phone: owner.phone })
            setShowOwnerModal(false)
          }}
          onClose={() => setShowOwnerModal(false)}
        />
      )}
    </div>
  )
}