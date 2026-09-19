/**
 * The totals rows that sit between the subtotal and the grand total.
 *
 * These rows are shared by the ESC/POS text composer, the rasteriser and the
 * HTML composer, so a mistake here prints on every receipt in every language.
 * The important rule is that the printed column of figures adds up: the tip is
 * charged on top of the check total, so it must not appear before it.
 */

import { describe, expect, it } from 'vitest'

import { saleAdjustmentRows, saleGratuityRow } from '../../main/services/thermal/adjustments'
import { getReceiptLabels } from '../../main/services/thermal/labels'

const en = getReceiptLabels('en')
const ar = getReceiptLabels('ar')

describe('sale adjustment rows', () => {
  it('adds no row at all to a plain receipt', () => {
    expect(saleAdjustmentRows({}, en)).toEqual([])
    expect(saleAdjustmentRows({ discount: 0, serviceCharge: 0, tipAmount: 0 }, en)).toEqual([])
    expect(saleAdjustmentRows({ discount: NaN, serviceCharge: NaN }, en)).toEqual([])
  })

  it('names the percentage behind a discount and prints it as a deduction', () => {
    expect(
      saleAdjustmentRows({ discount: 12, discountType: 'PERCENTAGE', discountRate: 10 }, en)
    ).toEqual([{ label: `${en.discount} 10%`, amount: '-12.00 EGP' }])
  })

  it('prints a fixed discount without a percentage', () => {
    expect(saleAdjustmentRows({ discount: 25, discountType: 'FIXED' }, en)).toEqual([
      { label: en.discount, amount: '-25.00 EGP' },
    ])
    // A percentage flag with no rate would print an empty label, so it falls back.
    expect(saleAdjustmentRows({ discount: 5, discountType: 'PERCENTAGE' }, en)).toEqual([
      { label: en.discount, amount: '-5.00 EGP' },
    ])
  })

  it('prints the service charge as a charge, not a deduction', () => {
    expect(saleAdjustmentRows({ serviceCharge: 18.5 }, en)).toEqual([
      { label: en.serviceCharge, amount: '18.50 EGP' },
    ])
  })

  it('orders discount before service and leaves the tip out of the block', () => {
    const rows = saleAdjustmentRows(
      { discount: 10, discountType: 'FIXED', serviceCharge: 6, tipAmount: 20 },
      en
    )
    expect(rows.map((row) => row.label)).toEqual([en.discount, en.serviceCharge])
  })
})

describe('gratuity row', () => {
  it('stays off the receipt until a tip was actually taken', () => {
    expect(saleGratuityRow({}, en)).toBeNull()
    expect(saleGratuityRow({ tipAmount: 0 }, en)).toBeNull()
    expect(saleGratuityRow({ tipAmount: -4 }, en)).toBeNull()
  })

  it('prints the tip in the receipt language', () => {
    expect(saleGratuityRow({ tipAmount: 20 }, en)).toEqual({
      label: en.gratuity,
      amount: '20.00 EGP',
    })
    expect(saleGratuityRow({ tipAmount: 20 }, ar)).toEqual({
      label: ar.gratuity,
      amount: '20.00 EGP',
    })
  })
})
