/**
 * Bulk task actions (personal:tasks:bulk).
 *
 * Bulk actions are the one place a single click can touch a lot of rows, so the
 * contract they have to keep is narrow and explicit:
 *
 *  1. a partial success is reported, not thrown — `{ affected, skipped }` always
 *     adds up to the number of distinct ids the caller asked about, and
 *  2. `pin` is the only action that can be refused, because the "Daily 3" board
 *     is a hard limit by design: it fills what it can and reports the rest.
 *
 * The handler is driven through a real `registerTaskHandlers` call against an
 * in-memory Prisma stand-in, so the test exercises the same code Electron runs.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ ipcMain: { handle: vi.fn(), removeHandler: vi.fn() } }))
vi.mock('../../main/utils/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })
}))

import { ipcMain } from 'electron'
import { DAILY_THREE_LIMIT, registerTaskHandlers } from '../../plugins/personal/handlers/tasks'

type Row = Record<string, any>

/** Minimal `personalTask` delegate covering only the verbs the bulk handler uses. */
function createFakePrisma(seed: Row[] = []) {
  const rows: Row[] = seed.map((row) => ({ isDailyThree: false, status: 'backlog', ...row }))

  const matches = (row: Row, where: Row = {}): boolean =>
    Object.entries(where).every(([key, value]) => {
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        const clause = value as { in?: unknown[]; notIn?: unknown[] }
        if (clause.in) return clause.in.includes(row[key])
        if (clause.notIn) return !clause.notIn.includes(row[key])
      }
      return row[key] === value
    })

  return {
    rows,
    personalTask: {
      updateMany: vi.fn(async ({ where, data }: { where: Row; data: Row }) => {
        const hit = rows.filter((row) => matches(row, where))
        hit.forEach((row) => Object.assign(row, data))
        return { count: hit.length }
      }),
      count: vi.fn(async ({ where }: { where: Row }) => rows.filter((row) => matches(row, where)).length),
      findMany: vi.fn(async ({ where, orderBy }: { where: Row; orderBy?: Row[] }) => {
        const hit = rows.filter((row) => matches(row, where))
        if (orderBy) {
          const by = (key: string, dir?: 'asc' | 'desc') => (a: Row, b: Row) => {
            const av = a[key]
            const bv = b[key]
            if (av === bv) return 0
            if (av == null) return 1
            if (bv == null) return -1
            const cmp = av < bv ? -1 : 1
            return dir === 'desc' ? -cmp : cmp
          }
          const [first, second] = orderBy as { priority?: 'asc' | 'desc'; dueDate?: 'asc' | 'desc' }[]
          hit.sort(
            (a, b) =>
              (first?.priority ? by('priority', first.priority)(a, b) : 0) ||
              (second?.dueDate ? by('dueDate', second.dueDate)(a, b) : 0)
          )
        }
        return hit.map((row) => ({ ...row }))
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Row }) => {
        const row = rows.find((candidate) => candidate.id === where.id)
        if (row) Object.assign(row, data)
        return { ...row }
      }),
      deleteMany: vi.fn(async ({ where }: { where: Row }) => {
        const hit = rows.filter((row) => matches(row, where))
        hit.forEach((row) => rows.splice(rows.indexOf(row), 1))
        return { count: hit.length }
      })
    }
  }
}

type BulkHandler = (event: unknown, data: unknown) => Promise<{ affected: number; skipped: number }>

function bulkHandlerOf(prisma: any): BulkHandler {
  registerTaskHandlers(prisma)
  const call = vi.mocked(ipcMain.handle).mock.calls.find(([channel]) => channel === 'personal:tasks:bulk')
  if (!call) throw new Error('personal:tasks:bulk was not registered')
  return call[1] as unknown as BulkHandler
}

const task = (id: string, extra: Row = {}): Row => ({ id, title: id, priority: 3, dueDate: null, ...extra })

