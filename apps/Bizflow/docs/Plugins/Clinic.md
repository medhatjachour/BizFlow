# Clinic Plugin — Features & Screenshots

This document lists the Clinic plugin features and includes example screenshots for documentation and marketing purposes. Include real screenshots in the `docs/assets/clinic/` folder and name them `appointments.png`, `sessions.png`, `patients.png`, `invoices.png`.

**Quick summary**
- **Appointments**: Book, reschedule, cancel, mark overdue, and view appointment payment status.
- **Sessions**: Start/stop clinical sessions, attach notes, and record vitals.
- **Patients**: Full patient profiles, visit history, and custom visit types.
- **Payments**: Record payments per appointment, refunds, and integrate with POS transactions.
- **Invoicing**: Generate printable invoices and receipts for clinic visits.
- **Reports**: Clinic-specific reports (appointments, no-shows, revenue by visit type).

---

## Features (Detailed)

- **Appointments**
	- Daily/weekly appointment list with overdue highlighting.
	- Filters by provider, visit type, and status.
	- Overdue appointments show an amber badge and support refund & cancel flows.
	- Example screenshot: ![Appointments](assets/clinic/appointments.png)

- **Sessions**
	- Start a session from the appointment row (disabled for overdue appointments).
	- Capture session notes, add diagnosis, and attach files.
	- Example screenshot: ![Sessions](assets/clinic/sessions.png)

- **Patients**
	- Create and edit patient records, contact details, and medical history.
	- Visit timeline with quick access to past visit notes and generated invoices.
	- Example screenshot: ![Patients](assets/clinic/patients.png)

- **Payments & Invoicing**
	- Record payments (cash, card, insurance) per appointment.
	- Refund & cancel flows with confirmation dialogs for paid appointments.
	- Generate printable invoices/receipts for each visit.
	- Example screenshot: ![Invoices](assets/clinic/invoices.png)

- **Visit Types**
	- Built-in visit types (`First visit`, `Follow-up`, `Routine`, `Emergency`).
	- Add custom visit types via the `+` button in the session form.

- **Reports & Analytics**
	- Clinic-specific reports for appointments, revenue, and no-shows.
	- Exportable CSV/Excel for offline analysis.

---

## Where to find code

- Main process handlers: [src/main/ipc/handlers](src/main/ipc/handlers) — look for `clinic` related handlers.
- Renderer UI: [src/renderer/src/plugins/clinic](src/renderer/src/plugins/clinic)
- Prisma schema (clinic additions): `src/plugins/clinic/schema.prisma`

---

## Adding screenshots

Place production screenshots in `docs/assets/clinic/` with the filenames mentioned above. Use PNG or JPG and keep sizes under 400 KB for docs performance.

---

If you'd like, I can: add placeholder images, auto-generate thumbnails, or produce a printable one-page PDF summary.
