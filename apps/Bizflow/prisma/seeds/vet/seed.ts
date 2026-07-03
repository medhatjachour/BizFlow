/**
 * Vet Plugin – Development Seed
 *
 * Mirrors the quality / structure of prisma/seeds/clinic-dentist/seed.ts.
 * Generates:
 *   – VetOwner + VetPatient (pets)
 *   – VetSession + VetPrescription + VetCheckResult (per pet)
 *   – VetAppointment (per pet)
 *   – VetExpense  (clinic running costs)
 *   – VetStaff + VetSalaryRecord
 *
 * Usage:
 *   npm run prisma:seed:vet
 *
 * Environment overrides:
 *   VET_SEED_OWNERS=4000
 *   VET_SEED_BATCH=50
 *   VET_SEED_STAFF=12
 *   VET_SEED_SALARY_MONTHS=18
 *   VET_SEED_EXPENSE_MONTHS=18
 *   VET_SEED_FUTURE_APPT_DAYS=180
 *   VET_SEED_RESULT_FILES=8
 */

import { PrismaClient } from '../../../src/generated/prisma'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

const CONFIG = {
  ownerCount:           Number(process.env.VET_SEED_OWNERS            ?? 4_000),
  batchSize:            Number(process.env.VET_SEED_BATCH              ?? 50),
  staffCount:           Number(process.env.VET_SEED_STAFF              ?? 12),
  salaryMonths:         Number(process.env.VET_SEED_SALARY_MONTHS      ?? 18),
  expenseMonths:        Number(process.env.VET_SEED_EXPENSE_MONTHS     ?? 18),
  futureAppointmentDays:Number(process.env.VET_SEED_FUTURE_APPT_DAYS  ?? 180),
  sharedResultFiles:    Number(process.env.VET_SEED_RESULT_FILES       ?? 8),
}

const NOW              = new Date()
const FOUR_YEARS_AGO   = new Date(NOW.getTime() - 4 * 365.25 * 24 * 3_600_000)
const FUTURE_WINDOW_END= new Date(NOW.getTime() + CONFIG.futureAppointmentDays * 86_400_000)
const GENERATED_RESULTS_DIR = path.resolve(__dirname, 'generated-check-results')

// ─── name pools ───────────────────────────────────────────────────────────────

const OWNER_FIRST = [
  'Ahmed','Mohammed','Ali','Omar','Hassan','Ibrahim','Khalid','Youssef',
  'Tariq','Samir','Nour','Lina','Sara','Hana','Rania','Dina','Maya',
  'Layla','Yasmin','Fatima','Zara','Adam','Karim','Bilal','Sami',
  'Walid','Faris','Mazen','Jad','Elie','Georges','Pierre','Mark',
  'David','Daniel','Joseph','Michael','James','Robert','John',
  'Carlos','Maria','Diego','Sofia','Luis','Emma','William','Isabella',
  'Benjamin','Sophia','Lucas','Mia','Henry','Charlotte','Alexander',
  // Arabic (bilingual dataset)
  'أحمد','محمد','علي','عمر','حسن','إبراهيم','خالد','يوسف','سعيد','ماجد',
  'سارة','لينا','نور','رانيا','دينا','مايا','ليلى','ياسمين','فاطمة','مريم','هبة','زينب',
]

const OWNER_LAST = [
  'Al-Hassan','Al-Omar','Ibrahim','Khalil','Nasser','Mansour','Haddad',
  'Khoury','Salam','Farah','Nasr','Sabbagh','Tannous','Rizk','Gemayel',
  'Jaber','Assaf','Barakat','Moussa','Diab','Saad','Ghazal','Issa',
  'Akl','Chaaban','Daher','Fawaz','Ghanem','Hamdan','Jamal',
  'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis',
  'Martinez','Anderson','Taylor','Thomas','Hernandez','Moore','Jackson',
  // Arabic (bilingual dataset)
  'الحسن','العمر','المنصور','الخطيب','النجار','الحدّاد','السيد','عبدالله',
  'الشامي','القاضي','الزعبي','الراشد','العتيبي','الدوسري','القحطاني','الغامدي',
]

const PET_NAMES = [
  'Max','Bella','Charlie','Lucy','Cooper','Molly','Buddy','Daisy','Rocky','Sadie',
  'Duke','Lily','Bear','Coco','Zeus','Lola','Bentley','Stella','Milo','Penny',
  'Leo','Rosie','Jack','Roxy','Toby','Maggie','Oliver','Ellie','Tucker','Sophie',
  'Simba','Luna','Oscar','Nala','Tiger','Missy','Sammy','Gracie','Thor','Abby',
  'Koda','Zoe','Buster','Ruby','Ace','Lady','Rex','Piper','Shadow','Chloe',
  'Gizmo','Honey','Harley','Dixie','Dexter','Lulu','Scout','Sasha','Bruno','Lexi',
  // Arabic (bilingual dataset)
  'لولو','بسبس','نمر','مشمش','قطقوط','زعتر','سكر','عسل','فلة','ريمي',
  'سيمو','جوجو','كوكو','توتو','ميمي','بوبي','سنفور','فستق','بطوط','خوخة',
]

const DOG_BREEDS  = ['Labrador Retriever','German Shepherd','Golden Retriever','Bulldog','Poodle',
  'Siberian Husky','Beagle','Boxer','Shih Tzu','Chihuahua','Rottweiler','Dachshund',
  'Doberman Pinscher','Maltese','Border Collie','Yorkshire Terrier','French Bulldog',]
const CAT_BREEDS  = ['Persian','Siamese','Maine Coon','Ragdoll','British Shorthair',
  'Abyssinian','Scottish Fold','Bengal','Sphynx','Burmese','American Shorthair',]
const BIRD_BREEDS = ['African Grey Parrot','Cockatiel','Budgerigar','Canary','Zebra Finch',
  'Lovebird','Macaw','Conure','Cockatoo','Eclectus Parrot',]
const PET_COLORS  = ['Black','White','Brown','Golden','Gray','Cream','Orange','Spotted',
  'Tricolor','Tabby','Calico','Brindle','Merle','Buff','Blue-Gray',]

const AREAS = ['Riyadh North','Riyadh South','Jeddah','Dammam','Khobar','Dubai','Abu Dhabi',
  'Sharjah','Cairo','Alexandria','Hamra','Achrafieh','Verdun','Jounieh','Zalka',
  'الرياض','جدة','الدمام','مكة','المدينة','حي النخيل','حي الورود','حي الياسمين',]

// ─── clinical data pools ──────────────────────────────────────────────────────

const VET_COMPLAINTS = [
  'Routine annual wellness examination',
  'Vaccination due – rabies and DHPP',
  'Reduced appetite for 3 days',
  'Lethargy and weakness',
  'Skin irritation and scratching',
  'Limping – right front leg',
  'Vomiting after eating',
  'Diarrhea – loose stool 2 days',
  'Eye discharge – left eye',
  'Ear shaking and odor',
  'Dental pain – drooling',
  'Weight loss over 2 months',
  'Excessive thirst and urination',
  'Post-surgery follow-up – wound check',
  'Parasite treatment – flea infestation',
  'Wound care – laceration on paw',
  'Difficulty breathing',
  'Urinary straining',
  'Persistent sneezing',
  'Behavioral change – aggression',
  'Grooming – matted coat',
  'Pre-surgical consultation',
  'Nail trimming and ear cleaning',
  'Limping – rear leg after play',
  'Swollen lymph nodes',
  // Arabic (bilingual dataset)
  'فحص دوري سنوي',
  'فقدان الشهية لمدة 3 أيام',
  'خمول وضعف عام',
  'حكة وتهيج جلدي',
  'عرج في القائمة الأمامية',
  'قيء بعد الأكل',
  'إسهال منذ يومين',
  'إفرازات من العين',
  'رجّة الأذن ورائحة كريهة',
  'ألم في الأسنان وسيلان لعاب',
]

const VET_DIAGNOSES = [
  'Healthy – no abnormalities detected',
  'Otitis externa – bacterial',
  'Dental disease Stage 2 – tartar accumulation',
  'Acute gastroenteritis',
  'Allergic dermatitis – environmental',
  'Obesity – dietary management initiated',
  'Hyperthyroidism – medication started',
  'Diabetes mellitus – insulin protocol',
  'Degenerative joint disease (arthritis)',
  'Urinary tract infection – E. coli',
  'Upper respiratory infection – viral',
  'Pyoderma – superficial bacterial skin infection',
  'Internal parasites – Toxocara spp.',
  'Conjunctivitis – secondary bacterial',
  'Fracture – radius/ulna – splint applied',
  'Post-operative recovery – healing well',
  'Anemia – iron-deficiency, supplementation started',
  'Heartworm disease – treatment protocol initiated',
  'Flea allergy dermatitis',
  'Chronic renal insufficiency – fluid therapy',
  'Pancreatitis – mild, dietary restriction',
  'Parvovirus – supportive care initiated',
  'Luxating patella – Grade II',
  'Corneal ulcer – antibiotic eye drops',
  // Arabic (bilingual dataset)
  'سليم — لا توجد ملاحظات',
  'التهاب الأذن الخارجية — بكتيري',
  'أمراض الأسنان — تراكم الجير',
  'التهاب معدة وأمعاء حاد',
  'التهاب جلدي تحسسي',
  'سمنة — بدء نظام غذائي',
  'عدوى المسالك البولية',
  'عدوى تنفسية علوية',
  'التهاب جلدي قيحي',
  'ديدان داخلية — علاج بدأ',
]

const VET_MEDICATIONS = [
  { name: 'Amoxicillin 500 mg',       dosage: '10 mg/kg',    frequency: '2× daily',   duration: '7 days',   quantity: 14 },
  { name: 'Metronidazole 250 mg',      dosage: '15 mg/kg',    frequency: '2× daily',   duration: '5 days',   quantity: 10 },
  { name: 'Meloxicam 1 mg/mL (oral)',  dosage: '0.1 mg/kg',   frequency: 'Once daily', duration: '5 days',   quantity: 1  },
  { name: 'Prednisone 5 mg',           dosage: '1 mg/kg',     frequency: 'Once daily', duration: '10 days',  quantity: 10 },
  { name: 'Enrofloxacin 68 mg',        dosage: '5 mg/kg',     frequency: 'Once daily', duration: '7 days',   quantity: 7  },
  { name: 'Otomax Ear Drops',          dosage: '4 drops/ear', frequency: '2× daily',   duration: '7 days',   quantity: 1  },
  { name: 'Frontline Plus (spot-on)',  dosage: '1 pipette',   frequency: 'Monthly',    duration: '3 months', quantity: 3  },
  { name: 'Heartgard Plus',            dosage: '1 tablet',    frequency: 'Monthly',    duration: '6 months', quantity: 6  },
  { name: 'Apoquel 16 mg',             dosage: '0.5 mg/kg',   frequency: '2× daily',   duration: '14 days',  quantity: 28 },
  { name: 'Clavamox 250 mg',           dosage: '12.5 mg/kg',  frequency: '2× daily',   duration: '10 days',  quantity: 20 },
  { name: 'Cerenia 24 mg',             dosage: '2 mg/kg',     frequency: 'Once daily', duration: '5 days',   quantity: 5  },
  { name: 'Famotidine 10 mg',          dosage: '0.5 mg/kg',   frequency: 'Once daily', duration: '7 days',   quantity: 7  },
]

