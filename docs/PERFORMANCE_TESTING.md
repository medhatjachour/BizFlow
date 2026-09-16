# BizFlow performance testing — website, live demo and desktop app

How to measure BizFlow, what the numbers actually mean, and what the current
measured baseline is. Two harnesses ship with the repository:

| Harness | What it measures | Entry point |
|---|---|---|
| **HTTP harness** | The marketing website, the in-browser live demo (`/app`) and the full customer journey, over the network | [`scripts/perf/run.mjs`](../scripts/perf/run.mjs) |
| **Desktop bench** | The Electron/Prisma data layer — every hot query the app makes, against a real SQLite database | [`apps/Bizflow/src/test/perf/desktop.perf.ts`](../apps/Bizflow/src/test/perf/desktop.perf.ts) |

Both are **zero-dependency** (plain Node ESM), so they run on a bare install,
on the VPS, or on a GitHub runner without touching `package.json` or
`package-lock.json`.

---

## 1. The HTTP harness

### Running it

```powershell
# from the repository root
node scripts\perf\run.mjs --target https://www.bizflow.medhatjachour.tech --profile load

# a specific concurrency and label, written to perf-reports/
node scripts\perf\run.mjs --target https://www.bizflow.medhatjachour.tech `
  --concurrency 20 --duration 30 --label "c=20" --out perf-reports

# skip the end-to-end journey (pure page load measurement)
node scripts\perf\run.mjs --target http://127.0.0.1:3000 --profile smoke --skip-journey

# compare several reports on one scaling chart
node scripts\perf\compare.mjs perf-reports\http-*c1.json perf-reports\http-*c10.json --out perf-reports\scaling.md
```

Root npm aliases:

```powershell
npm run perf:load      # HTTP harness, default profile
npm run perf:desktop   # desktop bench + report
npm run perf           # both
```

`perf:load` deliberately defaults to `http://127.0.0.1:3000`, so start a local
production build (`npm run build; npm start` in `apps/website`) first, or pass
an explicit `--target`. It fails fast with a clear message if nothing is
listening there — see exit codes below.

### Profiles

| Profile | Workers | Duration | Intended for |
|---|---|---|---|
| `smoke` | 1 | 10 s | Is the target even reachable? Run before anything else. |
| `load` | 10 | 30 s (+3 s warm-up, 3 s ramp) | Expected real traffic. Safe against production. |
| `stress` | 64 | 60 s (+15 s ramp) | Find the knee — where p95 stops being flat. |
| `spike` | 128 | 20 s | Sudden burst; does the server shed load or fall over? |
| `soak` | 16 | 900 s | Endurance — memory / connection leaks. |

`stress`, `spike` and `soak` are **refused against a non-local host** unless you
pass `--force-remote` or set `PERF_ALLOW_REMOTE_STRESS=1`. This is deliberate:
the production target is a single small VPS shared with real users.

### Exit codes, the pre-flight probe, and latency gating

Before any load is applied the harness sends one **probe** request (a `GET` on
the first scenario) and prints its status and duration:

```
  probe       GET / -> 200 (1512 ms)
```

That serves two purposes. It proves the target is actually answering, and it
absorbs the cold DNS + TCP + TLS cost (~1–4 s from a home connection) so the
measured window does not record it as a "p95".

| Exit code | Meaning |
|---|---|
| `0` | Ran to completion; no budget **enforced by this run** was breached. |
| `1` | A budget was breached. In JSON, `failures[]` is non-empty and the `Budgets` metadata row says which budgets were in force. |
| `2` | Harness or target problem — nothing useful was measured. |

Exit `2` covers two situations, distinguished by the message:

- an unreachable target — `cannot run: https://… is unreachable (ECONNREFUSED:
  connect ECONNREFUSED 127.0.0.1:3990).`
- a target that *does* answer, but with the wrong status on the probe path —
  `cannot run: https://… answered unexpectedly (HTTP 500 on /).` This is
  deliberate: the probe runs before any load, so a site that is already 500-ing
  is reported rather than hammered.

It also covers a target that dies *mid-run*: a worker that sees 20 consecutive
fatal socket errors (`ECONNREFUSED`, `ECONNRESET`, `EPIPE`, `ENOTFOUND`,
`EAI_AGAIN`, `EHOSTUNREACH`, `ENETUNREACH`, TLS-verification codes) aborts the
whole run instead of cheerfully recording tens of thousands of sub-millisecond
"responses" that never left the machine. Verified by killing the target 8 s into
a 60 s run: exit `2`, one error line, no report table.

**Latency gating is run-dependent; error rate is not.** An error rate over
budget always fails. Latency budgets are only enforced where the measurement
window is long enough to be a meaningful p95:

