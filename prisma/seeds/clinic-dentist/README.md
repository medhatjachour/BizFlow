# Dentist Clinic Dev Seed

Generates a large, realistic dataset for the **dentist clinic** plugin:

| Entity | Count |
|---|---|
| Patients | 5 000 |
| Sessions (1–20 per patient) | ~50 000 |
| Prescriptions | ~80 000 |
| Appointments | ~25 000 |
| Sessions with follow-up dates | ~15 000 |

## Run

```bash
npx ts-node --project tsconfig.node.json prisma/seeds/clinic-dentist/seed.ts
```

> Make sure `DATABASE_URL` points to the development database before running.