const RESULT_TITLES = [
  'Radiograph – Thoracic',
  'Radiograph – Abdominal',
  'Ultrasound Report',
  'CBC Blood Panel',
  'Biochemistry Profile',
  'Urinalysis Report',
  'Cytology Report',
  'Heartworm Test Result',
]

const RESULT_FILE_NAMES = [
  'thoracic-xray.pdf',
  'abdominal-xray.pdf',
  'ultrasound-report.pdf',
  'cbc-panel.pdf',
  'biochemistry-profile.pdf',
  'urinalysis.pdf',
  'cytology-report.pdf',
  'heartworm-test.pdf',
]

const STAFF_PROFILES = [
  { role: 'veterinarian', employmentType: 'full_time',  salaryType: 'monthly', baseSalary: 5200, hourlyRate: 45,   overtimeRate: 1.75 },
  { role: 'veterinarian', employmentType: 'full_time',  salaryType: 'monthly', baseSalary: 4800, hourlyRate: 42,   overtimeRate: 1.5  },
  { role: 'veterinarian', employmentType: 'contract',   salaryType: 'monthly', baseSalary: 3500, hourlyRate: 30,   overtimeRate: 1.5  },
  { role: 'vet_tech',     employmentType: 'full_time',  salaryType: 'monthly', baseSalary: 2200, hourlyRate: 15,   overtimeRate: 1.5  },
  { role: 'vet_tech',     employmentType: 'full_time',  salaryType: 'monthly', baseSalary: 2000, hourlyRate: 14,   overtimeRate: 1.5  },
  { role: 'vet_tech',     employmentType: 'part_time',  salaryType: 'hourly',  baseSalary: 0,    hourlyRate: 18,   overtimeRate: 1.5  },
  { role: 'receptionist', employmentType: 'full_time',  salaryType: 'monthly', baseSalary: 1600, hourlyRate: 11,   overtimeRate: 1.25 },
  { role: 'receptionist', employmentType: 'full_time',  salaryType: 'monthly', baseSalary: 1500, hourlyRate: 10.5, overtimeRate: 1.25 },
  { role: 'groomer',      employmentType: 'part_time',  salaryType: 'hourly',  baseSalary: 0,    hourlyRate: 22,   overtimeRate: 1.5  },
  { role: 'groomer',      employmentType: 'contract',   salaryType: 'monthly', baseSalary: 1800, hourlyRate: 12,   overtimeRate: 1.25 },
  { role: 'other',        employmentType: 'full_time',  salaryType: 'monthly', baseSalary: 1200, hourlyRate: 8,    overtimeRate: 1.25 },
  { role: 'other',        employmentType: 'full_time',  salaryType: 'monthly', baseSalary: 1100, hourlyRate: 7.5,  overtimeRate: 1.25 },
]

const EXPENSE_CATEGORIES = [
  'rent','utilities','medical_supplies','medications','equipment',
  'maintenance','lab_fees','insurance','marketing','cleaning','salaries','other',
]

const PAYMENT_METHODS      = ['cash','card','insurance','other'] as const
const EXPENSE_PAY_METHODS  = ['cash','card','bank_transfer','other'] as const
const VISIT_TYPES          = ['wellness_exam','visit','consultation','vaccination','sonar','lab_test','dental','surgery','emergency','follow_up','deworming','grooming'] as const
const SESSION_STATUSES     = ['completed','completed','completed','completed','active','cancelled'] as const
const APPOINTMENT_TYPES    = ['consultation','follow_up','vaccination','surgery','grooming','checkup'] as const
const PAST_APPT_STATUSES   = ['completed','completed','completed','cancelled','no_show'] as const
const FUTURE_APPT_STATUSES = ['scheduled','scheduled','scheduled','confirmed'] as const

// ─── Medicine catalogue ─────────────────────────────────────────────────────

// ── Medicine catalogue generator ──────────────────────────────────────────────
// Produces a large, varied catalogue. A good share of medicines are liquids /
// injectables that carry a sub-unit (e.g. a 100 ml bottle sold by the ml).

type MedDef = {
  name: string; category: string; unit: string; minimumStock: number
  description: string; unitPrice: number; costPerUnit: number
  subUnit: string | null; subUnitsPerContainer: number | null
}

// Solid oral drugs → tablet/capsule, multiple strengths
const SOLID_DRUGS: Array<{ base: string; cat: string; unit: string; strengths: string[]; price: number; cost: number; desc: string }> = [
  { base: 'Amoxicillin',     cat: 'antibiotic',    unit: 'tablet',  strengths: ['125mg','250mg','500mg'],        price: 0.45, cost: 0.20, desc: 'Broad-spectrum penicillin antibiotic' },
  { base: 'Clavamox',        cat: 'antibiotic',    unit: 'tablet',  strengths: ['62.5mg','250mg','375mg'],       price: 3.20, cost: 1.40, desc: 'Amoxicillin-clavulanate antibiotic' },
  { base: 'Cephalexin',      cat: 'antibiotic',    unit: 'capsule', strengths: ['250mg','500mg'],                price: 0.70, cost: 0.30, desc: 'First-generation cephalosporin antibiotic' },
  { base: 'Doxycycline',     cat: 'antibiotic',    unit: 'capsule', strengths: ['50mg','100mg'],                 price: 1.80, cost: 0.75, desc: 'Tetracycline antibiotic for tick-borne disease' },
  { base: 'Metronidazole',   cat: 'antibiotic',    unit: 'tablet',  strengths: ['250mg','500mg'],                price: 0.60, cost: 0.25, desc: 'Antibiotic / antiprotozoal for GI infections' },
  { base: 'Enrofloxacin',    cat: 'antibiotic',    unit: 'tablet',  strengths: ['22.7mg','68mg','136mg'],        price: 2.50, cost: 1.10, desc: 'Fluoroquinolone antibiotic' },
  { base: 'Cefpodoxime',     cat: 'antibiotic',    unit: 'tablet',  strengths: ['100mg','200mg'],                price: 2.10, cost: 0.95, desc: 'Third-generation cephalosporin antibiotic' },
  { base: 'Clindamycin',     cat: 'antibiotic',    unit: 'capsule', strengths: ['25mg','75mg','150mg'],          price: 0.90, cost: 0.38, desc: 'Lincosamide antibiotic for soft-tissue / dental infections' },
  { base: 'Heartgard Plus',  cat: 'antiparasitic', unit: 'tablet',  strengths: ['≤11kg','12-22kg','23-45kg'],    price: 12.5, cost: 5.50, desc: 'Ivermectin/pyrantel heartworm chewable' },
  { base: 'Drontal Plus',    cat: 'antiparasitic', unit: 'tablet',  strengths: ['small','medium','large'],       price: 6.80, cost: 2.90, desc: 'Broad-spectrum dewormer tablet' },
  { base: 'NexGard',         cat: 'antiparasitic', unit: 'tablet',  strengths: ['2-4kg','4-10kg','10-25kg'],     price: 14.0, cost: 6.20, desc: 'Afoxolaner flea & tick chewable' },
  { base: 'Bravecto',        cat: 'antiparasitic', unit: 'tablet',  strengths: ['4.5-10kg','10-20kg','20-40kg'], price: 38.0, cost: 18.0, desc: '12-week flea & tick chewable' },
  { base: 'Praziquantel',    cat: 'antiparasitic', unit: 'tablet',  strengths: ['23mg','34mg'],                  price: 1.20, cost: 0.50, desc: 'Tapeworm dewormer tablet' },
  { base: 'Meloxicam',       cat: 'analgesic',     unit: 'tablet',  strengths: ['1mg','2.5mg'],                  price: 0.80, cost: 0.32, desc: 'NSAID for pain and inflammation' },
  { base: 'Carprofen',       cat: 'analgesic',     unit: 'tablet',  strengths: ['25mg','75mg','100mg'],          price: 0.95, cost: 0.40, desc: 'NSAID for osteoarthritis pain' },
  { base: 'Gabapentin',      cat: 'analgesic',     unit: 'capsule', strengths: ['100mg','300mg'],                price: 0.60, cost: 0.22, desc: 'Neuropathic pain and anxiety relief' },
  { base: 'Tramadol',        cat: 'analgesic',     unit: 'tablet',  strengths: ['50mg'],                         price: 0.55, cost: 0.20, desc: 'Opioid-like analgesic' },
  { base: 'Prednisolone',    cat: 'general',       unit: 'tablet',  strengths: ['5mg','20mg'],                   price: 0.50, cost: 0.18, desc: 'Corticosteroid for inflammation' },
  { base: 'Apoquel',         cat: 'general',       unit: 'tablet',  strengths: ['3.6mg','5.4mg','16mg'],         price: 4.80, cost: 2.10, desc: 'Oclacitinib for allergic itch relief' },
  { base: 'Cerenia',         cat: 'general',       unit: 'tablet',  strengths: ['16mg','24mg','60mg'],           price: 6.50, cost: 2.80, desc: 'Maropitant anti-emetic' },
  { base: 'Famotidine',      cat: 'general',       unit: 'tablet',  strengths: ['10mg','20mg'],                  price: 0.55, cost: 0.20, desc: 'H2 blocker for gastric acid' },
  { base: 'Omeprazole',      cat: 'general',       unit: 'capsule', strengths: ['10mg','20mg'],                  price: 0.65, cost: 0.24, desc: 'Proton-pump inhibitor for ulcers' },
  { base: 'Furosemide',      cat: 'general',       unit: 'tablet',  strengths: ['12.5mg','40mg'],                price: 0.40, cost: 0.15, desc: 'Loop diuretic for cardiac oedema' },
  { base: 'Levothyroxine',   cat: 'general',       unit: 'tablet',  strengths: ['0.3mg','0.5mg','0.8mg'],        price: 0.45, cost: 0.18, desc: 'Thyroid hormone replacement' },
  { base: 'Cosequin DS',     cat: 'supplement',    unit: 'tablet',  strengths: ['chew'],                         price: 1.20, cost: 0.55, desc: 'Glucosamine-chondroitin joint chew' },
  { base: 'Omega-3',         cat: 'supplement',    unit: 'capsule', strengths: ['500mg','1000mg'],               price: 0.75, cost: 0.30, desc: 'Fish-oil fatty-acid supplement' },
  { base: 'Denamarin',       cat: 'supplement',    unit: 'tablet',  strengths: ['small','large'],                price: 2.10, cost: 0.95, desc: 'SAMe + silybin liver support' },
  { base: 'Vitamin B Complex',cat: 'supplement',   unit: 'tablet',  strengths: ['std'],                          price: 0.40, cost: 0.15, desc: 'B-vitamin metabolic support' },
]

