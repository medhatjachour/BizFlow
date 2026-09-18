/**
 * Loading states for the Personal Work plugin.
 *
 * A skeleton is a promise about the shape of the data that is coming, so the
 * contract these tests pin is: one announced status while waiting, a placeholder
 * whose bulk matches the body it stands in for, no text, and no spinner.
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import EmptyState from '../../../renderer/src/plugins/personal/pages/components/EmptyState'
import {
  LOADING_SHAPES,
  Skeleton,
  SkeletonCards,
  SkeletonLines,
  SkeletonRows,
  SkeletonText,
  SkeletonTiles
} from '../../../renderer/src/plugins/personal/pages/components/Skeleton'
import { translations } from '../../../renderer/src/i18n/translations'

const en = translations.en

/** The single animated root each shape renders. */
function pulseRoot(container: HTMLElement) {
  return container.querySelector('.animate-pulse')
}

describe('EmptyState while loading', () => {
  it('announces itself as a busy status', () => {
    render(<EmptyState loading loadingLabel={en.pwLoading} />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(status).toHaveAccessibleName(en.pwLoading)
  })

  it('does not borrow the empty-state copy as its accessible name', () => {
    render(<EmptyState loading title="No invoices" message="Nothing here yet" />)
    const status = screen.getByRole('status')
    expect(status).not.toHaveAttribute('aria-label')
    expect(screen.queryByText('No invoices')).not.toBeInTheDocument()
    expect(screen.queryByText('Nothing here yet')).not.toBeInTheDocument()
  })

  it('hides the whole placeholder behind one decorative root', () => {
    const { container } = render(<EmptyState loading loadingLabel={en.pwLoading} />)
    const status = screen.getByRole('status')
    expect(status.querySelectorAll('[aria-hidden]')).toHaveLength(1)
    expect(status.firstElementChild).toHaveAttribute('aria-hidden')
    expect(status.textContent).toBe('')
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(1)
  })

  it('defaults to the row shape used by every list body', () => {
    const { container } = render(<EmptyState loading />)
    expect(pulseRoot(container)?.children.length).toBe(4)
  })

  it.each([
    ['rows', 4],
    ['cards', 3],
    ['tiles', 14],
    ['lines', 4],
    ['text', 6],
    ['detail', 2]
  ] as const)('honours the %s shape', (shape, children) => {
    const { container } = render(<EmptyState loading loadingShape={shape} />)
    expect(pulseRoot(container)?.children.length).toBe(children)
  })

  it('never renders a spinner', () => {
    const { container } = render(<EmptyState loading />)
    expect(container.querySelector('.animate-spin')).toBeNull()
  })
})

describe('EmptyState when idle', () => {
  it('shows the headline, the message and the action', () => {
    render(
      <EmptyState
        title="No invoices"
        message="Bill your first milestone"
        action={<button type="button">New invoice</button>}
      />
    )
    expect(screen.getByText('No invoices')).toBeInTheDocument()
    expect(screen.getByText('Bill your first milestone')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New invoice' })).toBeInTheDocument()
  })

  it('falls back to a neutral dash when given no message', () => {
    render(<EmptyState />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders no status role at all', () => {
    render(<EmptyState message="Nothing here yet" />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

describe('Skeleton primitives', () => {
  it('keeps a bare block decorative and accepts sizing', () => {
    const { container } = render(<Skeleton className="h-3 w-24" />)
    const block = container.firstElementChild as HTMLElement
    expect(block).toHaveAttribute('aria-hidden')
    expect(block.className).toContain('h-3')
    expect(block.className).toContain('w-24')
  })

  it.each([
    ['SkeletonRows', SkeletonRows],
    ['SkeletonCards', SkeletonCards],
    ['SkeletonTiles', SkeletonTiles],
    ['SkeletonLines', SkeletonLines],
    ['SkeletonText', SkeletonText]
  ] as const)('%s animates through a single root', (_name, Shape) => {
    const { container } = render(<Shape />)
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(1)
  })

  it('scales every count-driven shape from its props', () => {
    const { container } = render(
      <>
        <SkeletonRows rows={2} />
        <SkeletonCards count={5} />
        <SkeletonTiles count={7} />
        <SkeletonLines rows={3} />
        <SkeletonText lines={2} />
      </>
    )
    const roots = Array.from(container.querySelectorAll('.animate-pulse'))
    expect(roots.map((root) => root.children.length)).toEqual([2, 5, 7, 3, 2])
  })

  it('covers every shape EmptyState can be asked for', () => {
    expect(Object.keys(LOADING_SHAPES).sort()).toEqual([
      'cards',
      'detail',
      'lines',
      'rows',
      'text',
      'tiles'
    ])
  })

  it('reuses element identity per shape, so panels do not remount on re-render', () => {
    const view = render(<EmptyState loading loadingShape="tiles" />)
    const first = view.container.querySelector('.animate-pulse')
    view.rerender(<EmptyState loading loadingShape="tiles" />)
    expect(view.container.querySelector('.animate-pulse')).toBe(first)
  })

  it('keeps every shape out of the accessibility tree', () => {
    for (const shape of Object.keys(LOADING_SHAPES) as Array<keyof typeof LOADING_SHAPES>) {
      const view = render(<>{LOADING_SHAPES[shape]}</>)
      expect(view.container.querySelector('.animate-pulse')).toHaveAttribute('aria-hidden')
      view.unmount()
    }
  })
})
