/**
 * Request schedule construction.
 *
 * Kept out of `run.mjs` so the scheduling rule can be unit-tested without
 * importing the CLI (which runs a load test on import).
 */

/**
 * Weighted schedule so the mix of URLs stays stable across workers.
 *
 * Interleaved rather than blocked: building it by repeating each scenario
 * `weight` times in a row means a short run only ever exercises the first
 * scenario. Cycling one entry per scenario instead keeps the proportions and
 * still covers the whole catalogue within the first few seconds.
 *
 * @param {Array<{ weight?: number }>} scenarios
 */
export function buildSchedule(scenarios) {
  const remaining = scenarios.map((scenario) => ({ scenario, left: scenario.weight ?? 1 }));
  const schedule = [];
  let anyLeft = true;
  while (anyLeft) {
    anyLeft = false;
    for (const entry of remaining) {
      if (entry.left > 0) {
        schedule.push(entry.scenario);
        entry.left -= 1;
        anyLeft = true;
      }
    }
  }
  return schedule;
}
