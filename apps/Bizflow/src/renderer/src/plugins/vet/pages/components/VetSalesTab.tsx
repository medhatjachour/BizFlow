import { useState, useEffect } from 'react'
import SaleOperation from './sales/SaleOperation'

// The Sales History view lives in its own file but is re-exported here so the
// vet pages index can keep importing `{ SalesHistory }` from this module.
export { SalesHistory } from './sales/SalesHistory'

// ── Main Tab ──────────────────────────────────────────────────────────────────

export default function VetSalesTab({ onCartCountChange }: { onCartCountChange?: (n: number) => void } = {}) {
  const [cartCount, setCartCount] = useState(0)

  // Bubble the cart size to the parent vet page so it can guard main-tab navigation.
  useEffect(() => { onCartCountChange?.(cartCount) }, [cartCount, onCartCountChange])

  // Sales History now lives in its own top-level vet tab, so this tab is just
  // the point-of-sale operation.
  return (
    <div className="flex flex-col h-full min-h-0">
      <SaleOperation onSaleRecorded={() => {}} onCartCountChange={setCartCount} />
    </div>
  )
}
