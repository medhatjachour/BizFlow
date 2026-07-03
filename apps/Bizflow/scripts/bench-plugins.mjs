/**
 * bench-plugins.mjs — backend load test against the running web bridge.
 *
 * Hits POST http://localhost:8787/ipc {channel,args,session} for the key
 * read / search / stats operations of each plugin, N times each, and reports
 * p50/p95/p99/max latency (ms) + the number of rows the query touched.
 *
 * Prereq: `npm run web:server` running, dev DB seeded.
 * Usage:  node scripts/bench-plugins.mjs        (default N=50)
 *         BENCH_N=100 node scripts/bench-plugins.mjs
 */
const URL = 'http://localhost:8787/ipc'
const SESSION = 'bench'
const N = Number(process.env.BENCH_N || 50)
const WARM = 3

async function call(channel, args = []) {
  const t = performance.now()
  const r = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel, args, session: SESSION }) })
  const j = await r.json()
  return { ms: performance.now() - t, ok: j.ok, data: j.data, error: j.error }
}
const rowsOf = (d) => {
  if (d == null) return ''
  if (Array.isArray(d)) return d.length
  if (typeof d === 'object') { if (Array.isArray(d.data)) return (d.total ?? d.data.length); if ('total' in d) return d.total; return 'obj' }
  return String(d)
}
const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.ceil(p / 100 * sorted.length) - 1)]

const OPS = [
  ['vet', 'owners list', 'vet:owners:getAll', [{ take: 50 }]],
  ['vet', 'patients search', 'vet:patients:getAll', [{ search: 'Ali', take: 50 }]],
  ['vet', 'medicines list', 'vet:medicines:getAll', [{ take: 50 }]],
  ['vet', 'med summary', 'vet:medicines:getSummary', [{}]],
  ['vet', 'sessions recent', 'vet:sessions:getRecent', [{ take: 50 }]],
  ['vet', 'stats overview', 'vet:stats:overview', ['month']],
  ['commerce', 'products list', 'products:getAll', [{ take: 50 }]],
  ['commerce', 'products search', 'products:getAll', [{ search: 'shirt', take: 50 }]],
  ['commerce', 'customers list', 'customers:getAll', [{ take: 50 }]],
  ['commerce', 'sales getAll (no paging)', 'sales:getAll', []],
  ['commerce', 'dashboard metrics', 'dashboard:getMetrics', []],
  ['pharmacy', 'products list', 'pharmacy:products:getAll', [{ take: 50 }]],
  ['pharmacy', 'sales list', 'pharmacy:sales:getAll', [{ take: 50 }]],
  ['pharmacy', 'cashflow', 'pharmacy:stats:cashflow', []],
  ['pharmacy', 'stats overview', 'pharmacy:stats:overview', ['month']],
  ['clinic', 'patients list', 'clinic:patients:getAll', [{ take: 50 }]],
  ['clinic', 'patients search', 'clinic:patients:getAll', [{ search: 'a', take: 50 }]],
  ['gym', 'trainees list', 'gym:trainees:getAll', [{ take: 50 }]],
  ['warehouse', 'overview', 'warehouse:getOverview', []],
  ['warehouse', 'stock', 'warehouse:getStock', [{}]],
]

console.log(`Backend load test — N=${N} per op, session="${SESSION}"`)
console.log('Warming sandbox (copies seeded template)…')
await call('vet:owners:getAll', [{ take: 1 }])
await new Promise((r) => setTimeout(r, 800))

const results = []
for (const [plugin, name, channel, args] of OPS) {
  let first
  for (let w = 0; w < WARM; w++) first = await call(channel, args)
  if (!first.ok) { results.push({ plugin, name, err: (first.error || 'failed').slice(0, 50) }); continue }
  const lat = []
  for (let i = 0; i < N; i++) lat.push((await call(channel, args)).ms)
  lat.sort((a, b) => a - b)
  results.push({
    plugin, name, rows: rowsOf(first.data),
    p50: Math.round(pct(lat, 50)), p95: Math.round(pct(lat, 95)),
    p99: Math.round(pct(lat, 99)), max: Math.round(lat[lat.length - 1]),
  })
  process.stdout.write('.')
}
process.stdout.write('\n\n')

const pad = (s, n) => String(s).padEnd(n)
const padL = (s, n) => String(s).padStart(n)
console.log(`${pad('plugin', 10)} ${pad('operation', 26)} ${padL('rows', 7)} ${padL('p50', 6)} ${padL('p95', 6)} ${padL('p99', 6)} ${padL('max', 6)}`)
console.log('-'.repeat(72))
for (const r of results) {
  if (r.err) { console.log(`${pad(r.plugin, 10)} ${pad(r.name, 26)}  ERROR: ${r.err}`); continue }
  console.log(`${pad(r.plugin, 10)} ${pad(r.name, 26)} ${padL(r.rows, 7)} ${padL(r.p50, 6)} ${padL(r.p95, 6)} ${padL(r.p99, 6)} ${padL(r.max, 6)}`)
}
const slow = results.filter((r) => !r.err && r.p99 >= 150).sort((a, b) => b.p99 - a.p99)
if (slow.length) {
  console.log('\n⚠ Slowest (p99 ≥ 150ms):')
  for (const r of slow) console.log(`   ${r.plugin} · ${r.name} — p99 ${r.p99}ms (rows ${r.rows})`)
}
