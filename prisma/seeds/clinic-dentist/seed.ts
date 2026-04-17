/**
 * Dentist Clinic – Development Seed
 * ===================================
 * Creates a large, realistic dataset for load-testing and UI development:
 *
 *  • 5 000 patients       (spread across ~4 years of registration dates)
 *  • 1–20 sessions each   (~50 k sessions total, dentist-flavoured data)
 *  • Prescriptions        (0–3 per session, ~80 k total)
 *  • Follow-up dates      (set on ~30 % of sessions)
 *  • Appointments         (4–8 per patient, past + future, various statuses)
 *
 * Usage:
 *   npx ts-node --project tsconfig.node.json prisma/seeds/clinic-dentist/seed.ts
 *
 * Set DATABASE_URL in your environment first.
 */

import { PrismaClient } from '../../../src/generated/prisma'
import * as crypto from 'crypto'

const prisma = new PrismaClient()

// ── Configuration ──────────────────────────────────────────────────────────────

const PATIENT_COUNT   = 5_000
const BATCH_SIZE      = 200     // patients per DB transaction
const NOW             = new Date()
const FOUR_YEARS_AGO  = new Date(NOW.getTime() - 4 * 365.25 * 24 * 3_600_000)
const SIX_MONTHS_AHEAD = new Date(NOW.getTime() + 180 * 24 * 3_600_000)

// ── Lookup tables ──────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Ahmed', 'Mohammed', 'Ali', 'Omar', 'Hassan', 'Ibrahim', 'Khalid', 'Youssef',
  'Tariq', 'Samir', 'Nour', 'Lina', 'Sara', 'Hana', 'Rania', 'Dina', 'Maya',
  'Layla', 'Yasmin', 'Fatima', 'Zara', 'Adam', 'Karim', 'Bilal', 'Sami',
  'Walid', 'Faris', 'Mazen', 'Jad', 'Elie', 'Georges', 'Pierre', 'Mark',
  'David', 'Daniel', 'Joseph', 'Michael', 'James', 'Robert', 'John',
]

const LAST_NAMES = [
  'Al-Hassan', 'Al-Omar', 'Ibrahim', 'Khalil', 'Nasser', 'Mansour', 'Haddad',
  'Khoury', 'Salam', 'Farah', 'Nasr', 'Sabbagh', 'Tannous', 'Rizk', 'Gemayel',
  'Jaber', 'Assaf', 'Barakat', 'Moussa', 'Diab', 'Saad', 'Ghazal', 'Issa',
  'Akl', 'Chaaban', 'Daher', 'Fawaz', 'Ghanem', 'Hamdan', 'Jamal',
]

const BLOOD_TYPES   = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
const GENDERS       = ['male', 'female']

const DENTAL_COMPLAINTS = [
  'Toothache – upper left molar',
  'Sensitivity to cold on lower right',
  'Chipped front tooth',
  'Bleeding gums on brushing',
  'Routine check-up and cleaning',
  'Wisdom tooth pain',
  'Loose filling – lower left',
  'Broken crown – upper right',
  'Jaw pain and clicking',
  'Gum swelling and redness',
  'Tooth discolouration',
  'Request for dental implant consultation',
  'Follow-up after root canal',
  'Pain after extraction',
  'Cracked tooth – upper premolar',
  'Orthodontic wire issue',
  'Mouth ulcer not healing',
  'Bad breath concern',
  'Sleep apnoea / snoring consultation',
  'Sports guard fitting',
]

const DENTAL_DIAGNOSES = [
  'Dental caries – Class II (distal)',
  'Gingivitis – mild',
  'Periodontitis – moderate',
  'Pulpitis – irreversible',
  'Periapical abscess',
  'Fractured cusp – upper left first molar',
  'Failed amalgam restoration',
  'Impacted lower wisdom tooth',
  'Bruxism – moderate wear',
  'Temporomandibular joint dysfunction',
  'Recurrent aphthous stomatitis',
  'Dental fluorosis – mild',
  'Root resorption (external)',
  'Calculus build-up – generalised',
  'Leukoplakia – requires monitoring',
  'No pathology detected – healthy dentition',
  'Dry socket post-extraction',
  'Hypersensitivity – dentinal',
  'Enamel erosion – dietary',
  'Supernumerary tooth – asymptomatic',
]

const DENTAL_PROCEDURES = [
  // visitType → chiefComplaint-like procedure note
  'Composite resin restoration',
  'Amalgam restoration',
  'Porcelain crown preparation',
  'Root canal therapy – single canal',
  'Root canal therapy – multi-canal (molar)',
  'Simple extraction – erupted tooth',
  'Surgical extraction – impacted wisdom tooth',
  'Scale and polish',
  'Periapical X-rays (full mouth)',
  'Fluoride varnish application',
  'Fissure sealant application',
  'Dental implant placement',
  'Impression for partial denture',
  'Impression for full denture',
  'Orthodontic bracket placement',
  'Orthodontic adjustment',
  'Teeth whitening – in-office',
  'Bone graft – socket preservation',
  'Gingivectomy',
  'Temporary crown / bridge',
]

