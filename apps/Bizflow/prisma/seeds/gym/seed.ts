/**
 * Gym Plugin – Development Seed
 *
 * Mirrors the quality / structure of prisma/seeds/vet/seed.ts.
 * Generates:
 *   – GymPlan          (8 subscription plans)
 *   – GymCoach         (10 coaches with specialties)
 *   – GymTrainee       (configurable, default 500)
 *   – GymSubscription  (one active/recent per trainee, mixed statuses)
 *   – GymWalkSession   (check-ins + walk-ins over past 12 months)
 *   – GymLocker        (40 lockers, zones: general/men/women/vip)
 *   – GymLockerAssignment
 *   – GymProgram + GymProgramDay + GymProgramExercise (4 programs)
 *   – GymProgramAssignment
 *   – GymMeasurement   (body measurements per trainee)
 *   – GymGoal          (fitness goals per trainee)
 *   – GymExpense       (running costs over past 12 months)
 *   – GymShift         (coach shifts for the past 4 weeks)
 *
 * Usage:
 *   npm run prisma:seed:gym
 *
 * Environment overrides:
 *   GYM_SEED_TRAINEES=500
 *   GYM_SEED_COACHES=10
 *   GYM_SEED_EXPENSE_MONTHS=12
 *   GYM_SEED_SESSION_MONTHS=12
 */

import { PrismaClient } from '../../../src/generated/prisma'
import * as crypto from 'crypto'

const prisma = new PrismaClient()

const CONFIG = {
  traineeCount:   Number(process.env.GYM_SEED_TRAINEES       ?? 500),
  coachCount:     Number(process.env.GYM_SEED_COACHES        ?? 10),
  expenseMonths:  Number(process.env.GYM_SEED_EXPENSE_MONTHS ?? 12),
  sessionMonths:  Number(process.env.GYM_SEED_SESSION_MONTHS ?? 12),
}

const NOW      = new Date()
const uuid     = () => crypto.randomUUID()

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: readonly T[]): T {
  return arr[rand(0, arr.length - 1)]
}

function daysAgo(n: number): Date {
  const d = new Date(NOW)
  d.setDate(d.getDate() - n)
  return d
}

function daysFromNow(n: number): Date {
  const d = new Date(NOW)
  d.setDate(d.getDate() + n)
  return d
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function randomPhone(): string {
  const prefixes = ['050', '055', '056', '058', '052', '054']
  return pick(prefixes) + rand(1000000, 9999999).toString()
}

function randomEmail(name: string): string {
  const domains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com']
  const slug = name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 10)
  return `${slug}${rand(10, 999)}@${pick(domains)}`
}

// ─── Name pools ───────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Ahmed', 'Mohammed', 'Ali', 'Omar', 'Hassan', 'Ibrahim', 'Khalid', 'Youssef',
  'Tariq', 'Samir', 'Nour', 'Lina', 'Sara', 'Hana', 'Rania', 'Dina', 'Maya',
  'Layla', 'Yasmin', 'Fatima', 'Zara', 'Adam', 'Karim', 'Bilal', 'Sami',
  'Walid', 'Faris', 'Mazen', 'Jad', 'Elie', 'Georges', 'Pierre', 'Mark',
  'David', 'Daniel', 'Joseph', 'Michael', 'James', 'Robert', 'John',
  'Carlos', 'Maria', 'Diego', 'Sofia', 'Luis', 'Emma', 'William', 'Isabella',
  'Benjamin', 'Sophia', 'Lucas', 'Mia', 'Henry', 'Charlotte', 'Alexander',
  'Ryan', 'Nathan', 'Kevin', 'Brian', 'Jason', 'Josh', 'Andrew', 'Tyler',
]

const LAST_NAMES = [
  'Al-Hassan', 'Al-Omar', 'Ibrahim', 'Khalil', 'Nasser', 'Mansour', 'Haddad',
  'Khoury', 'Salam', 'Farah', 'Nasr', 'Sabbagh', 'Tannous', 'Rizk', 'Gemayel',
  'Jaber', 'Assaf', 'Barakat', 'Moussa', 'Diab', 'Saad', 'Ghazal', 'Issa',
  'Akl', 'Chaaban', 'Daher', 'Fawaz', 'Ghanem', 'Hamdan', 'Jamal',
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
]

const GENDERS = ['male', 'female'] as const
const PAYMENT_METHODS = ['cash', 'card', 'bank_transfer'] as const
const SUB_STATUSES = ['active', 'active', 'active', 'expired', 'cancelled', 'frozen'] as const

// ─── Plans data ───────────────────────────────────────────────────────────────

