/**
 * Picking a printer without the user having to know which queue is the receipt
 * printer.
 *
 * A Windows machine usually offers a handful of queues: the real thermal
 * printer, "Microsoft Print to PDF", maybe a fax driver and an office laser
 * printer. Printing a receipt to the wrong one wastes a sale's worth of time,
 * so the rules that rank them are pinned here: a queue whose port has nothing
 * plugged into it must never win over one that can reach paper, and a virtual
 * queue (PDF/XPS/Fax) must never win at all.
 *
 * Everything tested here is a pure function of the objects Windows reports, so
 * no printer and no Electron runtime are involved.
 */

import { describe, expect, it } from 'vitest'

import {
  classifyPort,
  guessPaperWidth,
  isUsablePrinter,
  pickBestPrinter,
  rankPrinters,
  scorePrinter,
  type DetectedPrinter
} from '../../main/services/ThermalPrinterService'

const printer = (overrides: Partial<DetectedPrinter> = {}): DetectedPrinter => ({
  path: 'XP-58C',
  name: 'XP-58C',
  isThermal: true,
  portKind: 'usb',
  port: 'USB003',
  portLive: true,
  confidence: 85,
  ...overrides
})

/** The receipts printer the user actually has, plugged in and healthy. */
const XP58C = printer()

describe('classifyPort', () => {
  it('recognises the port families Windows writes into the queue', () => {
    expect(classifyPort('USB003')).toBe('usb')
    expect(classifyPort('usb001')).toBe('usb')
    expect(classifyPort('LPT1')).toBe('parallel')
    expect(classifyPort('\\\\SERVER\\SHARE')).toBe('share')
    expect(classifyPort('WSD-1a2b3c')).toBe('wsd')
    expect(classifyPort('PORTPROMPT:')).toBe('virtual')
    expect(classifyPort('nul')).toBe('virtual')
  })

  it('treats an address, and anything that is plainly a network socket, as network', () => {
    expect(classifyPort('192.168.1.50')).toBe('network')
    expect(classifyPort('IP_192.168.1.50')).toBe('network')
    expect(classifyPort('tcp://192.168.1.50:9100')).toBe('network')
  })

  it('says nothing when the queue does not report a port at all', () => {
    expect(classifyPort(undefined)).toBeUndefined()
    expect(classifyPort('   ')).toBeUndefined()
  })
})

describe('guessPaperWidth', () => {
  it('reads the width out of the driver paper name', () => {
    expect(guessPaperWidth('58 x 210 mm', 'XP-58C')).toBe('58mm')
    expect(guessPaperWidth('80 x 297 mm', 'POS-80')).toBe('80mm')
  })

  it('falls back to the printer name people bought', () => {
    expect(guessPaperWidth(undefined, 'XP-58C')).toBe('58mm')
    expect(guessPaperWidth(undefined, 'POS-80')).toBe('80mm')
    expect(guessPaperWidth(undefined, 'Thermal Receipt Printer 80mm')).toBe('80mm')
  })

  it('refuses to guess for a printer that is not a receipt printer', () => {
    expect(guessPaperWidth(undefined, 'HP LaserJet Pro')).toBeUndefined()
    expect(guessPaperWidth('A4 210 x 297 mm', 'HP LaserJet Pro')).toBeUndefined()
  })
})

