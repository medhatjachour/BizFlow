# Vet Plugin — Features & Screenshots

This document lists the Vet plugin features and includes example screenshots for documentation and marketing purposes. Place screenshots in `docs/assets/vet/` and name them `appointments.png`, `patients.png`, `treatments.png`, `invoices.png`.

**Quick summary**
- **Appointments**: Track vet appointments, multi-pet bookings, and follow-ups.
- **Patient (Animal) Profiles**: Species/breed, owner contact, vaccination records.
- **Clinical Records**: Treatments, prescriptions, and procedural notes.
- **Payments & Invoicing**: Visit invoices, payments, and refunds.
- **Reports**: Vaccination coverage, revenue by service, and patient history.

---

## Features (Detailed)

- **Appointments & Visits**
  - Book appointments by owner or walk-in; schedule follow-ups and reminders.
  - Example screenshot: ![Appointments](assets/vet/appointments.png)

- **Patient Records**
  - Maintain per-animal records: species, breed, microchip ID, weight history.
  - Example screenshot: ![Patients](assets/vet/patients.png)

- **Treatments & Prescriptions**
  - Record procedures, medications, and dispense instructions.
  - Example screenshot: ![Treatments](assets/vet/treatments.png)

- **Payments & Invoicing**
  - Generate visit invoices, handle insurance claims or direct payments.
  - Example screenshot: ![Invoices](assets/vet/invoices.png)

---

## Where to find code

- Main process handlers: [src/main/ipc/handlers](src/main/ipc/handlers)
- Renderer UI: [src/renderer/src/plugins/vet](src/renderer/src/plugins/vet)
- Prisma schema (vet additions): `src/plugins/vet/schema.prisma`

---

## Adding screenshots

Place production screenshots in `docs/assets/vet/`. Use PNG or JPG and keep sizes under 400 KB.