// Liquids → bottle sold by the ml (sub-unit)
const LIQUID_DRUGS: Array<{ base: string; cat: string; sizesMl: number[]; pricePerMl: number; costPerMl: number; desc: string }> = [
  { base: 'Amoxicillin Oral Suspension', cat: 'antibiotic',    sizesMl: [30, 60, 100],  pricePerMl: 0.30, costPerMl: 0.12, desc: 'Palatable oral antibiotic suspension' },
  { base: 'Metronidazole Suspension',    cat: 'antibiotic',    sizesMl: [60, 100],      pricePerMl: 0.28, costPerMl: 0.11, desc: 'Oral antiprotozoal suspension' },
  { base: 'Panacur Liquid',              cat: 'antiparasitic', sizesMl: [100, 240],     pricePerMl: 0.20, costPerMl: 0.08, desc: 'Fenbendazole dewormer suspension' },
  { base: 'Pyrantel Pamoate',            cat: 'antiparasitic', sizesMl: [30, 60],       pricePerMl: 0.22, costPerMl: 0.09, desc: 'Roundworm / hookworm oral suspension' },
  { base: 'Meloxicam Oral',              cat: 'analgesic',     sizesMl: [10, 15, 32],   pricePerMl: 0.85, costPerMl: 0.35, desc: 'NSAID oral suspension' },
  { base: 'Tramadol Syrup',              cat: 'analgesic',     sizesMl: [60, 100],      pricePerMl: 0.35, costPerMl: 0.14, desc: 'Liquid analgesic syrup' },
  { base: 'Lactulose Syrup',             cat: 'general',       sizesMl: [200, 500],     pricePerMl: 0.06, costPerMl: 0.02, desc: 'Osmotic laxative syrup' },
  { base: 'Sucralfate Suspension',       cat: 'general',       sizesMl: [100, 420],     pricePerMl: 0.10, costPerMl: 0.04, desc: 'GI mucosal protectant' },
  { base: 'Prednisolone Syrup',          cat: 'general',       sizesMl: [60, 120],      pricePerMl: 0.18, costPerMl: 0.07, desc: 'Liquid corticosteroid' },
  { base: 'Vitamin B Complex Oral',      cat: 'supplement',    sizesMl: [100, 250],     pricePerMl: 0.07, costPerMl: 0.03, desc: 'Liquid B-vitamin supplement' },
]

// Injectables → vial sold by the ml (sub-unit)
const INJ_DRUGS: Array<{ base: string; cat: string; sizesMl: number[]; pricePerMl: number; costPerMl: number; desc: string }> = [
  { base: 'Enrofloxacin Injectable', cat: 'antibiotic',  sizesMl: [20, 50, 100], pricePerMl: 0.55, costPerMl: 0.24, desc: 'Injectable fluoroquinolone antibiotic' },
  { base: 'Ceftriaxone Injectable',  cat: 'antibiotic',  sizesMl: [10, 20],      pricePerMl: 0.90, costPerMl: 0.40, desc: 'Injectable cephalosporin antibiotic' },
  { base: 'Ivermectin Injectable',   cat: 'antiparasitic',sizesMl: [50, 100],    pricePerMl: 0.35, costPerMl: 0.15, desc: 'Injectable antiparasitic' },
  { base: 'Meloxicam Injectable',    cat: 'analgesic',   sizesMl: [10, 20],      pricePerMl: 1.10, costPerMl: 0.48, desc: 'Injectable NSAID analgesic' },
  { base: 'Buprenorphine',           cat: 'analgesic',   sizesMl: [10],          pricePerMl: 2.40, costPerMl: 1.05, desc: 'Injectable opioid analgesic' },
  { base: 'Ketamine',                cat: 'anesthetic',  sizesMl: [10, 50],      pricePerMl: 2.00, costPerMl: 0.90, desc: 'Dissociative anesthetic' },
  { base: 'Propofol',                cat: 'anesthetic',  sizesMl: [20, 50],      pricePerMl: 1.75, costPerMl: 0.80, desc: 'IV anesthetic induction agent' },
  { base: 'Dexmedetomidine',         cat: 'anesthetic',  sizesMl: [10],          pricePerMl: 4.50, costPerMl: 2.00, desc: 'Sedative / analgesic' },
  { base: 'Atropine',                cat: 'anesthetic',  sizesMl: [20],          pricePerMl: 0.60, costPerMl: 0.22, desc: 'Anticholinergic pre-medication' },
  { base: 'Dexamethasone',           cat: 'general',     sizesMl: [50, 100],     pricePerMl: 0.30, costPerMl: 0.12, desc: 'Injectable corticosteroid' },
  { base: 'Vitamin B12',             cat: 'supplement',  sizesMl: [50, 100],     pricePerMl: 0.20, costPerMl: 0.08, desc: 'Injectable cyanocobalamin' },
]

// Vials / vaccines and topicals / spot-ons
const VACCINES = [
  { base: 'Rabies Vaccine',     cat: 'vaccine', price: 25, cost: 12,   desc: '3-year rabies vaccine' },
  { base: 'DHPP Combo Vaccine', cat: 'vaccine', price: 22, cost: 10.5, desc: 'Distemper/Hepatitis/Parvo/Parainfluenza combo' },
  { base: 'FVRCP Vaccine',      cat: 'vaccine', price: 20, cost: 9.5,  desc: 'Feline respiratory & panleukopenia combo' },
  { base: 'Bordetella Vaccine', cat: 'vaccine', price: 18, cost: 8,    desc: 'Kennel-cough intranasal vaccine' },
  { base: 'Leptospirosis Vaccine', cat: 'vaccine', price: 19, cost: 8.5, desc: '4-serovar leptospirosis vaccine' },
  { base: 'FeLV Vaccine',       cat: 'vaccine', price: 24, cost: 11,   desc: 'Feline leukemia vaccine' },
]
const SPOT_ONS = [
  { base: 'Frontline Plus',  cat: 'antiparasitic', unit: 'vial',   weights: ['S','M','L','XL'], price: 18, cost: 9,  desc: 'Flea & tick spot-on' },
  { base: 'Revolution',      cat: 'antiparasitic', unit: 'vial',   weights: ['cat','S','M','L'], price: 22, cost: 10, desc: 'Selamectin spot-on parasiticide' },
  { base: 'Advantage II',    cat: 'antiparasitic', unit: 'vial',   weights: ['S','M','L'],       price: 16, cost: 7,  desc: 'Imidacloprid flea spot-on' },
  { base: 'Advocate',        cat: 'antiparasitic', unit: 'vial',   weights: ['cat','S','M','L'], price: 20, cost: 9,  desc: 'Moxidectin/imidacloprid spot-on' },
]
const TOPICALS = [
  { base: 'Silver Sulfadiazine Cream', cat: 'general', price: 9,  cost: 3.8, desc: 'Antibacterial burn / wound cream' },
  { base: 'Otomax Ointment',           cat: 'general', price: 14, cost: 6,   desc: 'Otic anti-inflammatory / antibiotic' },
  { base: 'Animax Ointment',           cat: 'general', price: 12, cost: 5,   desc: 'Topical antifungal / antibacterial' },
  { base: 'Chlorhexidine Gel',         cat: 'general', price: 8,  cost: 3,   desc: 'Antiseptic skin gel' },
  { base: 'Terramycin Eye Ointment',   cat: 'antibiotic', price: 11, cost: 4.5, desc: 'Ophthalmic antibiotic ointment' },
]
const FLUIDS = [
  { base: 'Normal Saline 0.9%', cat: 'general', sizesMl: [500, 1000], pricePerMl: 0.016, costPerMl: 0.007, desc: 'Isotonic IV fluid' },
  { base: 'Lactated Ringers',   cat: 'general', sizesMl: [500, 1000], pricePerMl: 0.018, costPerMl: 0.008, desc: 'Balanced electrolyte IV fluid' },
  { base: 'Dextrose 5%',        cat: 'general', sizesMl: [500],       pricePerMl: 0.020, costPerMl: 0.009, desc: '5% dextrose IV fluid' },
]

function buildMedicineCatalogue(target: number): MedDef[] {
  const out: MedDef[] = []
  const minStock = (u: string) => u === 'tablet' || u === 'capsule' ? rand(40, 150)
    : u === 'ml' ? rand(150, 400) : u === 'bottle' || u === 'vial' ? rand(8, 40) : rand(6, 25)

  // Solids
  for (const d of SOLID_DRUGS) for (const s of d.strengths) {
    out.push({ name: `${d.base} ${s}`, category: d.cat, unit: d.unit, minimumStock: minStock(d.unit),
      description: d.desc, unitPrice: round2(d.price * randFloat(0.9, 1.15)), costPerUnit: round2(d.cost * randFloat(0.9, 1.1)),
      subUnit: null, subUnitsPerContainer: null })
  }
  // Liquids (bottle + ml sub-unit)
  for (const d of LIQUID_DRUGS) for (const ml of d.sizesMl) {
    const cpu = round2(d.costPerMl * ml)
    out.push({ name: `${d.base} ${ml}mL`, category: d.cat, unit: 'bottle', minimumStock: rand(6, 24),
      description: d.desc, unitPrice: round2(d.pricePerMl * ml * randFloat(1.0, 1.2)), costPerUnit: cpu,
      subUnit: 'ml', subUnitsPerContainer: ml })
  }
  // Injectables (vial + ml sub-unit)
  for (const d of INJ_DRUGS) for (const ml of d.sizesMl) {
    out.push({ name: `${d.base} ${ml}mL`, category: d.cat, unit: 'vial', minimumStock: rand(4, 20),
      description: d.desc, unitPrice: round2(d.pricePerMl * ml * randFloat(1.0, 1.2)), costPerUnit: round2(d.costPerMl * ml),
      subUnit: 'ml', subUnitsPerContainer: ml })
  }
  // Fluids (bottle + ml sub-unit)
  for (const d of FLUIDS) for (const ml of d.sizesMl) {
    out.push({ name: `${d.base} ${ml}mL`, category: d.cat, unit: 'bottle', minimumStock: rand(5, 20),
      description: d.desc, unitPrice: round2(d.pricePerMl * ml * randFloat(1.0, 1.25)), costPerUnit: round2(d.costPerMl * ml),
      subUnit: 'ml', subUnitsPerContainer: ml })
  }
  // Vaccines
  for (const v of VACCINES) for (const n of [1, 10]) {
    out.push({ name: n === 1 ? `${v.base} (single)` : `${v.base} (10-dose)`, category: v.cat, unit: 'vial', minimumStock: rand(10, 40),
      description: v.desc, unitPrice: round2(v.price * (n === 10 ? 8 : 1)), costPerUnit: round2(v.cost * (n === 10 ? 8 : 1)),
      subUnit: n === 10 ? 'dose' : null, subUnitsPerContainer: n === 10 ? 10 : null })
  }
  // Spot-ons
  for (const sp of SPOT_ONS) for (const w of sp.weights) {
    out.push({ name: `${sp.base} (${w})`, category: sp.cat, unit: sp.unit, minimumStock: rand(8, 30),
      description: sp.desc, unitPrice: round2(sp.price * randFloat(0.95, 1.1)), costPerUnit: round2(sp.cost), subUnit: null, subUnitsPerContainer: null })
  }
  // Topicals
  for (const tp of TOPICALS) for (const sz of ['15g', '30g']) {
    out.push({ name: `${tp.base} ${sz}`, category: tp.cat, unit: 'tube', minimumStock: rand(6, 20),
      description: tp.desc, unitPrice: round2(tp.price * (sz === '30g' ? 1.6 : 1)), costPerUnit: round2(tp.cost * (sz === '30g' ? 1.6 : 1)), subUnit: null, subUnitsPerContainer: null })
  }

  // Pad up to the target with branded generic variants of the solids
  const brands = ['Vet', 'Pharma', 'Care', 'Plus', 'Forte', 'Max', 'Pro', 'Animal', 'Pet', 'Bio']
  let bi = 0
  while (out.length < target) {
    const d = SOLID_DRUGS[bi % SOLID_DRUGS.length]
    const s = d.strengths[bi % d.strengths.length]
    const brand = brands[Math.floor(bi / SOLID_DRUGS.length) % brands.length]
    out.push({ name: `${d.base}-${brand} ${s}`, category: d.cat, unit: d.unit, minimumStock: minStock(d.unit),
      description: `${d.desc} (generic)`, unitPrice: round2(d.price * randFloat(0.8, 1.1)), costPerUnit: round2(d.cost * randFloat(0.85, 1.05)),
      subUnit: null, subUnitsPerContainer: null })
    bi++
  }
  return out.slice(0, target)
}

