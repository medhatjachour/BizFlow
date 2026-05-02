# Gym Plugin — Features & Screenshots

This document lists the Gym plugin features and includes example screenshots for documentation and marketing purposes. Place screenshots in `docs/assets/gym/` and name them `classes.png`, `members.png`, `checkin.png`, `payments.png`.

**Quick summary**
- **Classes & Schedules**: Create class schedules, assign instructors, and handle bookings.
- **Memberships**: Create membership plans, recurring billing, and member profiles.
- **Check-in**: Fast member check-in with barcode or membership ID.
- **Payments**: Record membership payments, refunds, and POS sales for merch.
- **Reports**: Attendance, revenue, and membership churn reports.

---

## Features (Detailed)

- **Classes & Scheduling**
  - Weekly class calendar, capacity limits, waitlists, and instructor assignment.
  - Example screenshot: ![Classes](assets/gym/classes.png)

- **Memberships & Billing**
  - Define plans (monthly/annual), trial periods, and auto-renewal settings.
  - Track active/expired memberships per member.
  - Example screenshot: ![Members](assets/gym/members.png)

- **Check-in & Attendance**
  - Quick QR/barcode check-in and attendance logs for classes.
  - Export attendance for instructors.
  - Example screenshot: ![Check-in](assets/gym/checkin.png)

- **Payments & POS**
  - Accept payments for memberships, classes, and retail items.
  - Refunds and receipts supported.
  - Example screenshot: ![Payments](assets/gym/payments.png)

- **Reports & Analytics**
  - Membership growth, churn, class utilization, and revenue breakdowns.

---

## Where to find code

- Main process handlers: [src/main/ipc/handlers](src/main/ipc/handlers)
- Renderer UI: [src/renderer/src/plugins/gym](src/renderer/src/plugins/gym)
- Prisma schema (gym additions): `src/plugins/gym/schema.prisma`

---

## Adding screenshots

Place production screenshots in `docs/assets/gym/`. Use PNG or JPG and keep sizes under 400 KB.