const PLANS_DATA = [
  {
    name: 'Monthly Basic',
    description: 'Perfect for beginners looking to start their fitness journey.',
    category: 'general',
    durationDays: 30,
    price: 150,
    maxFreezeDays: 3,
    sessionsPerWeek: null,
    sessionsTotal: null,
    coachSessions: 0,
    hasSauna: false, hasJacuzzi: false, hasPool: false, hasLocker: true,
    hasTowel: false, hasNutritionPlan: false, hasBodyAnalysis: false,
    hasFitnessTest: false, hasGroupClass: true, guestPasses: 0,
    color: 'orange', isPopular: false, isActive: true,
  },
  {
    name: 'Monthly Premium',
    description: 'Full access with personal trainer sessions and all amenities.',
    category: 'general',
    durationDays: 30,
    price: 350,
    maxFreezeDays: 5,
    sessionsPerWeek: null,
    sessionsTotal: null,
    coachSessions: 4,
    hasSauna: true, hasJacuzzi: true, hasPool: false, hasLocker: true,
    hasTowel: true, hasNutritionPlan: true, hasBodyAnalysis: true,
    hasFitnessTest: true, hasGroupClass: true, guestPasses: 2,
    color: 'blue', isPopular: true, isActive: true,
  },
  {
    name: '3-Month Package',
    description: 'Commit to 3 months and save 20% versus monthly billing.',
    category: 'general',
    durationDays: 90,
    price: 360,
    maxFreezeDays: 7,
    sessionsPerWeek: null,
    sessionsTotal: null,
    coachSessions: 4,
    hasSauna: false, hasJacuzzi: false, hasPool: false, hasLocker: true,
    hasTowel: false, hasNutritionPlan: false, hasBodyAnalysis: true,
    hasFitnessTest: false, hasGroupClass: true, guestPasses: 0,
    color: 'emerald', isPopular: false, isActive: true,
  },
  {
    name: '6-Month Package',
    description: 'Best value for committed gym-goers. Save 30% overall.',
    category: 'general',
    durationDays: 180,
    price: 630,
    maxFreezeDays: 14,
    sessionsPerWeek: null,
    sessionsTotal: null,
    coachSessions: 8,
    hasSauna: true, hasJacuzzi: false, hasPool: false, hasLocker: true,
    hasTowel: true, hasNutritionPlan: true, hasBodyAnalysis: true,
    hasFitnessTest: true, hasGroupClass: true, guestPasses: 4,
    color: 'purple', isPopular: true, isActive: true,
  },
  {
    name: 'Annual Membership',
    description: 'Full year, unlimited access — the ultimate commitment.',
    category: 'wellness',
    durationDays: 365,
    price: 1100,
    maxFreezeDays: 30,
    sessionsPerWeek: null,
    sessionsTotal: null,
    coachSessions: 12,
    hasSauna: true, hasJacuzzi: true, hasPool: true, hasLocker: true,
    hasTowel: true, hasNutritionPlan: true, hasBodyAnalysis: true,
    hasFitnessTest: true, hasGroupClass: true, guestPasses: 12,
    color: 'teal', isPopular: false, isActive: true,
  },
  {
    name: 'VIP Elite',
    description: 'Exclusive VIP experience: private locker, dedicated coach, premium perks.',
    category: 'vip',
    durationDays: 30,
    price: 700,
    maxFreezeDays: 10,
    sessionsPerWeek: null,
    sessionsTotal: null,
    coachSessions: 12,
    hasSauna: true, hasJacuzzi: true, hasPool: true, hasLocker: true,
    hasTowel: true, hasNutritionPlan: true, hasBodyAnalysis: true,
    hasFitnessTest: true, hasGroupClass: true, guestPasses: 4,
    color: 'rose', isPopular: false, isActive: true,
  },
  {
    name: 'Weight-Loss Special',
    description: '12-week program designed for maximum fat burning. Includes nutrition plan.',
    category: 'weight-loss',
    durationDays: 84,
    price: 500,
    maxFreezeDays: 7,
    sessionsPerWeek: 5,
    sessionsTotal: 60,
    coachSessions: 8,
    hasSauna: true, hasJacuzzi: false, hasPool: false, hasLocker: true,
    hasTowel: true, hasNutritionPlan: true, hasBodyAnalysis: true,
    hasFitnessTest: true, hasGroupClass: true, guestPasses: 0,
    color: 'orange', isPopular: false, isActive: true,
  },
  {
    name: 'Muscle Gain Pro',
    description: 'Structured program with personal coaching to build lean muscle.',
    category: 'muscle-gain',
    durationDays: 90,
    price: 550,
    maxFreezeDays: 5,
    sessionsPerWeek: 4,
    sessionsTotal: 48,
    coachSessions: 12,
    hasSauna: false, hasJacuzzi: false, hasPool: false, hasLocker: true,
    hasTowel: false, hasNutritionPlan: true, hasBodyAnalysis: true,
    hasFitnessTest: true, hasGroupClass: false, guestPasses: 0,
    color: 'blue', isPopular: false, isActive: true,
  },
]

// ─── Coach specialties ────────────────────────────────────────────────────────

const COACH_TEMPLATES = [
  { name: 'Rami Al-Akhtar',   specialty: 'Weightlifting & Powerlifting', salary: 3500, salaryType: 'monthly' },
  { name: 'Sara Mansour',     specialty: 'Cardio & HIIT',               salary: 3000, salaryType: 'monthly' },
  { name: 'Karim Jaber',      specialty: 'CrossFit & Functional Training', salary: 3200, salaryType: 'monthly' },
  { name: 'Lina Khoury',      specialty: 'Yoga & Pilates',              salary: 2800, salaryType: 'monthly' },
  { name: 'Omar Ibrahim',     specialty: 'Bodybuilding & Hypertrophy',  salary: 3800, salaryType: 'monthly' },
  { name: 'Nadia Farah',      specialty: 'Sports Nutrition & Wellness', salary: 2600, salaryType: 'monthly' },
  { name: 'Hassan Al-Saad',   specialty: 'Boxing & Martial Arts',       salary: 3100, salaryType: 'monthly' },
  { name: 'Jenna Williams',   specialty: 'Dance Fitness & Zumba',       salary: 2400, salaryType: 'monthly' },
  { name: 'Tariq Nasser',     specialty: 'Rehabilitation & Physio',     salary: 3600, salaryType: 'monthly' },
  { name: 'Maya Ghazal',      specialty: 'Swimming & Aqua Fitness',     salary: 2700, salaryType: 'monthly' },
]

// ─── Expense categories ───────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  'rent', 'utilities', 'equipment', 'maintenance', 'cleaning',
  'insurance', 'marketing', 'salaries', 'supplements', 'other',
]

const EXPENSE_VENDORS: Record<string, string[]> = {
  rent:        ['City Property Management'],
  utilities:   ['DEWA', 'Etisalat'],
  equipment:   ['Life Fitness', 'Technogym', 'Rogue Fitness'],
  maintenance: ['QuickFix Services', 'TechRepair LLC'],
  cleaning:    ['CleanPro Services'],
  insurance:   ['Gulf Insurance Group'],
  marketing:   ['Digital Boost Agency', 'Social Media Pro'],
  salaries:    ['Payroll'],
  supplements: ['MyProtein Wholesale', 'GNC Bulk'],
  other:       ['Miscellaneous'],
}