function round2(n: number) { return Math.round(n * 100) / 100 }

// Arabic-named medicines so store / sales / inventory reports show Arabic data.
const ARABIC_DRUGS: MedDef[] = [
  { name: 'أموكسيسيلين 500 مجم', category: 'antibiotic', unit: 'علبة', minimumStock: 80, description: 'مضاد حيوي واسع الطيف', unitPrice: 0.55, costPerUnit: 0.24, subUnit: 'قرص', subUnitsPerContainer: 20 },
  { name: 'ميترونيدازول 250 مجم', category: 'antibiotic', unit: 'علبة', minimumStock: 70, description: 'مضاد حيوي للالتهابات المعوية', unitPrice: 0.60, costPerUnit: 0.26, subUnit: 'قرص', subUnitsPerContainer: 20 },
  { name: 'سيفالكسين 500 مجم', category: 'antibiotic', unit: 'علبة', minimumStock: 60, description: 'مضاد حيوي سيفالوسبورين', unitPrice: 0.80, costPerUnit: 0.34, subUnit: 'كبسولة', subUnitsPerContainer: 16 },
  { name: 'دوكسيسيكلين 100 مجم', category: 'antibiotic', unit: 'علبة', minimumStock: 50, description: 'مضاد حيوي تتراسيكلين', unitPrice: 1.80, costPerUnit: 0.78, subUnit: 'كبسولة', subUnitsPerContainer: 10 },
  { name: 'إنروفلوكساسين 68 مجم', category: 'antibiotic', unit: 'علبة', minimumStock: 55, description: 'مضاد حيوي فلوروكينولون', unitPrice: 2.50, costPerUnit: 1.10, subUnit: 'قرص', subUnitsPerContainer: 10 },
  { name: 'ميلوكسيكام شراب 15 مل', category: 'analgesic', unit: 'زجاجة', minimumStock: 18, description: 'مسكن ومضاد التهاب (شراب)', unitPrice: 12, costPerUnit: 5.20, subUnit: 'مل', subUnitsPerContainer: 15 },
  { name: 'كاربروفين 75 مجم', category: 'analgesic', unit: 'علبة', minimumStock: 40, description: 'مسكن لالتهاب المفاصل', unitPrice: 0.95, costPerUnit: 0.40, subUnit: 'قرص', subUnitsPerContainer: 14 },
  { name: 'جابابنتين 100 مجم', category: 'analgesic', unit: 'علبة', minimumStock: 45, description: 'لتسكين الألم العصبي', unitPrice: 0.60, costPerUnit: 0.22, subUnit: 'كبسولة', subUnitsPerContainer: 30 },
  { name: 'بريدنيزولون 5 مجم', category: 'general', unit: 'علبة', minimumStock: 60, description: 'كورتيكوستيرويد مضاد للالتهاب', unitPrice: 0.50, costPerUnit: 0.18, subUnit: 'قرص', subUnitsPerContainer: 30 },
  { name: 'أوميبرازول 20 مجم', category: 'general', unit: 'علبة', minimumStock: 50, description: 'مثبط مضخة البروتون للقرحة', unitPrice: 0.65, costPerUnit: 0.24, subUnit: 'كبسولة', subUnitsPerContainer: 14 },
  { name: 'فاموتيدين 20 مجم', category: 'general', unit: 'علبة', minimumStock: 55, description: 'حاصرات H2 لحموضة المعدة', unitPrice: 0.55, costPerUnit: 0.20, subUnit: 'قرص', subUnitsPerContainer: 20 },
  { name: 'فوروسيميد 40 مجم', category: 'general', unit: 'علبة', minimumStock: 50, description: 'مدر للبول لوذمة القلب', unitPrice: 0.40, costPerUnit: 0.15, subUnit: 'قرص', subUnitsPerContainer: 20 },
  { name: 'شراب أموكسيسيلين 60 مل', category: 'antibiotic', unit: 'زجاجة', minimumStock: 16, description: 'مضاد حيوي شراب للفم', unitPrice: 18, costPerUnit: 7.20, subUnit: 'مل', subUnitsPerContainer: 60 },
  { name: 'محلول ملحي 0.9% 500 مل', category: 'general', unit: 'كيس', minimumStock: 20, description: 'محلول وريدي متساوي التوتر', unitPrice: 9, costPerUnit: 3.50, subUnit: 'مل', subUnitsPerContainer: 500 },
  { name: 'ديكساميثازون حقن 50 مل', category: 'general', unit: 'أمبولة', minimumStock: 14, description: 'كورتيكوستيرويد حقن', unitPrice: 15, costPerUnit: 6, subUnit: 'مل', subUnitsPerContainer: 50 },
  { name: 'فيتامين ب12 حقن 100 مل', category: 'supplement', unit: 'أمبولة', minimumStock: 18, description: 'مكمل سيانوكوبالامين حقن', unitPrice: 20, costPerUnit: 8, subUnit: 'مل', subUnitsPerContainer: 100 },
  { name: 'لقاح السعار', category: 'vaccine', unit: 'أمبولة', minimumStock: 30, description: 'لقاح داء الكَلَب لمدة 3 سنوات', unitPrice: 25, costPerUnit: 12, subUnit: null, subUnitsPerContainer: null },
  { name: 'لقاح رباعي DHPP', category: 'vaccine', unit: 'أمبولة', minimumStock: 28, description: 'لقاح مركّب رباعي للكلاب', unitPrice: 22, costPerUnit: 10.5, subUnit: null, subUnitsPerContainer: null },
  { name: 'مرهم العين تيراميسين', category: 'antibiotic', unit: 'أنبوب', minimumStock: 20, description: 'مرهم عيني مضاد حيوي', unitPrice: 11, costPerUnit: 4.50, subUnit: null, subUnitsPerContainer: null },
  { name: 'كريم سلفاديازين الفضة', category: 'general', unit: 'أنبوب', minimumStock: 18, description: 'كريم مضاد للبكتيريا للحروق والجروح', unitPrice: 9, costPerUnit: 3.80, subUnit: null, subUnitsPerContainer: null },
]

const MED_TARGET = Number(process.env.VET_SEED_MEDICINES ?? 500)
const MEDICINE_CATALOGUE: MedDef[] = [
  ...ARABIC_DRUGS,
  ...buildMedicineCatalogue(Math.max(0, MED_TARGET - ARABIC_DRUGS.length)),
]

const MED_SUPPLIERS = ['VetSupply Co.','MedVet Pharma','AnimalHealth Plus','VetPharm Direct','BioVet Solutions','GlobalVet Imports','PharmaVet Arabia','MedAnimal Supply','شركة الرعاية البيطرية','مؤسسة الدواء البيطري','مستلزمات الحيوان العربية','فارما فيت العربية']

// Unit-appropriate quantity ranges for realistic dispensing amounts
const UNIT_QTY: Record<string, [number, number]> = {
  tablet:  [5,  120],
  capsule: [5,   90],
  ml:      [10, 500],
  vial:    [1,    6],
  tube:    [1,    4],
  bottle:  [1,    3],
  sachet:  [5,   30],
  dose:    [1,   10],
  other:   [1,   20],
}

// Bulk purchase qty multiplier (for large orders)
const BULK_QTY_FACTOR = 4

// Discount tiers — 0% weighted 3× to be most common
const DISCOUNT_TIERS: Array<{ frac: number; note: string | null }> = [
  { frac: 0,    note: null },
  { frac: 0,    note: null },
  { frac: 0,    note: null },
  { frac: 0.05, note: 'Loyalty 5%' },
  { frac: 0.10, note: 'Regular 10%' },
  { frac: 0.15, note: 'Bulk 15%' },
  { frac: 0.20, note: 'Staff discount 20%' },
  { frac: 0.25, note: 'VIP client 25%' },
  { frac: 0.30, note: 'Clearance 30%' },
]

const SALE_NOTES = [
  'Dispensed per prescription',
  'Walk-in OTC purchase',
  'Emergency dispensing – after-hours',
  'Bulk order for boarding patients',
  'Owner requested extra supply for travel',
  'Partial fill – remainder on back-order',
  'Compounded dose per vet instructions',
  'Insurance pre-authorisation obtained',
  'VIP client – loyalty discount applied',
  'Donated to rescue organisation',
  'Repeat prescription refill',
  'Post-surgical dispensing',
]

const EMERGENCY_MARKUP = 1.25   // 25% mark-up for after-hours emergency sales
const LOYALTY_DISCOUNT  = 0.90  // 10% base loyalty for frequent customers

const SPECIES_WEIGHTS = [
  { species: 'dog',        weight: 35 },
  { species: 'cat',        weight: 30 },
  { species: 'bird',       weight: 12 },
  { species: 'rabbit',     weight: 8  },
  { species: 'guinea_pig', weight: 5  },
  { species: 'reptile',    weight: 5  },
  { species: 'fish',       weight: 3  },
  { species: 'other',      weight: 2  },
]

// ─── TypeScript types ─────────────────────────────────────────────────────────

type SeedOwner = {
  id: string; name: string; phone: string; email: string | null
  address: string | null; notes: string | null; createdAt: Date; updatedAt: Date
}

type SeedPatient = {
  id: string; ownerId: string; name: string; species: string; breed: string | null
  petColor: string | null; microchipId: string | null; dateOfBirth: Date | null
  gender: string | null; weight: number | null; allergies: string | null
  medicalNotes: string | null; createdAt: Date; updatedAt: Date
}

type SeedSession = {
  id: string; patientId: string; visitDate: Date; visitType: string
  vetName: string | null; chiefComplaint: string; vetVitals: string | null
  diagnosis: string | null; notes: string | null; followUpDate: Date | null
  status: string; amountCharged: number | null; amountPaid: number | null
  paymentStatus: string; paymentMethod: string | null; createdAt: Date; updatedAt: Date
}

type SeedPrescription = {
  id: string; sessionId: string; medicineName: string; dosage: string | null
  frequency: string | null; duration: string | null; quantity: number | null
  instructions: string | null; isActive: boolean; startDate: Date | null
  stoppedAt: Date | null; stopReason: string | null; createdAt: Date
}

type SeedAppointment = {
  id: string; patientId: string; appointmentDate: Date; duration: number
  type: string; vetName: string | null; notes: string | null; status: string
  reminderSent: boolean; createdAt: Date; updatedAt: Date
}

type SeedCheckResult = {
  id: string; patientId: string; title: string; description: string | null
  fileName: string; filePath: string; fileSize: number; resultDate: Date; createdAt: Date
}

type SeedExpense = {
  id: string; date: Date; category: string; description: string; amount: number
  vendor: string | null; paymentMethod: string; recurrence: string
  notes: string | null; createdAt: Date; updatedAt: Date
}