describe('scorePrinter', () => {
  it('prefers a live thermal queue over a virtual one', () => {
    const pdf = printer({
      path: 'Microsoft Print to PDF',
      name: 'Microsoft Print to PDF',
      isThermal: false,
      isVirtual: true,
      portKind: 'virtual',
      port: 'PORTPROMPT:',
      confidence: 5
    })
    expect(scorePrinter(pdf)).toBeGreaterThan(scorePrinter(XP58C))
  })

  it('pushes a queue whose port is empty below one that can reach paper', () => {
    const deadPort = printer({ path: 'XP-58C', port: 'USB002', portLive: false })
    expect(scorePrinter(deadPort)).toBeGreaterThan(scorePrinter(XP58C))
    expect(isUsablePrinter(deadPort)).toBe(false)
    expect(isUsablePrinter(XP58C)).toBe(true)
  })

  it('counts offline, reported problems and stuck jobs against a queue', () => {
    const base = scorePrinter(printer({ isDefault: false, confidence: 50 }))
    expect(scorePrinter(printer({ isOffline: true, isDefault: false, confidence: 50 }))).toBeGreaterThan(base)
    expect(scorePrinter(printer({ problem: 'no-paper', isDefault: false, confidence: 50 }))).toBeGreaterThan(base)
    expect(scorePrinter(printer({ stuckJobs: 3, isDefault: false, confidence: 50 }))).toBeGreaterThan(base)
  })

  it('lifts the queue the user already saved by a fixed amount', () => {
    // Confidence and default-ness are pinned so the only difference is the
    // preference, which is what the comparison is about.
    const candidate = printer({
      path: 'POS-80',
      name: 'POS-80',
      isThermal: false,
      isDefault: false,
      confidence: 30
    })
    const scored = scorePrinter(candidate)
    expect(scored).toBeGreaterThan(30)
    expect(scorePrinter(candidate, 'POS-80')).toBe(scored - 30)
    expect(scorePrinter(candidate, 'OTHER')).toBe(scored)
  })

  it('never returns a value outside 0-120', () => {
    for (const candidate of [XP58C, printer({ isVirtual: true, portKind: 'virtual' }), printer({ isOffline: true, portLive: false, problem: 'offline' })]) {
      const score = scorePrinter(candidate)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(120)
    }
  })
})

describe('rankPrinters', () => {
  it('puts the receipt printer first and the PDF queue last', () => {
    const pdf = printer({ name: 'Microsoft Print to PDF', path: 'Microsoft Print to PDF', isThermal: false, isVirtual: true, portKind: 'virtual', confidence: 5 })
    const laser = printer({ name: 'Office Laser', path: 'Office Laser', isThermal: false, portKind: 'network', port: '192.168.1.9', confidence: 40 })

    expect(rankPrinters([pdf, laser, XP58C]).map(p => p.name)).toEqual(['XP-58C', 'Office Laser', 'Microsoft Print to PDF'])
  })

  it('honours the saved queue when two printers look alike', () => {
    const pos80 = printer({ name: 'POS-80', path: 'POS-80' })
    // Nothing to choose between them, so they come back in name order.
    expect(rankPrinters([XP58C, pos80]).map(p => p.name)).toEqual(['POS-80', 'XP-58C'])
    expect(rankPrinters([XP58C, pos80], 'XP-58C')[0].name).toBe('XP-58C')
  })

  it('but the saved queue still loses when it cannot reach paper', () => {
    const pdf = printer({ name: 'Microsoft Print to PDF', path: 'Microsoft Print to PDF', isVirtual: true, portKind: 'virtual' })
    expect(rankPrinters([pdf, XP58C], 'Microsoft Print to PDF')[0].name).toBe('XP-58C')
  })

  it('does not reorder the array it was given', () => {
    const pdf = printer({ name: 'Microsoft Print to PDF', isVirtual: true, portKind: 'virtual' })
    const input = [pdf, XP58C]
    rankPrinters(input)
    expect(input[0]).toBe(pdf)
  })
})

describe('pickBestPrinter', () => {
  it('returns the first queue that can actually print', () => {
    const deadPort = printer({ name: 'XP-58C (old port)', path: 'XP-58C (old port)', port: 'USB002', portLive: false })
    expect(pickBestPrinter([deadPort, XP58C])?.name).toBe('XP-58C')
  })

  it('returns nothing when every queue is virtual, offline or broken', () => {
    const pdf = printer({ name: 'Microsoft Print to PDF', isVirtual: true, portKind: 'virtual' })
    const offline = printer({ name: 'XP-58C', isOffline: true })
    const broken = printer({ name: 'POS-80', problem: 'no-paper' })
    expect(pickBestPrinter([pdf, offline, broken])).toBeUndefined()
    expect(pickBestPrinter([])).toBeUndefined()
  })
})