- `smoke` (10 s, 1 worker) prints `over*` for over-budget rows plus a footnote
  (`* over budget but not enforced by this run - latency is reported only`) and
  a summary line (`N scenario(s) over budget but not enforced by this run (the
  smoke profile does not gate latency)`), then exits `0`. It is a reachability
  check, not a benchmark.
- `load` and above print `FAIL` and exit `1`.

The report header carries a `Budgets` row (`enforced (p95/p99 + error rate)` /
`latency reported only…; error rate still enforced`) so a saved report cannot be
misread later.

Two flags control this independently of the profile:

- `--no-latency-gate` — enforce the error rate but only report latency. Used by
  `.github/workflows/perf.yml`, where a shared runner's TLS handshake variance
  would make a p95 assertion flap.
- `--gate-latency` — enforce latency even on a profile that would not
  (e.g. `smoke`), for a quick local check.

### What is measured

Every entry in the catalogue in [`scripts/perf/scenarios.mjs`](../scripts/perf/scenarios.mjs)
is a real route or endpoint:

- **11 website pages** — `/`, three `/plugins/[id]` pages, `/download`, `/support`,
  `/account`, `/account/login`, `/portal/login`, `/legal/terms`, `/status`
- **1 demo target** — `/app`, the full desktop app running in the browser
- **4 API endpoints** — `/api/version` (every installed app calls this on
  update check), `/api/prices`, `/api/status` and the licence revalidation read
  path `/api/license/validate`
- **2 assets** — `/sitemap.xml`, `/robots.txt` (mostly TTFB / cache behaviour)
- **1 end-to-end journey** — the 8-step sequence the whole site is built around:

  `landing → demo → module → pricing → download → licence → activate → account`

  The journey records one sample for the **whole sequence**, so its p95 is
  literally "how long the journey takes", and it also reports each step on its own.

Each request reports:

