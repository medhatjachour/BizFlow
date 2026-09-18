/**
 * Undo bar — the offer's lifetime and the single-shot guarantee.
 *
 * An "Undo" button that is still clickable after the underlying data has moved on
 * is worse than no undo at all, so the two invariants worth locking down are:
 *
 *  1. an offer expires on its own, and
 *  2. running an offer consumes it, so the same reversal can never fire twice.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { UNDO_TIMEOUT_MS, useUndoBar } from '../../renderer/src/plugins/personal/pages/hooks/useUndoBar'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useUndoBar', () => {
  it('starts with no pending offer', () => {
    const { result } = renderHook(() => useUndoBar())
    expect(result.current.offer).toBeNull()
  })

  it('exposes the message of the most recent offer', () => {
    const { result } = renderHook(() => useUndoBar())
    act(() => result.current.show('Task marked done', () => {}))
    expect(result.current.offer?.message).toBe('Task marked done')
  })

  it('expires the offer once the window elapses', () => {
    const { result } = renderHook(() => useUndoBar())
    act(() => result.current.show('Task marked done', () => {}))

    act(() => vi.advanceTimersByTime(UNDO_TIMEOUT_MS - 1))
    expect(result.current.offer).not.toBeNull()

    act(() => vi.advanceTimersByTime(1))
    expect(result.current.offer).toBeNull()
  })

  it('honours a custom window', () => {
    const { result } = renderHook(() => useUndoBar(500))
    act(() => result.current.show('gone soon', () => {}))
    act(() => vi.advanceTimersByTime(500))
    expect(result.current.offer).toBeNull()
  })

  it('runs the action and clears the offer', async () => {
    const action = vi.fn()
    const { result } = renderHook(() => useUndoBar())
    act(() => result.current.show('Task marked done', action))

    await act(async () => {
      await result.current.undo()
    })

    expect(action).toHaveBeenCalledTimes(1)
    expect(result.current.offer).toBeNull()
  })

  it('can only be consumed once', async () => {
    const action = vi.fn()
    const { result } = renderHook(() => useUndoBar())
    act(() => result.current.show('Task marked done', action))

    await act(async () => {
      await result.current.undo()
    })
    await act(async () => {
      await result.current.undo()
    })

    expect(action).toHaveBeenCalledTimes(1)
  })

  it('does nothing when there is no offer to undo', async () => {
    const { result } = renderHook(() => useUndoBar())
    await act(async () => {
      await result.current.undo()
    })
    expect(result.current.offer).toBeNull()
  })

  it('awaits an async action before resolving', async () => {
    const order: string[] = []
    const { result } = renderHook(() => useUndoBar())
    act(() =>
      result.current.show('Task marked done', async () => {
        await Promise.resolve()
        order.push('reversed')
      })
    )

    await act(async () => {
      await result.current.undo()
    })
    order.push('after')

    expect(order).toEqual(['reversed', 'after'])
  })

  it('restarts the countdown when a new offer replaces the old one', () => {
    const { result } = renderHook(() => useUndoBar(1000))
    act(() => result.current.show('first', () => {}))
    act(() => vi.advanceTimersByTime(800))
    act(() => result.current.show('second', () => {}))

    act(() => vi.advanceTimersByTime(800))
    // The first offer's timer must not have fired and taken the second one with it.
    expect(result.current.offer?.message).toBe('second')
  })

  it('drops the offer on dismiss without running it', () => {
    const action = vi.fn()
    const { result } = renderHook(() => useUndoBar())
    act(() => result.current.show('Task marked done', action))

    act(() => result.current.dismiss())

    expect(result.current.offer).toBeNull()
    expect(action).not.toHaveBeenCalled()
  })

  it('does not fire a stale timer after dismissal', () => {
    const action = vi.fn()
    const { result } = renderHook(() => useUndoBar())
    act(() => result.current.show('one', action))
    act(() => result.current.dismiss())
    act(() => result.current.show('two', action))

    act(() => vi.advanceTimersByTime(UNDO_TIMEOUT_MS))
    expect(result.current.offer).toBeNull()
    expect(action).not.toHaveBeenCalled()
  })

  it('leaves no timer behind when the owning component unmounts', () => {
    const action = vi.fn()
    const { result, unmount } = renderHook(() => useUndoBar())
    act(() => result.current.show('Task marked done', action))

    unmount()
    act(() => vi.advanceTimersByTime(UNDO_TIMEOUT_MS * 2))

    expect(action).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
})