const EXPENSE_DESCRIPTIONS: Record<string, string[]> = {
  rent:        ['Monthly gym rent', 'Building lease payment'],
  utilities:   ['Electricity bill', 'Water & cooling', 'Internet & phone'],
  equipment:   ['Treadmill purchase', 'Dumbbells set', 'Barbell & plates', 'Cable machine service'],
  maintenance: ['AC maintenance', 'Plumbing repair', 'Equipment tune-up', 'Locker repair'],
  cleaning:    ['Monthly cleaning service', 'Disinfection & sanitation'],
  insurance:   ['Annual gym liability insurance'],
  marketing:   ['Social media ads', 'Promotional flyers', 'Google Ads campaign'],
  salaries:    ['Staff salary payout'],
  supplements: ['Protein powder stock', 'Pre-workout supply', 'Vitamin supplements'],
  other:       ['Office supplies', 'Miscellaneous expenses'],
}

// ─── Goal templates ───────────────────────────────────────────────────────────

const GOAL_TEMPLATES = [
  { title: 'Lose 10 kg', type: 'weight',    targetValue: 10, unit: 'kg',       deadline: 90 },
  { title: 'Lose 5 kg',  type: 'weight',    targetValue: 5,  unit: 'kg',       deadline: 60 },
  { title: 'Run 5 km without stopping',        type: 'custom',    targetValue: 5,  unit: 'km',       deadline: 45 },
  { title: 'Attend 50 gym sessions',           type: 'sessions',  targetValue: 50, unit: 'sessions', deadline: 90 },
  { title: 'Bench press 100 kg',               type: 'custom',    targetValue: 100,unit: 'kg',       deadline: 120 },
  { title: 'Reduce body fat to 15%',           type: 'measurement',targetValue: 15,unit: '%',        deadline: 90 },
  { title: 'Build 5 kg lean muscle',           type: 'measurement',targetValue: 5, unit: 'kg',       deadline: 120 },
  { title: 'Complete 30-day streak',           type: 'streak',    targetValue: 30, unit: 'days',     deadline: 35 },
]

// ─── Program templates ────────────────────────────────────────────────────────

type ExerciseTemplate = { name: string; sets: number; reps: string; weight?: string; restSec: number }
type DayTemplate = { name: string; exercises: ExerciseTemplate[] }
type ProgramTemplate = {
  name: string; description: string; goal: string; weeksTotal: number; daysPerWeek: number
  days: DayTemplate[]
}

const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  {
    name: '12-Week Fat Loss',
    description: 'High-intensity program combining strength and cardio for maximum calorie burn.',
    goal: 'weight_loss',
    weeksTotal: 12,
    daysPerWeek: 5,
    days: [
      {
        name: 'Upper Body + HIIT',
        exercises: [
          { name: 'Push-Ups',         sets: 4, reps: '15', restSec: 45 },
          { name: 'Dumbbell Row',     sets: 4, reps: '12', weight: '20kg', restSec: 45 },
          { name: 'Shoulder Press',   sets: 3, reps: '12', weight: '15kg', restSec: 45 },
          { name: 'Burpees',          sets: 4, reps: '10', restSec: 30 },
          { name: 'Treadmill Sprint', sets: 5, reps: '1 min', restSec: 60 },
        ],
      },
      {
        name: 'Lower Body',
        exercises: [
          { name: 'Squat',            sets: 4, reps: '15', weight: '40kg', restSec: 60 },
          { name: 'Lunges',           sets: 3, reps: '12 each', restSec: 45 },
          { name: 'Leg Press',        sets: 4, reps: '15', weight: '80kg', restSec: 60 },
          { name: 'Calf Raises',      sets: 4, reps: '20', restSec: 30 },
          { name: 'Plank',            sets: 3, reps: '45 sec', restSec: 30 },
        ],
      },
      {
        name: 'Cardio Day',
        exercises: [
          { name: 'Rowing Machine',   sets: 1, reps: '20 min', restSec: 0 },
          { name: 'Bike Intervals',   sets: 6, reps: '2 min', restSec: 90 },
          { name: 'Jump Rope',        sets: 5, reps: '1 min', restSec: 45 },
        ],
      },
    ],
  },
  {
    name: 'Muscle Gain – 16 Weeks',
    description: 'Progressive overload program targeting hypertrophy and strength gains.',
    goal: 'muscle_gain',
    weeksTotal: 16,
    daysPerWeek: 4,
    days: [
      {
        name: 'Chest & Triceps',
        exercises: [
          { name: 'Barbell Bench Press', sets: 5, reps: '5',    weight: '80kg', restSec: 120 },
          { name: 'Incline DB Press',    sets: 4, reps: '8-10', weight: '30kg', restSec: 90  },
          { name: 'Cable Fly',           sets: 3, reps: '12',   weight: '15kg', restSec: 60  },
          { name: 'Tricep Pushdown',     sets: 4, reps: '12',   weight: '25kg', restSec: 60  },
          { name: 'Skull Crushers',      sets: 3, reps: '10',   weight: '20kg', restSec: 60  },
        ],
      },
      {
        name: 'Back & Biceps',
        exercises: [
          { name: 'Deadlift',          sets: 4, reps: '5',    weight: '100kg', restSec: 180 },
          { name: 'Pull-Ups',          sets: 4, reps: '8',    restSec: 90  },
          { name: 'Barbell Row',       sets: 4, reps: '8',    weight: '70kg', restSec: 90  },
          { name: 'Barbell Curl',      sets: 3, reps: '10',   weight: '30kg', restSec: 60  },
          { name: 'Hammer Curl',       sets: 3, reps: '12',   weight: '15kg', restSec: 60  },
        ],
      },
      {
        name: 'Shoulders & Core',
        exercises: [
          { name: 'Overhead Press',    sets: 4, reps: '6-8',  weight: '60kg', restSec: 120 },
          { name: 'Lateral Raises',    sets: 4, reps: '12',   weight: '8kg',  restSec: 45  },
          { name: 'Face Pulls',        sets: 3, reps: '15',   weight: '20kg', restSec: 45  },
          { name: 'Plank',             sets: 3, reps: '60 sec', restSec: 45  },
          { name: 'Cable Crunch',      sets: 4, reps: '15',   weight: '30kg', restSec: 45  },
        ],
      },
      {
        name: 'Legs',
        exercises: [
          { name: 'Back Squat',        sets: 5, reps: '5',    weight: '90kg', restSec: 180 },
          { name: 'Romanian Deadlift', sets: 4, reps: '8',    weight: '70kg', restSec: 120 },
          { name: 'Leg Press',         sets: 4, reps: '10',   weight: '120kg', restSec: 90 },
          { name: 'Leg Curl',          sets: 3, reps: '12',   weight: '40kg', restSec: 60  },
          { name: 'Standing Calf Raise', sets: 5, reps: '15', weight: '50kg', restSec: 45  },
        ],
      },
    ],
  },
  {
    name: 'Beginner Foundations – 8 Weeks',
    description: 'Introductory full-body program for new gym members. Builds form, habit, and base fitness.',
    goal: 'general_fitness',
    weeksTotal: 8,
    daysPerWeek: 3,
    days: [
      {
        name: 'Full Body – Day A',
        exercises: [
          { name: 'Goblet Squat',      sets: 3, reps: '12', weight: '12kg', restSec: 90 },
          { name: 'DB Bench Press',    sets: 3, reps: '10', weight: '15kg', restSec: 90 },
          { name: 'Seated Row',        sets: 3, reps: '10', weight: '30kg', restSec: 90 },
          { name: 'DB Shoulder Press', sets: 3, reps: '10', weight: '10kg', restSec: 60 },
          { name: 'Plank',             sets: 3, reps: '30 sec', restSec: 45 },
        ],
      },
      {
        name: 'Full Body – Day B',
        exercises: [
          { name: 'Romanian Deadlift', sets: 3, reps: '10', weight: '30kg', restSec: 90 },
          { name: 'Incline DB Press',  sets: 3, reps: '10', weight: '12kg', restSec: 90 },
          { name: 'Lat Pulldown',      sets: 3, reps: '10', weight: '40kg', restSec: 90 },
          { name: 'Lateral Raises',    sets: 3, reps: '12', weight: '5kg',  restSec: 45 },
          { name: 'Mountain Climbers', sets: 3, reps: '20', restSec: 45 },
        ],
      },
      {
        name: 'Full Body – Day C',
        exercises: [
          { name: 'Leg Press',         sets: 3, reps: '12', weight: '60kg', restSec: 90 },
          { name: 'Push-Ups',          sets: 3, reps: '12', restSec: 60 },
          { name: 'Cable Row',         sets: 3, reps: '12', weight: '25kg', restSec: 60 },
          { name: 'Dumbbell Curl',     sets: 3, reps: '12', weight: '8kg',  restSec: 45 },
          { name: 'Tricep Extension',  sets: 3, reps: '12', weight: '15kg', restSec: 45 },
        ],
      },
    ],
  },
  {
    name: 'Endurance & Cardio – 10 Weeks',
    description: 'Cardiovascular endurance program for improved stamina and heart health.',
    goal: 'endurance',
    weeksTotal: 10,
    daysPerWeek: 5,
    days: [
      {
        name: 'Steady-State Cardio',
        exercises: [
          { name: 'Treadmill Run',     sets: 1, reps: '30 min', restSec: 0 },
          { name: 'Cool-Down Walk',    sets: 1, reps: '5 min',  restSec: 0 },
        ],
      },
      {
        name: 'Interval Training',
        exercises: [
          { name: 'Warm-Up Jog',       sets: 1, reps: '5 min', restSec: 0 },
          { name: 'Sprint Intervals',  sets: 8, reps: '1 min', restSec: 90 },
          { name: 'Rowing Machine',    sets: 4, reps: '5 min', restSec: 60 },
        ],
      },
      {
        name: 'Cross-Training',
        exercises: [
          { name: 'Stationary Bike',   sets: 1, reps: '20 min', restSec: 0 },
          { name: 'Elliptical',        sets: 1, reps: '15 min', restSec: 0 },
          { name: 'Jump Rope',         sets: 5, reps: '2 min', restSec: 60 },
        ],
      },
    ],
  },
]

