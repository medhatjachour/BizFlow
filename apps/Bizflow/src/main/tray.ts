/**
 * System tray quick-widget for the Personal work OS (spec section 6).
 *
 * Pinned in the Windows taskbar / macOS menu bar, showing the running focus
 * timer and the next delivery deadline. The selection and formatting rules live
 * in `tray-status.ts` so they can be unit tested without an electron runtime;
 * this file only reads the database and paints the result.
 *
 * The widget is scoped to the personal module: it is created only while that
 * module is both compiled in and enabled, and is destroyed when it is not.
 */
import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron'
import icon from '../../resources/icon.png?asset'
import { mainT } from './i18n'
import { prisma } from './ipc/handlers/index'
import { getEnabledModuleIds } from './utils/module-settings'
import { createLogger } from './utils/logger'
import {
  pickNextDeadline,
  formatElapsed,
  formatWhen,
  focusLabel,
  type ElapsedPhrase,
  type FocusLike,
  type ProjectDeadline,
  type WhenPhrase
} from './tray-status'

const log = createLogger('Tray')

/** The elapsed label only has minute resolution, so 30s keeps it honest. */
const REFRESH_MS = 30_000

let tray: Tray | null = null
let refreshTimer: NodeJS.Timeout | null = null
let quickCapture: (() => void) | null = null

/** True when the personal module is compiled in *and* switched on. */
const personalModuleActive = (): boolean =>
  typeof __PLUGIN_PERSONAL__ !== 'undefined' &&
  __PLUGIN_PERSONAL__ &&
  getEnabledModuleIds().includes('personal')

type TrayStatus = {
  focus: FocusLike | null
  deadline: { title: string; dueAt: Date } | null
}

const EMPTY_STATUS: TrayStatus = { focus: null, deadline: null }

async function readStatus(): Promise<TrayStatus> {
  if (!personalModuleActive() || !prisma) return EMPTY_STATUS

  try {
    const session = await prisma.personalFocusSession.findFirst({
      where: { endedAt: null },
      orderBy: { startedAt: 'desc' },
      include: { project: { select: { title: true } } }
    })

    const projects = (await prisma.personalProject.findMany({
      where: { OR: [{ dueDate: { not: null } }, { adjustedDueDate: { not: null } }] },
      select: { title: true, status: true, dueDate: true, adjustedDueDate: true }
    })) as ProjectDeadline[]

    // A focus session can point at a task instead of a project; the task title
    // is the more specific label, so it is fetched only when one is attached.
    let taskTitle: string | null = null
    if (session?.taskId) {
      const task = await prisma.personalTask.findUnique({
        where: { id: session.taskId },
        select: { title: true }
      })
      taskTitle = task?.title ?? null
    }

    return {
      focus: session
        ? {
            startedAt: session.startedAt,
            plannedMinutes: session.plannedMinutes,
            taskTitle,
            projectTitle: session.project?.title ?? null
          }
        : null,
      deadline: pickNextDeadline(projects)
    }
  } catch (error) {
    // The personal tables only exist once that module has been migrated in, so a
    // missing table is expected when the module is toggled off. Anything else is
    // worth a warning, but must never take the app down over a tray label.
    log.debug('Tray status unavailable:', error)
    return EMPTY_STATUS
  }
}

function elapsedText(elapsed: ElapsedPhrase): string {
  switch (elapsed.unit) {
    case 'minutes':
      return mainT('trayElapsedMinutes', { minutes: elapsed.minutes })
    case 'hours':
      return mainT('trayElapsedHours', { hours: elapsed.hours })
    default:
      return mainT('trayElapsedHoursMinutes', {
        hours: elapsed.hours,
        minutes: elapsed.minutes
      })
  }
}

function whenText(when: WhenPhrase): string {
  switch (when.unit) {
    case 'now':
      return mainT('trayDueNow')
    case 'minutes':
      return when.overdue
        ? mainT('trayOverdueMinutes', { count: when.count })
        : mainT('trayInMinutes', { count: when.count })
    case 'hours':
      return when.overdue
        ? mainT('trayOverdueHours', { count: when.count })
        : mainT('trayInHours', { count: when.count })
    default:
      return when.overdue
        ? mainT('trayOverdueDays', { count: when.count })
        : mainT('trayInDays', { count: when.count })
  }
}

