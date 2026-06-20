/**
 * Convert build/icon.png → build/icon.ico + build/icon.icns
 * Run: node scripts/png-to-icons.js
 */

const sharp = require('sharp')
const path  = require('path')
const fs    = require('fs')

const BUILD_DIR = path.join(__dirname, '..', 'build')
const SOURCE    = path.join(BUILD_DIR, 'icon.png')

// ─── ICO builder (PNG-in-ICO, Windows Vista+) ────────────────────────────────
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
    ico.writeUInt8(0,   base + 2);  ico.writeUInt8(0, base + 3)
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
  if (!fs.existsSync(SOURCE)) {
    console.error('ERROR: build/icon.png not found')
    process.exit(1)
  }

  const resize = (size) =>
    sharp(SOURCE)
      .resize(size, size, { fit: 'contain', kernel: 'lanczos3', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()

  console.log('Reading build/icon.png...')
  const [p512, p256, p128, p48, p32, p16] = await Promise.all(
    [512, 256, 128, 48, 32, 16].map(resize)
  )

  fs.writeFileSync(
    path.join(BUILD_DIR, 'icon.ico'),
    buildIco([p256, p128, p48, p32, p16], [256, 128, 48, 32, 16])
  )
  console.log('✓ build/icon.ico  (256, 128, 48, 32, 16 px)')

  fs.writeFileSync(
    path.join(BUILD_DIR, 'icon.icns'),
    buildIcns([
      { key: 'ic09', buf: p512 },
      { key: 'ic08', buf: p256 },
      { key: 'ic07', buf: p128 },
      { key: 'icp6', buf: p32  },
      { key: 'icp5', buf: p16  },
    ])
  )
  console.log('✓ build/icon.icns (512, 256, 128, 32, 16 px)')

  console.log('Done.')
}

main().catch(err => { console.error(err); process.exit(1) })
