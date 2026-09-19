/**
 * Thermal receipt wiring — every sales module must be able to print.
 *
 * Receipt printing used to be wired inside the commerce plugin only
 * (`plugins/commerce/preload.ts` exposed `window.api.thermalReceipts` and
 * `plugins/commerce/handlers/index.ts` called `registerReceiptHandlers()` from
 * `main/ipc/handlers/receipt.handlers.ts`). A module-only build — coffee,
 * restaurant, pharmacy, bakery, gym, vet — therefore shipped a POS whose
 * "Print Receipt" button answered "Receipt printing is unavailable." because
 * `window.api.thermalReceipts` was `undefined` and no `receipt:*` channel was
 * ever registered.
 *
 * Both halves are kernel-level now. These assertions read the wiring sources so
 * the regression cannot come back unnoticed by the renderer tests, which all
 * mock `window.api` and never see the real bridge.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const mainSrc = join(here, '..', '..', 'main')
const preloadSrc = join(here, '..', '..', 'preload')
const commerceSrc = join(here, '..', '..', 'plugins', 'commerce')

const read = (file: string): string => readFileSync(file, 'utf8')

const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

/** Renderer façade keys, each backed by an equally named `receipt:<key>` channel. */
const RECEIPT_KEYS = [
  'print',
  'detectPrinters',
  'testPrint',
  'diagnosePrinter',
  'repairPrinter',
  'autoConnect',
  'createQueue',
  'renderPreview',
] as const

const handlersIndex = stripComments(read(join(mainSrc, 'ipc', 'handlers', 'index.ts')))
const receiptHandlers = read(join(mainSrc, 'ipc', 'handlers', 'receipt.handlers.ts'))
const preloadIndex = stripComments(read(join(preloadSrc, 'index.ts')))
const commerceHandlers = stripComments(read(join(commerceSrc, 'handlers', 'index.ts')))
const commercePreload = stripComments(read(join(commerceSrc, 'preload.ts')))

describe('thermal receipt handlers', () => {
  it('registers the whole channel set the renderer calls', () => {
    for (const key of RECEIPT_KEYS) {
      expect(receiptHandlers).toContain(`ipcMain.handle('receipt:${key}'`)
    }
  })

  it('is registered by the kernel, before any plugin handler', () => {
    const kernelCall = handlersIndex.indexOf('registerThermalReceiptHandlers()')
    const pluginLoop = handlersIndex.indexOf('for (const plugin of ALL_PLUGINS)')
    expect(kernelCall).toBeGreaterThan(-1)
    expect(pluginLoop).toBeGreaterThan(-1)
    expect(kernelCall).toBeLessThan(pluginLoop)
  })

  it('is not registered a second time by the commerce plugin', () => {
    // A second `ipcMain.handle` on the same channel throws in Electron.
    expect(commerceHandlers).not.toContain('registerThermalReceiptHandlers')
    expect(commerceHandlers).not.toContain('receipt.handlers')
  })
})

describe('thermalReceipts renderer API', () => {
  it('is exposed by the shared preload, not a plugin-only one', () => {
    expect(preloadIndex).toContain('thermalReceipts:')
    expect(commercePreload).not.toContain('thermalReceipts')
  })

  it('exposes every channel as its own method', () => {
    for (const key of RECEIPT_KEYS) {
      expect(preloadIndex).toContain(`${key}:`)
      expect(preloadIndex).toContain(`'receipt:${key}'`)
    }
  })

  it('is not gated behind a plugin build flag', () => {
    const start = preloadIndex.indexOf('thermalReceipts:')
    expect(start).toBeGreaterThan(-1)
    const close = /(\r?\n)  \},/.exec(preloadIndex.slice(start))
    expect(close).not.toBeNull()
    const end = start + (close?.index ?? 0)
    expect(preloadIndex.slice(start, end)).not.toContain('__PLUGIN_')
  })
})