| Column | Meaning |
|---|---|
| `p50 / p75 / p90 / p95 / p99 / max` | Percentiles over raw samples with linear interpolation (the same definition as Excel's `PERCENTILE.INC`), computed by [`lib/stats.mjs`](../scripts/perf/lib/stats.mjs) |
| `TTFB p95` | Time to **first byte** — separates server think-time from download time |
| `cold p95` / `warm p95` | Split by whether the request reused a keep-alive socket. A "cold" sample includes a TCP + TLS handshake and is **not** server latency |
| `new%` | Share of measured requests that had to open a fresh socket. Near 0 % means keep-alive is working |
| `err` | Non-expected HTTP statuses or transport errors |

### Safety rules (please keep them)

- **Read-only by construction.** The endpoints that write — `POST /api/license/request`,
  `POST /api/requests`, the download build trigger, `POST /api/checkout` — are
  never generated, because load-testing them would create real tickets, real
  builds and real emails. The only generated POST is `/api/license/validate`
  with a deliberately **unknown** key; that is a single indexed read returning
  `{ ok: true, valid: false }` and writes nothing.
- `/api/download` (the asset it redirects to) is **never** load-tested — it
  fights the same bandwidth the real downloads use.
- Aggressive profiles require the explicit consent flag against remote hosts.

### Reading the numbers

Two things dominate the absolute latency of a single request and are easy to
misread as "the server is slow":

1. **The first request in a fresh process is 0.9–1.4 s** even for a 2 kB
   `robots.txt`. That is DNS + TCP + TLS with a TLS handshake around 440–985 ms
   from a home connection — not the server. Warm requests are 115–180 ms.
2. **Keep-alive.** The harness keeps sockets open; the `new%` column tells you
   whether a slow sample was actually a fresh handshake. In steady state it is
   0.2–0.3 %.

So the honest summary is: **server think-time (TTFB) is around 120 ms p50**, and
end-user latency is that plus their own network round trip.

---

## 2. Measured baseline — website and demo

Production target `https://www.bizflow.medhatjachour.tech`, single small VPS,
read-only, all samples pooled across scenarios. 30 s per level (45 s for the
stress run). **Zero errors and zero budget breaches in every run.**

| Workers | Requests | Throughput | p50 | p95 | p99 | max |
|---|---|---|---|---|---|---|
| 1 | 219 | 7.3 rps | 197 ms | 230 ms | 342 ms | 380 ms |
| 4 | 775 | 25.8 rps | 140 ms | 239 ms | 420 ms | 879 ms |
| 10 | 1 951 | 65.0 rps | 121 ms | 317 ms | 604 ms | 867 ms |
| 20 | 4 079 | 136.0 rps | 119 ms | 248 ms | 518 ms | 2.01 s |
| **32 (stress, 45 s)** | **8 406** | **186.8 rps** | **137 ms** | **206 ms** | **302 ms** | **567 ms** |

The knee is **not** reached: p95 stays flat (206–317 ms) and throughput grows
almost linearly all the way to 32 concurrent workers / ~187 rps. A single
visitor's page is a few hundred kilobytes and the site is served from Next.js'
static cache (`x-nextjs-cache: HIT`) behind nginx 1.31.3, so the box has far
more headroom than the current traffic mix needs.

### Worst-scenario p95/p99 per level

Percentiles are pooled per level above, but a load gate is only as good as its
worst scenario, so the four slowest scenarios are monitored individually:

| Workers | worst scenario p95 | worst scenario p99 | slowest single request |
|---|---|---|---|
| 1 | 346 ms | 373 ms | 380 ms |
| 4 | 369 ms | 682 ms | 879 ms |
| 10 | 437 ms | 646 ms | 867 ms |
| 20 | 372 ms | 739 ms | 2.01 s |
| 32 | 325 ms | 386 ms | 567 ms |

### The end-to-end journey

8 steps, 5 full replays per run:

| Workers | journey p50 | journey p95 |
|---|---|---|
| 1 | 1.37 s | 1.81 s |
| 4 | 1.40 s | 1.59 s |
| 10 | 1.07 s | 1.27 s |
| 20 | 923 ms | 957 ms |
| 32 | 930 ms | 1.01 s |

Budget: p95 ≤ 6 s, p99 ≤ 9 s. The whole "land, try the demo, look at a module,
check the price, hit download, ask for a licence, activate" path costs about a
second when the connections are warm.

Note the sample size: 5 replays means `p95` here is effectively the slowest of
five journeys, not a settled percentile. Raise `--journey-repeats` (e.g. `30`)
before treating a journey p95 as a hard number.

### Run-to-run variance — read this before quoting a p95

Four back-to-back c=10 runs on the same target:

| Run | p50 | p95 | Throughput |
|---|---|---|---|
| 1 | 121 ms | 149 ms | 83 rps |
| 2 | 112 ms | 152 ms | 78 rps |
| 3 | 118 ms | 180 ms | 65 rps |
| 4 | 121 ms | 317 ms | 65 rps |
| 5 (final sweep, 18 scenarios + journey) | 113 ms | 158 ms | 79 rps |

Run 5 is the full catalogue rather than a repeat of run 4: pooled over 2 376
samples it reports p50 113 ms, p95 158 ms, p99 239 ms, max 1.35 s, zero errors,
10 new sockets out of 2 416 requests (0.21 %), and a journey p50 1.12 s /
p95 1.39 s. The per-scenario p95 spread in that run was 124–198 ms, i.e. every
scenario sat inside the flat part of the curve.

**p50 is stable within ~8 %; p95 varies by up to ~2×.** One earlier window
measured p95 1.0–1.8 s and 18 rps at c=1; it never reproduced, and a client-side
harness cannot attribute it. Treat a single p95 as indicative and confirm a
suspicious reading with two more runs before acting on it. The budgets in
`scenarios.mjs` are set wide enough (0.5–1.5 s p95 for pages, 6 s for the whole
journey) that this noise does not produce false failures, but still catch a real
regression.

---

## 3. The desktop benchmark

### Running it

```powershell
cd apps\Bizflow
npm run perf:bench                      # full scale (~5 s of seeding + 17 workloads)
$env:PERF_SCALE=0.25; npm run perf:bench   # faster, for CI
$env:PERF_ITERATIONS=100; npm run perf:bench

# then render it (from the repo root)
node scripts\perf\desktop\report.mjs
```

### How it works

[`support/perfDb.ts`](../apps/Bizflow/src/test/perf/support/perfDb.ts) copies the
repository's schema into a **temporary** SQLite database (never the user's real
`prisma/dev.db`), applies the same datasource, log and transaction options the
production main process uses plus the six production `PRAGMA` settings, and
seeds it deterministically:

| Table | Rows |
|---|---|
| product / productVariant | 4 000 / 4 000 |
| saleTransaction / saleItem / stockMovement | 12 045 / 30 114 / 30 114 |
| customer | 400 |
| supplier / purchaseOrder | 60 / 300 |
| employee / employeePayroll | 120 / 1 440 |
| commerceExpense | 2 000 |

Then [`desktop.perf.ts`](../apps/Bizflow/src/test/perf/desktop.perf.ts) runs 17
real workloads across 7 groups — catalogue, POS checkout, dashboard, reports,
inventory, HR and finance — 30 iterations each after 5 warm-up iterations
(`PERF_ITERATIONS` / `PERF_WARMUP` override both), and writes
`perf-reports/desktop-raw.json`. `scripts/perf/desktop/report.mjs` applies
per-workload budgets and adds the renderer bundle budgets, exiting non-zero on
any breach.

### Measured baseline (Windows x64, scale 1, n=510)

