/**
 * Arabic text support for ESC/POS thermal printers.
 *
 * A thermal printer has no text engine: the firmware paints whatever glyph a
 * byte points at in the active code page. Both Arabic code pages these printers
 * ship are single byte pages, so the text has to be prepared before it is
 * encoded:
 *
 *  - CP864 (page 37) carries *presentation forms* (U+FE70–U+FEFF) and not the
 *    base letters, so the text must be shaped (joined) first. Feeding a plain
 *    `م` to that page encodes as `?`, which is why unshaped Arabic came out as
 *    question marks.
 *  - WPC1256 (page 50) carries the base letters and leaves the joining to the
 *    printer firmware, so that text is sent unshaped.
 *
 * Shaping is not enough on its own: Arabic runs right to left while a printer
 * only ever writes left to right, so every line is also re-ordered into visual
 * order, keeping numbers and Latin words as intact left-to-right islands.
 */

import * as iconv from 'iconv-lite'

export type ArabicEncoding = 'cp864' | 'win1256'

export interface ArabicCodePage {
  /** argument of `ESC t n` */
  page: number
  /** name used by node-thermal-printer's `setCharacterSet` */
  characterSet: 'PC864_ARABIC' | 'WPC1256_ARABIC'
  /** name used by iconv-lite */
  iconv: ArabicEncoding
  /** CP864 needs presentation forms, WPC1256 must not be shaped */
  shaped: boolean
  /** short label for diagnostics and settings */
  label: string
}

export const ARABIC_CODE_PAGES: Record<ArabicEncoding, ArabicCodePage> = {
  cp864: { page: 37, characterSet: 'PC864_ARABIC', iconv: 'cp864', shaped: true, label: 'CP864 / page 37' },
  win1256: { page: 50, characterSet: 'WPC1256_ARABIC', iconv: 'win1256', shaped: false, label: 'WPC1256 / page 50' },
}

export const DEFAULT_ARABIC_ENCODING: ArabicEncoding = 'cp864'

export const ARABIC_ENCODINGS: ArabicEncoding[] = ['cp864', 'win1256']

/**
 * What the user picked for Arabic output: a fixed code page, or `auto` to let
 * each receipt's own text decide. `auto` is the default because the two pages
 * disagree about which letters they carry, and no one can know in advance which
 * one their printer's ROM follows.
 */
export type ArabicEncodingPref = ArabicEncoding | 'auto'

export const ARABIC_ENCODING_PREFS: ArabicEncodingPref[] = ['auto', ...ARABIC_ENCODINGS]

export function isArabicEncodingPref(value: unknown): value is ArabicEncodingPref {
  return value === 'auto' || isArabicEncoding(value)
}

/** Resolve a preference to a page, falling back to the classic CP864 ordering. */
export function resolveArabicEncodingPref(value: unknown): ArabicEncoding {
  return isArabicEncoding(value) ? value : DEFAULT_ARABIC_ENCODING
}

/** Code page the printer starts on and that carries plain ASCII and Latin text. */
const ASCII_PAGE = 0

const ESC = 0x1b

/**
 * Presentation forms per base letter: [isolated, final, initial, medial].
 * An empty string means the letter has no such form, which is also what decides
 * whether it can join to the letter before (`final`) or after (`initial`) it.
 */
