/**
 * Arabic text preparation for a thermal printer's ESC/POS text path.
 *
 * This module is the difference between an Arabic receipt that reads correctly
 * and one that comes out as `?`, so the rules pinned here are the ones a real
 * printer depends on: the letters have to arrive in the *shape* the code page
 * carries, the line has to be flipped into the order a right-to-left reader
 * sees, and a code page with no byte for a letter must report that instead of
 * quietly dropping the letter.
 *
 * The expected values are the Unicode presentation forms (U+FE70-U+FEFF) that
 * the printer's Arabic page holds, spelled as escapes so the test stays
 * readable in a diff.
 */

import { describe, expect, it } from 'vitest'
import * as iconv from 'iconv-lite'

import {
  ARABIC_ENCODING_PREFS,
  canEncode,
  chooseArabicEncoding,
  containsArabic,
  encodeLine,
  isArabicEncoding,
  isArabicEncodingPref,
  resolveArabicEncoding,
  resolveArabicEncodingPref,
  shapeAndOrder,
  shapeArabic,
  stripInvisible,
  toVisualOrder,
  toVisualOrderLtr,
  unsupportedGlyphs,
} from '../../main/services/thermal/arabic'
import { getReceiptLabels } from '../../main/services/thermal/labels'

// One base letter per name; the presentation forms they become are what prints.
const ALEF = '\u0627'
const LAM = '\u0644'
const MEEM = '\u0645'
const SEEN = '\u0633'
const ALEF_HAMZA_BELOW = '\u0625'
const YEH = '\u064a'
const SAD = '\u0635'

const SALAM = SEEN + LAM + ALEF + MEEM
const EESAL = ALEF_HAMZA_BELOW + YEH + SAD + ALEF + LAM
const ALMAJMOO = '\u0627\u0644\u0645\u062c\u0645\u0648\u0639'
const AROZ = '\u0623\u0631\u0632'

/** Readable list of a string's code points, for assertion messages. */
const codepoints = (value: string): string =>
  Array.from(value)
    .map((char) => `U+${char.codePointAt(0)!.toString(16).toUpperCase()}`)
    .join(' ')

describe('Arabic code pages', () => {
  it('shapes into presentation forms for CP864', () => {
    // Seen joins forward (initial), LAM+ALEF is one ligature, MEEM stands alone.
    expect(codepoints(shapeArabic(SALAM, 'cp864'))).toBe('U+FEB3 U+FEFC U+FEE1')
  })

  it('leaves WPC1256 unshaped because that page carries the base letters', () => {
    expect(shapeArabic(SALAM, 'win1256')).toBe(SALAM)
  })

  it('writes LAM + ALEF as the single ligature glyph', () => {
    expect(codepoints(shapeArabic(LAM + ALEF, 'cp864'))).toBe('U+FEFB')
  })

  it('falls back to two letters when the page has no ligature, keeping both', () => {
    // This CP864 table has no LAM + ALEF-HAMZA-BELOW glyph, so the two letters
    // are written instead - and the LAM must not be lost on the way.
    const shaped = shapeArabic(LAM + ALEF_HAMZA_BELOW, 'cp864')
    expect(Array.from(shaped)).toHaveLength(2)
    expect(canEncode(shaped[0], 'cp864')).toBe(true)
  })

  it('drops harakat instead of printing them as question marks', () => {
    const withHarakat = SEEN + '\u064e' + LAM + '\u064e' + ALEF + MEEM
    const shaped = shapeArabic(withHarakat, 'cp864')
    expect(shaped).not.toMatch(/[\u064b-\u0652]/)
    // Every letter survives as a presentation form; the mark sitting between
    // LAM and ALEF costs the ligature, not a letter.
    expect(Array.from(shaped)).toHaveLength(4)
    for (const char of Array.from(shaped)) {
      expect(char.codePointAt(0)!).toBeGreaterThanOrEqual(0xfe70)
    }
  })

  it('streams a line on the right code page and returns to ASCII', () => {
    const line = encodeLine(EESAL + ' 12', 'win1256')
    expect(line.unsupported).toEqual([])
    expect([...line.buffer.subarray(0, 3)]).toEqual([0x1b, 0x74, 50])
    expect(iconv.decode(line.buffer.subarray(3, 3 + EESAL.length), 'win1256')).toBe(EESAL)
    // Back to the ASCII page before the amount, which the Arabic page has no
    // slots for.
    const backToAscii = 3 + EESAL.length
    expect([...line.buffer.subarray(backToAscii, backToAscii + 3)]).toEqual([0x1b, 0x74, 0x00])
    expect(line.buffer.subarray(backToAscii + 3).toString('latin1')).toBe(' 12')
  })

  it('never encodes a letter the page cannot write as a question mark', () => {
    // This table's CP864 has no medial SAD / isolated ALEF-HAMZA-BELOW, so the
    // glyphs are reported for the caller to rasterise rather than printed wrong.
    const line = encodeLine(shapeAndOrder(EESAL, 'cp864'), 'cp864')
    expect(line.unsupported.length).toBeGreaterThan(0)
    expect(line.buffer.includes(0x3f)).toBe(false)
  })

  it('reports nothing missing for WPC1256, the code page text mode relies on', () => {
    expect(unsupportedGlyphs(EESAL, 'win1256')).toEqual([])
  })
})

