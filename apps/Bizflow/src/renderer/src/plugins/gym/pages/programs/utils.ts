import { GOAL_STYLES } from './constants'
import { Program } from './types'

export function getGoalStyle(goal: string) {
  return GOAL_STYLES[goal.toLowerCase()] || GOAL_STYLES['general fitness']
}

export function groupProgramDaysByWeek(days: any[] = []) {
  const sorted = [...days].sort(
    (a, b) => a.weekNumber - b.weekNumber || a.dayNumber - b.dayNumber
  )
  const grouped: Record<number, typeof days> = {}
  sorted.forEach(d => {
    if (!grouped[d.weekNumber]) grouped[d.weekNumber] = []
    grouped[d.weekNumber].push(d)
  })
  return grouped
}

export function calculateProgramTotalExercises(program: Program): number {
  if (!program.days) return 0
  return program.days.reduce((acc, d) => acc + (d.exercises?.length ?? 0), 0)
}