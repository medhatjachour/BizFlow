/**
 * Barcode Scanner Hook
 * Simple event-based detection: Scanner only works when NO input field is focused
 * This ensures normal typing and search work perfectly without interference
 */

import { useEffect, useRef, useCallback } from 'react'

type BarcodeScannerOptions = {
  onScan: (barcode: string) => void | Promise<void>
  minLength?: number // Minimum barcode length (default: 3)
  maxLength?: number // Maximum barcode length (default: 50)
  timeout?: number // Timeout between keystrokes in ms (default: 100)
  prefix?: string // Expected prefix (optional)
  suffix?: string // Expected suffix like Enter key (default: 'Enter')
  preventDuplicates?: boolean // Prevent duplicate scans within short time
  duplicateTimeout?: number // Time window for duplicate prevention (default: 1000ms)
}

export function useBarcodeScanner(options: BarcodeScannerOptions) {
  const {
    onScan,
    minLength = 3,
    maxLength = 50,
    timeout = 100,
    prefix,
    suffix = 'Enter',
    preventDuplicates = false,
    duplicateTimeout = 1000
  } = options

  const buffer = useRef<string>('')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastScannedRef = useRef<string>('')
  const lastScanTimeRef = useRef<number>(0)
  const isProcessingRef = useRef<boolean>(false)

  const processBarcode = useCallback(async (barcode: string) => {
    // Trim whitespace
    const trimmedBarcode = barcode.trim()

    // Validate length
    if (trimmedBarcode.length < minLength || trimmedBarcode.length > maxLength) {
      return
    }

    // Check for prefix if specified
    if (prefix && !trimmedBarcode.startsWith(prefix)) {
      return
    }

    // Remove prefix if present
    const finalBarcode = prefix ? trimmedBarcode.slice(prefix.length) : trimmedBarcode

    // Prevent duplicates within time window
    if (preventDuplicates) {
      const now = Date.now()
      if (
        finalBarcode === lastScannedRef.current &&
        now - lastScanTimeRef.current < duplicateTimeout
      ) {
        return
      }
      lastScannedRef.current = finalBarcode
      lastScanTimeRef.current = now
    }

    // Prevent concurrent processing
    if (isProcessingRef.current) {
      return
    }

    try {
      isProcessingRef.current = true
      await onScan(finalBarcode)
    } finally {
      isProcessingRef.current = false
    }
  }, [onScan, minLength, maxLength, prefix, preventDuplicates, duplicateTimeout])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // SIMPLE RULE: If any input field is focused, scanner does NOTHING
      // This ensures typing and search work normally
      const target = event.target as HTMLElement
      const isInputField = 
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      if (isInputField) {
        // User is typing in a field - do nothing, let it work normally
        buffer.current = ''
        return
      }

      // Clear timeout on each keystroke
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Handle Enter key (or custom suffix)
      if (event.key === suffix) {
        event.preventDefault()
        event.stopPropagation()
        
        if (buffer.current.length >= minLength) {
          processBarcode(buffer.current)
        }
        
        buffer.current = ''
        return
      }

      // Ignore modifier keys
      if (
        event.key === 'Shift' ||
        event.key === 'Control' ||
        event.key === 'Alt' ||
        event.key === 'Meta' ||
        event.key === 'Tab' ||
        event.key === 'Escape'
      ) {
        return
      }

      // Ignore if it's a shortcut (Ctrl/Cmd + key)
      if (event.ctrlKey || event.metaKey) {
        buffer.current = ''
        return
      }

      // Add character to buffer (only when not in input field)
      if (event.key.length === 1) {
        event.preventDefault()
        event.stopPropagation()
        
        buffer.current += event.key

        // Prevent buffer overflow
        if (buffer.current.length > maxLength) {
          buffer.current = ''
          return
        }

        // Set timeout to clear buffer if no more input
        timeoutRef.current = setTimeout(() => {
          buffer.current = ''
        }, timeout)
      }
    }

    // Add event listener
    window.addEventListener('keydown', handleKeyDown)

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [processBarcode, timeout, suffix, minLength, maxLength])

  return {
    // Expose method to manually trigger scan (useful for testing)
    manualScan: processBarcode
  }
}
