/**
 * The universal permission guard has to cover the personal plugin too.
 *
 * A security review flagged `personal:billing:refundPayment` and
 * `personal:billing:voidInvoice` as missing a capability check. On the desktop
 * that was a false positive: the guard wraps `ipcMain.handle` and is installed
 * before any plugin registers, so every `personal:*` channel is checked by
 * convention. Nothing pinned that, though — the guard derives its rules from the
 * plugin registry, so a rename of a capability or an id would silently drop the
 * protection. This test fixes the convention in place.
 *
 * It is also the reason the inline `requireCap` calls in `billing.ts` exist: the
 * web bridge registers the same handlers, so if this guard is not installed
 * there the inline checks are the only enforcement left.
 */

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ ipcMain: { handle: vi.fn(), removeHandler: vi.fn() } }))
vi.mock('../../main/ipc/handlers/session', () => ({ requireCap: vi.fn() }))

import { ipcMain } from 'electron'
import { requireCap } from '../../main/ipc/handlers/session'
import { installPermissionGuard } from '../../main/ipc/handlers/permissionsGuard'

const requireCapMock = vi.mocked(requireCap)
/** Captured before installing, because the guard replaces the property itself. */
const originalHandle = vi.mocked(ipcMain.handle)

/**
 * Registers a channel the way a handler module would and returns the listener the
 * guard actually stored, plus a spy for what the caller asked it to run.
 */
function register(channel: string) {
  const listener = vi.fn(async (..._args: unknown[]) => 'handler-result')
  ;(ipcMain.handle as any)(channel, listener)
  const stored = originalHandle.mock.calls[originalHandle.mock.calls.length - 1][1]
  return { stored: stored as (...args: unknown[]) => Promise<unknown>, listener }
}

beforeAll(() => installPermissionGuard())
beforeEach(() => vi.clearAllMocks())

describe('installPermissionGuard over the personal plugin', () => {
  it('guards refunds with the plugin refund capability', async () => {
    const { stored } = register('personal:billing:refundPayment')

    await stored(null, { id: 'p1' })

    expect(requireCapMock).toHaveBeenCalledWith('personal_refund')
  })

  it('guards voids with the plugin void capability', async () => {
    const { stored } = register('personal:billing:voidInvoice')

    await stored(null, { id: 'a' })

    expect(requireCapMock).toHaveBeenCalledWith('personal_void_sale')
  })

  it('matches by convention, so a new refund channel is covered without being listed', async () => {
    const { stored } = register('personal:billing:refundRetainerCycle')

    await stored(null, {})

    expect(requireCapMock).toHaveBeenCalledWith('personal_refund')
  })

  it('falls back to plugin access for everything else under the prefix', async () => {
    for (const channel of [
      'personal:billing:markStatus',
      'personal:billing:updateInvoice',
      'personal:billing:discountPreview',
      'personal:tasks:update'
    ]) {
      requireCapMock.mockClear()
      const { stored } = register(channel)
      await stored(null, {})
      expect(requireCapMock).toHaveBeenCalledWith('access_personal')
    }
  })

  it('still covers the kernel capabilities it covered before', async () => {
    const { stored } = register('users:create')

    await stored(null, {})

    expect(requireCapMock).toHaveBeenCalledWith('manage_users')
  })

  it('leaves unrelated channels unwrapped', async () => {
    const { stored, listener } = register('app:getVersion')

    await stored(null)

    expect(requireCapMock).not.toHaveBeenCalled()
    // The guard hands the caller's listener straight to the original registrar.
    expect(originalHandle.mock.calls[originalHandle.mock.calls.length - 1][1]).toBe(listener)
  })

  it('passes the arguments through and returns what the handler returned', async () => {
    const { stored, listener } = register('personal:billing:refundPayment')

    const result = await stored(null, { id: 'p1' }, 'extra')

    expect(listener).toHaveBeenCalledWith(null, { id: 'p1' }, 'extra')
    expect(result).toBe('handler-result')
  })

  it('does not run the handler when the capability is missing', async () => {
    requireCapMock.mockImplementationOnce(() => {
      throw new Error('Permission denied — this action requires the "personal_void_sale" permission.')
    })
    const { stored, listener } = register('personal:billing:voidInvoice')

    await expect(stored(null, { id: 'a' })).rejects.toThrow('Permission denied')
    expect(listener).not.toHaveBeenCalled()
  })

  it('is idempotent, so a second install cannot stack checks', async () => {
    installPermissionGuard()
    installPermissionGuard()
    const { stored } = register('personal:billing:refundPayment')

    await stored(null, { id: 'p1' })

    expect(requireCapMock).toHaveBeenCalledTimes(1)
  })
})