describe('line direction', () => {
  it('puts the number first and the Arabic run last on a right-to-left line', () => {
    const visual = toVisualOrder(`${ALMAJMOO} 12.50`)
    expect(visual.startsWith('12.50 ')).toBe(true)
    expect(visual.slice(6)).toBe(Array.from(ALMAJMOO).reverse().join(''))
  })

  it('reverses only the Arabic run of a left-to-right line', () => {
    // An Arabic item name on an English receipt: "Item: ARABIC 2".
    const visual = toVisualOrderLtr(`Item: ${AROZ} 2`)
    expect(visual).toBe(`Item: ${Array.from(AROZ).reverse().join('')} 2`)
  })

  it('passes text without Arabic through untouched', () => {
    expect(shapeAndOrder('Total: 12.50', 'cp864')).toBe('Total: 12.50')
    expect(toVisualOrderLtr('Total: 12.50')).toBe('Total: 12.50')
  })

  it('strips direction controls that have no glyph on any Arabic page', () => {
    expect(stripInvisible('a\u200fb\u00a0c\u200e')).toBe('ab c')
  })
})

describe('helpers', () => {
  it('detects Arabic script only when there is Arabic in the string', () => {
    expect(containsArabic(SALAM)).toBe(true)
    expect(containsArabic('Receipt 12')).toBe(false)
    expect(containsArabic('')).toBe(false)
    expect(containsArabic(null)).toBe(false)
  })

  it('accepts only the two known Arabic code pages', () => {
    expect(isArabicEncoding('cp864')).toBe(true)
    expect(isArabicEncoding('nope')).toBe(false)
    expect(resolveArabicEncoding('win1256')).toBe('win1256')
    expect(resolveArabicEncoding(undefined)).toBe('cp864')
  })

  it('offers the two pages plus auto, and nothing else', () => {
    expect(ARABIC_ENCODING_PREFS).toEqual(['auto', 'cp864', 'win1256'])
    expect(isArabicEncodingPref('auto')).toBe(true)
    expect(isArabicEncodingPref('cp864')).toBe(true)
    expect(isArabicEncodingPref('latin1')).toBe(false)
    expect(isArabicEncodingPref(undefined)).toBe(false)
  })

  it('resolves auto to the code page older printers expect', () => {
    expect(resolveArabicEncodingPref('auto')).toBe('cp864')
    expect(resolveArabicEncodingPref(undefined)).toBe('cp864')
    expect(resolveArabicEncodingPref('win1256')).toBe('win1256')
  })

  it('lets a receipt pick the page that can write the most of its own text', () => {
    // EESAL ("receipt") needs glyphs this CP864 table does not have, so the
    // page CP864 loses to is the one a text-mode receipt should use.
    expect(unsupportedGlyphs(EESAL, 'cp864').length).toBeGreaterThan(0)
    expect(unsupportedGlyphs(EESAL, 'win1256')).toEqual([])
    expect(chooseArabicEncoding([EESAL, 'Total: 12.50'], 'auto')).toBe('win1256')

    // An explicit choice from the user is never second-guessed.
    expect(chooseArabicEncoding([EESAL], 'cp864')).toBe('cp864')
  })

  it('falls back to CP864 for a receipt with no Arabic on it at all', () => {
    expect(chooseArabicEncoding(['Espresso 2', '', undefined, null], 'auto')).toBe('cp864')
    expect(chooseArabicEncoding([], 'auto')).toBe('cp864')
  })

  it('keeps every Arabic receipt label printable on the code page text mode uses', () => {
    // Labels are printed next to the data, so a label the page cannot write
    // would break the text path for every Arabic receipt.
    for (const language of ['en', 'ar'] as const) {
      for (const [key, value] of Object.entries(getReceiptLabels(language))) {
        expect(unsupportedGlyphs(value, 'win1256'), `${language}.${key}`).toEqual([])
      }
    }
  })
})