type SeedStaff = {
  id: string; name: string; role: string; phone: string; email: string | null
  employmentType: string; status: string; baseSalary: number; salaryType: string
  hourlyRate: number | null; overtimeRate: number | null; hireDate: Date
  createdAt: Date; updatedAt: Date
}

type SeedSalaryRecord = {
  id: string; staffId: string; month: number; year: number; baseSalary: number
  regularHours: number; overtimeHours: number; overtimeMultiplier: number
  doubleShiftCount: number; doubleShiftBonus: number; bonuses: number
  deductions: number; netPay: number; status: string; createdAt: Date; updatedAt: Date
}

type SeedMedicine = {
  id: string; name: string; category: string; unit: string
  subUnit: string | null; subUnitsPerContainer: number | null
  description: string | null; minimumStock: number; createdAt: Date; updatedAt: Date
}

type SeedMedicineBatch = {
  id: string; medicineId: string; batchNumber: string | null; supplier: string | null
  expiryDate: Date; quantity: number; initialQty: number; costPerUnit: number
  sellingPrice: number | null
  receivedDate: Date; notes: string | null; createdAt: Date; updatedAt: Date
}

type SeedMedicineSale = {
  id: string; medicineId: string; batchId: string; quantity: number
  unitPrice: number; totalPrice: number; discount: number
  saleGroupId: string | null; saleUnit: string | null
  patientId: string | null; patientName: string | null
  ownerId: string | null; ownerName: string | null
  amountPaid: number | null; paymentStatus: string | null
  status: string | null; refundedQty: number | null; refundedAmount: number | null
  refundedAt: Date | null; refundReason: string | null
  paymentMethod: string | null; notes: string | null; saleDate: Date; createdAt: Date
}

type ResultTemplate = { fileName: string; filePath: string; fileSize: number }

type SeedMedicineAudit = {
  id: string; medicineId: string; batchId: string | null; batchNumber: string | null
  action: string; changes: string | null; note: string | null
  userId: string | null; userName: string | null; createdAt: Date
}// ─── helpers ──────────────────────────────────────────────────────────────────

function uuid()                     { return crypto.randomUUID() }
function pick<T>(items: readonly T[]): T { return items[Math.floor(Math.random() * items.length)] }
function sampleDistinct<T>(items: readonly T[], n: number): T[] {
  if (n >= items.length) return [...items]
  const pool = [...items]
  const out: T[] = []
  for (let i = 0; i < n && pool.length; i++) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
  }
  return out
}
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function randFloat(min: number, max: number) { return Math.round((Math.random() * (max - min) + min) * 100) / 100 }
function chance(p: number)          { return Math.random() < p }
function randDate(from: Date, to: Date) { return new Date(from.getTime() + Math.random() * (to.getTime() - from.getTime())) }
function addDays(d: Date, days: number) { return new Date(d.getTime() + days * 86_400_000) }
function pad(v: number, w = 4)      { return String(v).padStart(w, '0') }
function monthStart(offset: number) { return new Date(NOW.getFullYear(), NOW.getMonth() - offset, 1) }

function weightedSpecies(): string {
  const total = SPECIES_WEIGHTS.reduce((s, x) => s + x.weight, 0)
  let r = Math.random() * total
  for (const x of SPECIES_WEIGHTS) { r -= x.weight; if (r <= 0) return x.species }
  return 'other'
}

function breedFor(species: string): string | null {
  if (species === 'dog')  return pick(DOG_BREEDS)
  if (species === 'cat')  return pick(CAT_BREEDS)
  if (species === 'bird') return pick(BIRD_BREEDS)
  return null
}

function weightFor(species: string): number {
  if (species === 'fish')       return randFloat(0.01, 0.5)
  if (species === 'bird')       return randFloat(0.03, 1.2)
  if (species === 'guinea_pig') return randFloat(0.4, 1.2)
  if (species === 'rabbit')     return randFloat(0.8, 5.0)
  if (species === 'cat')        return randFloat(2.5, 8.0)
  if (species === 'reptile')    return randFloat(0.1, 6.0)
  if (species === 'dog')        return randFloat(3.0, 45.0)
  return randFloat(0.5, 10.0)
}

function makeVetVitals(species: string) {
  const isMammal = ['dog','cat','rabbit','guinea_pig'].includes(species)
  return JSON.stringify({
    weight_kg:        randFloat(0.5, species === 'dog' ? 40 : 8),
    temp_rectal_c:    isMammal ? randFloat(37.5, 39.5) : null,
    heart_rate:       isMammal ? rand(60, 180) : null,
    resp_rate:        isMammal ? rand(15, 40)  : null,
    crt:              isMammal ? pick(['< 2s','2s','> 2s']) : null,
    mucous_membranes: isMammal ? pick(['Pink','Pale','Tacky','Moist and pink']) : null,
  })
}

function normalizePayment(charged: number) {
  const roll = Math.random()
  if (roll < 0.60) return { amountPaid: charged,                                              paymentStatus: 'paid',    paymentMethod: pick(PAYMENT_METHODS) }
  if (roll < 0.82) return { amountPaid: randFloat(Math.max(10, charged * 0.2), charged * 0.9), paymentStatus: 'partial', paymentMethod: pick(PAYMENT_METHODS) }
  if (roll < 0.93) return { amountPaid: 0,                                                    paymentStatus: 'unpaid',  paymentMethod: null }
  return                   { amountPaid: 0,                                                    paymentStatus: 'waived',  paymentMethod: null }
}

function calcNetPay(staff: SeedStaff, p: { regularHours: number; overtimeHours: number; overtimeMultiplier: number; doubleShiftCount: number; doubleShiftBonus: number; bonuses: number; deductions: number }) {
  const hourlyBase = staff.hourlyRate ?? (staff.baseSalary / 160)
  const basePay    = staff.salaryType === 'monthly' ? staff.baseSalary
                   : staff.salaryType === 'hourly'  ? p.regularHours * hourlyBase
                   : staff.baseSalary
  const overtimePay    = p.overtimeHours    * hourlyBase * p.overtimeMultiplier
  const doubleShiftPay = p.doubleShiftCount * p.doubleShiftBonus
  return Math.round(Math.max(0, basePay + overtimePay + doubleShiftPay + p.bonuses - p.deductions) * 100) / 100
}

function writePdfTemplate(filePath: string) {
  // Minimal valid PDF
  const pdfBase64 = 'JVBERi0xLjMKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9Db3VudCAxIC9LaWRzIFszIDAgUl0gPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCAzMDAgMTQ0XSAvQ29udGVudHMgNCAwIFIgL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgNSAwIFIgPj4gPj4gPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0xlbmd0aCA0OCA+PgpzdHJlYW0KQlQgL0YxIDE4IFRmIDgwIDgwIFRkIChCaXpGbG93IFZldCBDbGluaWMgUmVzdWx0KSBUaiBFVAplbmRzdHJlYW0KZW5kb2JqCjUgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTAgMDAwMDAgbiAKMDAwMDAwMDA2MiAwMDAwMCBuIAowMDAwMDAwMTE3IDAwMDAwIG4gCjAwMDAwMDAyNDEgMDAwMDAgbiAKMDAwMDAwMDMzOSAwMDAwMCBuIAp0cmFpbGVyCjw8IC9TaXplIDYgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjQwOQolJUVPRg=='
  const buf = Buffer.from(pdfBase64, 'base64')
  fs.writeFileSync(filePath, buf)
  return buf.length
}

function prepareResultTemplates(): ResultTemplate[] {
  fs.rmSync(GENERATED_RESULTS_DIR, { recursive: true, force: true })
  fs.mkdirSync(GENERATED_RESULTS_DIR, { recursive: true })
  return Array.from({ length: CONFIG.sharedResultFiles }, (_, i) => {
    const fileName = RESULT_FILE_NAMES[i % RESULT_FILE_NAMES.length] ?? `result-${i + 1}.pdf`
    const filePath = path.join(GENERATED_RESULTS_DIR, `${pad(i + 1)}-${fileName}`)
    const fileSize = writePdfTemplate(filePath)
    return { fileName, filePath, fileSize }
  })
}

// ─── builders ─────────────────────────────────────────────────────────────────

function buildStaff(): SeedStaff[] {
  return Array.from({ length: CONFIG.staffCount }, (_, i) => {
    const firstName = pick(OWNER_FIRST)
    const lastName  = pick(OWNER_LAST)
    const profile   = STAFF_PROFILES[i % STAFF_PROFILES.length]
    const name      = profile.role === 'veterinarian'
      ? `Dr. ${firstName} ${lastName}` : `${firstName} ${lastName}`
    const hireDate  = randDate(FOUR_YEARS_AGO, addDays(NOW, -30))
    return {
      id: uuid(), name,
      role: profile.role,
      phone: `+966-5${rand(0,9)}-${rand(1000000, 9999999)}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z]/g, '')}.staff${i + 1}@vetclinic.local`,
      employmentType: profile.employmentType,
      status: chance(0.92) ? 'active' : 'inactive',
      baseSalary: profile.baseSalary,
      salaryType: profile.salaryType,
      hourlyRate: profile.hourlyRate,
      overtimeRate: profile.overtimeRate,
      hireDate,
      createdAt: hireDate,
      updatedAt: hireDate,
    }
  })
}

function buildSalaryRecords(staff: SeedStaff[]): SeedSalaryRecord[] {
  const records: SeedSalaryRecord[] = []
  for (const member of staff) {
    for (let offset = 0; offset < CONFIG.salaryMonths; offset++) {
      const date = monthStart(offset)
      const hireMonth = new Date(member.hireDate.getFullYear(), member.hireDate.getMonth(), 1)
      if (date < hireMonth) continue

      const regularHours   = member.salaryType === 'hourly' ? randFloat(70, 140) : randFloat(150, 176)
      const overtimeHours  = chance(0.5)  ? randFloat(2, 18) : 0
      const doubleShiftCount = chance(0.3) ? rand(0, 4)      : 0
      const doubleShiftBonus = doubleShiftCount > 0 ? randFloat(80, 150) : 0
      const bonuses        = chance(0.2)  ? randFloat(100, 500) : 0
      const deductions     = chance(0.15) ? randFloat(20, 200)  : 0
      const overtimeMultiplier = member.overtimeRate ?? 1.5
      const netPay = calcNetPay(member, { regularHours, overtimeHours, overtimeMultiplier, doubleShiftCount, doubleShiftBonus, bonuses, deductions })
      const isPaid = offset > 0 || chance(0.55)
      const updatedAt = new Date(date.getFullYear(), date.getMonth(), rand(24, 28), 12, 0, 0)

      records.push({
        id: uuid(), staffId: member.id,
        month: date.getMonth() + 1, year: date.getFullYear(),
        baseSalary: member.baseSalary,
        regularHours, overtimeHours, overtimeMultiplier,
        doubleShiftCount, doubleShiftBonus,
        bonuses, deductions, netPay,
        status: isPaid ? 'paid' : 'draft',
        createdAt: updatedAt, updatedAt,
      })
    }
  }
  return records
}

