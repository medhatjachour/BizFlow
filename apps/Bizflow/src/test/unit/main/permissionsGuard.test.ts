import { describe, it, expect, vi, beforeEach } from 'vitest'

const requireCapMock = vi.fn()
const handleMock = vi.fn()

vi.mock('electron', () => ({
  ipcMain: { handle: handleMock },
}))

vi.mock('../../../main/ipc/handlers/session', () => ({
  requireCap: requireCapMock,
}))

type GuardedHandler = [string, (...a: any[]) => any]

async function freshGuard() {
  vi.resetModules()
  const { ipcMain } = await import('electron')
  const mod = await import('../../../main/ipc/handlers/permissionsGuard')
  handleMock.mockClear()
  mod.installPermissionGuard()
  return ipcMain
}

describe('permissionsGuard', () => {
  beforeEach(() => {
    handleMock.mockReset()
    handleMock.mockImplementation((channel: string, listener: (...a: any[]) => any) => ({ channel, listener }))
    requireCapMock.mockReset()
  })

  it('enforces BOTH plugin access and void_sale for a plugin void channel', async () => {
    const ipcMain = await freshGuard()
    ipcMain.handle('coffee:orders:void', () => 'done')
    const call = handleMock.mock.calls.find((c: GuardedHandler) => c[0] === 'coffee:orders:void') as GuardedHandler
    expect(call).toBeTruthy()

    requireCapMock.mockImplementation((cap: string) => {
      if (cap === 'void_sale') throw Object.assign(new Error('denied'), { code: 'EPERM_CAP' })
    })
    await expect(call[1]('x')).rejects.toMatchObject({ code: 'EPERM_CAP' })
    expect(requireCapMock).toHaveBeenCalledWith('access_coffee')
    expect(requireCapMock).toHaveBeenCalledWith('void_sale')
  })

  it('passes a guarded channel when the user holds the fine-grained cap', async () => {
    const ipcMain = await freshGuard()
    ipcMain.handle('coffee:orders:void', () => 'done')
    const call = handleMock.mock.calls.find((c: GuardedHandler) => c[0] === 'coffee:orders:void') as GuardedHandler
    requireCapMock.mockImplementation(() => {})
    await expect(call[1]('x')).resolves.toBe('done')
    expect(requireCapMock).toHaveBeenCalledWith('access_coffee')
    expect(requireCapMock).toHaveBeenCalledWith('void_sale')
  })

  it('enforces a single rule for plain channels (users:*)', async () => {
    const ipcMain = await freshGuard()
    ipcMain.handle('users:delete', () => 'done')
    const call = handleMock.mock.calls.find((c: GuardedHandler) => c[0] === 'users:delete') as GuardedHandler
    expect(call).toBeTruthy()

    requireCapMock.mockImplementation((cap: string) => {
      if (cap === 'manage_users') throw Object.assign(new Error('denied'), { code: 'EPERM_CAP' })
    })
    await expect(call[1]()).rejects.toMatchObject({ code: 'EPERM_CAP' })
    expect(requireCapMock).toHaveBeenCalledTimes(1)
    expect(requireCapMock).toHaveBeenCalledWith('manage_users')
  })

  it('leaves harmless channels unguarded (no requireCap calls)', async () => {
    const ipcMain = await freshGuard()
    ipcMain.handle('finance:getTransactions', () => 'ok')
    const call = handleMock.mock.calls.find((c: GuardedHandler) => c[0] === 'finance:getTransactions') as GuardedHandler
    expect(call).toBeTruthy()
    expect(call[1]('x')).toBe('ok')
    expect(requireCapMock).not.toHaveBeenCalled()
  })
})