/** `null` when nothing is running; the untitled label when a timer has no name. */
function timerLine(status: TrayStatus, now: Date): string | null {
  if (!status.focus) return null
  const label = focusLabel(status.focus) ?? mainT('trayUntitled')
  return `${label} — ${elapsedText(formatElapsed(status.focus.startedAt, now))}`
}

function deadlineLine(status: TrayStatus, now: Date): string | null {
  if (!status.deadline) return null
  return mainT('trayTooltipDeadline', {
    project: status.deadline.title,
    when: whenText(formatWhen(status.deadline.dueAt, now))
  })
}

function showWindow(): void {
  // `getAllWindows()` rather than a tracked reference: the tray outlives a
  // window that was closed and re-created (macOS `activate`).
  const [window] = BrowserWindow.getAllWindows()
  if (!window) return
  if (window.isMinimized()) window.restore()
  window.show()
  window.focus()
}

function buildMenu(status: TrayStatus, now: Date): Menu {
  const timer = timerLine(status, now)
  const deadline = deadlineLine(status, now)

  return Menu.buildFromTemplate([
    { label: mainT('trayTimerTitle'), enabled: false },
    { label: timer ?? mainT('trayNoTimer'), enabled: false },
    { type: 'separator' },
    { label: mainT('trayDeadlineTitle'), enabled: false },
    { label: deadline ?? mainT('trayNoDeadline'), enabled: false },
    { type: 'separator' },
    { label: mainT('trayShow'), click: showWindow },
    {
      label: mainT('trayQuickCapture'),
      enabled: quickCapture !== null,
      click: () => quickCapture?.()
    },
    { type: 'separator' },
    { label: mainT('trayQuit'), click: () => app.quit() }
  ])
}

/** Re-reads the database and repaints the tooltip and menu. */
export async function refreshTray(): Promise<void> {
  if (!tray || tray.isDestroyed()) return

  const status = await readStatus()
  const now = new Date()

  const lines = [mainT('trayTooltipIdle')]
  const timer = timerLine(status, now)
  if (timer) lines.push(mainT('trayTooltipFocus', { task: timer }))

  const deadline = deadlineLine(status, now)
  if (deadline) lines.push(deadline)
  if (lines.length === 1) lines.push(mainT('trayTooltipEmpty'))

  tray.setToolTip(lines.join('\n'))
  tray.setContextMenu(buildMenu(status, now))
}

/**
 * Creates the widget and starts refreshing it. Safe to call more than once —
 * the tray is a singleton, and the refresh interval is not stacked.
 */
export function setupTray(options: { onQuickCapture?: () => void } = {}): void {
  if (options.onQuickCapture) quickCapture = options.onQuickCapture

  if (!personalModuleActive()) {
    log.info('Tray widget skipped: the personal module is not enabled.')
    return
  }

  if (tray && !tray.isDestroyed()) {
    void refreshTray()
    return
  }

  try {
    // The source icon is a full-size app logo; the tray needs it at its own
    // pixel size or Windows stretches it into a blurry square.
    const size = process.platform === 'darwin' ? 18 : 16
    const image = nativeImage.createFromPath(icon).resize({ width: size, height: size })

    tray = new Tray(image)
    tray.setToolTip(mainT('trayTooltipIdle'))
    tray.on('click', showWindow)

    void refreshTray()

    refreshTimer = setInterval(() => void refreshTray(), REFRESH_MS)
    log.info('Tray widget created.')
  } catch (error) {
    log.error('Failed to create the tray widget:', error)
    tray = null
  }
}

/** Called on quit so the interval cannot fire during teardown. */
export function destroyTray(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
  if (tray && !tray.isDestroyed()) {
    tray.destroy()
  }
  tray = null
}