// ─── Types ────────────────────────────────────────────────────────────────────

type SeedCoach = {
  id: string; name: string; specialty: string | null; phone: string | null; email: string | null
  nationalId: string | null; salary: number; salaryType: string; hireDate: Date; isActive: boolean
  notes: string | null; createdAt: Date; updatedAt: Date
}

type SeedPlan = {
  id: string; name: string; description: string | null; category: string
  durationDays: number; price: number; maxFreezeDays: number
  sessionsPerWeek: number | null; sessionsTotal: number | null; coachSessions: number
  hasSauna: boolean; hasJacuzzi: boolean; hasPool: boolean; hasLocker: boolean
  hasTowel: boolean; hasNutritionPlan: boolean; hasBodyAnalysis: boolean
  hasFitnessTest: boolean; hasGroupClass: boolean; guestPasses: number
  color: string; isPopular: boolean; features: string | null; isActive: boolean
  createdAt: Date; updatedAt: Date
}

type SeedTrainee = {
  id: string; name: string; phone: string | null; email: string | null
  dateOfBirth: Date | null; gender: string | null; nationalId: string | null
  address: string | null; emergencyContact: string | null; emergencyPhone: string | null
  notes: string | null; createdAt: Date; updatedAt: Date
}

type SeedSubscription = {
  id: string; traineeId: string; planId: string; coachId: string | null
  startDate: Date; endDate: Date; status: string; amountPaid: number
  paymentMethod: string; freezeDaysUsed: number; notes: string | null
  createdAt: Date; updatedAt: Date
}

type SeedWalkSession = {
  id: string; traineeId: string | null; coachId: string | null
  subscriptionId: string | null; date: Date; type: string
  amount: number; paymentMethod: string | null; notes: string | null
  createdAt: Date
}

type SeedLocker = {
  id: string; number: string; zone: string; notes: string | null; createdAt: Date
}

type SeedLockerAssignment = {
  id: string; lockerId: string; traineeId: string; startDate: Date
  endDate: Date | null; isActive: boolean; notes: string | null; createdAt: Date
}

type SeedMeasurement = {
  id: string; traineeId: string; date: Date; weight: number | null
  bodyFat: number | null; muscle: number | null; waist: number | null
  chest: number | null; arms: number | null; legs: number | null
  notes: string | null; createdAt: Date
}

