/**
 * encode-tours.mjs
 *
 * Encodes the per-plugin screenshot frames captured under `.tour-frames/<plugin>/`
 * into looping animated GIF "feature tours" saved to `docs/tours/<plugin>.gif`.
 *
 * Frames are produced by the Playwright capture step (one PNG per feature/tab).
 * Uses sharp (decode/resize) + gifenc (pure-JS GIF encoder).
 *
 * Usage:
 *   node scripts/encode-tours.mjs            # encode every plugin with frames
 *   node scripts/encode-tours.mjs vet gym    # encode only the listed plugins
 */
import { readdirSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import gifenc from 'gifenc'
const { GIFEncoder, quantize, applyPalette } = gifenc

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const framesBase = join(root, '.tour-frames')
const outDir = join(root, 'docs', 'tours')
mkdirSync(outDir, { recursive: true })

const W = 1000          // GIF width (frames keep their aspect ratio)
const DELAY = 1700      // ms each feature screen is shown

const requested = process.argv.slice(2)
const plugins = (requested.length
  ? requested
  : readdirSync(framesBase).filter((d) => statSync(join(framesBase, d)).isDirectory()))

for (const id of plugins) {
  const dir = join(framesBase, id)
  if (!existsSync(dir)) { console.log(`skip ${id}: no frames dir`); continue }
  const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.png')).sort()
  if (!files.length) { console.log(`skip ${id}: no frames`); continue }

  const meta = await sharp(join(dir, files[0])).metadata()
  const H = Math.round((meta.height / meta.width) * W)

  const enc = GIFEncoder()
  for (const f of files) {
    const { data } = await sharp(join(dir, f))
      .resize(W, H, { fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const palette = quantize(data, 256)
    const index = applyPalette(data, palette)
    enc.writeFrame(index, W, H, { palette, delay: DELAY, repeat: 0 })
  }
  enc.finish()

  const out = join(outDir, `${id}.gif`)
  writeFileSync(out, enc.bytes())
  const kb = (statSync(out).size / 1024).toFixed(0)
  console.log(`✓ ${id}.gif — ${files.length} frames, ${W}x${H}, ${kb} KB`)
}