const DENTAL_MEDICATIONS = [
  { name: 'Amoxicillin 500 mg',  dosage: '500 mg', frequency: '3× daily', duration: '7 days',  qty: 21 },
  { name: 'Metronidazole 400 mg', dosage: '400 mg', frequency: '3× daily', duration: '7 days',  qty: 21 },
  { name: 'Ibuprofen 400 mg',    dosage: '400 mg', frequency: 'Every 8 h PRN', duration: '5 days', qty: 15 },
  { name: 'Paracetamol 500 mg',  dosage: '500 mg', frequency: 'Every 6 h PRN', duration: '5 days', qty: 20 },
  { name: 'Chlorhexidine 0.12 % Mouthwash', dosage: '15 mL', frequency: '2× daily', duration: '14 days', qty: 1 },
  { name: 'Clindamycin 300 mg',  dosage: '300 mg', frequency: '4× daily', duration: '7 days',  qty: 28 },
  { name: 'Dexamethasone 4 mg',  dosage: '4 mg',   frequency: 'Once daily (tapering)', duration: '3 days', qty: 3 },
  { name: 'Tramadol 50 mg',      dosage: '50 mg',  frequency: 'Every 6–8 h PRN', duration: '3 days', qty: 9 },
  { name: 'Fluoride gel (topical)', dosage: 'Thin layer', frequency: 'Once daily at night', duration: 'Ongoing', qty: 1 },
  { name: 'Benzydamine Mouthwash', dosage: '15 mL', frequency: 'Every 3 h', duration: '7 days', qty: 1 },
]

const DOCTOR_NAMES = [
  'Dr. Sarah Al-Haddad',
  'Dr. Omar Rizk',
  'Dr. Lina Khoury',
  'Dr. Karim Mansour',
  'Dr. Yasmin Nasr',
]

const VISIT_TYPES    = ['first_visit', 'follow_up', 'routine', 'emergency'] as const
const SESSION_STATUSES = ['completed', 'completed', 'completed', 'active', 'cancelled'] as const // weighted
const PAYMENT_STATUSES = ['paid', 'paid', 'paid', 'partial', 'unpaid', 'waived'] as const
const PAYMENT_METHODS  = ['cash', 'cash', 'card', 'insurance'] as const

const APPT_TYPES    = ['consultation', 'follow_up', 'procedure', 'checkup'] as const
const APPT_STATUSES_PAST   = ['completed', 'completed', 'completed', 'cancelled', 'no_show'] as const
const APPT_STATUSES_FUTURE = ['scheduled', 'scheduled', 'confirmed'] as const

// ── Helpers ────────────────────────────────────────────────────────────────────

function uuid() { return crypto.randomUUID() }
function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function randFloat(min: number, max: number) { return Math.round((Math.random() * (max - min) + min) * 100) / 100 }
function randDate(from: Date, to: Date) {
  return new Date(from.getTime() + Math.random() * (to.getTime() - from.getTime()))
}
function addDays(d: Date, n: number) { return new Date(d.getTime() + n * 86_400_000) }
function pad(n: number) { return String(n).padStart(4, '0') }

/** Dental chart – a few random teeth with conditions */
function makeDentalChart(): string {
  const conditions = ['caries', 'crown', 'missing', 'root_canal', 'filling', 'implant', 'extraction_needed']
  const chart: Record<string, { conditions: string[]; note: string }> = {}
  const toothCount = rand(0, 5)
  for (let i = 0; i < toothCount; i++) {
    const tooth = String(rand(11, 48))
    chart[tooth] = {
      conditions: [pick(conditions)],
      note: rand(0, 1) ? pick(['Sensitivity noted', 'Needs monitoring', 'Treatment planned', '']) : '',
    }
  }
  return JSON.stringify(chart)
}

/** Realistic vitals for a dental visit (blood pressure, pulse, o2sat – no temperature/weight usually) */
function makeVitals(): string {
  const systolic  = rand(100, 145)
  const diastolic = rand(60, 95)
  return JSON.stringify({
    bp:    `${systolic}/${diastolic}`,
    pulse: String(rand(60, 100)),
    o2sat: `${rand(96, 100)}%`,
  })
}

// ── Build entity objects (no DB calls yet) ─────────────────────────────────────