const FORMS: Record<string, readonly [string, string, string, string]> = {
  '\u0621': ['\uFE80', '', '', ''],
  '\u0622': ['\uFE81', '\uFE82', '', ''],
  '\u0623': ['\uFE83', '\uFE84', '', ''],
  '\u0624': ['\uFE85', '\uFE86', '', ''],
  '\u0625': ['\uFE87', '\uFE88', '', ''],
  '\u0626': ['\uFE89', '\uFE8A', '\uFE8B', '\uFE8C'],
  '\u0627': ['\uFE8D', '\uFE8E', '', ''],
  '\u0628': ['\uFE8F', '\uFE90', '\uFE91', '\uFE92'],
  '\u0629': ['\uFE93', '\uFE94', '', ''],
  '\u062A': ['\uFE95', '\uFE96', '\uFE97', '\uFE98'],
  '\u062B': ['\uFE99', '\uFE9A', '\uFE9B', '\uFE9C'],
  '\u062C': ['\uFE9D', '\uFE9E', '\uFE9F', '\uFEA0'],
  '\u062D': ['\uFEA1', '\uFEA2', '\uFEA3', '\uFEA4'],
  '\u062E': ['\uFEA5', '\uFEA6', '\uFEA7', '\uFEA8'],
  '\u062F': ['\uFEA9', '\uFEAA', '', ''],
  '\u0630': ['\uFEAB', '\uFEAC', '', ''],
  '\u0631': ['\uFEAD', '\uFEAE', '', ''],
  '\u0632': ['\uFEAF', '\uFEB0', '', ''],
  '\u0633': ['\uFEB1', '\uFEB2', '\uFEB3', '\uFEB4'],
  '\u0634': ['\uFEB5', '\uFEB6', '\uFEB7', '\uFEB8'],
  '\u0635': ['\uFEB9', '\uFEBA', '\uFEBB', '\uFEBC'],
  '\u0636': ['\uFEBD', '\uFEBE', '\uFEBF', '\uFEC0'],
  '\u0637': ['\uFEC1', '\uFEC2', '\uFEC3', '\uFEC4'],
  '\u0638': ['\uFEC5', '\uFEC6', '\uFEC7', '\uFEC8'],
  '\u0639': ['\uFEC9', '\uFECA', '\uFECB', '\uFECC'],
  '\u063A': ['\uFECD', '\uFECE', '\uFECF', '\uFED0'],
  '\u0640': ['\u0640', '\u0640', '\u0640', '\u0640'],
  '\u0641': ['\uFED1', '\uFED2', '\uFED3', '\uFED4'],
  '\u0642': ['\uFED5', '\uFED6', '\uFED7', '\uFED8'],
  '\u0643': ['\uFED9', '\uFEDA', '\uFEDB', '\uFEDC'],
  '\u0644': ['\uFEDD', '\uFEDE', '\uFEDF', '\uFEE0'],
  '\u0645': ['\uFEE1', '\uFEE2', '\uFEE3', '\uFEE4'],
  '\u0646': ['\uFEE5', '\uFEE6', '\uFEE7', '\uFEE8'],
  '\u0647': ['\uFEE9', '\uFEEA', '\uFEEB', '\uFEEC'],
  '\u0648': ['\uFEED', '\uFEEE', '', ''],
  '\u0649': ['\uFEEF', '\uFEF0', '', ''],
  '\u064A': ['\uFEF1', '\uFEF2', '\uFEF3', '\uFEF4'],
  '\u0671': ['\uFB50', '\uFB51', '', ''],
}

/** LAM + ALEF is written as one glyph: [isolated, final]. */
const LAM_ALEF: Record<string, readonly [string, string]> = {
  '\u0622': ['\uFEF5', '\uFEF6'],
  '\u0623': ['\uFEF7', '\uFEF8'],
  '\u0625': ['\uFEF9', '\uFEFA'],
  '\u0627': ['\uFEFB', '\uFEFC'],
}

const LAM = '\u0644'

/**
 * Harakat and Quranic marks. A thermal font cannot place them beside a joined
 * letter and most code pages have no byte for them, so they are dropped rather
 * than printed as `?`.
 */
const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/

/**
 * Directional and zero-width controls. `Intl` inserts RLM/LRM around Arabic
 * numbers, and no Arabic page has a byte for them, so they would print as `?`.
 * Direction is decided by the orderer below, so they are dropped instead.
 */
const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g

const ARABIC_SCRIPT = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/

