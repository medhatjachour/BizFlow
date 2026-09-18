/**
 * Status maths behind the tray quick-widget.
 *
 * Kept free of electron / prisma imports so the selection and formatting rules
 * can be unit tested without a runtime. The caller translates the phrases these
 * helpers return, because `mainT` lives in a module that pulls in `electron`.
 */

/** A project as the tray reads it — only the fields the deadline rule needs. */
export type ProjectDeadline = {
  title: string
  status: string
  dueDate: Date | null
  adjustedDueDate: Date | null
}

export type FocusLike = {
  startedAt: Date
  plannedMinutes: number
  taskTitle?: string | null
  projectTitle?: string | null
}

/** Stages past which a project no longer has a deadline worth counting down. */
const CLOSED_STATUSES = new Set(['delivered', 'closed'])

/**
 * `adjustedDueDate` is `dueDate` shifted forward by every logged client delay,
 * so it wins whenever the client bottleneck tracker has recorded one.
 */
export const effectiveDueDate = (project: ProjectDeadline): Date | null =>
  project.adjustedDueDate ?? project.dueDate

/**
 * The soonest deadline across every still-open project.
 *
 * Deliberately includes past dates: an overdue delivery is the single most
 * important thing the widget can surface, so it outranks a later one rather
 * than being hidden until it is dealt with.
 */
export function pickNextDeadline(
  projects: ProjectDeadline[]
): { title: string; dueAt: Date } | null {
  let best: { title: string; dueAt: Date } | null = null

  for (const project of projects) {
    if (CLOSED_STATUSES.has(project.status)) continue

    const dueAt = effectiveDueDate(project)
    if (!dueAt || Number.isNaN(dueAt.getTime())) continue

    if (!best || dueAt.getTime() < best.dueAt.getTime()) {
      best = { title: project.title, dueAt }
    }
  }

  return best
}

export type ElapsedPhrase =
  | { unit: 'minutes'; minutes: number }
  | { unit: 'hours'; hours: number }
  | { unit: 'hoursMinutes'; hours: number; minutes: number }

/**
 * Whole minutes since the timer started, floored at zero so a clock adjustment
 * mid-session can never render as negative time.
 */
export function formatElapsed(startedAt: Date, now: Date): ElapsedPhrase {
  const minutes = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 60_000))

  const hours = Math.floor(minutes / 60)
  if (hours === 0) return { unit: 'minutes', minutes }

  const remainder = minutes % 60
  if (remainder === 0) return { unit: 'hours', hours }

  return { unit: 'hoursMinutes', hours, minutes: remainder }
}

export type WhenPhrase =
  | { unit: 'now' }
  | { unit: 'minutes' | 'hours' | 'days'; count: number; overdue: boolean }

/** Countdown to a deadline. Anything under a minute reads as `now`. */
export function formatWhen(dueAt: Date, now: Date): WhenPhrase {
  const diff = dueAt.getTime() - now.getTime()
  const overdue = diff < 0
  const minutes = Math.floor(Math.abs(diff) / 60_000)

  if (minutes < 1) return { unit: 'now' }
  if (minutes < 60) return { unit: 'minutes', count: minutes, overdue }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return { unit: 'hours', count: hours, overdue }

  return { unit: 'days', count: Math.floor(hours / 24), overdue }
}

/**
 * What the running timer should be called. A task title is more specific than
 * the project it belongs to; `null` means the caller should fall back to the
 * "untitled" label, which is different from having no timer at all.
 */
export function focusLabel(focus: FocusLike | null): string | null {
  if (!focus) return null

  const task = focus.taskTitle?.trim()
  if (task) return task

  const project = focus.projectTitle?.trim()
  if (project) return project

  return null
}
