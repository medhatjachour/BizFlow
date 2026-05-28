# BizFlow Mobile App Parity and Cost Plan

## 1. Purpose
This document explains how to build a mobile app that matches BizFlow desktop capabilities, what should be shipped first, what backend changes are required, and what hosting and operational costs to expect.

Scope covered:
- Product and technical strategy for Android and iOS
- Feature parity mapping from desktop to mobile
- Recommended architecture and sync model
- Security and compliance basics
- Hosting and third-party cost estimates
- Team, timeline, and phased rollout

## 2. What "Match Desktop" Should Mean
For mobile, parity should be defined by business outcomes, not 1:1 screen copies.

Desktop-first workflows:
- Heavy data entry
- Back-office operations
- Bulk inventory and reports

Mobile-first workflows:
- Fast POS and barcode scanning
- On-the-floor stock operations
- Customer lookup and simple CRM actions
- Daily KPI checks, alerts, approvals

Parity target:
- Functional parity for core workflows
- UX parity for business rules and calculations
- Not necessarily visual parity for every desktop page

## 3. Current Desktop Modules to Map
Based on current BizFlow architecture, mobile must account for:
- Commerce core: POS, products, inventory, sales, installments, customers, stores, expenses, finance snapshots
- Finance: KPIs, cash flow metrics, expense tracking
- Employees: attendance and payroll viewing actions
- Plugins: bakery, clinic, restaurant, warehouse (enabled per client)

Important constraint:
- Desktop is offline-first with local SQLite + Electron IPC
- Mobile requires an API and sync architecture for multi-device consistency

## 4. Recommended Mobile Product Phases

### Phase 1 (MVP, 8-12 weeks)
- Authentication and role permissions
- Dashboard (today revenue, sales count, low stock, overdue installments)
- POS Lite (scan, cart, payment, receipt preview/share)
- Customer search/select/create
- Sales history and transaction detail
- Inventory quick actions (adjust stock, transfer request)
- Expense create/list/filter
- Offline queue for critical writes (sales, stock updates)

### Phase 2 (6-10 weeks)
- Installments and deposit flows
- Advanced product variants and price rules
- Store-level switching and scoped permissions
- Push notifications (overdue installments, low stock)
- Basic reports export (CSV/PDF server-side)

### Phase 3 (8-12 weeks)
- Plugin-aware mobile surfaces (clinic, bakery, restaurant, warehouse)
- Route sales person mode / field mode
- Improved analytics and forecasting tiles
- Device integrations (thermal Bluetooth printers, label printing where supported)

## 5. Feature Parity Matrix (Desktop -> Mobile)

| Area | Desktop Status | Mobile Phase | Notes |
|---|---|---|---|
| Login + roles | Full | P1 | Must match permission checks |
| POS checkout | Full | P1 | Start with cash/card and core flow |
| Barcode scan | Full | P1 | Camera scanning in mobile |
| Product variants | Full | P2 | Include color/size/attributes |
| Inventory adjustments | Full | P1 | Fast actions first |
| Sales history | Full | P1 | Search/filter/detail |
| Receipts | Full | P1/P2 | Share PDF first, thermal later |
| Customers | Full | P1 | Search/select/add |
| Installments/deposits | Full | P2 | Keep same settlement rules |
| Expenses | Full | P1 | Include COGS/Salary toggles in totals views |
| Finance analytics | Full | P2/P3 | KPI-first, deep reports later |
| Employees/payroll | Full | P2 | View + lightweight actions |
| Bakery plugin | Active | P3 | Production and recipe snapshots first |
| Clinic plugin | Active | P3 | Patient list and session essentials first |
| Restaurant plugin | Active | P3 | Table/order flows need dedicated UX |
| Warehouse plugin | Active | P2/P3 | Scanning and transfers high priority |

## 6. Technical Architecture Recommendation

### 6.1 Mobile Stack
Recommended:
- React Native (TypeScript) + Expo (or bare RN if deep native integrations are needed early)
- State/query: TanStack Query + lightweight local store (Zustand)
- Local offline DB: SQLite (Expo SQLite or WatermelonDB/Realm)
- Navigation: React Navigation
- UI: Native components + design tokens derived from desktop theme

### 6.2 Backend Layer (Required)
Desktop IPC calls cannot be used by mobile directly. Add a backend API layer:
- REST or GraphQL service
- Auth with JWT + refresh tokens
- Tenant/store scoping in every query
- Audit logs for finance/stock mutations

Suggested service split:
- API service: business endpoints
- Worker service: background jobs (notifications, reconciliations, report generation)
- Postgres: primary shared database
- Redis: queue, cache, rate limits
- Object storage: receipts, report files, media

### 6.3 Sync Model
Use an offline-first sync pattern:
- Each mobile write goes to local queue first
- Sync engine retries with exponential backoff
- Server uses idempotency keys to avoid duplicates
- Conflict policy per entity:
  - Sales/payment: server-authoritative, reject stale changes
  - Notes/profile-like fields: last-write-wins
  - Inventory counts: operation-based deltas with reconciliation