/** Digits and Latin letters stay left to right even inside an Arabic line. */
const ALNUM = /[0-9A-Za-z\u0660-\u0669]/
/** Punctuation that belongs to a number or a Latin word rather than to the sentence. */
const PART_OF_ISLAND = /[.,:%/+\-*#]/
const MIRRORED: Record<string, string> = {
  '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<',
}

export function containsArabic(text: string | undefined | null): boolean {
  return !!text && ARABIC_SCRIPT.test(text)
}

/**
 * Remove characters that have no glyph to print: bidi controls, zero-width
 * marks and a non-breaking space written as a plain space.
 */
export function stripInvisible(text: string): string {
  return text.replace(INVISIBLE, '').replace(/\u00A0/g, ' ')
}

export function isArabicEncoding(value: unknown): value is ArabicEncoding {
  return value === 'cp864' || value === 'win1256'
}

export function resolveArabicEncoding(value: unknown): ArabicEncoding {
  return isArabicEncoding(value) ? value : DEFAULT_ARABIC_ENCODING
}

/** True when the active code page has a byte for this character. */
export function canEncode(char: string, encoding: ArabicEncoding): boolean {
  try {
    return iconv.encode(char, ARABIC_CODE_PAGES[encoding].iconv).toString('latin1') !== '?'
  } catch {
    return false
  }
}

/** Nearest base letter before `index`, skipping harakat. Null when joining breaks. */
function letterBefore(chars: string[], index: number): string | null {
  for (let i = index - 1; i >= 0; i--) {
    if (DIACRITICS.test(chars[i])) continue
    return FORMS[chars[i]] ? chars[i] : null
  }
  return null
}

/** Nearest base letter after `index`, skipping harakat. Null when joining breaks. */
function letterAfter(chars: string[], index: number): string | null {
  for (let i = index + 1; i < chars.length; i++) {
    if (DIACRITICS.test(chars[i])) continue
    return FORMS[chars[i]] ? chars[i] : null
  }
  return null
}

/**
 * Best encodable form of a letter: prefer the form that joins backwards when
 * the letter attaches to the one before it, so a fallback never silently drops
 * a letter the page could have carried in another form.
 */
function pickForm(letter: string, joiningPrev: boolean, encoding: ArabicEncoding): string {
  const forms = FORMS[letter]
  const order = joiningPrev ? [1, 0, 3, 2] : [0, 2, 1, 3]
  for (const index of order) {
    const form = forms[index]
    if (form && canEncode(form, encoding)) return form
  }
  return joiningPrev && forms[1] ? forms[1] : forms[0]
}

/**
 * Join base letters into the presentation forms the printer's Arabic page
 * carries. Input and output are both in logical order; only glyphs change.
 */
export function shapeArabic(text: string, encoding: ArabicEncoding = DEFAULT_ARABIC_ENCODING): string {
  if (!ARABIC_CODE_PAGES[encoding].shaped) return stripInvisible(text)

  const chars = Array.from(stripInvisible(text))
  const out: string[] = []

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]

    if (DIACRITICS.test(ch)) continue

    const previous = letterBefore(chars, i)
    const joiningPrev = previous ? FORMS[previous][2] !== '' : false
    const next = letterAfter(chars, i)
    const joiningNext = next ? FORMS[next][1] !== '' : false

    const ligature = ch === LAM ? LAM_ALEF[chars[i + 1]] : undefined
    if (ligature) {
      const created = joiningPrev ? ligature[1] : ligature[0]
      if (canEncode(created, encoding)) {
        out.push(created)
      } else {
        // CP864 leaves out LAM + ALEF-HAMZA-BELOW; write the two letters instead.
        const alef = chars[i + 1]
        out.push(pickForm(LAM, joiningPrev, encoding))
        out.push(pickForm(alef, joiningPrev, encoding))
      }
      i++
      continue
    }

    const forms = FORMS[ch]
    if (!forms) {
      out.push(ch)
      continue
    }

    if (joiningPrev && joiningNext && forms[3]) out.push(forms[3])
    else if (joiningPrev && forms[1]) out.push(forms[1])
    else if (joiningNext && forms[2]) out.push(forms[2])
    else out.push(forms[0])
  }

  return out.join('')
}

interface Token {
  island: boolean
  text: string
}

function tokenize(text: string): Token[] {
  const chars = Array.from(text)
  const tokens: Token[] = []

  for (let i = 0; i < chars.length; i++) {
    if (!ALNUM.test(chars[i])) {
      tokens.push({ island: false, text: chars[i] })
      continue
    }

    let word = chars[i]
    let j = i + 1
    while (j < chars.length && (ALNUM.test(chars[j]) || PART_OF_ISLAND.test(chars[j]))) {
      word += chars[j]
      j++
    }

    // A trailing '.' or ':' belongs to the sentence, not to the number.
    const trailing = /[.,:%/+\-*#]+$/.exec(word)?.[0] ?? ''
    if (trailing) {
      word = word.slice(0, -trailing.length)
      j -= trailing.length
    }

    tokens.push({ island: true, text: word })
    i = j - 1
  }

  return tokens
}

/**
 * Re-order one logical line into the visual order an RTL line is read in.
 * Numbers, times and Latin words keep their own left-to-right order.
 */
export function toVisualOrder(text: string): string {
  return tokenize(stripInvisible(text))
    .reverse()
    .map(token => {
      if (token.island) return token.text
      const mirrored = MIRRORED[token.text] ?? token.text
      return Array.from(mirrored).reverse().join('')
    })
    .join('')
}

/** Shape (when the page needs it) and re-order a single line. */
export function shapeAndOrder(text: string, encoding: ArabicEncoding = DEFAULT_ARABIC_ENCODING): string {
  if (!containsArabic(text)) return text
  return toVisualOrder(shapeArabic(text, encoding))
}

/**
 * Re-order the Arabic runs of a left-to-right line (an Arabic product name on an
 * English receipt), leaving numbers and Latin words where they are.
 */
export function toVisualOrderLtr(text: string): string {
  if (!containsArabic(text)) return stripInvisible(text)
  return stripInvisible(text).replace(
    /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]+(?:[ \t]+[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]+)*/g,
    run => toVisualOrder(run)
  )
}

