/**
 * BizFlow Icon Generator
 * Source: build/WhatsApp Image 2026-05-08 at 1.52.00 PM.jpeg
 * Steps:
 *   1. Load the JPEG
 *   2. Remove white/near-white pixels (make them transparent)
 *   3. Composite the mark onto a dark navy background
 *   4. Export: icon.png, icon.ico, icon.icns
 * Run: node scripts/create-bizflow-icons.js
 */

const sharp = require('sharp')
const path  = require('path')
const fs    = require('fs')

const BUILD_DIR     = path.join(__dirname, '..', 'build')
const RESOURCES_DIR = path.join(__dirname, '..', 'resources')
const SOURCE        = path.join(BUILD_DIR, 'WhatsApp Image 2026-05-08 at 1.52.00 PM.jpeg')

// Dark navy background (no white)
const BG_COLOR = { r: 10, g: 18, b: 50, alpha: 1 }

// ─── ICO builder ─────────────────────────────────────────────────────────────
function buildIco(pngBuffers, sizes) {
  const n = pngBuffers.length
  const HEADER = 6, ENTRY = 16
  let off = HEADER + n * ENTRY
  const offsets = pngBuffers.map(b => { const o = off; off += b.length; return o })
  const ico = Buffer.alloc(off)
  ico.writeUInt16LE(0, 0); ico.writeUInt16LE(1, 2); ico.writeUInt16LE(n, 4)
  pngBuffers.forEach((buf, i) => {
    const base = HEADER + i * ENTRY
    const dim  = sizes[i] >= 256 ? 0 : sizes[i]
    ico.writeUInt8(dim, base);      ico.writeUInt8(dim, base + 1)
    ico.writeUInt8(0, base + 2);    ico.writeUInt8(0, base + 3)
    ico.writeUInt16LE(1, base + 4); ico.writeUInt16LE(32, base + 6)
    ico.writeUInt32LE(buf.length, base + 8)
    ico.writeUInt32LE(offsets[i],  base + 12)
    buf.copy(ico, offsets[i])
  })
  return ico
}

// ─── ICNS builder ─────────────────────────────────────────────────────────────
function buildIcns(entries) {
  const chunks = entries.map(({ key, buf }) => {
    const h = Buffer.alloc(8)
    h.write(key, 0, 'ascii')
    h.writeUInt32BE(buf.length + 8, 4)
    return Buffer.concat([h, buf])
  })
  const body = Buffer.concat(chunks)
  const hdr  = Buffer.alloc(8)
  hdr.write('icns', 0, 'ascii')
  hdr.writeUInt32BE(body.length + 8, 4)
  return Buffer.concat([hdr, body])
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('BizFlow Icon Generator')
  console.log('Source:', SOURCE)
  console.log()

  if (!fs.existsSync(SOURCE)) {
    console.error('ERROR: Source file not found:', SOURCE)
    process.exit(1)
  }

  // 1. Load JPEG as raw RGBA
  const { data, info } = await sharp(SOURCE)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height } = info
  console.log(`  Source: ${width}x${height}px`)

  // 2. Remove white background using proper alpha-extraction from white bg.
  //    Formula (per channel, white=255 background):
  //      alpha = 1 - min(r,g,b)/255          (darkness of darkest channel)
  //      F_c   = (C_c - 255*(1-alpha)) / alpha  (recover true foreground color)
  //    This eliminates the white fringe / halo at edges.
  const pixels = new Uint8ClampedArray(data.buffer)
  let removed = 0
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2]
    // Alpha based on how far from pure white
    const alpha = 1 - Math.min(r, g, b) / 255
    if (alpha < 0.01) {
      // Fully white — transparent
      pixels[i + 3] = 0
      removed++
    } else {
      pixels[i + 3] = Math.round(alpha * 255)
      // Recover true foreground color (un-mix from white)
      pixels[i]     = Math.min(255, Math.round((r - 255 * (1 - alpha)) / alpha))
      pixels[i + 1] = Math.min(255, Math.round((g - 255 * (1 - alpha)) / alpha))
      pixels[i + 2] = Math.min(255, Math.round((b - 255 * (1 - alpha)) / alpha))
    }
  }
  console.log(`  Removed ${removed} white pixels, edges feathered cleanly`)

  // Rebuild as transparent PNG
  const markPng = await sharp(Buffer.from(pixels.buffer), {
    raw: { width, height, channels: 4 }
  }).png().toBuffer()

  // 3. Composite at each target size onto dark background
  const genIcon = async (size) => {
    const bg = await sharp({
      create: { width: size, height: size, channels: 4, background: BG_COLOR }
    }).png().toBuffer()

    const inner = Math.round(size * 0.88)
    const mark = await sharp(markPng)
      .resize(inner, inner, {
        fit: 'contain',
        kernel: 'lanczos3',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer()

    const offset = Math.floor((size - inner) / 2)
    return sharp(bg)
      .composite([{ input: mark, top: offset, left: offset }])
      .png({ compressionLevel: 9 })
      .toBuffer()
  }

  console.log('  Generating sizes: 512, 256, 48, 32, 16...')
  const [p512, p256, p48, p32, p16] = await Promise.all(
    [512, 256, 48, 32, 16].map(genIcon)
  )

  // 4. Write output files
  const pngOut = path.join(BUILD_DIR, 'icon.png')
  fs.writeFileSync(pngOut, p512)
  fs.writeFileSync(path.join(RESOURCES_DIR, 'icon.png'), p512)
  console.log('  ✓ icon.png  (512x512)')

  fs.writeFileSync(path.join(BUILD_DIR, 'icon.ico'),
    buildIco([p256, p48, p32, p16], [256, 48, 32, 16]))
  console.log('  ✓ icon.ico  (256, 48, 32, 16 px)')

  fs.writeFileSync(path.join(BUILD_DIR, 'icon.icns'),
    buildIcns([
      { key: 'ic09', buf: p512 },
      { key: 'ic08', buf: p256 },
      { key: 'icp6', buf: p32  },
      { key: 'icp5', buf: p16  },
    ]))
  console.log('  ✓ icon.icns (512, 256, 32, 16 px)')

  console.log()
  console.log('Icon output:', pngOut)
  console.log('Done.')
}

main().catch(err => { console.error(err); process.exit(1) })
