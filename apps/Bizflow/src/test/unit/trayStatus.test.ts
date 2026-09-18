/**
 * Tray status maths: what the always-visible widget decides to show.
 *
 * The tray is the only surface a solo operator sees while they are *not*
 * looking at the app, so its output has to be true without a second glance. Two
 * rules in here are load-bearing: an overdue deadline must still be surfaced
 * (the widget is the last line of defence before a client notices the slip),
 * and `adjustedDueDate` must win over `dueDate` whenever the client bottleneck
 * tracker has pushed a deadline forward — otherwise the widget would quietly
 * contradict the auditable paper trail the plugin promised.
 *
 * `tray-status.ts` is deliberately Electron- and Prisma-free, so the rules can
 * be tested without a runtime. It returns structured phrases rather than
 * strings because `mainT` lives in a module that pulls in `electron`.
 */

import { describe, expect, it } from 'vitest'

import {
  effectiveDueDate,
  focusLabel,
  formatElapsed,
  formatWhen,
  pickNextDeadline,
  type ProjectDeadline
} from '../../main/tray-status'

const ISO = '2024-06-10T12:00:00.000Z'
const at = (offsetMinutes: number): Date =>
  new Date(new Date(ISO).getTime() + offsetMinutes * 60_000)

const project = (over: Partial<ProjectDeadline> = {}): ProjectDeadline => ({
  title: 'Landing page',
  status: 'active',
  dueDate: at(60),
  adjustedDueDate: null,
  ...over
})

