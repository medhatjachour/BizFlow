/**
 * Every plugin reads the receipt/printer configuration straight from
 * localStorage, and the Settings page is the only thing that writes it there —
 * and only when "Save changes" is pressed. So an unsaved edit changes nothing
 * about how receipts print, and the page has to say so.
 */

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useSettings } from '../../../renderer/src/pages/Settings/useSettings'

describe('settings unsaved changes', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('reports nothing pending on a freshly mounted page', () => {
    const { result } = renderHook(() => useSettings())
    expect(result.current.hasUnsavedChanges).toBe(false)
  })

  it('flags an edit that has not been saved yet', () => {
    const { result } = renderHook(() => useSettings())

    act(() => {
      result.current.setStoreSettings({ ...result.current.storeSettings, storeName: 'Nile View' })
    })
    expect(result.current.hasUnsavedChanges).toBe(true)

    act(() => {
      result.current.setTaxReceiptSettings({
        ...result.current.taxReceiptSettings,
        receiptFooter: 'شكرًا لزيارتكم'
      })
    })
    expect(result.current.hasUnsavedChanges).toBe(true)
  })

  it('applies the edit to localStorage and clears the flag on save', () => {
    const { result } = renderHook(() => useSettings())

    act(() => {
      result.current.setTaxReceiptSettings({
        ...result.current.taxReceiptSettings,
        printerName: 'XP-58C',
        receiptLanguage: 'ar'
      })
    })
    expect(localStorage.getItem('printerName')).toBe(null)

    act(() => {
      result.current.saveSettings()
    })
    expect(result.current.hasUnsavedChanges).toBe(false)
    expect(localStorage.getItem('printerName')).toBe('XP-58C')
    expect(localStorage.getItem('receiptLanguage')).toBe('ar')
  })

  it('clears the flag when the edit is reverted instead of saved', () => {
    const { result } = renderHook(() => useSettings())
    const original = result.current.storeSettings.storeName

    act(() => {
      result.current.setStoreSettings({ ...result.current.storeSettings, storeName: 'Renamed' })
    })
    expect(result.current.hasUnsavedChanges).toBe(true)

    act(() => {
      result.current.setStoreSettings({ ...result.current.storeSettings, storeName: original })
    })
    expect(result.current.hasUnsavedChanges).toBe(false)
  })

  it('treats a second save with no further edits as clean', () => {
    const { result } = renderHook(() => useSettings())

    act(() => {
      result.current.setDisplaySettings({
        ...result.current.displaySettings,
        showImagesInPOSCards: !result.current.displaySettings.showImagesInPOSCards
      })
    })
    act(() => {
      result.current.saveSettings()
    })
    expect(result.current.hasUnsavedChanges).toBe(false)

    act(() => {
      result.current.saveSettings()
    })
    expect(result.current.hasUnsavedChanges).toBe(false)
  })
})
