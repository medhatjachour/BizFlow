# Powerful Clinic Dev Seed

Generates a broader and heavier dataset for the clinic module, not just patients and appointments.

Default targets:

| Entity | Default volume |
|---|---:|
| Patients | 7,500 |
| Sessions | 1–24 per patient |
| Prescriptions | 0–3 per session |
| Appointments | 5–12 per patient |
| Check results | ~28% of patients |
| Staff | 14 |
| Salary records | 18 months per staff member |
| Expenses | 18 months of recurring + variable costs |

What it seeds:

- patients with folder numbers, national IDs, allergies, notes, and realistic registration dates
- sessions with vitals, diagnoses, procedures, payment states, dental charts, and mixed future/overdue follow-ups
- prescriptions with active/inactive states
- appointments across past and future time slots up to 23:30
- clinic staff, payroll history, and operating expenses
- valid placeholder PDF files for clinic check results

## Run

```bash
npm run prisma:seed:clinic
```

Legacy alias still works:

```bash
npm run prisma:seed:clinic-dentist
```

## Fast smoke-test

Use environment overrides to run a smaller seed quickly:

```bash
CLINIC_SEED_PATIENTS=100 CLINIC_SEED_BATCH=50 CLINIC_SEED_SALARY_MONTHS=3 CLINIC_SEED_EXPENSE_MONTHS=3 npm run prisma:seed:clinic
```

Supported overrides:

- `CLINIC_SEED_PATIENTS`
- `CLINIC_SEED_BATCH`
- `CLINIC_SEED_STAFF`
- `CLINIC_SEED_SALARY_MONTHS`
- `CLINIC_SEED_EXPENSE_MONTHS`
- `CLINIC_SEED_FUTURE_APPOINTMENT_DAYS`
- `CLINIC_SEED_RESULT_FILES`

Make sure `DATABASE_URL` points to the development database before running.