function buildExpenses(): SeedExpense[] {
  const expenses: SeedExpense[] = []

  for (let offset = CONFIG.expenseMonths - 1; offset >= 0; offset--) {
    const month = monthStart(offset)

    // Fixed monthly costs
    const fixed = [
      { category: 'rent',             amount: randFloat(3500, 5500), description: 'Veterinary clinic rent',             vendor: 'Property Management',   recurrence: 'monthly' },
      { category: 'utilities',        amount: randFloat(400,  800),  description: 'Electricity, water and internet',    vendor: 'Utilities Authority',    recurrence: 'monthly' },
      { category: 'insurance',        amount: randFloat(250,  450),  description: 'Professional liability insurance',   vendor: 'Veterinary Shield',      recurrence: 'monthly' },
      { category: 'cleaning',         amount: randFloat(180,  320),  description: 'Cleaning and sanitation services',   vendor: 'CleanPro Services',      recurrence: 'monthly' },
      { category: 'marketing',        amount: randFloat(100,  350),  description: 'Digital ads and social media',       vendor: 'Meta Ads',               recurrence: 'monthly' },
    ]
    for (const row of fixed) {
      const date = new Date(month.getFullYear(), month.getMonth(), rand(1, 5), 10, 0, 0)
      expenses.push({
        id: uuid(), date,
        category: row.category, description: row.description,
        amount: row.amount, vendor: row.vendor,
        paymentMethod: pick(EXPENSE_PAY_METHODS),
        recurrence: row.recurrence, notes: null,
        createdAt: date, updatedAt: date,
      })
    }

    // Variable costs
    const variableCount = rand(20, 45)
    const amountRange: Record<string, [number, number]> = {
      medical_supplies: [50, 800],
      medications:      [80, 600],
      equipment:        [200, 3000],
      maintenance:      [60, 700],
      lab_fees:         [40, 500],
      utilities:        [50, 200],
      marketing:        [30, 250],
      cleaning:         [25, 150],
      insurance:        [100, 300],
      salaries:         [1500, 5000],
      other:            [20, 300],
      rent:             [3500, 5500],
    }
    for (let i = 0; i < variableCount; i++) {
      const category = pick(EXPENSE_CATEGORIES)
      const date = new Date(month.getFullYear(), month.getMonth(), rand(1, 28), rand(8, 18), 0, 0)
      const [min, max] = amountRange[category] ?? [20, 300]
      expenses.push({
        id: uuid(), date, category,
        description: `${category.replace(/_/g, ' ')} expense`,
        amount: randFloat(min, max),
        vendor: chance(0.7) ? pick(['VetSupply Co.','MedVet Pharma','Lab Direct','SaniClean','TechVet','AnimalHealth Plus']) : null,
        paymentMethod: pick(EXPENSE_PAY_METHODS),
        recurrence: 'one_time',
        notes: chance(0.15) ? pick(['Urgent restock','Bulk purchase','Emergency repair','Monthly contract']) : null,
        createdAt: date, updatedAt: date,
      })
    }
  }
  return expenses
}

function buildOwner(index: number): SeedOwner {
  const firstName = pick(OWNER_FIRST)
  const lastName  = pick(OWNER_LAST)
  const createdAt = randDate(FOUR_YEARS_AGO, NOW)
  return {
    id: uuid(),
    name: `${firstName} ${lastName}`,
    phone: `+966-5${rand(0,9)}-${pad(index + 1_000_000, 7)}`,
    email: chance(0.65) ? `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z]/g, '')}${index + 1}@example.com` : null,
    address: chance(0.72) ? `${rand(1, 200)} ${pick(['King Fahd Rd','Prince Sultan St','Corniche Ave','Garden Blvd','Al-Nahda St'])}, ${pick(AREAS)}` : null,
    notes: chance(0.12) ? pick(['VIP client – multiple pets','Referred by veterinarian','Prefers morning appointments','Requires Arabic communication']) : null,
    createdAt, updatedAt: createdAt,
  }
}

function buildPetsForOwner(owner: SeedOwner, ownerIndex: number): SeedPatient[] {
  const petCount = rand(1, 3)
  return Array.from({ length: petCount }, (_, j) => {
    const species = weightedSpecies()
    return {
      id: uuid(), ownerId: owner.id,
      name: pick(PET_NAMES) + (chance(0.2) ? ` ${rand(1, 99)}` : ''),
      species,
      breed:       chance(0.7) ? breedFor(species) : null,
      petColor:    chance(0.8) ? pick(PET_COLORS) : null,
      // Index-based prefix guarantees uniqueness across batches
      microchipId: chance(0.55) ? `MC${pad(ownerIndex * 4 + j + 1, 8)}` : null,
      dateOfBirth: chance(0.75) ? randDate(new Date('2010-01-01'), addDays(NOW, -90)) : null,
      gender:      pick(['male','female','unknown']),
      weight:      chance(0.85) ? weightFor(species) : null,
      allergies:   chance(0.12) ? pick(['Penicillin','NSAIDs','Flea treatments','Latex','Chlorhexidine']) : null,
      medicalNotes:chance(0.2)  ? pick(['Neutered/spayed','Chronic ear issues','Diabetic – insulin required','Anxious – handle with care','History of seizures']) : null,
      createdAt: owner.createdAt, updatedAt: owner.createdAt,
    }
  })
}

function buildSessionsForPatient(patient: SeedPatient, vetNames: string[]) {
  const sessions:      SeedSession[]      = []
  const prescriptions: SeedPrescription[] = []

  const sessionCount = rand(1, 20)
  let prev = new Date(Math.max(patient.createdAt.getTime(), FOUR_YEARS_AGO.getTime()))

  for (let i = 0; i < sessionCount; i++) {
    const gapDays   = i === 0 ? rand(0, 14) : rand(14, 120)
    const visitDate = addDays(prev, gapDays)
    if (visitDate > NOW) break
    prev = visitDate

    const charged = randFloat(40, 850)
    const payment = normalizePayment(charged)
    const needsFollowUp = chance(0.35)
    const followUpDate  = !needsFollowUp ? null
      : Math.random() < 0.6 ? addDays(visitDate, rand(7, 60))
      : Math.random() < 0.7 ? addDays(NOW, rand(1, 45))
      : addDays(NOW, -rand(1, 30))
    const status = visitDate > addDays(NOW, -14) && chance(0.1) ? 'active' : pick(SESSION_STATUSES)

    const session: SeedSession = {
      id: uuid(), patientId: patient.id,
      visitDate,
      visitType:     i === 0 ? 'wellness_exam' : pick(VISIT_TYPES),
      vetName:       pick(vetNames),
      chiefComplaint:pick(VET_COMPLAINTS),
      vetVitals:     chance(0.88) ? makeVetVitals(patient.species) : null,
      diagnosis:     chance(0.90) ? pick(VET_DIAGNOSES) : null,
      notes:         chance(0.65) ? pick([
        'Owner instructed on home care. Follow-up as needed.',
        'Treatment tolerated well. Monitor for adverse reactions.',
        'Wound healing satisfactorily. Keep dry for 5 days.',
        'Dietary change recommended. Re-weigh in 4 weeks.',
        'Excellent response to treatment. Discharge advised.',
      ]) : null,
      followUpDate, status,
      amountCharged: charged, amountPaid: payment.amountPaid,
      paymentStatus: payment.paymentStatus, paymentMethod: payment.paymentMethod,
      createdAt: visitDate, updatedAt: visitDate,
    }
    sessions.push(session)

    // Prescriptions – 60% of sessions get 1-3
    if (chance(0.6)) {
      const rxCount = rand(1, 3)
      const used = new Set<string>()
      for (let r = 0; r < rxCount; r++) {
        let med = pick(VET_MEDICATIONS)
        while (used.has(med.name)) med = pick(VET_MEDICATIONS)
        used.add(med.name)
        const active = chance(visitDate > addDays(NOW, -21) ? 0.65 : 0.12)
        prescriptions.push({
          id: uuid(), sessionId: session.id,
          medicineName: med.name,
          dosage: med.dosage, frequency: med.frequency,
          duration: med.duration, quantity: med.quantity,
          instructions: chance(0.5) ? pick([
            'Administer with food','Complete full course',
            'Avoid direct sunlight after application',
            'Keep refrigerated','Monitor for vomiting or diarrhea',
          ]) : null,
          isActive: active, startDate: visitDate,
          stoppedAt:  active ? null : addDays(visitDate, rand(3, 14)),
          stopReason: active ? null : pick(['completed','side_effects','not_effective','other']),
          createdAt: visitDate,
        })
      }
    }
  }

  return { sessions, prescriptions }
}

function buildAppointmentsForPatient(patient: SeedPatient, vetNames: string[]): SeedAppointment[] {
  const count     = rand(3, 10)
  const pastCount = rand(2, Math.max(2, count - 1))
  return Array.from({ length: count }, (_, i) => {
    const isFuture       = i >= pastCount
    const appointmentDate = isFuture
      ? randDate(NOW, FUTURE_WINDOW_END)
      : randDate(patient.createdAt, NOW)
    appointmentDate.setHours(rand(8, 20), pick([0, 30]), 0, 0)
    return {
      id: uuid(), patientId: patient.id,
      appointmentDate,
      duration: pick([15, 20, 30, 45, 60, 90]),
      type: pick(APPOINTMENT_TYPES),
      vetName: pick(vetNames),
      notes: chance(0.4) ? pick(['Bring vaccination booklet','Fasting required 12h','Owner requested morning slot','Annual booster due']) : null,
      status: isFuture ? pick(FUTURE_APPT_STATUSES) : pick(PAST_APPT_STATUSES),
      reminderSent: !isFuture || chance(0.35),
      createdAt: isFuture ? NOW : appointmentDate,
      updatedAt: isFuture ? NOW : appointmentDate,
    }
  }).sort((a, b) => a.appointmentDate.getTime() - b.appointmentDate.getTime())
}

function buildCheckResults(patient: SeedPatient, templates: ResultTemplate[]): SeedCheckResult[] {
  if (!chance(0.28)) return []
  return Array.from({ length: rand(1, 3) }, () => {
    const tpl        = pick(templates)
    const resultDate = randDate(patient.createdAt, NOW)
    return {
      id: uuid(), patientId: patient.id,
      title: pick(RESULT_TITLES),
      description: chance(0.5) ? pick([
        'Pre-operative imaging','Routine annual bloodwork','Requested by specialist',
        'Shared from external lab','Monitoring chronic condition','Follow-up imaging',
      ]) : null,
      fileName: tpl.fileName, filePath: tpl.filePath, fileSize: tpl.fileSize,
      resultDate, createdAt: resultDate,
    }
  })
}

// ─── medicine builders ───────────────────────────────────────────────────────