function buildPatient(i: number) {
  const firstName = pick(FIRST_NAMES)
  const lastName  = pick(LAST_NAMES)
  const dob       = randDate(new Date('1950-01-01'), new Date('2005-12-31'))
  const gender    = pick(GENDERS)
  const regDate   = randDate(FOUR_YEARS_AGO, NOW)

  return {
    id:          uuid(),
    name:        `${firstName} ${lastName}`,
    dateOfBirth: dob,
    gender,
    phone:       `+961 ${rand(3, 9)}${rand(100_000, 999_999)}`,
    email:       rand(0, 1) ? `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/-/g, '')}${i}@example.com` : null,
    address:     rand(0, 1) ? `${rand(1, 200)} ${pick(['Hamra St', 'Corniche Blvd', 'Verdun St', 'Mar Elias Rd', 'Badaro St'])}, Beirut` : null,
    nationalId:  `LB${pad(rand(10_000, 99_999))}${i}`,
    folderNumber: `D${pad(i + 1)}`,
    bloodType:   rand(0, 2) ? pick(BLOOD_TYPES) : null,
    allergies:   rand(0, 4) === 0 ? pick(['Penicillin', 'Aspirin', 'Latex', 'Ibuprofen', 'Codeine']) : null,
    medicalNotes: rand(0, 5) === 0 ? pick([
      'Diabetic – monitor healing post-extraction',
      'Hypertensive – avoid vasoconstrictors in high dose',
      'Asthmatic – use latex-free gloves',
      'Blood thinner (warfarin) – INR check required before surgery',
      'Anxious patient – consider anxiolysis',
    ]) : null,
    createdAt:   regDate,
    updatedAt:   regDate,
  }
}

function buildSessionsForPatient(patientId: string, regDate: Date) {
  const sessionCount = rand(1, 20)
  const sessions: ReturnType<typeof buildSession>[] = []

  let lastDate = new Date(Math.max(regDate.getTime(), FOUR_YEARS_AGO.getTime()))

  for (let s = 0; s < sessionCount; s++) {
    // Space sessions at least 7 days apart, up to 120 days
    const gap = rand(7, 120)
    const visitDate = addDays(lastDate, gap)
    if (visitDate > NOW) break
    lastDate = visitDate

    sessions.push(buildSession(patientId, visitDate, s === 0))
  }
  return sessions
}

function buildSession(patientId: string, visitDate: Date, isFirst: boolean) {
  const charged     = randFloat(30, 600)
  const payStatus   = pick(PAYMENT_STATUSES)
  const paid        = payStatus === 'paid'    ? charged
                    : payStatus === 'partial' ? randFloat(10, charged - 5)
                    : payStatus === 'waived'  ? 0
                    : 0 // unpaid
  const hasFollowUp = Math.random() < 0.30
  const followUpDate = hasFollowUp ? addDays(visitDate, rand(7, 90)) : null

  const id = uuid()
  return {
    id,
    patientId,
    visitDate,
    visitType:     isFirst ? 'first_visit' : pick(VISIT_TYPES),
    doctorName:    pick(DOCTOR_NAMES),
    chiefComplaint: pick(DENTAL_COMPLAINTS),
    vitals:        makeVitals(),
    diagnosis:     pick(DENTAL_DIAGNOSES),
    notes:         rand(0, 2) ? pick(DENTAL_PROCEDURES) : null,
    followUpDate,
    status:        pick(SESSION_STATUSES),
    amountCharged: charged,
    amountPaid:    paid,
    paymentStatus: payStatus,
    paymentMethod: pick(PAYMENT_METHODS),
    dentalChart:   rand(0, 1) ? makeDentalChart() : null,
    createdAt:     visitDate,
    updatedAt:     visitDate,
  }
}

function buildPrescriptions(sessionId: string, visitDate: Date) {
  const count = rand(0, 3)
  const rxs = []
  const used = new Set<number>()
  for (let i = 0; i < count; i++) {
    let idx: number
    do { idx = rand(0, DENTAL_MEDICATIONS.length - 1) } while (used.has(idx))
    used.add(idx)
    const med = DENTAL_MEDICATIONS[idx]
    rxs.push({
      id:          uuid(),
      sessionId,
      medicineName: med.name,
      dosage:      med.dosage,
      frequency:   med.frequency,
      duration:    med.duration,
      quantity:    med.qty,
      instructions: rand(0, 2) ? pick(['Take with food', 'Avoid alcohol', 'Complete full course', 'Rinse and spit – do not swallow']) : null,
      isActive:    true,
      startDate:   visitDate,
      stoppedAt:   null,
      stopReason:  null,
      createdAt:   visitDate,
    })
  }
  return rxs
}