describe('tray status', () => {
  describe('effectiveDueDate', () => {
    it('prefers the client-delay adjusted date when one exists', () => {
      const dueDate = at(60)
      const adjustedDueDate = at(600)

      expect(effectiveDueDate(project({ dueDate, adjustedDueDate }))).toBe(adjustedDueDate)
    })

    it('falls back to the original due date when no delay was logged', () => {
      const dueDate = at(60)

      expect(effectiveDueDate(project({ dueDate }))).toBe(dueDate)
    })

    it('is null when the project has no deadline at all', () => {
      expect(effectiveDueDate(project({ dueDate: null }))).toBeNull()
    })
  })

  describe('pickNextDeadline', () => {
    it('is null when there is nothing open', () => {
      expect(pickNextDeadline([])).toBeNull()
    })

    it('picks the soonest open deadline', () => {
      const projects = [
        project({ title: 'Later', dueDate: at(600) }),
        project({ title: 'Sooner', dueDate: at(30) }),
        project({ title: 'Middle', dueDate: at(120) })
      ]

      expect(pickNextDeadline(projects)).toEqual({ title: 'Sooner', dueAt: at(30) })
    })

    it('counts an overdue deadline as next rather than hiding it', () => {
      const projects = [
        project({ title: 'Almost due', dueDate: at(30) }),
        project({ title: 'Already late', dueDate: at(-500) })
      ]

      expect(pickNextDeadline(projects)).toEqual({ title: 'Already late', dueAt: at(-500) })
    })

    it('ignores delivered and closed projects', () => {
      const projects = [
        project({ title: 'Delivered', status: 'delivered', dueDate: at(-500) }),
        project({ title: 'Closed', status: 'closed', dueDate: at(-400) }),
        project({ title: 'Active', dueDate: at(45) })
      ]

      expect(pickNextDeadline(projects)).toEqual({ title: 'Active', dueAt: at(45) })
    })

    it('still counts paused and lead projects, which have not shipped', () => {
      const projects = [
        project({ title: 'Paused', status: 'paused', dueDate: at(200) }),
        project({ title: 'Lead', status: 'lead', dueDate: at(90) })
      ]

      expect(pickNextDeadline(projects)).toEqual({ title: 'Lead', dueAt: at(90) })
    })

    it('uses the adjusted date, so a delayed deadline stops being the next one', () => {
      const projects = [
        project({ title: 'Pushed back', dueDate: at(15), adjustedDueDate: at(5_000) }),
        project({ title: 'Untouched', dueDate: at(240) })
      ]

      expect(pickNextDeadline(projects)).toEqual({ title: 'Untouched', dueAt: at(240) })
    })

    it('skips projects with no deadline and invalid dates', () => {
      const projects = [
        project({ title: 'No deadline', dueDate: null }),
        project({ title: 'Broken', dueDate: new Date('not a date') }),
        project({ title: 'Real', dueDate: at(300) })
      ]

      expect(pickNextDeadline(projects)).toEqual({ title: 'Real', dueAt: at(300) })
    })

    it('is null when every open project is missing a deadline', () => {
      expect(pickNextDeadline([project({ dueDate: null })])).toBeNull()
    })
  })

  describe('formatElapsed', () => {
    it('counts whole minutes', () => {
      expect(formatElapsed(at(0), at(24))).toEqual({ unit: 'minutes', minutes: 24 })
    })

    it('truncates rather than rounding part-minutes up', () => {
      const started = new Date(ISO)
      const now = new Date(started.getTime() + 119_000)

      expect(formatElapsed(started, now)).toEqual({ unit: 'minutes', minutes: 1 })
    })

    it('floors at zero so a clock adjustment never renders negative time', () => {
      expect(formatElapsed(at(30), at(0))).toEqual({ unit: 'minutes', minutes: 0 })
    })

    it('switches to hours on the hour', () => {
      expect(formatElapsed(at(0), at(60))).toEqual({ unit: 'hours', hours: 1 })
      expect(formatElapsed(at(0), at(120))).toEqual({ unit: 'hours', hours: 2 })
    })

    it('keeps the leftover minutes once past an hour', () => {
      expect(formatElapsed(at(0), at(95))).toEqual({
        unit: 'hoursMinutes',
        hours: 1,
        minutes: 35
      })
    })

    it('reports a long session in hours and minutes', () => {
      expect(formatElapsed(at(0), at(7 * 60 + 42))).toEqual({
        unit: 'hoursMinutes',
        hours: 7,
        minutes: 42
      })
    })
  })

  describe('formatWhen', () => {
    it('reads as now for anything under a minute', () => {
      expect(formatWhen(at(0), at(0))).toEqual({ unit: 'now' })
      expect(formatWhen(at(0.5), at(0))).toEqual({ unit: 'now' })
    })

    it('reads as now even when the deadline is a few seconds overdue', () => {
      expect(formatWhen(at(-0.5), at(0))).toEqual({ unit: 'now' })
    })

    it('counts minutes up to the hour', () => {
      expect(formatWhen(at(59), at(0))).toEqual({ unit: 'minutes', count: 59, overdue: false })
    })

    it('counts hours up to the day', () => {
      expect(formatWhen(at(60), at(0))).toEqual({ unit: 'hours', count: 1, overdue: false })
      expect(formatWhen(at(23 * 60), at(0))).toEqual({
        unit: 'hours',
        count: 23,
        overdue: false
      })
    })

    it('counts days beyond 24 hours', () => {
      expect(formatWhen(at(24 * 60), at(0))).toEqual({ unit: 'days', count: 1, overdue: false })
      expect(formatWhen(at(3 * 24 * 60 + 60), at(0))).toEqual({
        unit: 'days',
        count: 3,
        overdue: false
      })
    })

    it('flags overdue deadlines in the same units', () => {
      expect(formatWhen(at(-90), at(0))).toEqual({ unit: 'hours', count: 1, overdue: true })
      expect(formatWhen(at(-5), at(0))).toEqual({ unit: 'minutes', count: 5, overdue: true })
      expect(formatWhen(at(-48 * 60), at(0))).toEqual({
        unit: 'days',
        count: 2,
        overdue: true
      })
    })
  })

  describe('focusLabel', () => {
    it('is null when no timer is running', () => {
      expect(focusLabel(null)).toBeNull()
    })

    it('prefers the task title, which is more specific than the project', () => {
      expect(
        focusLabel({
          startedAt: at(0),
          plannedMinutes: 50,
          taskTitle: 'Write copy',
          projectTitle: 'Landing page'
        })
      ).toBe('Write copy')
    })

    it('falls back to the project title when the session has no task', () => {
      expect(
        focusLabel({
          startedAt: at(0),
          plannedMinutes: 50,
          taskTitle: null,
          projectTitle: 'Landing page'
        })
      ).toBe('Landing page')
    })

    it('trims surrounding whitespace', () => {
      expect(
        focusLabel({
          startedAt: at(0),
          plannedMinutes: 50,
          taskTitle: '  Write copy  ',
          projectTitle: null
        })
      ).toBe('Write copy')
    })

    it('is null for a blank title, so the caller uses its untitled label', () => {
      expect(
        focusLabel({
          startedAt: at(0),
          plannedMinutes: 50,
          taskTitle: '   ',
          projectTitle: '  '
        })
      ).toBeNull()
    })

    it('is null when both titles are absent', () => {
      expect(focusLabel({ startedAt: at(0), plannedMinutes: 50 })).toBeNull()
    })
  })
})