describe('personal:tasks:bulk', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('completes every selected task and clears their Daily 3 pin', async () => {
    const prisma = createFakePrisma([task('a', { isDailyThree: true, status: 'today' }), task('b'), task('c')])
    const bulk = bulkHandlerOf(prisma)

    const result = await bulk(null, { ids: ['a', 'b'], action: 'complete' })

    expect(result).toEqual({ affected: 2, skipped: 0 })
    expect(prisma.rows.find((row) => row.id === 'a')).toMatchObject({ status: 'done', isDailyThree: false })
    expect(prisma.rows.find((row) => row.id === 'b')?.status).toBe('done')
    expect(prisma.rows.find((row) => row.id === 'c')?.status).toBe('backlog')
  })

  it('reopens completed tasks back into progress', async () => {
    const prisma = createFakePrisma([task('a', { status: 'done', completedAt: new Date() })])
    const bulk = bulkHandlerOf(prisma)

    const result = await bulk(null, { ids: ['a'], action: 'reopen' })

    expect(result).toEqual({ affected: 1, skipped: 0 })
    expect(prisma.rows.find((row) => row.id === 'a')).toMatchObject({ status: 'in_progress', completedAt: null })
  })

  it('unpins only the rows that were actually pinned', async () => {
    const prisma = createFakePrisma([task('a', { isDailyThree: true }), task('b')])
    const bulk = bulkHandlerOf(prisma)

    const result = await bulk(null, { ids: ['a', 'b'], action: 'unpin' })

    expect(result).toEqual({ affected: 1, skipped: 1 })
    expect(prisma.rows.every((row) => row.isDailyThree === false)).toBe(true)
  })

  it('deletes every selected row and reports the count', async () => {
    const prisma = createFakePrisma([task('a'), task('b'), task('c')])
    const bulk = bulkHandlerOf(prisma)

    const result = await bulk(null, { ids: ['a', 'c'], action: 'delete' })

    expect(result).toEqual({ affected: 2, skipped: 0 })
    expect(prisma.rows.map((row) => row.id)).toEqual(['b'])
  })

  it('pins candidates until the Daily 3 board is full, then reports the rest as skipped', async () => {
    const prisma = createFakePrisma([
      task('pinned-1', { isDailyThree: true, status: 'today' }),
      task('cand-1', { priority: 1, dueDate: '2024-05-01' }),
      task('cand-2', { priority: 2, dueDate: '2024-05-02' }),
      task('cand-3', { priority: 3, dueDate: '2024-05-03' })
    ])
    const bulk = bulkHandlerOf(prisma)

    const result = await bulk(null, { ids: ['cand-1', 'cand-2', 'cand-3'], action: 'pin' })

    expect(result).toEqual({ affected: 2, skipped: 1 })
    expect(prisma.rows.find((row) => row.id === 'cand-1')).toMatchObject({ isDailyThree: true, status: 'today' })
    expect(prisma.rows.find((row) => row.id === 'cand-2')).toMatchObject({ isDailyThree: true, status: 'today' })
    expect(prisma.rows.find((row) => row.id === 'cand-3')?.isDailyThree).toBe(false)
  })

  it('never exceeds the Daily 3 limit when the board is already full', async () => {
    const full = Array.from({ length: DAILY_THREE_LIMIT }, (_, index) =>
      task(`pinned-${index}`, { isDailyThree: true, status: 'today' })
    )
    const prisma = createFakePrisma([...full, task('cand', { status: 'today' })])
    const bulk = bulkHandlerOf(prisma)

    const result = await bulk(null, { ids: ['cand'], action: 'pin' })

    expect(result).toEqual({ affected: 0, skipped: 1 })
    expect(prisma.rows.filter((row) => row.isDailyThree)).toHaveLength(DAILY_THREE_LIMIT)
  })

  it('leaves an already-pinned or already-closed task out of a pin batch', async () => {
    const prisma = createFakePrisma([
      task('already', { isDailyThree: true, status: 'today' }),
      task('closed', { status: 'done' }),
      task('fresh', { status: 'backlog' })
    ])
    const bulk = bulkHandlerOf(prisma)

    const result = await bulk(null, { ids: ['already', 'closed', 'fresh'], action: 'pin' })

    expect(result).toEqual({ affected: 1, skipped: 2 })
    expect(prisma.rows.find((row) => row.id === 'fresh')?.isDailyThree).toBe(true)
  })

  it('deduplicates ids so affected + skipped stays bounded by distinct rows', async () => {
    const prisma = createFakePrisma([task('a')])
    const bulk = bulkHandlerOf(prisma)

    const result = await bulk(null, { ids: ['a', 'a', 'a', ' '], action: 'delete' })

    expect(result).toEqual({ affected: 1, skipped: 0 })
  })

  it('short-circuits an empty selection without touching the database', async () => {
    const prisma = createFakePrisma([task('a')])
    const bulk = bulkHandlerOf(prisma)

    const result = await bulk(null, { ids: [], action: 'delete' })

    expect(result).toEqual({ affected: 0, skipped: 0 })
    expect(prisma.personalTask.deleteMany).not.toHaveBeenCalled()
    expect(prisma.personalTask.updateMany).not.toHaveBeenCalled()
  })

  it('tolerates a missing or malformed payload', async () => {
    const prisma = createFakePrisma([task('a')])
    const bulk = bulkHandlerOf(prisma)

    await expect(bulk(null, undefined)).resolves.toEqual({ affected: 0, skipped: 0 })
    await expect(bulk(null, { ids: 'a', action: 'delete' })).resolves.toEqual({ affected: 0, skipped: 0 })
    await expect(bulk(null, { ids: [1, null, {}], action: 'delete' })).resolves.toEqual({ affected: 0, skipped: 0 })
  })

  it('reports stale ids as skipped instead of failing the whole batch', async () => {
    const prisma = createFakePrisma([task('a')])
    const bulk = bulkHandlerOf(prisma)

    const result = await bulk(null, { ids: ['a', 'gone'], action: 'complete' })

    expect(result).toEqual({ affected: 1, skipped: 1 })
  })

  it('rejects an unknown action loudly', async () => {
    const prisma = createFakePrisma([task('a')])
    const bulk = bulkHandlerOf(prisma)

    await expect(bulk(null, { ids: ['a'], action: 'archive' })).rejects.toThrow('Unsupported bulk action: archive')
  })
})
