/**
 * Shift time arithmetic.
 *
 * The tab used to do this inline, which is why a night shift could show a
 * negative length and two shifts booked on top of each other looked fine. These
 * pin the rules, including the cross-midnight cases that are easy to regress.
 */

import { describe, expect, it } from 'vitest'

import {
  localDayOffset,
  minutesBetween,
  overlappingShiftIds,
  shiftDay,
  shiftDurationMinutes,
  shiftEndMinutes,
  shiftsBetween,
  timeToMinutes,
  totalShiftMinutes,
} from '../../renderer/src/pages/Employees/shiftTimes'

describe('timeToMinutes', () => {
  it('reads an HH:MM clock time', () => {
    expect(timeToMinutes('09:30')).toBe(570)
    expect(timeToMinutes('00:00')).toBe(0)
    expect(timeToMinutes('23:59')).toBe(1439)
  })

  it('accepts a single-digit hour and seconds', () => {
    expect(timeToMinutes('9:05')).toBe(545)
    expect(timeToMinutes('09:30:00')).toBe(570)
  })

  it('rejects anything that is not a time rather than guessing', () => {
    expect(timeToMinutes('24:00')).toBeNull()
    expect(timeToMinutes('09:60')).toBeNull()
    expect(timeToMinutes('lunchtime')).toBeNull()
    expect(timeToMinutes('')).toBeNull()
    expect(timeToMinutes(null)).toBeNull()
    expect(timeToMinutes(undefined)).toBeNull()
  })
})

describe('shiftEndMinutes', () => {
  it('keeps a same-day shift inside its own day', () => {
    expect(shiftEndMinutes('09:00', '17:00')).toBe(1020)
  })

  it('pushes a cross-midnight shift past 1440 instead of going negative', () => {
    expect(shiftEndMinutes('22:00', '06:00')).toBe(1800)
    expect(shiftEndMinutes('00:30', '00:15')).toBe(1455)
  })

  it('reads an identical start and end as zero length, not a full day', () => {
    expect(shiftEndMinutes('09:00', '09:00')).toBe(540)
  })

  it('returns null when either side is unusable', () => {
    expect(shiftEndMinutes('22:00', 'later')).toBeNull()
    expect(shiftEndMinutes(undefined, '06:00')).toBeNull()
  })
})

describe('shiftDurationMinutes', () => {
  it('subtracts the unpaid break', () => {
    expect(shiftDurationMinutes('09:00', '17:00', 60)).toBe(420)
    expect(shiftDurationMinutes('09:00', '17:00')).toBe(480)
  })

  it('measures a night shift across midnight', () => {
    expect(shiftDurationMinutes('22:00', '06:00')).toBe(480)
  })

  it('never returns a negative duration', () => {
    // A break longer than the shift is a data-entry mistake, not negative hours.
    expect(shiftDurationMinutes('09:00', '10:00', 120)).toBe(0)
    expect(shiftDurationMinutes('09:00', '09:00', 60)).toBe(0)
  })

  it('ignores a nonsense break instead of poisoning the total', () => {
    expect(shiftDurationMinutes('09:00', '17:00', -30)).toBe(480)
    expect(shiftDurationMinutes('09:00', '17:00', NaN)).toBe(480)
  })

  it('returns zero for unusable times', () => {
    expect(shiftDurationMinutes('', '', 0)).toBe(0)
    expect(shiftDurationMinutes('09:00', 'oops', 0)).toBe(0)
  })
})

describe('shiftDay', () => {
  it('gives the local calendar day, not the UTC one', () => {
    const localNoon = new Date(2024, 4, 17, 12, 0, 0)
    expect(shiftDay({ date: localNoon.toISOString() })).toBe('2024-05-17')
  })

  it('returns an empty string for an unparseable date', () => {
    expect(shiftDay({ date: 'not-a-date' })).toBe('')
  })
})