type SeedGoal = {
  id: string; traineeId: string; title: string; type: string
  targetValue: number | null; currentValue: number | null; unit: string | null
  deadline: Date | null; status: string; notes: string | null
  createdAt: Date; updatedAt: Date
}

type SeedExpense = {
  id: string; category: string; amount: number; date: Date; description: string
  vendor: string | null; paymentMethod: string; notes: string | null
  createdAt: Date; updatedAt: Date
}

type SeedShift = {
  id: string; coachId: string; date: Date; startTime: string; endTime: string
  notes: string | null; createdAt: Date
}

// ─── Clear ────────────────────────────────────────────────────────────────────

async function clearGymData(): Promise<void> {
  console.log('🗑️   Clearing existing gym data...')
  // Delete in dependency order (children before parents).
  // Wrapped in try-catch so first-ever run (tables not yet created) doesn't abort.
  const tables = [
    'GymShift', 'GymLockerAssignment', 'GymLocker',
    'GymProgramExercise', 'GymProgramDay', 'GymProgramAssignment', 'GymProgram',
    'GymGoal', 'GymMeasurement', 'GymWalkSession', 'GymFreeze', 'GymSubscription',
    'GymTrainee', 'GymPlan', 'GymCoach', 'GymExpense',
  ]
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`)
    } catch {
      // Table may not exist yet on first run — safe to ignore
    }
  }
}

// ─── Builders ─────────────────────────────────────────────────────────────────

function buildCoaches(count: number): SeedCoach[] {
  const coaches: SeedCoach[] = []
  const templates = COACH_TEMPLATES.slice(0, count)
  for (const tpl of templates) {
    const createdAt = daysAgo(rand(30, 730))
    coaches.push({
      id:         uuid(),
      name:       tpl.name,
      specialty:  tpl.specialty,
      phone:      randomPhone(),
      email:      randomEmail(tpl.name),
      nationalId: `ID${rand(100000, 999999)}`,
      salary:     tpl.salary,
      salaryType: tpl.salaryType,
      hireDate:   daysAgo(rand(60, 1095)),
      isActive:   Math.random() > 0.1,
      notes:      Math.random() > 0.7 ? 'Experienced certified trainer.' : null,
      createdAt,
      updatedAt:  createdAt,
    })
  }
  return coaches
}

function buildPlans(): SeedPlan[] {
  return PLANS_DATA.map(p => {
    const createdAt = daysAgo(rand(30, 365))
    return {
      id: uuid(),
      ...p,
      features: null,
      createdAt,
      updatedAt: createdAt,
    }
  })
}

function buildTrainees(count: number): SeedTrainee[] {
  const trainees: SeedTrainee[] = []
  for (let i = 0; i < count; i++) {
    const firstName  = pick(FIRST_NAMES)
    const lastName   = pick(LAST_NAMES)
    const name       = `${firstName} ${lastName}`
    const gender     = pick(GENDERS)
    const dob        = Math.random() > 0.2
      ? randomDate(daysAgo(365 * 50), daysAgo(365 * 16))
      : null
    const createdAt  = daysAgo(rand(0, CONFIG.sessionMonths * 30))

    trainees.push({
      id:               uuid(),
      name,
      phone:            randomPhone(),
      email:            Math.random() > 0.3 ? randomEmail(name) : null,
      dateOfBirth:      dob,
      gender,
      nationalId:       Math.random() > 0.4 ? `ID${rand(100000, 999999)}` : null,
      address:          Math.random() > 0.5 ? `Apt ${rand(1, 50)}, Building ${rand(1, 20)}, Dubai` : null,
      emergencyContact: Math.random() > 0.5 ? pick(FIRST_NAMES) + ' ' + pick(LAST_NAMES) : null,
      emergencyPhone:   Math.random() > 0.5 ? randomPhone() : null,
      notes:            Math.random() > 0.8 ? pick(['Has knee injury – avoid heavy squats.', 'Allergic to latex gloves.', 'Prefers morning sessions.', 'Goal: lose weight before wedding.']) : null,
      createdAt,
      updatedAt: createdAt,
    })
  }
  return trainees
}

function buildSubscriptions(trainees: SeedTrainee[], plans: SeedPlan[], coaches: SeedCoach[]): SeedSubscription[] {
  const subs: SeedSubscription[] = []
  const activeCoaches = coaches.filter(c => c.isActive)

  for (const trainee of trainees) {
    // Each trainee gets 1-2 subscriptions to simulate history
    const subCount = Math.random() > 0.7 ? 2 : 1
    let refDate = new Date(trainee.createdAt)

    for (let s = 0; s < subCount; s++) {
      const plan       = pick(plans)
      const startDate  = s === 0 ? new Date(refDate) : daysFromNow(rand(5, 30))
      const endDate    = new Date(startDate)
      endDate.setDate(endDate.getDate() + plan.durationDays)

      const isPast     = endDate < NOW
      const isCurrent  = startDate <= NOW && endDate >= NOW
      let status: string
      if (s === subCount - 1) {
        // Last sub: pick a meaningful status
        if (isCurrent)  status = pick(['active', 'active', 'active', 'frozen'])
        else if (isPast) status = pick(['expired', 'expired', 'cancelled'])
        else            status = 'active' // future start
      } else {
        status = 'expired'
      }

      const discount   = Math.random() > 0.8 ? rand(0, 20) / 100 : 0
      const amountPaid = parseFloat((plan.price * (1 - discount)).toFixed(2))
      const coach      = plan.coachSessions > 0 && Math.random() > 0.3 && activeCoaches.length > 0
        ? pick(activeCoaches)
        : null

      const createdAt = new Date(startDate)
      subs.push({
        id:             uuid(),
        traineeId:      trainee.id,
        planId:         plan.id,
        coachId:        coach?.id ?? null,
        startDate,
        endDate,
        status,
        amountPaid,
        paymentMethod:  pick(PAYMENT_METHODS),
        freezeDaysUsed: status === 'frozen' ? rand(1, 7) : 0,
        notes:          Math.random() > 0.85 ? 'Paid in advance.' : null,
        createdAt,
        updatedAt: createdAt,
      })

      refDate = new Date(endDate)
      refDate.setDate(refDate.getDate() + rand(1, 14))
    }
  }

  return subs
}

function buildWalkSessions(
  trainees: SeedTrainee[],
  coaches: SeedCoach[],
  subscriptions: SeedSubscription[],
  months: number,
): SeedWalkSession[] {
  const sessions: SeedWalkSession[] = []
  const sessionStart = daysAgo(months * 30)
  const activeCoaches = coaches.filter(c => c.isActive)

  // Check-in sessions for subscribed trainees
  for (const sub of subscriptions) {
    if (sub.status === 'cancelled') continue
    const trainee = trainees.find(t => t.id === sub.traineeId)!
    const windowStart = sub.startDate > sessionStart ? sub.startDate : sessionStart
    const windowEnd   = sub.endDate < NOW ? sub.endDate : NOW
    if (windowStart >= windowEnd) continue

    const sessionsCount = rand(3, 15)
    for (let i = 0; i < sessionsCount; i++) {
      const sessionDate = randomDate(windowStart, windowEnd)
      const coach = sub.coachId && Math.random() > 0.6 ? coaches.find(c => c.id === sub.coachId) ?? null : null

      sessions.push({
        id:             uuid(),
        traineeId:      trainee.id,
        coachId:        coach?.id ?? null,
        subscriptionId: sub.id,
        date:           sessionDate,
        type:           'checkin',
        amount:         0,
        paymentMethod:  null,
        notes:          null,
        createdAt:      sessionDate,
      })
    }
  }

  // Walk-in sessions — always have a non-zero cost and a payment method
  const walkInCount = rand(150, 300)
  const walkInAmounts = [20, 25, 30, 30, 35, 40, 50, 50, 50, 60, 75, 75, 100, 120, 150]
  for (let i = 0; i < walkInCount; i++) {
    const sessionDate = randomDate(sessionStart, NOW)
    const hasTrainee  = Math.random() > 0.35
    const trainee     = hasTrainee ? pick(trainees) : null
    const coach       = Math.random() > 0.5 && activeCoaches.length > 0 ? pick(activeCoaches) : null
    const amount      = pick(walkInAmounts)

    sessions.push({
      id:             uuid(),
      traineeId:      trainee?.id ?? null,
      coachId:        coach?.id ?? null,
      subscriptionId: null,
      date:           sessionDate,
      type:           'walkin',
      amount,
      paymentMethod:  pick(PAYMENT_METHODS),
      notes:          Math.random() > 0.8 ? pick(['Walk-in visitor.', 'Day pass.', 'Trial session.', 'Guest pass used.']) : null,
      createdAt:      sessionDate,
    })
  }

  return sessions
}

function buildLockers(): { lockers: SeedLocker[]; assignments: SeedLockerAssignment[]; traineeIds: string[] } {
  const lockers: SeedLocker[] = []
  const assignableIds: string[] = [] // returned so caller can use trainee ids

  const zones: Array<{ zone: string; count: number }> = [
    { zone: 'general', count: 15 },
    { zone: 'men',     count: 10 },
    { zone: 'women',   count: 10 },
    { zone: 'vip',     count: 5  },
  ]

  for (const { zone, count } of zones) {
    for (let i = 1; i <= count; i++) {
      lockers.push({
        id:        uuid(),
        number:    `${zone.toUpperCase().slice(0, 1)}${String(i).padStart(2, '0')}`,
        zone,
        notes:     null,
        createdAt: daysAgo(rand(30, 365)),
      })
    }
  }

  return { lockers, assignments: [], traineeIds: [] }
}

function buildLockerAssignments(lockers: SeedLocker[], trainees: SeedTrainee[]): SeedLockerAssignment[] {
  const assignments: SeedLockerAssignment[] = []
  const shuffled = [...trainees].sort(() => Math.random() - 0.5)
  const toAssign = shuffled.slice(0, Math.min(lockers.length - 5, Math.floor(lockers.length * 0.7)))

  for (let i = 0; i < toAssign.length; i++) {
    const trainee    = toAssign[i]
    const locker     = lockers[i]
    const startDate  = daysAgo(rand(1, 60))
    const isActive   = Math.random() > 0.2

    assignments.push({
      id:        uuid(),
      lockerId:  locker.id,
      traineeId: trainee.id,
      startDate,
      endDate:   isActive ? null : daysAgo(rand(1, 10)),
      isActive,
      notes:     null,
      createdAt: startDate,
    })
  }

  return assignments
}

function buildPrograms(coaches: SeedCoach[]): {
  programs: Array<{ id: string; name: string; description: string | null; goal: string; weeksTotal: number; daysPerWeek: number; coachId: string | null; isActive: boolean; createdAt: Date; updatedAt: Date }>
  days: Array<{ id: string; programId: string; weekNumber: number; dayNumber: number; name: string }>
  exercises: Array<{ id: string; dayId: string; name: string; sets: number; reps: string; weight: string | null; restSec: number; order: number; notes: string | null }>
} {
  const programs = []
  const days     = []
  const exercises = []
  const activeCoaches = coaches.filter(c => c.isActive)

  for (const tpl of PROGRAM_TEMPLATES) {
    const programId  = uuid()
    const coach      = activeCoaches.length > 0 && Math.random() > 0.3 ? pick(activeCoaches) : null
    const createdAt  = daysAgo(rand(30, 180))

    programs.push({
      id:          programId,
      name:        tpl.name,
      description: tpl.description,
      goal:        tpl.goal,
      weeksTotal:  tpl.weeksTotal,
      daysPerWeek: tpl.daysPerWeek,
      coachId:     coach?.id ?? null,
      isActive:    true,
      createdAt,
      updatedAt:   createdAt,
    })

    for (let w = 1; w <= tpl.weeksTotal; w++) {
      for (let d = 0; d < tpl.days.length; d++) {
        const dayTemplate = tpl.days[d % tpl.days.length]
        const dayId       = uuid()

        days.push({
          id:         dayId,
          programId,
          weekNumber: w,
          dayNumber:  d + 1,
          name:       dayTemplate.name,
        })

        for (let e = 0; e < dayTemplate.exercises.length; e++) {
          const ex = dayTemplate.exercises[e]
          exercises.push({
            id:      uuid(),
            dayId,
            name:    ex.name,
            sets:    ex.sets,
            reps:    ex.reps,
            weight:  ex.weight ?? null,
            restSec: ex.restSec,
            order:   e,
            notes:   null,
          })
        }
      }
    }
  }

  return { programs, days, exercises }
}

function buildProgramAssignments(
  programs: Array<{ id: string }>,
  trainees: SeedTrainee[],
): Array<{ id: string; programId: string; traineeId: string; startDate: Date; endDate: Date | null; isActive: boolean; notes: string | null; createdAt: Date }> {
  const assignments = []
  // Assign ~40% of trainees to a random program
  const eligible = [...trainees].sort(() => Math.random() - 0.5).slice(0, Math.floor(trainees.length * 0.4))

  for (const trainee of eligible) {
    const program   = pick(programs)
    const startDate = daysAgo(rand(0, 60))
    const isActive  = Math.random() > 0.2

    assignments.push({
      id:        uuid(),
      programId: program.id,
      traineeId: trainee.id,
      startDate,
      endDate:   isActive ? null : daysAgo(rand(1, 30)),
      isActive,
      notes:     null,
      createdAt: startDate,
    })
  }

  return assignments
}

function buildMeasurements(trainees: SeedTrainee[]): SeedMeasurement[] {
  const measurements: SeedMeasurement[] = []
  // ~60% of trainees have body measurements
  const eligible = trainees.filter(() => Math.random() > 0.4)

  for (const trainee of eligible) {
    const count = rand(1, 4)
    for (let i = 0; i < count; i++) {
      const date = daysAgo(rand(0, 120))
      measurements.push({
        id:        uuid(),
        traineeId: trainee.id,
        date,
        weight:    parseFloat((rand(55, 120) + Math.random()).toFixed(1)),
        bodyFat:   parseFloat((rand(10, 35) + Math.random()).toFixed(1)),
        muscle:    parseFloat((rand(25, 55) + Math.random()).toFixed(1)),
        waist:     parseFloat((rand(65, 105) + Math.random()).toFixed(1)),
        chest:     parseFloat((rand(85, 120) + Math.random()).toFixed(1)),
        arms:      parseFloat((rand(28, 45) + Math.random()).toFixed(1)),
        legs:      parseFloat((rand(45, 70) + Math.random()).toFixed(1)),
        notes:     null,
        createdAt: date,
      })
    }
  }

  return measurements
}

function buildGoals(trainees: SeedTrainee[]): SeedGoal[] {
  const goals: SeedGoal[] = []
  const eligible = trainees.filter(() => Math.random() > 0.5)

  for (const trainee of eligible) {
    const tpl        = pick(GOAL_TEMPLATES)
    const createdAt  = daysAgo(rand(0, 90))
    const isAchieved = Math.random() > 0.8
    const status     = isAchieved ? 'achieved' : (Math.random() > 0.9 ? 'cancelled' : 'active')
    const progress   = isAchieved ? tpl.targetValue! : parseFloat((tpl.targetValue! * Math.random() * 0.9).toFixed(1))

    goals.push({
      id:           uuid(),
      traineeId:    trainee.id,
      title:        tpl.title,
      type:         tpl.type,
      targetValue:  tpl.targetValue ?? null,
      currentValue: progress,
      unit:         tpl.unit ?? null,
      deadline:     daysFromNow(tpl.deadline),
      status,
      notes:        null,
      createdAt,
      updatedAt:    createdAt,
    })
  }

  return goals
}

function buildExpenses(months: number): SeedExpense[] {
  const expenses: SeedExpense[] = []
  const startDate = daysAgo(months * 30)

  for (let m = 0; m < months; m++) {
    const monthStart = new Date(startDate)
    monthStart.setMonth(monthStart.getMonth() + m)
    const monthEnd   = new Date(monthStart)
    monthEnd.setMonth(monthEnd.getMonth() + 1)
    if (monthEnd > NOW) monthEnd.setTime(NOW.getTime())

    // Fixed monthly expenses
    const fixedCategories = ['rent', 'utilities', 'cleaning', 'insurance']
    for (const cat of fixedCategories) {
      const amounts: Record<string, number> = { rent: 8000, utilities: 1200, cleaning: 500, insurance: 300 }
      const date       = new Date(monthStart)
      date.setDate(rand(1, 5))
      const createdAt  = new Date(date)

      expenses.push({
        id:            uuid(),
        category:      cat,
        amount:        amounts[cat] + rand(-50, 200),
        date,
        description:   pick(EXPENSE_DESCRIPTIONS[cat]),
        vendor:        pick(EXPENSE_VENDORS[cat]),
        paymentMethod: pick(['bank_transfer', 'card', 'cash']),
        notes:         null,
        createdAt,
        updatedAt:     createdAt,
      })
    }

    // Variable monthly expenses
    const variableCount = rand(2, 5)
    for (let i = 0; i < variableCount; i++) {
      const cat        = pick(['equipment', 'maintenance', 'marketing', 'supplements', 'other'])
      const date       = randomDate(monthStart, monthEnd)
      const createdAt  = new Date(date)

      expenses.push({
        id:            uuid(),
        category:      cat,
        amount:        parseFloat((rand(50, 2000) + Math.random() * 100).toFixed(2)),
        date,
        description:   pick(EXPENSE_DESCRIPTIONS[cat] ?? ['Expense']),
        vendor:        pick(EXPENSE_VENDORS[cat] ?? ['Unknown']),
        paymentMethod: pick(['cash', 'card', 'bank_transfer']),
        notes:         null,
        createdAt,
        updatedAt:     createdAt,
      })
    }
  }

  return expenses
}

function buildShifts(coaches: SeedCoach[]): SeedShift[] {
  const shifts: SeedShift[] = []
  const activeCoaches = coaches.filter(c => c.isActive)
  const shiftPatterns = [
    { startTime: '06:00', endTime: '14:00' },
    { startTime: '08:00', endTime: '16:00' },
    { startTime: '14:00', endTime: '22:00' },
    { startTime: '16:00', endTime: '22:00' },
  ]

  // Generate shifts for the past 4 weeks + next week
  for (let d = -28; d <= 7; d++) {
    const date = daysAgo(-d)
    // Each coach works 5 out of 7 days
    for (const coach of activeCoaches) {
      if (Math.random() > 0.3) {
        const pattern    = pick(shiftPatterns)
        const createdAt  = daysAgo(rand(0, 5))
        shifts.push({
          id:        uuid(),
          coachId:   coach.id,
          date,
          startTime: pattern.startTime,
          endTime:   pattern.endTime,
          notes:     null,
          createdAt,
        })
      }
    }
  }

  return shifts
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🏋️  Gym Plugin Seed – starting...')
  console.log(`📊  Trainees=${CONFIG.traineeCount}  Coaches=${CONFIG.coachCount}  ExpenseMonths=${CONFIG.expenseMonths}  SessionMonths=${CONFIG.sessionMonths}`)
  console.log('   Run with GYM_SEED_TRAINEES=N to override trainee count')

  const startedAt = Date.now()

  await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;')
  await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;')
  await prisma.$queryRawUnsafe('PRAGMA cache_size = 20000;')
  await prisma.$queryRawUnsafe('PRAGMA temp_store = MEMORY;')

  await clearGymData()

  // ── Build data ──────────────────────────────────────────────────────────────
  console.log('🎽  Building plans and coaches...')
  const plans    = buildPlans()
  const coaches  = buildCoaches(CONFIG.coachCount)
  const trainees = buildTrainees(CONFIG.traineeCount)

  console.log('📋  Building subscriptions...')
  const subscriptions = buildSubscriptions(trainees, plans, coaches)

  console.log('🏃  Building walk sessions and check-ins...')
  const sessions = buildWalkSessions(trainees, coaches, subscriptions, CONFIG.sessionMonths)

  console.log('🔒  Building lockers...')
  const { lockers }   = buildLockers()
  const lockerAssignments = buildLockerAssignments(lockers, trainees)

  console.log('📝  Building programs...')
  const { programs, days: programDays, exercises } = buildPrograms(coaches)
  const programAssignments = buildProgramAssignments(programs, trainees)

  console.log('📏  Building measurements and goals...')
  const measurements = buildMeasurements(trainees)
  const goals        = buildGoals(trainees)

  console.log('💰  Building expenses...')
  const expenses = buildExpenses(CONFIG.expenseMonths)

  console.log('📅  Building coach shifts...')
  const shifts = buildShifts(coaches)

  // ── Insert ──────────────────────────────────────────────────────────────────
  console.log('\n💾  Inserting plans and coaches...')
  await prisma.$transaction(async (tx) => {
    await tx.gymPlan.createMany({ data: plans })
    await tx.gymCoach.createMany({ data: coaches })
  }, { timeout: 60_000 })

  console.log('💾  Inserting trainees...')
  await prisma.$transaction(async (tx) => {
    await tx.gymTrainee.createMany({ data: trainees })
  }, { timeout: 120_000 })

  console.log('💾  Inserting subscriptions...')
  await prisma.$transaction(async (tx) => {
    await tx.gymSubscription.createMany({ data: subscriptions })
  }, { timeout: 60_000 })

  console.log('💾  Inserting walk sessions...')
  await prisma.$transaction(async (tx) => {
    await tx.gymWalkSession.createMany({ data: sessions })
  }, { timeout: 120_000 })

  console.log('💾  Inserting lockers and assignments...')
  await prisma.$transaction(async (tx) => {
    await tx.gymLocker.createMany({ data: lockers })
    await tx.gymLockerAssignment.createMany({ data: lockerAssignments })
  }, { timeout: 60_000 })

  console.log('💾  Inserting programs, days, and exercises...')
  await prisma.$transaction(async (tx) => {
    await tx.gymProgram.createMany({ data: programs })
    await tx.gymProgramDay.createMany({ data: programDays })
    await tx.gymProgramExercise.createMany({ data: exercises })
    await tx.gymProgramAssignment.createMany({ data: programAssignments })
  }, { timeout: 120_000 })

  console.log('💾  Inserting measurements and goals...')
  await prisma.$transaction(async (tx) => {
    await tx.gymMeasurement.createMany({ data: measurements })
    await tx.gymGoal.createMany({ data: goals })
  }, { timeout: 60_000 })

  console.log('💾  Inserting expenses and shifts...')
  await prisma.$transaction(async (tx) => {
    await tx.gymExpense.createMany({ data: expenses })
    await tx.gymShift.createMany({ data: shifts })
  }, { timeout: 60_000 })

  const duration = ((Date.now() - startedAt) / 1000).toFixed(1)

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length
  const expiredSubscriptions = subscriptions.filter(s => s.status === 'expired').length
  const expiringIn7 = subscriptions.filter(s => {
    const diff = (s.endDate.getTime() - NOW.getTime()) / (1000 * 60 * 60 * 24)
    return s.status === 'active' && diff >= 0 && diff <= 7
  }).length

  console.log('\n✅  Gym seed complete!')
  console.log('  ── Gym Plugin ─────────────────────────────────────')
  console.log(`   • ${plans.length} subscription plans`)
  console.log(`   • ${coaches.length} coaches`)
  console.log(`   • ${trainees.length} trainees`)
  console.log(`   • ${subscriptions.length} subscriptions (${activeSubscriptions} active, ${expiredSubscriptions} expired, ${expiringIn7} expiring in 7 days)`)
  console.log(`   • ${sessions.length} walk sessions & check-ins`)
  console.log(`   • ${lockers.length} lockers / ${lockerAssignments.length} assigned`)
  console.log(`   • ${programs.length} training programs / ${programDays.length} days / ${exercises.length} exercises`)
  console.log(`   • ${programAssignments.length} trainee program assignments`)
  console.log(`   • ${measurements.length} body measurements`)
  console.log(`   • ${goals.length} fitness goals`)
  console.log(`   • ${expenses.length} expenses`)
  console.log(`   • ${shifts.length} coach shifts`)
  console.log(`\n⏱️  Completed in ${duration}s`)
}

main()
  .catch((error) => {
    console.error('\n❌  Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
