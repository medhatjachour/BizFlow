import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PosMenuItem, PosOrder } from '@renderer/plugins/restaurant/pages/POS/types'
import type { VetFollowUpRecord } from '@renderer/plugins/vet/pages/vet-followups/types'
import type { VetSessionRecord } from '@renderer/plugins/vet/pages/vet-sessions/types'
import { ModifierSelectionModal } from '@renderer/plugins/restaurant/pages/POS/components/ModifierSelectionModal'
import { PaymentSplitModal } from '@renderer/plugins/restaurant/pages/POS/components/PaymentSplitModal'
import { RescheduleFollowUpModal } from '@renderer/plugins/vet/pages/vet-followups/components/RescheduleFollowUpModal'
import { QuickPaymentModal } from '@renderer/plugins/vet/pages/vet-sessions/components/QuickPaymentModal'

/**
 * Regression tests for hooks that were called after an early `return null`.
 *
 * Measured behaviour of React 18.3.1, which is what makes these worth testing:
 *
 *   0 -> N hooks    no error  (the append path is clean, nothing to compare)
 *   N -> 0 hooks    no error  (no hook is called, so no comparison happens)
 *   N -> M, M > N   throws    "Rendered more hooks than during the previous render."
 *   N -> M, M < N   throws    "Rendered fewer hooks than expected. This may be
 *                             caused by an accidental early return statement."
 *
 * So only components that call hooks on BOTH sides of the guard can actually
 * break. Two did:
 *
 *   RescheduleFollowUpModal  useLanguage() then guard then 2x useState -> 1 vs 3
 *   QuickPaymentModal        useToast+useLanguage then guard then 2x useState -> 2 vs 4
 *
 * Those are reproduced below. Both are mounted conditionally by their callers
 * today, so the transition is not reachable from the current UI -- they fire the
 * moment anything renders them with a null record, which is exactly the kind of
 * change a modal refactor makes.
 *
 * The other offenders (ModifierSelectionModal, PaymentSplitModal,
 * StockAlertBanner, the coffee drawers) called every hook AFTER the guard, so
 * they are 0 <-> N and do not throw today. They are still Rules-of-Hooks
 * violations, and they are one added hook above the guard away from throwing, so
 * they were fixed too. Their tests below assert behaviour, not crashes.
 */

// These mocks MUST occupy a hook slot, exactly like the real implementations do.
// A plain `() => ({...})` stub registers zero hooks, which collapses the
// reproduction to 0 -> N (which React tolerates) and hides the bug entirely.
vi.mock('@renderer/contexts/LanguageContext', async () => {
  const { useState } = await import('react')
  return {
    useLanguage: () => {
      useState(0)
      return { t: (key: string) => key, language: 'en' }
    }
  }
})

vi.mock('@renderer/contexts/ToastContext', async () => {
  const { useState } = await import('react')
  return {
    useToast: () => {
      useState(0)
      return { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }
    }
  }
})

vi.mock('@renderer/plugins/restaurant/pages/utils/sound', () => ({
  sounds: { playBump: vi.fn(), playError: vi.fn(), playSuccess: vi.fn() }
}))

const followUp: VetFollowUpRecord = {
  id: 'fu-1',
  visitDate: '2026-09-01',
  visitType: 'checkup',
  followUpDate: '2026-09-20',
  status: 'pending'
}

const session: VetSessionRecord = {
  id: 'session-1',
  patientId: 'patient-1',
  visitDate: '2026-09-01',
  visitType: 'checkup',
  chiefComplaint: 'Limping',
  status: 'active',
  amountCharged: 120,
  amountPaid: 45,
  paymentStatus: 'partial'
}

const dish: PosMenuItem = {
  id: 'item-1',
  name: 'Truffle Pasta',
  category: 'mains',
  price: 24.5,
  cost: 8,
  preparationTime: 15,
  station: 'kitchen',
  isAvailable: true,
  displayOrder: 1,
  modifierGroups: [
    {
      title: 'Size',
      minSelect: 1,
      maxSelect: 1,
      options: [
        { name: 'Regular', priceDelta: 0 },
        { name: 'Large', priceDelta: 4 }
      ]
    }
  ]
}

const order: PosOrder = {
  id: 'order-1',
  orderNumber: 42,
  orderType: 'dine_in',
  status: 'billing',
  guestCount: 2,
  subtotal: 40,
  discountAmount: 0,
  taxRate: 0,
  tax: 0,
  serviceCharge: 0,
  tipAmount: 0,
  total: 40,
  openedAt: '2026-09-14T10:00:00.000Z',
  items: [],
  payments: [
    {
      id: 'payment-1',
      amount: 15,
      tipAmount: 0,
      paymentMethod: 'cash',
      createdAt: '2026-09-14T10:05:00.000Z'
    }
  ]
}

describe('hooks run before early returns (reproduced crashes)', () => {
  it('RescheduleFollowUpModal: null follow-up -> real follow-up', () => {
    const { rerender, container } = render(
      <RescheduleFollowUpModal followUp={null} onReschedule={vi.fn()} onClose={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()

    // useLanguage() had already run, so this used to go 1 hook -> 3 hooks.
    expect(() =>
      rerender(
        <RescheduleFollowUpModal followUp={followUp} onReschedule={vi.fn()} onClose={vi.fn()} />
      )
    ).not.toThrow()

    expect(container).not.toBeEmptyDOMElement()
  })

  it('QuickPaymentModal: no session -> selected session', () => {
    const { rerender, container } = render(
      <QuickPaymentModal session={null} onSuccess={vi.fn()} onClose={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()

    // useToast() and useLanguage() had already run, so this went 2 hooks -> 4.
    expect(() =>
      rerender(<QuickPaymentModal session={session} onSuccess={vi.fn()} onClose={vi.fn()} />)
    ).not.toThrow()

    expect(container).not.toBeEmptyDOMElement()
  })

  it('QuickPaymentModal still seeds the amount from the outstanding balance', () => {
    // 120 charged - 45 paid = 75 outstanding.
    render(<QuickPaymentModal session={session} onSuccess={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByDisplayValue('75')).toBeInTheDocument()
  })
})

describe('components whose guard covered every hook (behaviour only)', () => {
  it('ModifierSelectionModal renders closed and open', () => {
    const { rerender, container } = render(
      <ModifierSelectionModal
        isOpen={false}
        onClose={vi.fn()}
        item={null}
        activeSeat={1}
        onConfirm={vi.fn()}
      />
    )
    expect(container).toBeEmptyDOMElement()

    rerender(
      <ModifierSelectionModal
        isOpen
        onClose={vi.fn()}
        item={dish}
        activeSeat={1}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByText('Truffle Pasta')).toBeInTheDocument()
  })

  it('PaymentSplitModal seeds tenderAmount from the order balance', () => {
    // 40 total - 15 already paid = 25 outstanding. Hoisting the hook must not
    // capture the empty state ("0.00") instead.
    render(<PaymentSplitModal isOpen onClose={vi.fn()} order={order} onProcessPayment={vi.fn()} />)

    expect(screen.getByDisplayValue('25.00')).toBeInTheDocument()
  })
})