function buildMedicines(): { medicines: SeedMedicine[]; batches: SeedMedicineBatch[] } {
  const medicines: SeedMedicine[] = []
  const batches:   SeedMedicineBatch[] = []
  const now = new Date()

  for (const med of MEDICINE_CATALOGUE) {
    const createdAt = randDate(new Date(now.getTime() - 24 * 30 * 86_400_000), now)
    const medicine: SeedMedicine = {
      id: uuid(), name: med.name, category: med.category, unit: med.unit,
      subUnit: med.subUnit, subUnitsPerContainer: med.subUnitsPerContainer,
      description: med.description, minimumStock: med.minimumStock,
      createdAt, updatedAt: createdAt,
    }
    medicines.push(medicine)

    // Healthy stock dominates. Only a small minority of medicines carry an
    // expired or near-expiry batch so the catalogue isn't a wall of red.
    const hasExpired   = chance(0.12)   // ~12% have one expired batch
    const hasNearExp   = !hasExpired && chance(0.18) // ~18% expiring ≤30d
    const isLowStock   = chance(0.10)   // ~10% are low on stock
    // Some sub-unit medicines are left with a partially-used container only
    // (e.g. 0.3 bottle = 30 ml) so the POS can show the leftover in sub-units.
    const subAlmostOut = !!(med.subUnit && med.subUnitsPerContainer) && !hasExpired && chance(0.25)
    const batchCount   = rand(2, 4)
    const medBatchList: SeedMedicineBatch[] = []

    for (let b = 0; b < batchCount; b++) {
      let expiryDate:  Date
      let batchNotes:  string | null = null
      let soldFrac:    number
      let receivedDate: Date
      const firstBatch = b === 0

      if (firstBatch && hasExpired) {
        expiryDate   = addDays(now, -rand(5, 150))
        soldFrac     = randFloat(0.75, 0.99)
        receivedDate = randDate(new Date(now.getTime() - 30 * 30 * 86_400_000), new Date(now.getTime() - 8 * 30 * 86_400_000))
        batchNotes   = 'Expired – quarantined, do not dispense'
      } else if (firstBatch && hasNearExp) {
        expiryDate   = addDays(now, rand(3, 29))
        soldFrac     = randFloat(0.40, 0.80)
        receivedDate = randDate(new Date(now.getTime() - 12 * 30 * 86_400_000), new Date(now.getTime() - 2 * 30 * 86_400_000))
        batchNotes   = chance(0.5) ? 'Near expiry – use FEFO priority' : null
      } else {
        // Healthy current stock with comfortable expiry
        expiryDate   = addDays(now, rand(180, 900))
        soldFrac     = chance(0.6) ? randFloat(0.05, 0.55) : 0
        receivedDate = randDate(new Date(now.getTime() - 15 * 30 * 86_400_000), now)
        batchNotes   = chance(0.10) ? pick([
          'Refrigerate after opening', 'Store below 25 °C',
          'Keep away from direct light', 'Cold chain maintained on delivery',
        ]) : null
      }

      const lowStockBatch = isLowStock && b === batchCount - 1
      const initialQty = lowStockBatch
        ? rand(1, Math.max(2, Math.floor(med.minimumStock * 0.5)))
        : rand(med.minimumStock, med.minimumStock * 6)
      if (lowStockBatch) { soldFrac = randFloat(0.85, 0.97); batchNotes = chance(0.4) ? 'Reorder pending' : batchNotes }
      const remaining = Math.max(0, Math.round(initialQty * (1 - soldFrac)))
      // Selling price ~ catalogue unitPrice with a little batch variation
      const sellingPrice = round2(med.unitPrice * randFloat(0.95, 1.15))

      medBatchList.push({
        id: uuid(), medicineId: medicine.id,
        batchNumber:  chance(0.9) ? `LOT-${rand(10_000, 99_999)}` : null,
        supplier:     chance(0.85) ? pick(MED_SUPPLIERS) : null,
        expiryDate, quantity: remaining, initialQty,
        costPerUnit: med.costPerUnit,
        sellingPrice,
        receivedDate, notes: batchNotes,
        createdAt: receivedDate, updatedAt: now,
      })
    }

    if (subAlmostOut && medBatchList.length) {
      // Keep just one almost-empty container (0.15–0.85 of a container) so the
      // medicine's total stock is below 1 and the leftover shows in sub-units.
      const keep = medBatchList[0]
      keep.quantity   = Math.round(randFloat(0.15, 0.85) * 100) / 100
      keep.expiryDate = addDays(now, rand(60, 400))
      keep.notes      = 'Last container — partial stock'
      batches.push(keep)
    } else {
      batches.push(...medBatchList)
    }
  }

  return { medicines, batches }
}

function buildMedicineSales(
  medicines:  SeedMedicine[],
  batches:    SeedMedicineBatch[],
  patientMap: Map<string, string>,           // patientId → patientName
  ownerList:  { id: string; name: string }[],
): SeedMedicineSale[] {
  const sales: SeedMedicineSale[] = []
  const SALE_MONTHS = 18
  const now = new Date()
  const patientIds = Array.from(patientMap.keys())

  // Group batches by medicine
  const batchByMed = new Map<string, SeedMedicineBatch[]>()
  for (const b of batches) {
    const list = batchByMed.get(b.medicineId) ?? []
    list.push(b)
    batchByMed.set(b.medicineId, list)
  }

  const priceMap = new Map<string, number>(
    MEDICINE_CATALOGUE.map(m => [m.name as string, m.unitPrice])
  )
  const sellableMeds = medicines.filter(m => (batchByMed.get(m.id) ?? []).length > 0)
  if (!sellableMeds.length) return sales

  const PAYMENT_WEIGHTED = [
    ...Array(4).fill('cash'),
    ...Array(3).fill('card'),
    ...Array(2).fill('insurance'),
    'other',
  ] as const

  // Pick who the transaction is for: owner (customer), real patient, walk-in name, or anonymous
  function pickCustomer(): { ownerId: string | null; ownerName: string | null; patientId: string | null; patientName: string | null } {
    const roll = Math.random()
    if (roll < 0.45 && ownerList.length) {
      const o = pick(ownerList); return { ownerId: o.id, ownerName: o.name, patientId: null, patientName: null }
    }
    if (roll < 0.75 && patientIds.length) {
      const pid = pick(patientIds); return { ownerId: null, ownerName: null, patientId: pid, patientName: patientMap.get(pid) ?? null }
    }
    if (roll < 0.90) {
      return { ownerId: null, ownerName: `${pick(OWNER_FIRST)} ${pick(OWNER_LAST)}`, patientId: null, patientName: null }
    }
    return { ownerId: null, ownerName: null, patientId: null, patientName: null }
  }

  type Line = {
    medicineId: string; batchId: string; quantity: number; unitPrice: number
    totalPrice: number; discount: number; note: string | null; saleUnit: string
  }
  function buildLine(medicine: SeedMedicine, saleDate: Date): Line | null {
    const medBatches = batchByMed.get(medicine.id) ?? []
    if (!medBatches.length) return null
    const valid = medBatches
      .filter(b => b.expiryDate > saleDate)
      .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())
    const batch = valid.length > 0 ? valid[0] : pick(medBatches)

    const baseUnitPrice = priceMap.get(medicine.name) ?? randFloat(1, 30)
    const [qtyMin, qtyMax] = UNIT_QTY[medicine.unit] ?? [1, 20]

    // Medicines with a sub-unit are dispensed by the sub-unit ~45% of the time
    // (e.g. selling 8 ml out of a 100 ml bottle).
    const useSub = !!(medicine.subUnit && medicine.subUnitsPerContainer) && chance(0.45)
    const saleUnit = useSub ? 'sub' : 'container'

    const saleTypeRoll = Math.random()
    const isBulk      = !useSub && saleTypeRoll > 0.88
    const isEmergency = !useSub && saleTypeRoll > 0.92

    let qty: number
    let price: number
    if (useSub) {
      const subPer = medicine.subUnitsPerContainer!
      qty   = rand(1, Math.max(2, Math.round(subPer * 0.35)))
      price = round2(baseUnitPrice / subPer)
      if (price <= 0) price = round2(randFloat(0.05, 0.5))
      if (isEmergency) price = round2(price * EMERGENCY_MARKUP)
    } else {
      qty   = isBulk ? rand(qtyMin * 2, qtyMax * BULK_QTY_FACTOR) : rand(1, Math.ceil(qtyMax / 3))
      price = baseUnitPrice
      if (isEmergency)       price = round2(baseUnitPrice * EMERGENCY_MARKUP)
      else if (chance(0.12)) price = round2(baseUnitPrice * LOYALTY_DISCOUNT)
    }

    const tier    = pick(DISCOUNT_TIERS)
    const discAmt = tier.frac > 0 ? round2(qty * price * tier.frac) : 0
    const total   = round2(Math.max(0, qty * price - discAmt))

    let note: string | null = null
    if (isEmergency)       note = 'Emergency dispensing – after-hours'
    else if (isBulk)       note = pick(['Bulk order for boarding patients', 'Owner requested extra supply for travel', 'Repeat prescription – 3-month supply'])
    else if (tier.note)    note = tier.note
    else if (chance(0.15)) note = pick(SALE_NOTES)

    return { medicineId: medicine.id, batchId: batch.id, quantity: qty, unitPrice: price, totalPrice: total, discount: discAmt, note, saleUnit }
  }

  for (let mo = SALE_MONTHS - 1; mo >= 0; mo--) {
    const mStart = monthStart(mo)
    const mEnd   = new Date(Math.min(now.getTime(), mStart.getTime() + 30 * 86_400_000))
    // Number of checkout transactions this month (higher for recent months)
    const txCount = mo < 3 ? rand(30, 70) : mo < 9 ? rand(20, 45) : rand(10, 25)

    for (let t = 0; t < txCount; t++) {
      const saleDate = randDate(mStart, mEnd)
      if (saleDate > now) continue

      const saleGroupId   = uuid()
      const customer      = pickCustomer()
      const paymentMethod = pick(PAYMENT_WEIGHTED)

      // Item count: mostly 1–2, occasionally up to 4 → showcases combined sales
      const r = Math.random()
      const itemCount = r < 0.55 ? 1 : r < 0.82 ? 2 : r < 0.95 ? 3 : 4
      const chosen = sampleDistinct(sellableMeds, itemCount)
      const lines  = chosen.map(m => buildLine(m, saleDate)).filter((l): l is Line => l !== null)
      if (!lines.length) continue

      const cartTotal = lines.reduce((s, l) => s + l.totalPrice, 0)

      // Payment status: paid 78% / partial 14% / unpaid 8%
      const payRoll = Math.random()
      let amountPaid: number, paymentStatus: string
      if (payRoll < 0.78)      { amountPaid = cartTotal;                                  paymentStatus = 'paid' }
      else if (payRoll < 0.92) { amountPaid = Math.round(cartTotal * randFloat(0.2, 0.7) * 100) / 100; paymentStatus = 'partial' }
      else                     { amountPaid = 0;                                          paymentStatus = 'unpaid' }

      // Refunds: ~6% of paid transactions fully refunded; a few multi-item ones partially refunded
      const refundRoll      = Math.random()
      const isFullRefund    = paymentStatus === 'paid' && refundRoll < 0.06
      const isPartialRefund = !isFullRefund && paymentStatus === 'paid' && lines.length > 1 && refundRoll < 0.10
      const refundedAt      = randDate(saleDate, now)

      lines.forEach((l, idx) => {
        const frac     = cartTotal > 0 ? l.totalPrice / cartTotal : 1 / lines.length
        const itemPaid = Math.round(amountPaid * frac * 100) / 100

        let status: string = 'completed'
        let refundedQty: number | null = null
        let refundedAmount: number | null = null
        if (isFullRefund || (isPartialRefund && idx === 0)) {
          status         = 'refunded'
          refundedQty    = l.quantity
          refundedAmount = l.totalPrice
        }

        sales.push({
          id: uuid(), medicineId: l.medicineId, batchId: l.batchId,
          quantity: l.quantity, unitPrice: l.unitPrice, totalPrice: l.totalPrice, discount: l.discount,
          saleGroupId, saleUnit: l.saleUnit,
          patientId: customer.patientId, patientName: customer.patientName,
          ownerId: customer.ownerId, ownerName: customer.ownerName,
          amountPaid: itemPaid, paymentStatus,
          status,
          refundedQty, refundedAmount,
          refundedAt:   status === 'refunded' ? refundedAt : null,
          refundReason: status === 'refunded' ? pick(['Customer returned item', 'Wrong medication dispensed', 'Pet refused medication', 'Duplicate purchase']) : null,
          paymentMethod, notes: l.note,
          saleDate, createdAt: saleDate,
        })
      })
    }
  }

  return sales
}