function buildAppointmentsForPatient(patientId: string, regDate: Date) {
  const apptCount = rand(4, 8)
  const appts = []
  const pivotDate = NOW

  for (let a = 0; a < apptCount; a++) {
    const isFuture = a >= apptCount - rand(1, 3) // last 1-3 are future
    const apptDate = isFuture
      ? randDate(pivotDate, SIX_MONTHS_AHEAD)
      : randDate(regDate, pivotDate)

    const status = isFuture ? pick(APPT_STATUSES_FUTURE) : pick(APPT_STATUSES_PAST)
    const type   = pick(APPT_TYPES)

    // Randomise the time of day (8 AM – 6 PM)
    const hour   = rand(8, 17)
    const minute = pick([0, 15, 30, 45])
    apptDate.setHours(hour, minute, 0, 0)

    appts.push({
      id:              uuid(),
      patientId,
      appointmentDate: apptDate,
      duration:        pick([20, 30, 45, 60, 90]),
      type,
      doctorName:      pick(DOCTOR_NAMES),
      notes:           rand(0, 2) ? pick(DENTAL_PROCEDURES) : null,
      status,
      reminderSent:    !isFuture,
      createdAt:       isFuture ? NOW : apptDate,
      updatedAt:       isFuture ? NOW : apptDate,
    })
  }
  return appts
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🦷  Dentist Clinic Seed – starting...')
  console.log(`📊  Target: ${PATIENT_COUNT.toLocaleString()} patients\n`)

  const t0 = Date.now()

  // SQLite performance tuning (PRAGMAs that return rows need $queryRawUnsafe)
  await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;')
  await prisma.$queryRawUnsafe('PRAGMA synchronous  = NORMAL;')
  await prisma.$queryRawUnsafe('PRAGMA cache_size   = 20000;')
  await prisma.$queryRawUnsafe('PRAGMA temp_store   = MEMORY;')

  // ── Wipe existing clinic data so re-runs don't clash on unique constraints ──
  console.log('🗑   Clearing existing clinic data...')
  await prisma.clinicPrescription.deleteMany({})
  await prisma.clinicSession.deleteMany({})
  await prisma.clinicAppointment.deleteMany({})
  await prisma.clinicCheckResult.deleteMany({})
  await prisma.clinicPatient.deleteMany({})
  console.log('✅  Clinic tables cleared\n')

  let totalPatients     = 0
  let totalSessions     = 0
  let totalPrescriptions = 0
  let totalAppointments = 0

  const batches = Math.ceil(PATIENT_COUNT / BATCH_SIZE)

  for (let b = 0; b < batches; b++) {
    const batchStart = b * BATCH_SIZE
    const batchEnd   = Math.min(batchStart + BATCH_SIZE, PATIENT_COUNT)
    const batchSize  = batchEnd - batchStart

    // Build all objects in memory first
    const patients:      ReturnType<typeof buildPatient>[]         = []
    const sessions:      ReturnType<typeof buildSession>[]         = []
    const prescriptions: ReturnType<typeof buildPrescriptions>[0][] = []
    const appointments:  ReturnType<typeof buildAppointmentsForPatient>[0][] = []

    for (let i = batchStart; i < batchEnd; i++) {
      const p  = buildPatient(i)
      patients.push(p)

      const sesses = buildSessionsForPatient(p.id, p.createdAt)
      sessions.push(...sesses)

      for (const s of sesses) {
        const rxs = buildPrescriptions(s.id, s.visitDate)
        prescriptions.push(...rxs)
      }

      const appts = buildAppointmentsForPatient(p.id, p.createdAt)
      appointments.push(...appts)
    }

    // Single transaction per batch
    await prisma.$transaction(async (tx) => {
      await tx.clinicPatient.createMany({ data: patients })
      await tx.clinicSession.createMany({ data: sessions })
      if (prescriptions.length) {
        await tx.clinicPrescription.createMany({ data: prescriptions })
      }
      await tx.clinicAppointment.createMany({ data: appointments })
    }, { timeout: 60_000 })

    totalPatients      += batchSize
    totalSessions      += sessions.length
    totalPrescriptions += prescriptions.length
    totalAppointments  += appointments.length

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
    const pct = (((b + 1) / batches) * 100).toFixed(0)
    process.stdout.write(
      `\r  Batch ${b + 1}/${batches}  [${pct}%]  `
      + `patients=${totalPatients.toLocaleString()}  `
      + `sessions=${totalSessions.toLocaleString()}  `
      + `appts=${totalAppointments.toLocaleString()}  `
      + `${elapsed}s      `
    )
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  console.log('\n\n✅  Done!\n')
  console.log(`  Patients       : ${totalPatients.toLocaleString()}`)
  console.log(`  Sessions       : ${totalSessions.toLocaleString()}`)
  console.log(`  Prescriptions  : ${totalPrescriptions.toLocaleString()}`)
  console.log(`  Appointments   : ${totalAppointments.toLocaleString()}`)
  console.log(`  Elapsed        : ${elapsed}s\n`)
}

main()
  .catch((err) => { console.error('\n❌  Seed failed:', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