| Group | Workload | p50 | p95 | p99 | max |
|---|---|---|---|---|---|
| catalogue | page 1 (50 rows, variants + images) | 3.17 ms | 3.68 ms | 3.73 ms | 3.75 ms |
| catalogue | deep page | 3.19 ms | 3.68 ms | 3.87 ms | 3.92 ms |
| catalogue | **search** | 38.43 ms | 40.92 ms | 42.08 ms | 42.37 ms |
| catalogue | **low stock** | 28.74 ms | 32.06 ms | 33.56 ms | 34.16 ms |
| catalogue | by id | 0.95 ms | 1.64 ms | 1.67 ms | 1.67 ms |
| pos | **checkout** (write transaction) | 6.29 ms | 8.33 ms | 25.93 ms | 33.05 ms |
| dashboard | daily sales | 3.28 ms | 4.35 ms | 4.48 ms | 4.51 ms |
| dashboard | **top products** | 53.56 ms | 59.25 ms | 59.31 ms | 59.32 ms |
| reports | sales by day | 2.25 ms | 3.13 ms | 3.24 ms | 3.26 ms |
| reports | sales by month | 5.59 ms | 6.51 ms | 6.84 ms | 6.94 ms |
| inventory | ledger | 0.55 ms | 0.86 ms | 0.89 ms | 0.90 ms |
| inventory | valuation | 0.40 ms | 0.84 ms | 0.93 ms | 0.96 ms |
| hr | directory | 1.86 ms | 2.47 ms | 2.52 ms | 2.52 ms |
| hr | payroll summary | 1.50 ms | 2.20 ms | 2.31 ms | 2.33 ms |
| hr | payroll period | 1.09 ms | 1.63 ms | 1.88 ms | 1.97 ms |
| finance | expenses by category | 1.19 ms | 1.98 ms | 2.23 ms | 2.32 ms |
| finance | purchase orders | 3.09 ms | 3.65 ms | 3.93 ms | 4.03 ms |
| **all** | | **2.76 ms** | **51.03 ms** | **55.71 ms** | **59.32 ms** |

Everything is well inside a 16 ms frame budget except the four deliberately
heavy aggregate queries, which are the ones a user waits on while a screen
loads. Even those are 32–60 ms p95 on 4 000 products / 12 000 sales, on a
single-file SQLite database — a local synchronous read, no network at all.

### Renderer bundle budgets

`report.mjs` also fails the run if the built renderer grows past the recorded
baseline (with headroom), because a slow first paint never shows up in a query
benchmark:

| Metric | Measured | Budget |
|---|---|---|
| entry JS | 1.29 MB | 1 600 000 B |
| total JS | 12.85 MB in 219 chunks | 13 500 000 B |
| total CSS | 330.8 kB | 500 000 B |

The largest chunks are `xlsx` (983 kB), a PDF/charting chunk (867 kB) and
`jspdf` (662 kB) — all lazily imported, so they never delay first paint.

### Two production bugs this benchmark found

Both were shipped fixes, and both are pinned by unit tests:

1. **Every product search threw.** `ProductRepository.search()` filtered
   `category: { contains: query }` on a *relation* instead of
   `category: { name: { contains: query } }`.
2. **Low-stock / out-of-stock loaded the whole catalogue** and filtered in
   JavaScript. Rewritten as a bounded two-step query
   (`productVariant.groupBy` → `findAll({ where: { id: { in: ids } } })`):
   low-stock p95 went from **161.6 ms to ~32–36 ms**.

---

## 4. CI

`.github/workflows/perf.yml` runs both harnesses on a `workflow_dispatch` and a
nightly `schedule` only — never on push, because a shared runner's numbers would
fail randomly and blocking every PR on them would be noise. It runs the HTTP
`load` profile against the deployed site and the desktop bench with
`PERF_SCALE=0.25`, and uploads `perf-reports/` as an artifact.

Because a shared runner's TLS handshake variance would make any latency gate
flap, the workflow passes `--no-latency-gate`: reachability, transport failures
and the **error rate** are hard gates, latency is measured and uploaded for
reading. The deterministic parts are additionally pinned by the website unit
tests (`perf-harness.test.ts`, `user-flow.test.ts`) — percentile maths, budget
logic, safety rules and the user-flow contract.

## 5. Where the numbers come from

Raw reports are written to `perf-reports/` (git-ignored, since they are build
output):

- `http-*.json` / `http-*.md` — one pair per HTTP run, including the pooled
  `connections` block (`newSockets`, `handshakeP50Ms`, `freshSocketRate`)
- `desktop-raw.json` — per-workload samples for the desktop bench
- `desktop-*.json` / `desktop-*.md` — the rendered desktop report
- `scaling.md` — a `compare.mjs` consolidation across concurrency levels

See also [`WEBSITE_USER_FLOW.md`](./WEBSITE_USER_FLOW.md) for the journey being
measured.
