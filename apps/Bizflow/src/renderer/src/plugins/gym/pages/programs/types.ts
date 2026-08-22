export type ProgramGoal =
  | 'weight loss'
  | 'muscle gain'
  | 'endurance'
  | 'flexibility'
  | 'general fitness'

export type ProgramViewMode = 'cards' | 'table'

export interface CoachLite {
  id: string
  name: string
  specialty?: string
}

export interface TraineeLite {
  id: string
  name: string
  phone?: string
  photoUrl?: string
}

export interface ProgramExercise {
  id: string
  dayId: string
  name: string
  sets: number
  reps: string
  weight?: string
  restSec?: number
  notes?: string
  order?: number
  createdAt?: string
}

export interface ProgramDay {
  id: string
  programId: string
  weekNumber: number
  dayNumber: number
  name?: string
  notes?: string
  exercises?: ProgramExercise[]
}

export interface ProgramAssignment {
  id: string
  programId: string
  traineeId: string
  trainee?: TraineeLite
  startDate?: string
  notes?: string
  status?: string
  createdAt?: string
}

export interface Program {
  id: string
  name: string
  description?: string | null
  goal: ProgramGoal | string
  weeksTotal: number
  daysPerWeek: number
  coachId?: string | null
  coach?: CoachLite | null
  isActive: boolean
  days?: ProgramDay[]
  assignments?: ProgramAssignment[]
  _count?: {
    days?: number
    assignments?: number
  }
  createdAt?: string
  updatedAt?: string
}

export interface ProgramFormData {
  name: string
  description: string
  goal: ProgramGoal | string
  weeksTotal: string | number
  daysPerWeek: string | number
  coachId: string
  isActive: boolean
}

export interface DayFormData {
  weekNumber: number
  dayNumber: number
  name: string
}

export interface ExerciseFormData {
  name: string
  sets: string
  reps: string
  weight: string
  restSec: string
  notes: string
}

export interface AssignProgramFormData {
  memberSearch: string
  traineeId: string
  selectedMember: TraineeLite | null
  startDate: string
  notes: string
}   