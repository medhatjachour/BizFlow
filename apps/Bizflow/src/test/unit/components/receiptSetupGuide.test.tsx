/**
 * The "?" that explains receipt setup.
 *
 * A receipt printer has to exist as an operating-system print queue before the
 * app can print to it, so the guide has to name the system it detected and give
 * that system's install steps. These tests pin the platform detection, the
 * popover mechanics (open, Escape, outside click) and the fact that the rendered
 * text comes from the dictionary rather than from a raw i18n key.
 */

import { fireEvent, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { LanguageProvider } from '../../../renderer/src/contexts/LanguageContext'
import { translations } from '../../../renderer/src/i18n/translations'
import DesignPanel from '../../../renderer/src/pages/Settings/receipt/DesignPanel'
import { InfoHint } from '../../../renderer/src/pages/Settings/receipt/formControls'
import ReceiptGuide from '../../../renderer/src/pages/Settings/receipt/ReceiptGuide'
import TaxPanel from '../../../renderer/src/pages/Settings/receipt/TaxPanel'
import {
  detectPlatform,
  platformLabel
} from '../../../renderer/src/pages/Settings/receipt/platform'
import type { TaxReceiptSettings } from '../../../renderer/src/pages/Settings/types'

const USER_AGENTS = {
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
  macos: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17 Safari',
  linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
  other: 'Mozilla/5.0 (Unknown) AppleWebKit/537.36'
}

const setUserAgent = (userAgent: string): void => {
  Object.defineProperty(window.navigator, 'userAgent', { value: userAgent, configurable: true })
}

const showGuide = (language: 'en' | 'ar' = 'en') => {
  localStorage.setItem('language', language)
  render(
    <LanguageProvider>
      <ReceiptGuide />
    </LanguageProvider>
  )
  return screen.getByRole('button', { name: translations[language].trGuideOpen })
}

const openGuide = (language: 'en' | 'ar' = 'en') => {
  const trigger = showGuide(language)
  fireEvent.click(trigger)
  return trigger
}

const panel = () => screen.getByRole('dialog')

const osLine = (language: 'en' | 'ar', os: string) =>
  translations[language].trGuideOsDetected.replace('{os}', os)

describe('receipt setup guide platform detection', () => {
  it('recognises the three desktop systems the app ships on', () => {
    expect(detectPlatform(USER_AGENTS.windows)).toBe('windows')
    expect(detectPlatform(USER_AGENTS.macos)).toBe('macos')
    expect(detectPlatform(USER_AGENTS.linux)).toBe('linux')
    expect(detectPlatform(USER_AGENTS.other)).toBe('other')
    expect(detectPlatform('')).toBe('other')
  })

  it('names the systems it recognises and stays silent about the rest', () => {
    expect(platformLabel('windows')).toBe('Windows')
    expect(platformLabel('macos')).toBe('macOS')
    expect(platformLabel('linux')).toBe('Linux')
    expect(platformLabel('other')).toBe('')
  })
})

describe('receipt setup guide', () => {
  beforeEach(() => {
    setUserAgent(USER_AGENTS.windows)
  })

  it('stays closed until the icon is pressed', () => {
    const trigger = showGuide()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(panel()).toBeInTheDocument()

    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the intro, the detected system and every step', () => {
    openGuide()
    const guide = panel()

    expect(within(guide).getByText(translations.en.trGuideIntro)).toBeInTheDocument()
    expect(within(guide).getByText(osLine('en', 'Windows'))).toBeInTheDocument()
    for (const key of [
      'trGuideOsWindows',
      'trGuideStepDetect',
      'trGuideStepPaper',
      'trGuideStepArabic',
      'trGuideStepTax',
      'trGuideDevNote'
    ] as const) {
      expect(within(guide).getByText(translations.en[key])).toBeInTheDocument()
    }
  })

  it('gives the steps of the system it is running on', () => {
    setUserAgent(USER_AGENTS.macos)
    openGuide()
    expect(within(panel()).getByText(translations.en.trGuideOsMac)).toBeInTheDocument()
    expect(within(panel()).queryByText(translations.en.trGuideOsWindows)).not.toBeInTheDocument()
  })

  it('names no system it cannot recognise, and never shows a raw key', () => {
    setUserAgent(USER_AGENTS.other)
    openGuide()
    const guide = panel()

    expect(
      within(guide).getByText(osLine('en', translations.en.trGuideOsUnknown))
    ).toBeInTheDocument()
    expect(within(guide).getByText(translations.en.trGuideOsOther)).toBeInTheDocument()
    expect(guide.textContent).not.toContain('trGuide')
  })

  it('speaks Arabic when the shop does', () => {
    openGuide('ar')
    const guide = panel()

    expect(within(guide).getByText(translations.ar.trGuideIntro)).toBeInTheDocument()
    expect(within(guide).getByText(osLine('ar', 'Windows'))).toBeInTheDocument()
    expect(within(guide).getByText(translations.ar.trGuideStepArabic)).toBeInTheDocument()
  })

  it('closes on Escape', () => {
    openGuide()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes when the click lands outside', () => {
    openGuide()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps the panel open while the pointer is inside it', () => {
    openGuide()
    fireEvent.mouseDown(within(panel()).getByText(translations.en.trGuideTitle))
    expect(screen.queryByRole('dialog')).toBeInTheDocument()
  })
})

describe('info hints on the receipt panels', () => {
  const settings = { taxRate: 15 } as unknown as TaxReceiptSettings

  beforeEach(() => {
    localStorage.setItem('language', 'en')
  })

  it('opens the hint of the design and tax panels', () => {
    render(
      <LanguageProvider>
        <DesignPanel settings={settings} onChange={() => {}} />
        <TaxPanel settings={settings} onChange={() => {}} />
      </LanguageProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: translations.en.trHintDesignTitle }))
    expect(screen.getByText(translations.en.trHintDesignBody)).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: translations.en.trHintTaxTitle }))
    expect(screen.getByText(translations.en.trHintTaxBody)).toBeInTheDocument()
  })

  it('closes the hint that was already open when another one is pressed', () => {
    render(
      <LanguageProvider>
        <DesignPanel settings={settings} onChange={() => {}} />
        <TaxPanel settings={settings} onChange={() => {}} />
      </LanguageProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: translations.en.trHintDesignTitle }))
    expect(screen.getByText(translations.en.trHintDesignBody)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: translations.en.trHintTaxTitle }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByText(translations.en.trHintTaxBody)).toBeInTheDocument()
    expect(screen.queryByText(translations.en.trHintDesignBody)).not.toBeInTheDocument()
  })

  it('renders whatever the caller passes in', () => {
    render(
      <LanguageProvider>
        <InfoHint label="Field help" title="Field help">
          Plain explanation
        </InfoHint>
      </LanguageProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Field help' }))
    expect(within(panel()).getByText('Plain explanation')).toBeInTheDocument()
  })
})