describe('overlappingShiftIds', () => {
  // Built from local dates so the test does not depend on the machine timezone.
  const shift = (id: string, dayOfMay: number, startTime: string, endTime: string) => ({
    id,
    date: new Date(2024, 4, dayOfMay).toISOString(),
    startTime,
    endTime,
  })

  it('flags both sides of a clash, because either row might be the mistake', () => {
    const flagged = overlappingShiftIds([
      shift('a', 17, '09:00', '17:00'),
      shift('b', 17, '16:00', '20:00'),
    ])
    expect(Array.from(flagged).sort()).toEqual(['a', 'b'])
  })

  it('accepts back-to-back shifts', () => {
    const flagged = overlappingShiftIds([
      shift('a', 17, '09:00', '12:00'),
      shift('b', 17, '12:00', '15:00'),
    ])
    expect(flagged.size).toBe(0)
  })

  it('does not compare unrelated days', () => {
    const flagged = overlappingShiftIds([
      shift('a', 17, '09:00', '17:00'),
      shift('b', 18, '09:00', '17:00'),
    ])
    expect(flagged.size).toBe(0)
  })

  it('catches the handover clash between a night shift and the next morning', () => {
    const flagged = overlappingShiftIds([
      shift('night', 17, '22:00', '06:00'),
      shift('early', 18, '05:00', '09:00'),
    ])
    expect(Array.from(flagged).sort()).toEqual(['early', 'night'])
  })

  it('lets a night shift finish before the next day starts', () => {
    const flagged = overlappingShiftIds([
      shift('night', 17, '22:00', '06:00'),
      shift('day', 18, '09:00', '17:00'),
    ])
    expect(flagged.size).toBe(0)
  })

  it('skips rows it cannot read instead of flagging everything', () => {
    const flagged = overlappingShiftIds([
      shift('broken', 17, '09:00', 'oops'),
      shift('b', 17, '10:00', '12:00'),
    ])
    expect(flagged.size).toBe(0)
  })
})

describe('totalShiftMinutes', () => {
  it('adds up the paid minutes of every shift', () => {
    expect(
      totalShiftMinutes([
        { id: 'a', date: '2024-05-17', startTime: '09:00', endTime: '17:00', breakMins: 60 },
        { id: 'b', date: '2024-05-18', startTime: '22:00', endTime: '06:00', breakMins: 30 },
      ])
    ).toBe(420 + 450)
  })

  it('is zero for no shifts', () => {
    expect(totalShiftMinutes([])).toBe(0)
  })
})

describe('shiftsBetween', () => {
  const on = (dayOfMay: number) => new Date(2024, 4, dayOfMay).toISOString()
  const list = [
    { id: 'before', date: on(1), startTime: '09:00', endTime: '17:00' },
    { id: 'first', date: on(2), startTime: '09:00', endTime: '17:00' },
    { id: 'last', date: on(9), startTime: '09:00', endTime: '17:00' },
    { id: 'after', date: on(10), startTime: '09:00', endTime: '17:00' },
  ]

  it('includes both boundary days', () => {
    expect(shiftsBetween(list, '2024-05-02', '2024-05-09').map(s => s.id)).toEqual(['first', 'last'])
  })

  it('returns nothing when the range is a single day with no shift', () => {
    expect(shiftsBetween(list, '2024-05-05', '2024-05-05')).toEqual([])
  })
})

describe('minutesBetween', () => {
  it('measures a worked day', () => {
    expect(minutesBetween('2024-05-17T09:00:00.000Z', '2024-05-17T17:30:00.000Z')).toBe(510)
  })

  it('treats a missing or backwards pair as no time worked', () => {
    expect(minutesBetween('2024-05-17T09:00:00.000Z', null)).toBe(0)
    expect(minutesBetween(null, '2024-05-17T17:00:00.000Z')).toBe(0)
    expect(minutesBetween('2024-05-17T17:00:00.000Z', '2024-05-17T09:00:00.000Z')).toBe(0)
    expect(minutesBetween('nope', '2024-05-17T09:00:00.000Z')).toBe(0)
  })
})

describe('localDayOffset', () => {
  it('walks forward and back from a fixed date', () => {
    const anchored = new Date(2024, 4, 17, 23, 30, 0)
    expect(localDayOffset(0, anchored)).toBe('2024-05-17')
    expect(localDayOffset(1, anchored)).toBe('2024-05-18')
    expect(localDayOffset(-6, anchored)).toBe('2024-05-11')
  })

  it('rolls over a month and a year boundary', () => {
    expect(localDayOffset(1, new Date(2024, 11, 31, 12, 0, 0))).toBe('2025-01-01')
    expect(localDayOffset(-1, new Date(2024, 0, 1, 12, 0, 0))).toBe('2023-12-31')
  })
})