### 6.4 Multi-Plugin Support in Mobile
Implement feature flags from server:
- User has module access list
- App hides plugin tabs that are disabled
- API enforces plugin/module permissions regardless of UI state

## 7. Security and Compliance Baseline
- Token storage in secure keychain/keystore
- Biometric unlock optional for manager roles
- TLS everywhere, certificate pinning recommended
- Field-level authorization checks in backend
- PII minimization and encrypted backups
- Full audit trail for sales/refunds/expense edits
- Device session revoke and remote logout

## 8. Hosting and Ops Cost Estimates (Monthly)
All numbers are realistic planning ranges and will vary by region/provider. USD estimates.

### 8.1 Lean Production (small rollout: 1-20 stores)
- API app service (2 small instances): $40-$120
- Worker/background jobs: $15-$60
- Managed Postgres: $30-$120
- Redis: $10-$40
- Object storage + CDN: $5-$30
- Monitoring/logging: $0-$60
- Push notifications: $0-$30
- Email/SMS alerts: $10-$80

Estimated total: $110-$540/month

### 8.2 Growth Production (20-100 stores)
- API autoscaling: $150-$700
- Workers: $60-$250
- Postgres HA tier: $200-$900
- Redis HA: $50-$200
- Object storage + CDN: $30-$200
- Monitoring/APM/logging: $50-$300
- Queues/notifications/email/SMS: $80-$400

Estimated total: $620-$2,950/month

### 8.3 Enterprise Production (100+ stores, strict SLA)
- API multi-zone cluster: $1,000-$5,000+
- Worker fleet: $400-$2,000+
- Postgres HA + read replicas: $1,200-$6,000+
- Redis clustered: $200-$1,200+
- Storage/CDN/media: $150-$1,000+
- Observability + SIEM: $300-$2,500+
- Messaging/SMS/email/push: $300-$2,000+

Estimated total: $3,550-$19,700+/month

## 9. Third-Party Cost Buckets to Budget Separately
- App distribution:
  - Apple Developer Program: ~$99/year
  - Google Play Console: ~$25 one-time
- Transactional email provider
- SMS/WhatsApp provider (if used for reminders)
- Crash reporting/APM (Sentry, Datadog, etc.)
- Maps/geocoding (only if field routing features are added)
- Payment gateway fees (if in-app online payment is added)

## 10. One-Time Build Cost (Team and Delivery)
Typical team for parity-grade mobile:
- 1 product manager (part-time)
- 1 UX/UI designer
- 2 mobile engineers
- 1 backend engineer
- 1 QA engineer
- Optional DevOps support

Typical one-time implementation range:
- MVP (Phase 1): $35k-$120k
- Phase 1 + 2: $80k-$220k
- Full parity with plugin surfaces: $150k-$450k+

## 11. UX Guidelines for Smooth Cross-Platform Experience
- Keep desktop business logic identical (totals, taxes, discount rules)
- Use mobile-specific interaction patterns, do not copy desktop layouts directly
- Prioritize one-thumb actions for POS and stock updates
- Add optimistic UI for offline queue actions
- Surface sync state clearly: Pending, Synced, Failed
- Preserve bilingual and RTL behavior from day one

## 12. API Checklist Required Before Mobile Starts
- Auth: login, refresh, logout, role claims
- POS: create transaction, refunds, receipt endpoints
- Products/inventory: search, variants, stock movement
- Customers: search, profile, create/update
- Expenses/finance: CRUD and KPI aggregate endpoints
- Installments/deposits: schedule, mark paid, reminders
- Settings/modules: enabled plugin list per tenant/user

## 13. Data Migration and Coexistence Strategy
If desktop currently stores data locally per machine:
- Define source of truth migration path to central Postgres
- Build importer from local SQLite snapshots
- During transition, run dual-write only if strongly necessary
- Prefer per-store cutover windows with rollback plan

## 14. Risks and Mitigations
- Risk: logic drift between desktop and mobile
  - Mitigation: shared backend calculation endpoints and contract tests
- Risk: offline conflicts on inventory/sales
  - Mitigation: operation-based sync + reconciliation jobs
- Risk: plugin complexity explosion
  - Mitigation: staged plugin rollout with feature flags
- Risk: cost overrun from under-sized infra assumptions
  - Mitigation: start lean, instrument everything, autoscale by SLO

## 15. Suggested 90-Day Execution Plan
- Weeks 1-2: product scope lock, API contracts, design system baseline
- Weeks 3-6: auth, POS Lite, sales history, customer flows, offline queue v1
- Weeks 7-9: inventory actions, expenses, KPI dashboard, sync hardening
- Weeks 10-11: QA regression, performance tuning, pilot deployment
- Week 12: staged store rollout and monitoring

## 16. Decision Summary
If your goal is to match desktop BizFlow reliably on mobile:
- Build a backend API and sync layer first
- Ship core commerce workflows in Phase 1
- Keep plugin-heavy parity for Phase 2/3
- Budget hosting from $110-$540/month for a lean pilot, scaling upward with adoption

---
Prepared for BizFlow desktop parity planning.