/**
 * Latin text goes out on the printer's ASCII page. Anything that page has no
 * byte for falls back to its ASCII base, so a stray `é` prints as `e` instead
 * of `?`.
 */
function encodeLatin(text: string): Buffer {
  const bytes: number[] = []

  for (const ch of Array.from(text)) {
    if (/^[\x00-\x7F]$/.test(ch)) {
      bytes.push(ch.charCodeAt(0))
      continue
    }

    const ascii = iconv.encode(ch, 'cp437')
    if (ascii.toString('latin1') !== '?') {
      bytes.push(...Array.from(ascii))
      continue
    }

    const base = ch.normalize('NFD').replace(/[\u0300-\u036F]/g, '')
    bytes.push(...Array.from(iconv.encode(base === ch ? '?' : base, 'cp437')))
  }

  return Buffer.from(bytes)
}

export interface EncodedLine {
  buffer: Buffer
  /** Characters the printer's Arabic page has no glyph for. */
  unsupported: string[]
}

/**
 * Encode a prepared line for the printer, switching code page per run so the
 * Arabic glyphs and the ASCII around them each land on a page that has them.
 *
 * The bytes come back as a Buffer on purpose: node-thermal-printer's
 * `append(string)` re-encodes character by character and would inject page
 * switches into the middle of an Arabic word.
 */
export function encodeLine(text: string, encoding: ArabicEncoding = DEFAULT_ARABIC_ENCODING): EncodedLine {
  const page = ARABIC_CODE_PAGES[encoding]
  const unsupported: string[] = []
  const buffers: Buffer[] = []
  let activePage: ArabicEncoding | null = null

  const push = (bytes: Buffer, run: ArabicEncoding | null): void => {
    if (run !== activePage) {
      buffers.push(Buffer.from([ESC, 0x74, run === null ? ASCII_PAGE : page.page]))
      activePage = run
    }
    buffers.push(bytes)
  }

  let latin = ''
  let arabic = ''

  const flushLatin = (): void => {
    if (!latin) return
    push(encodeLatin(latin), null)
    latin = ''
  }

  const flushArabic = (): void => {
    if (!arabic) return
    push(iconv.encode(arabic, page.iconv), encoding)
    arabic = ''
  }

  for (const ch of Array.from(stripInvisible(text))) {
    if (!ARABIC_SCRIPT.test(ch)) {
      flushArabic()
      latin += ch
      continue
    }

    flushLatin()
    if (canEncode(ch, encoding)) arabic += ch
    else unsupported.push(ch)
  }

  flushArabic()
  flushLatin()
  // Leave the printer on the page the rest of the receipt is written in.
  push(Buffer.alloc(0), null)

  return { buffer: Buffer.concat(buffers), unsupported }
}

/** Characters in `text` that would print as `?` in this code page. */
export function unsupportedGlyphs(text: string, encoding: ArabicEncoding = DEFAULT_ARABIC_ENCODING): string[] {
  return encodeLine(shapeAndOrder(text, encoding), encoding).unsupported
}

/**
 * Page that can print the most of `texts`.
 *
 * Both Arabic pages lose different letters (CP864 has no glyphs for parts of the
 * WPC1256 alphabet and the other way round), so the page with the fewest gaps
 * wins; a tie keeps CP864, which is what older printers expect.
 */
export function chooseArabicEncoding(
  texts: Array<string | undefined | null>,
  pref: ArabicEncodingPref = 'auto',
): ArabicEncoding {
  if (isArabicEncoding(pref)) return pref

  const lines = texts.filter((text): text is string => !!text && ARABIC_SCRIPT.test(text))
  if (lines.length === 0) return DEFAULT_ARABIC_ENCODING

  let best = DEFAULT_ARABIC_ENCODING
  let fewest = Number.POSITIVE_INFINITY

  for (const encoding of ARABIC_ENCODINGS) {
    let gaps = 0
    for (const line of lines) gaps += unsupportedGlyphs(line, encoding).length
    if (gaps < fewest) {
      fewest = gaps
      best = encoding
    }
  }

  return best
}
