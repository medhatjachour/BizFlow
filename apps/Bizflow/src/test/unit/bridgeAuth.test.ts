/**
 * The public web bridge has no login, so the channels the desktop gates behind a
 * dedicated action capability have to be gated by name instead — the inline
 * `requireCap()` calls in the handlers fail OPEN while nobody is bound, which on
 * a public bridge means they do not gate anything at all.
 *
 * The rule is small but it is the only thing standing between an anonymous
 * `POST /ipc` and voiding or refunding an invoice, so it is pinned here rather
 * than left to reading web/server.ts.
 */

import { describe, expect, it } from 'vitest'
import { BRIDGE_REQUIRES_AUTH, bridgeRequiresAuth } from '../../../web/bridge-auth'

describe('bridgeRequiresAuth', () => {
  it.each([
    'personal:billing:refundPayment',
    'personal:billing:voidInvoice',
    'personal:billing:writeOff',
    'personal:billing:deleteInvoice',
    'personal:billing:deletePayment',
    'personal:billing:applyDiscount',
    'personal:billing:taxVault:delete'
  ])('gates the capability-protected channel %s', (channel) => {
    expect(bridgeRequiresAuth(channel, [])).toBe(true)
  })

  it('gates voiding reached through the generic status channel', () => {
    expect(bridgeRequiresAuth('personal:billing:markStatus', [{ id: 'a', status: 'void' }])).toBe(true)
  })

  it.each([['sent'], ['overdue'], ['paid'], ['partial'], ['draft']])(
    'leaves the ordinary status "%s" demo-able',
    (status) => {
      expect(bridgeRequiresAuth('personal:billing:markStatus', [{ id: 'a', status }])).toBe(false)
    }
  )

  it.each([
    ['no payload', undefined],
    ['a payload with no status', [{ id: 'a' }]],
    ['a non-object payload', ['void']],
    ['a status of the wrong type', [{ status: { nested: 'void' } }]]
  ])('does not gate markStatus given %s', (_label, args) => {
    expect(bridgeRequiresAuth('personal:billing:markStatus', args)).toBe(false)
  })

  it('leaves the read and write channels the demo site needs alone', () => {
    for (const channel of [
      'personal:billing:getInvoices',
      'personal:billing:createInvoice',
      'personal:billing:updateInvoice',
      'personal:billing:recordPayment',
      'personal:billing:discountPreview',
      'personal:billing:lateFeeScan',
      'personal:billing:taxVault:getSummary',
      'personal:tasks:update',
      'dashboard:getStats'
    ]) {
      expect(bridgeRequiresAuth(channel, [{ status: 'void' }])).toBe(false)
    }
  })

  it('is not fooled by case or by a prefixed name', () => {
    expect(bridgeRequiresAuth('PERSONAL:BILLING:REFUNDPAYMENT', [])).toBe(true)
    expect(bridgeRequiresAuth('x:personal:billing:refundPayment', [])).toBe(false)
  })

  it('needs the whole channel name, so a lookalike is not gated', () => {
    expect(bridgeRequiresAuth('personal:billing:refundPaymentExtra', [])).toBe(false)
    expect(bridgeRequiresAuth('personal:billing:markStatusExtra', [{ status: 'void' }])).toBe(false)
  })

  it('survives a non-string channel', () => {
    expect(bridgeRequiresAuth(undefined, [])).toBe(false)
    expect(bridgeRequiresAuth(null, [])).toBe(false)
    expect(bridgeRequiresAuth({ toString: () => 'personal:billing:refundPayment' }, [])).toBe(false)
  })

  it('keeps the exported pattern and the function in step', () => {
    expect(BRIDGE_REQUIRES_AUTH.test('personal:billing:refundPayment')).toBe(true)
    expect(BRIDGE_REQUIRES_AUTH.test('personal:billing:recordPayment')).toBe(false)
  })
})