function buildMedicineAudits(
  medicines: SeedMedicine[],
  batches:   SeedMedicineBatch[],
  editorNames: string[],
): SeedMedicineAudit[] {
  const audits: SeedMedicineAudit[] = []
  const now = new Date()
  const editors = editorNames.length ? editorNames : ['setup']

  // Record a manual edit on ~15% of batches so the medicine history shows
  // "Edited" events (who / when / what).
  for (const b of batches) {
    if (!chance(0.15)) continue
    const createdAt = randDate(b.receivedDate, now)
    const editor    = pick(editors)
    const field     = pick(['quantity', 'sellingPrice', 'costPerUnit'] as const)

    let changes: Array<{ field: string; label: string; from: number; to: number }>
    if (field === 'quantity') {
      const from = Math.round((b.quantity + rand(1, 8)) * 100) / 100
      changes = [{ field: 'quantity', label: 'Quantity', from, to: b.quantity }]
    } else if (field === 'sellingPrice') {
      const to = b.sellingPrice ?? 0
      changes = [{ field: 'sellingPrice', label: 'Selling price', from: round2(to * randFloat(0.8, 0.95)), to }]
    } else {
      changes = [{ field: 'costPerUnit', label: 'Cost/unit', from: round2(b.costPerUnit * randFloat(0.85, 0.98)), to: b.costPerUnit }]
    }

    audits.push({
      id: uuid(), medicineId: b.medicineId, batchId: b.id, batchNumber: b.batchNumber,
      action: 'edit_batch', changes: JSON.stringify(changes), note: null,
      userId: null, userName: editor, createdAt,
    })
  }
  return audits
}

// ─── clear + main ─────────────────────────────────────────────────────────────

async function clearVetData() {
  console.log('🗑   Clearing existing vet data...')
  try { await prisma.vetMedicineAudit.deleteMany({}) } catch { /* table may not exist yet */ }
  await prisma.vetMedicineSale.deleteMany({})
  await prisma.vetMedicineBatch.deleteMany({})
  await prisma.vetMedicine.deleteMany({})
  await prisma.vetSalaryRecord.deleteMany({})
  await prisma.vetStaff.deleteMany({})
  await prisma.vetExpense.deleteMany({})
  await prisma.vetCheckResult.deleteMany({})
  await prisma.vetPrescription.deleteMany({})
  await prisma.vetAppointment.deleteMany({})
  await prisma.vetSession.deleteMany({})
  await prisma.vetPatient.deleteMany({})
  await prisma.vetOwner.deleteMany({})
  console.log('✅  Vet tables cleared\n')
}

// Seed the user-managed taxonomy (categories + container units) so the
// catalogue filters are populated out of the box.
async function seedCatalogueSettings() {
  const categories = [
    { name: 'general',       color: '#64748b' },
    { name: 'antibiotic',    color: '#8b5cf6' },
    { name: 'antiparasitic', color: '#0ea5e9' },
    { name: 'vaccine',       color: '#10b981' },
    { name: 'anesthetic',    color: '#f59e0b' },
    { name: 'analgesic',     color: '#ef4444' },
    { name: 'supplement',    color: '#ec4899' },
  ]
  const units = ['tablet', 'capsule', 'ml', 'vial', 'tube', 'bottle', 'sachet', 'dose', 'other']
  await prisma.vetMedicineCategory.deleteMany({})
  await prisma.vetMedicineUnit.deleteMany({})
  await prisma.vetMedicineCategory.createMany({ data: categories.map(c => ({ ...c, isDefault: true })) })
  await prisma.vetMedicineUnit.createMany({ data: units.map(name => ({ name, isDefault: true })) })
  console.log(`✅  Seeded ${categories.length} categories + ${units.length} units\n`)
}

async function main() {
  console.log('🐾  Vet Clinic Seed – starting...')
  console.log(`📊  Owners=${CONFIG.ownerCount.toLocaleString()}  Staff=${CONFIG.staffCount}  SalaryMonths=${CONFIG.salaryMonths}  ExpenseMonths=${CONFIG.expenseMonths}`)

  const startedAt = Date.now()

  await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;')
  await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;')
  await prisma.$queryRawUnsafe('PRAGMA cache_size = 20000;')
  await prisma.$queryRawUnsafe('PRAGMA temp_store = MEMORY;')

  const resultTemplates = prepareResultTemplates()
  await clearVetData()
  await seedCatalogueSettings()

  // ── Staff + Salary + Expenses ─────────────────────────────────────────────
  console.log('👩‍⚕️  Creating staff, salary records, and expenses...')
  const staff          = buildStaff()
  const salaryRecords  = buildSalaryRecords(staff)
  const expenses       = buildExpenses()

  await prisma.$transaction(async (tx) => {
    await tx.vetStaff.createMany({ data: staff })
    if (salaryRecords.length) await tx.vetSalaryRecord.createMany({ data: salaryRecords })
    if (expenses.length)      await tx.vetExpense.createMany({ data: expenses })
  }, { timeout: 60_000 })
  console.log(`✅  Staff=${staff.length}  Salaries=${salaryRecords.length}  Expenses=${expenses.length}\n`)

  const vetNames = staff.filter(s => s.role === 'veterinarian').map(s => s.name)

  // ── Owners + Pets + Sessions + Appointments + Results ────────────────────
  const batches = Math.ceil(CONFIG.ownerCount / CONFIG.batchSize)

  let ownerTotal      = 0
  let patientTotal    = 0
  let sessionTotal    = 0
  let prescTotal      = 0
  let appointTotal    = 0
  let resultTotal     = 0

  for (let batch = 0; batch < batches; batch++) {
    const start = batch * CONFIG.batchSize
    const end   = Math.min(start + CONFIG.batchSize, CONFIG.ownerCount)

    const owners:       SeedOwner[]       = []
    const patients:     SeedPatient[]     = []
    const sessions:     SeedSession[]     = []
    const prescriptions:SeedPrescription[]= []
    const appointments: SeedAppointment[] = []
    const checkResults: SeedCheckResult[] = []

    for (let i = start; i < end; i++) {
      const owner = buildOwner(i)
      owners.push(owner)

      const pets = buildPetsForOwner(owner, i)
      for (const pet of pets) {
        patients.push(pet)
        const { sessions: s, prescriptions: p } = buildSessionsForPatient(pet, vetNames)
        sessions.push(...s)
        prescriptions.push(...p)
        appointments.push(...buildAppointmentsForPatient(pet, vetNames))
        checkResults.push(...buildCheckResults(pet, resultTemplates))
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.vetOwner.createMany({ data: owners })
      if (patients.length)     await tx.vetPatient.createMany({ data: patients })
      if (sessions.length)     await tx.vetSession.createMany({ data: sessions })
      if (prescriptions.length)await tx.vetPrescription.createMany({ data: prescriptions })
      if (appointments.length) await tx.vetAppointment.createMany({ data: appointments })
      if (checkResults.length) await tx.vetCheckResult.createMany({ data: checkResults })
    }, { timeout: 120_000 })

    ownerTotal   += owners.length
    patientTotal += patients.length
    sessionTotal += sessions.length
    prescTotal   += prescriptions.length
    appointTotal += appointments.length
    resultTotal  += checkResults.length

    const elapsed  = ((Date.now() - startedAt) / 1000).toFixed(1)
    const progress = Math.round(((batch + 1) / batches) * 100)
    process.stdout.write(
      `\r  Batch ${batch + 1}/${batches} [${progress}%] `
      + `owners=${ownerTotal.toLocaleString()} `
      + `pets=${patientTotal.toLocaleString()} `
      + `sessions=${sessionTotal.toLocaleString()} `
      + `appts=${appointTotal.toLocaleString()} `
      + `${elapsed}s      `
    )
  }

  // ── Medicines + Batches + Sales ──────────────────────────────────────────
  console.log('💊  Creating medicine catalogue, batches, and sales...')
  const { medicines, batches: medBatches } = buildMedicines()

  // Collect patient id+name pairs to link medicine sales to real patients
  const patientRows = await prisma.vetPatient.findMany({ select: { id: true, name: true }, take: 1000 })
  const patientMap  = new Map<string, string>(
    patientRows.map((r: { id: string; name: string }) => [r.id, r.name])
  )
  // Collect owners so combined sales can be linked to real customers
  const ownerRows = await prisma.vetOwner.findMany({ select: { id: true, name: true }, take: 1000 }) as { id: string; name: string }[]

  const medSales = buildMedicineSales(medicines, medBatches, patientMap, ownerRows)
  const medAudits = buildMedicineAudits(medicines, medBatches, staff.map(s => s.name))

  await prisma.$transaction(async (tx) => {
    await tx.vetMedicine.createMany({ data: medicines })
    if (medBatches.length) await tx.vetMedicineBatch.createMany({ data: medBatches })
    if (medSales.length)   await tx.vetMedicineSale.createMany({ data: medSales })
  }, { timeout: 120_000 })
  // Audit rows live outside the main transaction so a missing table (older DB
  // before the audit model) can never roll back the core medicine data.
  let auditsWritten = 0
  if (medAudits.length) {
    try {
      await prisma.vetMedicineAudit.createMany({ data: medAudits })
      auditsWritten = medAudits.length
    } catch (e) {
      console.warn('   ⚠️  Skipped medicine audit seed (regenerate the Prisma client):', (e as Error).message)
    }
  }
  console.log(`✅  Medicines=${medicines.length}  Batches=${medBatches.length}  Sales=${medSales.length}  Audits=${auditsWritten}\n`)

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log('\n\n✅  Vet clinic seed complete\n')
  console.log(`  Owners         : ${ownerTotal.toLocaleString()}`)
  console.log(`  Pets           : ${patientTotal.toLocaleString()}`)
  console.log(`  Sessions       : ${sessionTotal.toLocaleString()}`)
  console.log(`  Prescriptions  : ${prescTotal.toLocaleString()}`)
  console.log(`  Appointments   : ${appointTotal.toLocaleString()}`)
  console.log(`  Check Results  : ${resultTotal.toLocaleString()}`)
  console.log(`  Staff          : ${staff.length}`)
  console.log(`  Salary Records : ${salaryRecords.length}`)
  console.log(`  Expenses       : ${expenses.length}`)
  console.log(`  Medicines      : ${medicines.length}`)
  console.log(`  Med Batches    : ${medBatches.length}`)
  console.log(`  Med Sales      : ${medSales.length}`)
  console.log(`  Med Audits     : ${auditsWritten}`)
  console.log(`  Result files   : ${resultTemplates.length} generated PDFs`)
  console.log(`  Elapsed        : ${elapsed}s\n`)
}

main()
  .catch((err) => { console.error('\n❌  Seed failed:', err); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
