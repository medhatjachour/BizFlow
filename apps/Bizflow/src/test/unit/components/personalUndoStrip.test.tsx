/**
 * The floating "Undo" strip.
 *
 * It is an affordance, not a data path: its whole job is to be absent when there
 * is nothing to undo, to name what happened, and to hand the click back to the
 * caller exactly once.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { LanguageProvider } from '../../../renderer/src/contexts/LanguageContext'
import UndoStrip from '../../../renderer/src/plugins/personal/pages/components/UndoStrip'
import { translations } from '../../../renderer/src/i18n/translations'

const en = translations.en

function renderStrip(offer: { message: string } | null, handlers: Partial<{ onUndo: () => void; onDismiss: () => void }> = {}) {
  const onUndo = handlers.onUndo ?? vi.fn()
  const onDismiss = handlers.onDismiss ?? vi.fn()
  const view = render(
    <LanguageProvider>
      <UndoStrip offer={offer ? { ...offer, action: vi.fn() } : null} onUndo={onUndo} onDismiss={onDismiss} />
    </LanguageProvider>
  )
  return { ...view, onUndo, onDismiss }
}

beforeEach(() => {
  window.localStorage.setItem('language', 'en')
})

describe('UndoStrip', () => {
  it('renders nothing when there is no offer', () => {
    const { container } = renderStrip(null)
    expect(container).toBeEmptyDOMElement()
  })

  it('names the action that was undone', () => {
    renderStrip({ message: 'Task marked done' })
    expect(screen.getByText('Task marked done')).toBeInTheDocument()
  })

  it('announces itself to assistive technology', () => {
    renderStrip({ message: 'Task marked done' })
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })

  it('offers an Undo button labelled in the active language', () => {
    renderStrip({ message: 'Task marked done' })
    expect(screen.getByRole('button', { name: en.pwUndo })).toBeInTheDocument()
  })

  it('reports the undo click to the caller', () => {
    const { onUndo } = renderStrip({ message: 'Task marked done' })
    fireEvent.click(screen.getByRole('button', { name: en.pwUndo }))
    expect(onUndo).toHaveBeenCalledTimes(1)
  })

  it('reports the dismiss click to the caller', () => {
    const { onDismiss } = renderStrip({ message: 'Task marked done' })
    fireEvent.click(screen.getByRole('button', { name: en.pwUndoDismiss }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('dismiss does not run the undo action', () => {
    const { onUndo, onDismiss } = renderStrip({ message: 'Task marked done' })
    fireEvent.click(screen.getByRole('button', { name: en.pwUndoDismiss }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(onUndo).not.toHaveBeenCalled()
  })
})
