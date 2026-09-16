/**
 * Measurement plumbing for the desktop benchmark.
 *
 * The bench only records *raw samples*; every percentile is computed later by
 * `scripts/perf/desktop/report.mjs`, which shares its maths with the HTTP
 * harness (`scripts/perf/lib/stats.mjs`). One implementation of the percentile
 * definition, two producers.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
/** repo root */
export const REPO_ROOT = path.resolve(here, '..', '..', '..', '..', '..', '..')
export const REPORT_DIR = path.join(REPO_ROOT, 'perf-reports')

export interface PerfRow {
  id: string
  group: string
  description: string
  /** Latencies in milliseconds, one per measured iteration. */
  samples: number[]
  /** Failures: an operation that threw is not a fast operation. */
  errors: string[]
  /** Extra scalar detail the report renders as a column (rows returned, ...). */
  extra: Record<string, string | number | boolean>
  budget?: Record<string, number>
}

export interface MeasureOptions {
  /** Discarded iterations that warm the SQLite page cache and Prisma engine. */
  warmup?: number
  iterations?: number
  budget?: Record<string, number>
  extra?: () => Record<string, string | number | boolean>
}

export class PerfRecorder {
  private readonly rows: PerfRow[] = []
  private readonly startedAt = Date.now()

  /** Time one operation many times, discarding the warm-up iterations. */
  async measure(
    id: string,
    group: string,
    description: string,
    operation: () => Promise<unknown>,
    options: MeasureOptions = {}
  ): Promise<PerfRow> {
    const warmup = options.warmup ?? 3
    const iterations = options.iterations ?? 30
    const errors: string[] = []

    for (let i = 0; i < warmup; i += 1) {
      try {
        await operation()
      } catch {
        // A warm-up failure is reported by the measured loop below.
      }
    }

    const samples: number[] = []
    for (let i = 0; i < iterations; i += 1) {
      const start = process.hrtime.bigint()
      try {
        await operation()
        samples.push(Number(process.hrtime.bigint() - start) / 1e6)
      } catch (error) {
        errors.push(String((error as Error)?.message ?? error))
      }
    }

    const row: PerfRow = {
      id,
      group,
      description,
      samples,
      errors,
      extra: options.extra?.() ?? {},
      budget: options.budget
    }
    this.rows.push(row)
    return row
  }

  get all(): PerfRow[] {
    return this.rows
  }

  get elapsedMs(): number {
    return Date.now() - this.startedAt
  }
}

export interface RawReport {
  generatedAt: string
  platform: string
  node: string
  scale: number
  db: Record<string, unknown>
  seed: Record<string, unknown>
  tables: Record<string, number>
  rows: PerfRow[]
}

export function writeRawReport(report: RawReport): string {
  fs.mkdirSync(REPORT_DIR, { recursive: true })
  const file = path.join(REPORT_DIR, 'desktop-raw.json')
  fs.writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  return file
}

/** `node`'s console can be redirected to a file, so keep the lines plain. */
export function logLine(line: string): void {
  process.stdout.write(`${line}\n`)
}
