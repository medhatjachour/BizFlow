// ─── Personal Work: Sample workspace dataset ─────────────────────────────────
// Builds a complete, realistic solo-freelancer workspace so every tab, KPI and
// chart has something to show.
//
// This file is **pure**: it returns plain rows keyed by symbolic references and
// imports nothing from Electron or Prisma, so it can be unit-tested without a
// database. The half that writes those rows lives in `demo-seed.ts`, and the CLI
// entry point is `prisma/seeds/personal/seed.ts` (`npm run prisma:seed:personal`).
// ─────────────────────────────────────────────────────────────────────────────

import { round2, startOfDay } from './utils'
import { DEFAULT_CHECKLIST_TEMPLATES, DEFAULT_SCRIPTS } from './templates'
import { STAGE_IDS, stageIndex } from './domain'

// ─── Dataset shapes ──────────────────────────────────────────────────────────

export interface DemoClient { key: string; data: Record<string, any> }
export interface DemoProject { key: string; clientKey?: string; data: Record<string, any> }
export interface DemoInvoice {
  key: string
  clientKey?: string
  projectKey?: string
  data: Record<string, any>
}

export interface DemoDataset {
  clients: DemoClient[]
  projects: DemoProject[]
  deliverables: Array<{ projectKey: string; data: Record<string, any> }>
  stageEvents: Array<{ projectKey: string; data: Record<string, any> }>
  changeRequests: Array<{ projectKey: string; data: Record<string, any> }>
  waitLogs: Array<{ projectKey: string; data: Record<string, any> }>
  checklistTemplates: Array<{ data: Record<string, any> }>
  checklistItems: Array<{ projectKey: string; data: Record<string, any> }>
  tasks: Array<{
    key: string
    projectKey?: string | null
    clientKey?: string
    data: Record<string, any>
  }>
  focusSessions: Array<{
    projectKey?: string | null
    clientKey?: string
    taskKey?: string
    data: Record<string, any>
  }>
  workLogs: Array<{ data: Record<string, any> }>
  invoices: DemoInvoice[]
  payments: Array<{ invoiceKey: string; data: Record<string, any> }>
  expenses: Array<{ projectKey?: string | null; data: Record<string, any> }>
  subscriptions: Array<{ data: Record<string, any> }>
  retainers: Array<{ key: string; clientKey: string; data: Record<string, any> }>
  retainerUsages: Array<{ retainerKey: string; data: Record<string, any> }>
  rateProfile: Record<string, any>
  taxVaultEntries: Array<{ invoiceKey?: string; data: Record<string, any> }>
  blackouts: Array<{ data: Record<string, any> }>
  workloads: Array<{ projectKey?: string | null; data: Record<string, any> }>
  scripts: Array<{ data: Record<string, any> }>
  notes: Array<{
    projectKey?: string | null
    clientKey?: string
    data: Record<string, any>
  }>
}

// ─── Date helpers ────────────────────────────────────────────────────────────

/** `now` shifted by whole days, pinned to a wall-clock time. */
function dayAt(now: Date, offsetDays: number, hour = 9, minute = 0): Date {
  const d = new Date(now)
  d.setDate(d.getDate() + offsetDays)
  d.setHours(hour, minute, 0, 0)
  return d
}

function isWeekend(d: Date): boolean {
  const dow = d.getDay()
  return dow === 0 || dow === 6
}

/** Offsets for the last `count` weekdays, oldest first (today included). */
function recentWeekdays(now: Date, count: number): number[] {
  const offsets: number[] = []
  for (let offset = 0; offset >= -60 && offsets.length < count; offset -= 1) {
    if (!isWeekend(dayAt(now, offset))) offsets.push(offset)
  }
  return offsets.reverse()
}

/** Offsets for the next `count` weekdays, nearest first (tomorrow onwards). */
function upcomingWeekdays(now: Date, count: number): number[] {
  const offsets: number[] = []
  for (let offset = 1; offset <= 60 && offsets.length < count; offset += 1) {
    if (!isWeekend(dayAt(now, offset))) offsets.push(offset)
  }
  return offsets
}

function placeholdersIn(body: string): string[] {
  const keys = new Set<string>()
  for (const match of body.matchAll(/\{([A-Za-z0-9_]+)\}/g)) keys.add(match[1])
  return [...keys]
}

// ─── The dataset ─────────────────────────────────────────────────────────────

/**
 * Builds the full demo workspace. Deterministic for a given `now`, so tests can
 * assert on the shape without freezing the clock globally.
 */
export function buildDemoDataset(now: Date = new Date()): DemoDataset {
  const year = now.getFullYear()
  const recentOffsets = recentWeekdays(now, 12)

  // ── Clients ────────────────────────────────────────────────────────────────
  const clients: DemoClient[] = [
    {
      key: 'northwind',
      data: {
        name: 'Amara Osei',
        company: 'Northwind Studio',
        email: 'amara@northwind.studio',
        phone: '+44 20 7946 0132',
        timezone: 'Europe/London',
        currency: 'USD',
        defaultHourlyRate: 85,
        defaultDepositPercent: 50,
        paymentTermsDays: 14,
        workingStyleNotes:
          'Prefers a 3-minute Loom walkthrough over written updates. Reviews on Tuesday and Thursday mornings only.',
        redFlags: 'Slow payer — invoices routinely clear around day 14. Invoice the day a milestone lands.'
      }
    },
    {
      key: 'lumen',
      data: {
        name: 'Dr. Priya Raman',
        company: 'Lumen Health',
        email: 'priya@lumenhealth.io',
        phone: '+1 415 555 0188',
        timezone: 'America/Los_Angeles',
        currency: 'USD',
        defaultHourlyRate: 95,
        defaultDepositPercent: 30,
        paymentTermsDays: 30,
        workingStyleNotes:
          'Sends long email threads; summarise decisions back in one bullet list per thread.',
        redFlags: 'Compliance review can stall a release for a week — build it into the plan.'
      }
    },
    {
      key: 'kite',
      data: {
        name: 'Marcus Bell',
        company: 'Kite & Co Coffee',
        email: 'marcus@kiteandco.coffee',
        phone: '+1 512 555 0110',
        timezone: 'America/Chicago',
        currency: 'USD',
        defaultHourlyRate: 70,
        defaultDepositPercent: 50,
        paymentTermsDays: 7,
        workingStyleNotes: 'Talks through ideas on the phone; decisions arrive by WhatsApp voice note.',
        redFlags: 'Scope grows during every review round. Quote changes before touching the file.'
      }
    },
    {
      key: 'vantage',
      data: {
        name: 'Helena Duarte',
        company: 'Vantage Legal',
        email: 'helena@vantagelegal.com',
        timezone: 'Europe/Lisbon',
        currency: 'USD',
        defaultHourlyRate: 110,
        defaultDepositPercent: 50,
        paymentTermsDays: 30,
        workingStyleNotes: 'Wants a written status email every Friday. Very precise about wording in the UI.',
        redFlags: null
      }
    },
    {
      key: 'glacier',
      data: {
        name: 'Tomas Neruda',
        company: 'Glacier Analytics',
        email: 'tomas@glacier.analytics',
        timezone: 'Europe/Berlin',
        currency: 'USD',
        defaultHourlyRate: 90,
        defaultDepositPercent: 50,
        paymentTermsDays: 21,
        workingStyleNotes: 'Archived — went in-house in the spring. Kept for historical rate comparison.',
        redFlags: 'Requires a purchase order before any invoice is accepted.',
        isArchived: true
      }
    }
  ]

  // ── Projects ───────────────────────────────────────────────────────────────
  const projects: DemoProject[] = [
    {
      key: 'pNorthwindSite',
      clientKey: 'northwind',
      data: {
        code: 'DEMO-101',
        title: 'Northwind brand site rebuild',
        summary:
          'Marketing site rebuild on the existing CMS: new IA, design system hand-off and a launch plan.',
        status: 'active',
        stage: 'draft_staging',
        pricingType: 'fixed',
        currency: 'USD',
        agreedAmount: 8500,
        hourlyRate: 85,
        depositPercent: 50,
        startDate: dayAt(now, -24),
        dueDate: dayAt(now, 12),
        // Eight client-wait days pushed the deadline out by exactly that many days.
        adjustedDueDate: dayAt(now, 20),
        estimatedHours: 120,
        maxHoursPerWeek: 16,
        notes: 'Baseline is 3 page templates plus a style guide. Anything beyond that is a change request.'
      }
    },
    {
      key: 'pLumenPortal',
      clientKey: 'lumen',
      data: {
        code: 'DEMO-102',
        title: 'Patient portal maintenance retainer',
        summary: 'Monthly retainer: 15 hours of fixes, accessibility passes and content updates.',
        status: 'active',
        stage: 'feedback_locked',
        pricingType: 'retainer',
        currency: 'USD',
        agreedAmount: 1500,
        hourlyRate: 95,
        depositPercent: 0,
        startDate: dayAt(now, -70),
        dueDate: dayAt(now, 6),
        adjustedDueDate: dayAt(now, 9),
        estimatedHours: 180,
        maxHoursPerWeek: 8,
        notes: 'Compliance copy is supplied by Lumen and must be signed off before release.'
      }
    },
    {
      key: 'pKiteLanding',
      clientKey: 'kite',
      data: {
        code: 'DEMO-103',
        title: 'Coffee subscription landing page',
        summary: 'Single-page campaign site with a subscription flow and Stripe checkout.',
        status: 'active',
        stage: 'deposit_received',
        pricingType: 'fixed',
        currency: 'USD',
        agreedAmount: 3200,
        hourlyRate: 70,
        depositPercent: 50,
        startDate: dayAt(now, -6),
        dueDate: dayAt(now, 9),
        adjustedDueDate: dayAt(now, 11),
        estimatedHours: 46,
        maxHoursPerWeek: 12,
        notes: 'Copy and product photography both come from the client.'
      }
    },
    {
      key: 'pVantageDashboard',
      clientKey: 'vantage',
      data: {
        code: 'DEMO-104',
        title: 'Vantage case intake dashboard',
        summary: 'Internal dashboard for case intake triage, with role-based access and CSV exports.',
        status: 'delivered',
        stage: 'assets_handed_over',
        pricingType: 'fixed',
        currency: 'USD',
        agreedAmount: 12400,
        hourlyRate: 110,
        depositPercent: 50,
        startDate: dayAt(now, -96),
        dueDate: dayAt(now, -26),
        adjustedDueDate: dayAt(now, -22),
        deliveredAt: dayAt(now, -24, 16),
        estimatedHours: 140,
        notes: 'Handover call recorded; source archived to the client drive.'
      }
    },
    {
      key: 'pNorthwindAudit',
      clientKey: 'northwind',
      data: {
        code: 'DEMO-105',
        title: 'Design system audit (phase 1)',
        summary: 'Audit of the component library, token coverage and a prioritised fix list.',
        status: 'paused',
        stage: 'brief_approved',
        pricingType: 'hourly',
        currency: 'USD',
        agreedAmount: 0,
        hourlyRate: 85,
        depositPercent: 50,
        startDate: dayAt(now, -4),
        dueDate: dayAt(now, 26),
        estimatedHours: 30,
        maxHoursPerWeek: 6,
        notes: 'On hold until the site rebuild ships. Rate locked at the 2025 number.'
      }
    },
    {
      key: 'pGlacierDocs',
      clientKey: 'glacier',
      data: {
        code: 'DEMO-106',
        title: 'Analytics onboarding documentation',
        summary: 'Written onboarding guide and a Notion template for the analytics team.',
        status: 'closed',
        stage: 'assets_handed_over',
        pricingType: 'fixed',
        currency: 'USD',
        agreedAmount: 2600,
        hourlyRate: 90,
        depositPercent: 50,
        startDate: dayAt(now, -150),
        dueDate: dayAt(now, -120),
        adjustedDueDate: dayAt(now, -120),
        deliveredAt: dayAt(now, -122, 15),
        closedAt: dayAt(now, -118, 11),
        estimatedHours: 32,
        notes: 'Closed with a testimonial and a referral to the finance team.'
      }
    },
    {
      key: 'pGlacierDash',
      clientKey: 'glacier',
      data: {
        code: 'DEMO-107',
        title: 'Q3 reporting dashboards',
        summary: 'Lead: a scoped proposal to build three reporting dashboards.',
        status: 'lead',
        stage: 'brief_approved',
        pricingType: 'fixed',
        currency: 'USD',
        agreedAmount: 6400,
        hourlyRate: 90,
        depositPercent: 40,
        startDate: dayAt(now, 14),
        dueDate: dayAt(now, 52),
        estimatedHours: 80,
        notes: 'Proposal sent. Waiting on their Q3 budget confirmation.'
      }
    }
  ]

  // ── Deliverables: the baseline scope you quote against ──────────────────────
  const deliverables: DemoDataset['deliverables'] = [
    { projectKey: 'pNorthwindSite', data: { title: 'Page templates', quantity: 3, unit: 'template' } },
    { projectKey: 'pNorthwindSite', data: { title: 'Style guide', quantity: 1, unit: 'doc' } },
    { projectKey: 'pNorthwindSite', data: { title: 'CMS migration', quantity: 1, unit: 'migration' } },
    {
      projectKey: 'pNorthwindSite',
      data: {
        title: 'Copywriting',
        quantity: 0,
        unit: 'page',
        isIncluded: false,
        notes: 'Explicitly out of scope — the client supplies final copy.'
      }
    },
    { projectKey: 'pLumenPortal', data: { title: 'Maintenance hours', quantity: 15, unit: 'hour' } },
    { projectKey: 'pLumenPortal', data: { title: 'Accessibility pass', quantity: 1, unit: 'audit' } },
    {
      projectKey: 'pLumenPortal',
      data: {
        title: 'New feature development',
        quantity: 0,
        unit: 'feature',
        isIncluded: false,
        notes: 'Any new feature is quoted separately as a change request.'
      }
    },
    { projectKey: 'pKiteLanding', data: { title: 'Landing page build', quantity: 1, unit: 'page' } },
    { projectKey: 'pKiteLanding', data: { title: 'Stripe checkout wiring', quantity: 1, unit: 'integration' } },
    { projectKey: 'pKiteLanding', data: { title: 'Revision rounds', quantity: 2, unit: 'round' } },
    { projectKey: 'pVantageDashboard', data: { title: 'Dashboard screens', quantity: 6, unit: 'screen' } },
    { projectKey: 'pVantageDashboard', data: { title: 'Role-based access', quantity: 1, unit: 'module' } },
    { projectKey: 'pVantageDashboard', data: { title: 'CSV export', quantity: 1, unit: 'integration' } },
    { projectKey: 'pVantageDashboard', data: { title: 'Hand-over documentation', quantity: 1, unit: 'doc' } },
    { projectKey: 'pNorthwindAudit', data: { title: 'Component inventory', quantity: 1, unit: 'doc' } },
    { projectKey: 'pNorthwindAudit', data: { title: 'Prioritised fix list', quantity: 1, unit: 'doc' } },
    { projectKey: 'pGlacierDocs', data: { title: 'Onboarding guide', quantity: 1, unit: 'doc' } },
    { projectKey: 'pGlacierDocs', data: { title: 'Notion template', quantity: 1, unit: 'template' } },
    { projectKey: 'pGlacierDash', data: { title: 'Reporting dashboards', quantity: 3, unit: 'dashboard' } }
  ]

  // ── Stage events: one row per stage the project has passed through ──────────
  const stageNotes: Record<string, string> = {
    brief_approved: 'Brief signed off in writing; the scope baseline is frozen at this point.',
    deposit_received: 'Deposit cleared — production unlocked.',
    draft_staging: 'First draft pushed to the staging environment for review.',
    feedback_locked: 'Round-2 feedback signed off; no further changes inside the baseline.',
    final_payment_received: 'Balance settled in full.',
    assets_handed_over: 'Files released and the hand-over walkthrough recorded.'
  }

  const stageEvents: DemoDataset['stageEvents'] = []
  for (const project of projects) {
    const reached = stageIndex(project.data.stage)
    const anchor = project.data.startDate ?? dayAt(now, -30)
    for (let i = 0; i <= reached; i += 1) {
      const stage = STAGE_IDS[i]
      const entered = new Date(anchor)
      entered.setDate(entered.getDate() + i * 5)
      entered.setHours(11, 0, 0, 0)
      stageEvents.push({ projectKey: project.key, data: { stage, note: stageNotes[stage] ?? null, enteredAt: entered } })
    }
  }

  // ── Change requests: logged, priced and quoted before any work starts ───────
  const changeRequests: DemoDataset['changeRequests'] = [
    {
      projectKey: 'pNorthwindSite',
      data: {
        title: 'Add a careers page template',
        description: 'Fourth template on top of the agreed three, including an application form style.',
        estimatedHours: 11,
        hourlyRate: 85,
        extraCost: 935,
        extraDays: 4,
        status: 'approved',
        quoteText:
          'Adding a careers page template sits outside the agreed three templates.\n\n• Extra effort: 11 hours\n• Extra cost: USD 935\n• Timeline impact: 4 working days\n\nThe existing milestones stay on track. Approve and I will schedule it this week.',
        quotedAt: dayAt(now, -9, 10),
        decidedAt: dayAt(now, -8, 9, 30),
        decisionNote: 'Approved by email — "yes, go ahead before launch".'
      }
    },
    {
      projectKey: 'pKiteLanding',
      data: {
        title: 'Add a gift-card purchase flow',
        description: 'Client asked for gift cards mid-build; not part of the agreed single-page scope.',
        estimatedHours: 14,
        hourlyRate: 70,
        extraCost: 980,
        extraDays: 6,
        status: 'quoted',
        quoteText:
          'Gift cards are a separate flow with its own checkout and email template.\n\n• Extra effort: 14 hours\n• Extra cost: USD 980\n• Timeline impact: 6 working days',
        quotedAt: dayAt(now, -2, 15)
      }
    },
    {
      projectKey: 'pNorthwindSite',
      data: {
        title: 'Animated hero background',
        description: 'Subtle Lottie animation behind the hero, fallback for reduced motion.',
        estimatedHours: 6,
        hourlyRate: 85,
        extraCost: 510,
        extraDays: 2,
        status: 'declined',
        quoteText: 'Adding an animated hero is 6 hours of extra work plus a reduced-motion fallback.',
        quotedAt: dayAt(now, -14, 12),
        decidedAt: dayAt(now, -13, 16),
        decisionNote: 'Client decided to keep the static hero for now.'
      }
    },
    {
      projectKey: 'pLumenPortal',
      data: {
        title: 'Bulk patient import tool',
        description: 'One-off CSV importer for the migrations team.',
        estimatedHours: 9,
        hourlyRate: 95,
        extraCost: 855,
        extraDays: 3,
        status: 'invoiced',
        quoteText: 'The importer is 9 hours of work outside the retainer hours.',
        quotedAt: dayAt(now, -20, 11),
        decidedAt: dayAt(now, -19, 10),
        decisionNote: 'Approved; invoiced separately so it does not eat the retainer.'
      }
    },
    {
      projectKey: 'pVantageDashboard',
      data: {
        title: 'Scheduled email digest',
        description: 'Daily digest email to case owners.',
        estimatedHours: 7,
        hourlyRate: 110,
        extraCost: 770,
        extraDays: 3,
        status: 'draft',
        quoteText: 'A daily digest is roughly 7 hours: query, template and the scheduled job.'
      }
    }
  ]

  // ── Client waits: the auditable paper trail behind every shifted deadline ───
  const waitLogs: DemoDataset['waitLogs'] = [
    {
      projectKey: 'pNorthwindSite',
      data: {
        reason: 'assets',
        startedAt: dayAt(now, -18, 9),
        endedAt: dayAt(now, -13, 17),
        days: 5,
        shiftDeadline: true,
        appliedDays: 5,
        note: 'Brand photography and the logo pack arrived five days after the agreed drop date.'
      }
    },
    {
      projectKey: 'pNorthwindSite',
      data: {
        reason: 'review',
        startedAt: dayAt(now, -6, 9),
        endedAt: dayAt(now, -3, 12),
        days: 3,
        shiftDeadline: true,
        appliedDays: 3,
        note: 'Round-1 feedback sat in the client inbox over a weekend.'
      }
    },
    {
      projectKey: 'pKiteLanding',
      data: {
        reason: 'copy',
        startedAt: dayAt(now, -4, 9),
        endedAt: null,
        days: 0,
        shiftDeadline: true,
        appliedDays: 0,
        note: 'Product copy still not delivered — the hero and pricing sections are blocked.'
      }
    },
    {
      projectKey: 'pLumenPortal',
      data: {
        reason: 'credentials',
        startedAt: dayAt(now, -34, 9),
        endedAt: dayAt(now, -32, 15),
        days: 2,
        shiftDeadline: true,
        appliedDays: 2,
        note: 'Staging VPN credentials were reissued before access worked.'
      }
    },
    {
      projectKey: 'pVantageDashboard',
      data: {
        reason: 'payment',
        startedAt: dayAt(now, -30, 9),
        endedAt: dayAt(now, -21, 16),
        days: 9,
        shiftDeadline: false,
        appliedDays: 0,
        note: 'Final invoice held in their accounts payable queue. Delivery was released anyway.'
      }
    }
  ]

  // ── Pre-flight checklists: templates plus live items on active projects ─────
  const checklistTemplates = DEFAULT_CHECKLIST_TEMPLATES.map((template) => ({
    data: {
      name: template.name,
      profession: template.profession,
      isDefault: template.isDefault,
      itemsJson: JSON.stringify(template.items)
    }
  }))

  const checklistItems: DemoDataset['checklistItems'] = []
  const templateFor = (profession: string) =>
    DEFAULT_CHECKLIST_TEMPLATES.find((tpl) => tpl.profession === profession) ??
    DEFAULT_CHECKLIST_TEMPLATES[DEFAULT_CHECKLIST_TEMPLATES.length - 1]

  const checklistPlan: Array<[string, string, number]> = [
    ['pNorthwindSite', 'developer', 3],
    ['pVantageDashboard', 'developer', 8],
    ['pKiteLanding', 'designer', 2],
    ['pLumenPortal', 'general', 4]
  ]
  for (const [projectKey, profession, doneCount] of checklistPlan) {
    const template = templateFor(profession)
    template.items.forEach((label, index) => {
      const isDone = index < doneCount
      checklistItems.push({
        projectKey,
        data: {
          label,
          category: profession,
          isDone,
          doneAt: isDone ? dayAt(now, -20 + index, 15) : null,
          isBlocking: index < template.items.length - 2,
          displayOrder: index,
          notes: null
        }
      })
    })
  }

  // ── Tasks: the Daily 3 plus a realistic backlog ────────────────────────────
  const tasks: DemoDataset['tasks'] = [
    {
      key: 'tHeroLayout',
      projectKey: 'pNorthwindSite',
      clientKey: 'northwind',
      data: {
        title: 'Finish the hero + feature-section layout',
        status: 'today',
        type: 'deliverable',
        priority: 1,
        estimateMinutes: 180,
        dueDate: dayAt(now, 0, 18),
        isDailyThree: true,
        isBillable: true
      }
    },
    {
      key: 'tCopyChase',
      projectKey: 'pKiteLanding',
      clientKey: 'kite',
      data: {
        title: 'Chase the outstanding product copy',
        notes: 'Third reminder. Reference the wait log so the deadline shift is defensible.',
        status: 'today',
        type: 'admin',
        priority: 2,
        estimateMinutes: 20,
        dueDate: dayAt(now, 0, 12),
        isDailyThree: true,
        isBillable: false
      }
    },
    {
      key: 'tAccessibility',
      projectKey: 'pLumenPortal',
      clientKey: 'lumen',
      data: {
        title: 'Accessibility pass on the intake form',
        status: 'in_progress',
        type: 'deliverable',
        priority: 2,
        estimateMinutes: 150,
        dueDate: dayAt(now, 1, 17),
        isDailyThree: true,
        isBillable: true
      }
    },
    {
      key: 'tInvoiceDeposit',
      projectKey: 'pKiteLanding',
      clientKey: 'kite',
      data: {
        title: 'Send the gift-card change-request quote',
        status: 'in_progress',
        type: 'sales',
        priority: 2,
        estimateMinutes: 30,
        dueDate: dayAt(now, 0, 16),
        isBillable: false
      }
    },
    {
      key: 'tGridTokens',
      projectKey: 'pNorthwindSite',
      clientKey: 'northwind',
      data: {
        title: 'Extract the spacing scale into design tokens',
        status: 'backlog',
        type: 'deliverable',
        priority: 3,
        estimateMinutes: 120,
        dueDate: dayAt(now, 4, 17),
        isBillable: true
      }
    },
    {
      key: 'tWpLogin',
      projectKey: 'pNorthwindSite',
      data: {
        title: 'Waiting on staging credentials from the hosting provider',
        notes: 'Blocked since the provider rotated SSH keys. Ticket #48221 open.',
        status: 'blocked',
        type: 'admin',
        priority: 2,
        estimateMinutes: 45,
        dueDate: dayAt(now, 2, 12),
        isBillable: false
      }
    },
    {
      key: 'tLumenCompliance',
      projectKey: 'pLumenPortal',
      clientKey: 'lumen',
      data: {
        title: 'Apply the compliance copy revisions',
        status: 'backlog',
        type: 'deliverable',
        priority: 2,
        estimateMinutes: 90,
        dueDate: dayAt(now, 3, 17),
        isBillable: true
      }
    },
    {
      key: 'tRefactorExports',
      projectKey: 'pVantageDashboard',
      clientKey: 'vantage',
      data: {
        title: 'Refactor CSV export into a shared helper',
        status: 'done',
        type: 'deliverable',
        priority: 3,
        estimateMinutes: 90,
        dueDate: dayAt(now, -22, 17),
        isBillable: true,
        completedAt: dayAt(now, -23, 16)
      }
    },
    {
      key: 'tHandoverCall',
      projectKey: 'pVantageDashboard',
      clientKey: 'vantage',
      data: {
        title: 'Record the Vantage hand-over walkthrough',
        status: 'done',
        type: 'admin',
        priority: 2,
        estimateMinutes: 60,
        dueDate: dayAt(now, -24, 15),
        isBillable: true,
        completedAt: dayAt(now, -24, 16)
      }
    },
    {
      key: 'tReadPaper',
      projectKey: null,
      data: {
        title: 'Read the CSS containment spec for the animation work',
        status: 'done',
        type: 'learning',
        priority: 4,
        estimateMinutes: 45,
        dueDate: dayAt(now, -9, 18),
        isBillable: false,
        completedAt: dayAt(now, -9, 18, 30)
      }
    },
    {
      key: 'tQ3Proposal',
      projectKey: 'pGlacierDash',
      clientKey: 'glacier',
      data: {
        title: 'Follow up on the Q3 dashboard proposal',
        status: 'backlog',
        type: 'sales',
        priority: 2,
        estimateMinutes: 30,
        dueDate: dayAt(now, 5, 12),
        isBillable: false
      }
    },
    {
      key: 'tRetainerReport',
      projectKey: 'pLumenPortal',
      clientKey: 'lumen',
      data: {
        title: 'Write the monthly retainer report',
        notes: '15 hours included, 12.5 used, 2.5 carried into next month.',
        status: 'backlog',
        type: 'admin',
        priority: 3,
        estimateMinutes: 45,
        dueDate: dayAt(now, 7, 17),
        isBillable: false
      }
    },
    {
      key: 'tTaxRun',
      projectKey: null,
      data: {
        title: 'Quarterly tax set-aside check',
        status: 'backlog',
        type: 'admin',
        priority: 3,
        estimateMinutes: 60,
        dueDate: dayAt(now, 11, 17),
        isBillable: false
      }
    },
    {
      key: 'tPortfolio',
      projectKey: null,
      data: {
        title: 'Publish the Vantage case study on the portfolio',
        status: 'cancelled',
        type: 'sales',
        priority: 4,
        estimateMinutes: 120,
        isBillable: false,
        notes: 'The client withdrew permission, so this is on hold indefinitely.'
      }
    },
    {
      key: 'tRateReview',
      projectKey: null,
      data: {
        title: 'Recompute the minimum hourly rate after the rent increase',
        status: 'done',
        type: 'admin',
        priority: 3,
        estimateMinutes: 40,
        dueDate: dayAt(now, -15, 17),
        isBillable: false,
        completedAt: dayAt(now, -15, 18)
      }
    },
    {
      key: 'tStyleGuide',
      projectKey: 'pNorthwindSite',
      clientKey: 'northwind',
      data: {
        title: 'Draft the style guide page',
        status: 'done',
        type: 'deliverable',
        priority: 2,
        estimateMinutes: 150,
        dueDate: dayAt(now, -5, 17),
        isBillable: true,
        completedAt: dayAt(now, -5, 16)
      }
    },
    {
      key: 'tKiteCheckout',
      projectKey: 'pKiteLanding',
      clientKey: 'kite',
      data: {
        title: 'Wire up Stripe test-mode checkout',
        status: 'done',
        type: 'deliverable',
        priority: 2,
        estimateMinutes: 120,
        dueDate: dayAt(now, -2, 17),
        isBillable: true,
        completedAt: dayAt(now, -2, 17, 30)
      }
    },
    {
      key: 'tBackupAudit',
      projectKey: null,
      data: {
        title: 'Audit the subscription list for tools I stopped using',
        status: 'backlog',
        type: 'admin',
        priority: 4,
        estimateMinutes: 30,
        dueDate: dayAt(now, 9, 12),
        isBillable: false
      }
    }
  ]

  // ── Focus sessions across twelve working days ──────────────────────────────
  const focusSessions: DemoDataset['focusSessions'] = []
  const sessionTemplates: Array<{
    hour: number
    minutes: number
    kind: string
    projectKey: string
    billable: boolean
    interruptions: number
    taskKey?: string
    note?: string
  }> = [
    { hour: 9, minutes: 50, kind: 'flow', projectKey: 'pNorthwindSite', billable: true, interruptions: 0 },
    {
      hour: 10,
      minutes: 50,
      kind: 'flow',
      projectKey: 'pNorthwindSite',
      billable: true,
      interruptions: 1,
      taskKey: 'tHeroLayout'
    },
    {
      hour: 11,
      minutes: 25,
      kind: 'pomodoro',
      projectKey: 'pLumenPortal',
      billable: true,
      interruptions: 0,
      taskKey: 'tAccessibility'
    },
    { hour: 14, minutes: 45, kind: 'flow', projectKey: 'pKiteLanding', billable: true, interruptions: 2 },
    { hour: 15, minutes: 25, kind: 'pomodoro', projectKey: 'pLumenPortal', billable: true, interruptions: 0 },
    {
      hour: 16,
      minutes: 35,
      kind: 'manual',
      projectKey: 'pNorthwindSite',
      billable: false,
      interruptions: 0,
      note: 'Admin: invoicing and the Friday status email.'
    }
  ]

  for (const [index, offset] of recentOffsets.entries()) {
    const take = 2 + (index % 2)
    for (let i = 0; i < take; i += 1) {
      const template = sessionTemplates[(index + i) % sessionTemplates.length]
      const startedAt = dayAt(now, offset, template.hour, (i % 2) * 30)
      const endedAt = new Date(startedAt.getTime() + template.minutes * 60_000)
      const project = projects.find((p) => p.key === template.projectKey)
      focusSessions.push({
        projectKey: template.projectKey,
        clientKey: project?.clientKey,
        taskKey: template.taskKey,
        data: {
          kind: template.kind,
          startedAt,
          endedAt,
          plannedMinutes: template.minutes < 30 ? 25 : 50,
          actualMinutes: template.minutes,
          billable: template.billable,
          interruptions: template.interruptions,
          note: template.note ?? null
        }
      })
    }
  }

  // ── Daily work logs: the stand-up summary history ──────────────────────────
  const workLogs: DemoDataset['workLogs'] = []
  const moods = ['energised', 'focused', 'steady', 'focused', 'ok', 'drained', 'energised', 'steady']
  for (const [index, offset] of recentOffsets.slice(-8).entries()) {
    const day = startOfDay(dayAt(now, offset))
    const sessions = focusSessions.filter(
      (session) => startOfDay(session.data.startedAt as Date).getTime() === day.getTime()
    )
    const focusMinutes = sessions.reduce((sum, s) => sum + Number(s.data.actualMinutes), 0)
    const billableMinutes = sessions
      .filter((s) => s.data.billable)
      .reduce((sum, s) => sum + Number(s.data.actualMinutes), 0)
    const completed = tasks
      .filter((task) => task.data.completedAt)
      .filter((task) => startOfDay(task.data.completedAt as Date).getTime() === day.getTime())
      .map((task) => task.data.title)

    const fallback = [
      'Reviewed the staging build and logged the outstanding items',
      'Answered client feedback and updated the task list',
      'Paired the design tokens with the component library'
    ]

    workLogs.push({
      data: {
        day,
        completedJson: JSON.stringify(completed.length > 0 ? completed : [fallback[index % fallback.length]]),
        nextJson: JSON.stringify([
          'Finish the hero and feature-section layout',
          'Chase the outstanding product copy',
          'Prep the Friday status email'
        ]),
        summary:
          `Completed ${completed.length > 0 ? completed.length : 1} item(s) and logged ` +
          `${Math.round(focusMinutes / 6) / 10}h of focused work (${Math.round(billableMinutes / 6) / 10}h billable). ` +
          'Tomorrow starts with the layout work, then the copy chase and the client update.',
        notes: index % 3 === 0 ? 'Client call in the morning; protect the 9:00–11:00 deep-work block.' : null,
        focusMinutes,
        billableMinutes,
        mood: moods[index % moods.length]
      }
    })
  }

  // ── Invoices, payments and the matching tax-vault reservations ─────────────
  const invoices: DemoInvoice[] = [
    {
      key: 'iNorthwindDeposit',
      clientKey: 'northwind',
      projectKey: 'pNorthwindSite',
      data: {
        number: `INV-${year}-0001`,
        kind: 'deposit',
        status: 'paid',
        currency: 'USD',
        amount: 4250,
        taxRate: 0,
        issuedAt: dayAt(now, -23),
        dueAt: dayAt(now, -16),
        paidAt: dayAt(now, -17, 14),
        notes: '50% deposit per the signed brief.'
      }
    },
    {
      key: 'iNorthwindMilestone',
      clientKey: 'northwind',
      projectKey: 'pNorthwindSite',
      data: {
        number: `INV-${year}-0002`,
        kind: 'milestone',
        status: 'sent',
        currency: 'USD',
        amount: 2125,
        taxRate: 0,
        issuedAt: dayAt(now, -3),
        dueAt: dayAt(now, 5),
        notes: '25% on staged draft approval.'
      }
    },
    {
      key: 'iNorthwindAudit',
      clientKey: 'northwind',
      projectKey: 'pNorthwindAudit',
      data: {
        number: `INV-${year}-0003`,
        kind: 'milestone',
        status: 'draft',
        currency: 'USD',
        amount: 1275,
        taxRate: 0,
        issuedAt: dayAt(now, -1),
        dueAt: dayAt(now, 13),
        notes: '15 audit hours at the locked 2025 rate. Hold until phase 1 restarts.'
      }
    },
    {
      key: 'iKiteDeposit',
      clientKey: 'kite',
      projectKey: 'pKiteLanding',
      data: {
        number: `INV-${year}-0004`,
        kind: 'deposit',
        status: 'paid',
        currency: 'USD',
        amount: 1600,
        taxRate: 0,
        issuedAt: dayAt(now, -8),
        dueAt: dayAt(now, -1),
        paidAt: dayAt(now, -3, 11),
        notes: '50% deposit before design starts.'
      }
    },
    {
      key: 'iKiteFinal',
      clientKey: 'kite',
      projectKey: 'pKiteLanding',
      data: {
        number: `INV-${year}-0005`,
        kind: 'final',
        status: 'draft',
        currency: 'USD',
        amount: 1600,
        taxRate: 0,
        issuedAt: dayAt(now, 0),
        dueAt: dayAt(now, 9),
        notes: 'Balance on hand-over. Held back until the outstanding copy arrives.'
      }
    },
    {
      key: 'iVantageFinal',
      clientKey: 'vantage',
      projectKey: 'pVantageDashboard',
      data: {
        number: `INV-${year}-0006`,
        kind: 'final',
        status: 'paid',
        currency: 'USD',
        amount: 7700,
        taxRate: 10,
        issuedAt: dayAt(now, -40),
        dueAt: dayAt(now, -30),
        paidAt: dayAt(now, -33, 16),
        notes: 'Balance plus the scheduled email digest change request, tax at 10%.'
      }
    },
    {
      key: 'iLumenRetainer',
      clientKey: 'lumen',
      projectKey: 'pLumenPortal',
      data: {
        number: `INV-${year}-0007`,
        kind: 'retainer',
        status: 'paid',
        currency: 'USD',
        amount: 1500,
        taxRate: 0,
        issuedAt: dayAt(now, -6),
        dueAt: dayAt(now, 24),
        paidAt: dayAt(now, -4, 10),
        notes: 'Monthly retainer, 15 hours included.'
      }
    },
    {
      key: 'iLumenChange',
      clientKey: 'lumen',
      projectKey: 'pLumenPortal',
      data: {
        number: `INV-${year}-0008`,
        kind: 'change_request',
        status: 'overdue',
        currency: 'USD',
        amount: 855,
        taxRate: 0,
        issuedAt: dayAt(now, -18),
        dueAt: dayAt(now, -9),
        notes: 'Bulk patient import tool. Three reminders sent; work has been paused.'
      }
    },
    {
      key: 'iLumenPartial',
      clientKey: 'lumen',
      projectKey: 'pLumenPortal',
      data: {
        number: `INV-${year}-0009`,
        kind: 'milestone',
        status: 'partial',
        currency: 'USD',
        amount: 950,
        taxRate: 0,
        issuedAt: dayAt(now, -12),
        dueAt: dayAt(now, -2),
        notes: 'Accessibility remediation; half received so far.'
      }
    },
    {
      key: 'iGlacierDocs',
      clientKey: 'glacier',
      projectKey: 'pGlacierDocs',
      data: {
        number: `INV-${year}-0010`,
        kind: 'final',
        status: 'paid',
        currency: 'USD',
        amount: 2600,
        taxRate: 0,
        issuedAt: dayAt(now, -124),
        dueAt: dayAt(now, -118),
        paidAt: dayAt(now, -122, 12),
        notes: 'Paid early. Closed the engagement.'
      }
    }
  ]

  const payments: DemoDataset['payments'] = [
    {
      invoiceKey: 'iNorthwindDeposit',
      data: {
        amount: 4250,
        paidAt: dayAt(now, -17, 14),
        method: 'bank',
        reference: 'NW-DEP-40817',
        isDeposit: true,
        note: 'Cleared two days late; the deadline shift is logged.'
      }
    },
    {
      invoiceKey: 'iKiteDeposit',
      data: {
        amount: 1600,
        paidAt: dayAt(now, -3, 11),
        method: 'card',
        reference: 'STRIPE-9K21D',
        isDeposit: true
      }
    },
    {
      invoiceKey: 'iVantageFinal',
      data: {
        amount: 7700,
        paidAt: dayAt(now, -33, 16),
        method: 'bank',
        reference: 'VNT-FIN-77120',
        isDeposit: false
      }
    },
    {
      invoiceKey: 'iLumenRetainer',
      data: {
        amount: 1500,
        paidAt: dayAt(now, -4, 10),
        method: 'bank',
        reference: 'LMN-RET-0625',
        isDeposit: false
      }
    },
    {
      invoiceKey: 'iLumenPartial',
      data: {
        amount: 500,
        paidAt: dayAt(now, -8, 13),
        method: 'bank',
        reference: 'LMN-ACC-500',
        isDeposit: false,
        note: 'First half of the accessibility work; the balance is still with their finance team.'
      }
    },
    {
      invoiceKey: 'iGlacierDocs',
      data: {
        amount: 2600,
        paidAt: dayAt(now, -122, 12),
        method: 'bank',
        reference: 'GLC-DOC-11204',
        isDeposit: false
      }
    }
  ]

  const taxReservePercent = 28
  const taxVaultEntries: DemoDataset['taxVaultEntries'] = payments.map((payment) => ({
    invoiceKey: payment.invoiceKey,
    data: {
      sourceType: 'invoice',
      amount: round2(Number(payment.data.amount) * (taxReservePercent / 100)),
      rate: taxReservePercent,
      reservedAt: payment.data.paidAt as Date,
      releasedAt: null,
      note: `${taxReservePercent}% set aside automatically when the payment landed.`
    }
  }))
  taxVaultEntries.push({
    invoiceKey: undefined,
    data: {
      sourceType: 'withdrawal',
      amount: -1850,
      rate: taxReservePercent,
      reservedAt: dayAt(now, -46, 10),
      releasedAt: dayAt(now, -45, 10),
      note: 'Quarterly provisional tax payment released from the vault.'
    }
  })

  // ── Expenses ───────────────────────────────────────────────────────────────
  const expenses: DemoDataset['expenses'] = [
    {
      projectKey: 'pNorthwindSite',
      data: {
        description: 'Premium stock photography licence (3 images)',
        category: 'software',
        vendor: 'Storyblocks',
        amount: 79,
        spentAt: dayAt(now, -20),
        isBillable: true,
        paymentMethod: 'card',
        note: 'Rebilled to Northwind on the milestone invoice.'
      }
    },
    {
      projectKey: 'pVantageDashboard',
      data: {
        description: 'Load-testing credits',
        category: 'hosting',
        vendor: 'LoadForge',
        amount: 24,
        spentAt: dayAt(now, -44),
        isBillable: true,
        paymentMethod: 'card'
      }
    },
    {
      projectKey: null,
      data: {
        description: '2 TB SSD for the client archive',
        category: 'equipment',
        vendor: 'SanDisk',
        amount: 189,
        spentAt: dayAt(now, -58),
        isBillable: false,
        paymentMethod: 'card',
        note: 'One of two backup locations for handed-over work.'
      }
    },
    {
      projectKey: null,
      data: {
        description: 'Co-working hot-desk day passes (4)',
        category: 'travel',
        vendor: 'Hearth Cowork',
        amount: 96,
        spentAt: dayAt(now, -11),
        isBillable: false,
        paymentMethod: 'card'
      }
    },
    {
      projectKey: 'pLumenPortal',
      data: {
        description: 'Accessibility audit tool, monthly',
        category: 'software',
        vendor: 'Axe Pro',
        amount: 49,
        spentAt: dayAt(now, -5),
        isBillable: true,
        paymentMethod: 'card'
      }
    },
    {
      projectKey: null,
      data: {
        description: 'Bank transfer fees for inbound USD payments',
        category: 'fees',
        vendor: 'Wise',
        amount: 18.4,
        spentAt: dayAt(now, -4),
        isBillable: false,
        paymentMethod: 'bank'
      }
    },
    {
      projectKey: null,
      data: {
        description: 'Advanced TypeScript course',
        category: 'education',
        vendor: 'Total TypeScript',
        amount: 249,
        spentAt: dayAt(now, -35),
        isBillable: false,
        paymentMethod: 'card'
      }
    },
    {
      projectKey: 'pKiteLanding',
      data: {
        description: 'Domain renewal for the campaign site',
        category: 'hosting',
        vendor: 'Namecheap',
        amount: 14.98,
        spentAt: dayAt(now, -7),
        isBillable: true,
        paymentMethod: 'card'
      }
    },
    {
      projectKey: null,
      data: {
        description: 'Portfolio site hosting, annual',
        category: 'hosting',
        vendor: 'Vercel',
        amount: 240,
        spentAt: dayAt(now, -72),
        isBillable: false,
        paymentMethod: 'card'
      }
    },
    {
      projectKey: null,
      data: {
        description: 'Accountant review for the quarter',
        category: 'fees',
        vendor: 'Bramwell & Co',
        amount: 180,
        spentAt: dayAt(now, -27),
        isBillable: false,
        paymentMethod: 'bank'
      }
    },
    {
      projectKey: null,
      data: {
        description: 'Ergonomic keyboard for the long build weeks',
        category: 'equipment',
        vendor: 'NuPhy',
        amount: 169,
        spentAt: dayAt(now, -50),
        isBillable: false,
        paymentMethod: 'card'
      }
    },
    {
      projectKey: 'pNorthwindSite',
      data: {
        description: 'Loom annual plan (client walkthroughs)',
        category: 'software',
        vendor: 'Loom',
        amount: 96,
        spentAt: dayAt(now, -16),
        isBillable: true,
        paymentMethod: 'card'
      }
    }
  ]

  // ── Subscriptions ──────────────────────────────────────────────────────────
  const subscriptions: DemoDataset['subscriptions'] = [
    {
      data: {
        name: 'Adobe Creative Cloud',
        vendor: 'Adobe',
        amount: 59.99,
        billingCycle: 'monthly',
        category: 'software',
        nextRenewalAt: dayAt(now, 4),
        autoRenew: true,
        isActive: true,
        isEssential: true,
        lastUsedAt: dayAt(now, -1),
        usageLevel: 'daily',
        notes: 'Only Photoshop and Illustrator get used now — check the plan tier.'
      }
    },
    {
      data: {
        name: 'Figma Professional',
        vendor: 'Figma',
        amount: 15,
        billingCycle: 'monthly',
        category: 'software',
        nextRenewalAt: dayAt(now, 9),
        autoRenew: true,
        isActive: true,
        isEssential: true,
        lastUsedAt: dayAt(now, -1),
        usageLevel: 'daily'
      }
    },
    {
      data: {
        name: 'GitHub Team',
        vendor: 'GitHub',
        amount: 4,
        billingCycle: 'monthly',
        category: 'software',
        nextRenewalAt: dayAt(now, 12),
        autoRenew: true,
        isActive: true,
        isEssential: true,
        lastUsedAt: dayAt(now, 0),
        usageLevel: 'daily'
      }
    },
    {
      data: {
        name: 'GitHub Copilot',
        vendor: 'GitHub',
        amount: 10,
        billingCycle: 'monthly',
        category: 'ai',
        nextRenewalAt: dayAt(now, 12),
        autoRenew: true,
        isActive: true,
        isEssential: true,
        lastUsedAt: dayAt(now, 0),
        usageLevel: 'daily'
      }
    },
    {
      data: {
        name: 'ChatGPT Plus',
        vendor: 'OpenAI',
        amount: 20,
        billingCycle: 'monthly',
        category: 'ai',
        nextRenewalAt: dayAt(now, 2),
        autoRenew: true,
        isActive: true,
        isEssential: true,
        lastUsedAt: dayAt(now, 0),
        usageLevel: 'daily'
      }
    },
    {
      data: {
        name: 'Midjourney',
        vendor: 'Midjourney',
        amount: 30,
        billingCycle: 'monthly',
        category: 'ai',
        nextRenewalAt: dayAt(now, 6),
        autoRenew: true,
        isActive: true,
        isEssential: false,
        lastUsedAt: dayAt(now, -22),
        usageLevel: 'rarely',
        notes: 'Barely used this quarter. Cancel unless a moodboard job lands.'
      }
    },
    {
      data: {
        name: 'Vercel Pro',
        vendor: 'Vercel',
        amount: 20,
        billingCycle: 'monthly',
        category: 'storage',
        nextRenewalAt: dayAt(now, 18),
        autoRenew: true,
        isActive: true,
        isEssential: true,
        lastUsedAt: dayAt(now, -2),
        usageLevel: 'weekly'
      }
    },
    {
      data: {
        name: 'Dropbox Plus (2 TB)',
        vendor: 'Dropbox',
        amount: 119.88,
        billingCycle: 'yearly',
        category: 'storage',
        nextRenewalAt: dayAt(now, 46),
        autoRenew: true,
        isActive: true,
        isEssential: true,
        lastUsedAt: dayAt(now, -1),
        usageLevel: 'weekly',
        notes: 'Second backup location for handed-over client work.'
      }
    },
    {
      data: {
        name: 'Domain renewals bundle',
        vendor: 'Namecheap',
        amount: 38.5,
        billingCycle: 'yearly',
        category: 'other',
        nextRenewalAt: dayAt(now, 71),
        autoRenew: true,
        isActive: true,
        isEssential: false,
        usageLevel: 'monthly'
      }
    },
    {
      data: {
        name: 'Skillshare',
        vendor: 'Skillshare',
        amount: 168,
        billingCycle: 'yearly',
        category: 'learning',
        nextRenewalAt: dayAt(now, 23),
        autoRenew: false,
        isActive: true,
        isEssential: false,
        lastUsedAt: dayAt(now, -63),
        usageLevel: 'rarely',
        notes: 'Auto-renew off. Cancelling at the end of the term.'
      }
    }
  ]

  // ── Retainers ─────────────────────────────────────────────────────────────
  const retainers: DemoDataset['retainers'] = [
    {
      key: 'rLumen',
      clientKey: 'lumen',
      data: {
        name: 'Lumen Health — portal maintenance',
        monthlyAmount: 1500,
        currency: 'USD',
        hoursIncluded: 15,
        hoursUsed: 12.5,
        rolloverEnabled: true,
        rolloverHours: 2.5,
        periodStart: dayAt(now, -6, 0),
        nextResetAt: dayAt(now, 25, 0),
        isActive: true,
        notes: '2.5 unused hours carry into next month. Anything beyond that is a change request.'
      }
    }
  ]

  const retainerUsages: DemoDataset['retainerUsages'] = [
    { retainerKey: 'rLumen', data: { minutes: 150, usedAt: dayAt(now, -4, 11), note: 'Compliance copy revisions' } },
    { retainerKey: 'rLumen', data: { minutes: 95, usedAt: dayAt(now, -3, 14), note: 'Intake form accessibility fixes' } },
    { retainerKey: 'rLumen', data: { minutes: 200, usedAt: dayAt(now, -2, 10), note: 'Release prep and smoke testing' } },
    { retainerKey: 'rLumen', data: { minutes: 60, usedAt: dayAt(now, -1, 16), note: 'Client call and ticket triage' } },
    {
      retainerKey: 'rLumen',
      data: {
        minutes: 245,
        usedAt: dayAt(now, -5, 9),
        note: 'Carried over from last month',
        isRollover: true
      }
    }
  ]

  // ── Rate profile — the floor price maths ──────────────────────────────────
  const rateProfile = {
    id: 'default',
    currency: 'USD',
    monthlyLivingCost: 2450,
    monthlyTaxes: 640,
    monthlySoftware: 232.4,
    monthlySavings: 600,
    monthlyOther: 180,
    targetBillableHoursPerWeek: 25,
    workingWeeksPerYear: 46,
    billableUtilisation: 0.7,
    taxReservePercent,
    weeklyCapacityHours: 40,
    maxClientHoursPerWeek: 30,
    minimumProjectPrice: 1200
  }

  // ── Blackouts ─────────────────────────────────────────────────────────────
  const blackouts: DemoDataset['blackouts'] = [
    {
      data: {
        title: 'Family trip — no client work',
        kind: 'vacation',
        startDate: dayAt(now, 24, 0),
        endDate: dayAt(now, 31, 23, 59),
        blocksDelivery: true,
        note: 'Deliveries must land before the 24th or wait until September.'
      }
    },
    {
      data: {
        title: 'Conference day (attending)',
        kind: 'study',
        startDate: dayAt(now, 8, 0),
        endDate: dayAt(now, 8, 23, 59),
        blocksDelivery: true,
        note: 'No client calls; the deep-work block moves to the morning.'
      }
    },
    {
      data: {
        title: 'Public holiday',
        kind: 'holiday',
        startDate: dayAt(now, -17, 0),
        endDate: dayAt(now, -17, 23, 59),
        blocksDelivery: true
      }
    },
    {
      data: {
        title: 'Dentist + admin afternoon',
        kind: 'personal',
        startDate: dayAt(now, 3, 0),
        endDate: dayAt(now, 3, 23, 59),
        blocksDelivery: false,
        note: 'Delivery blocking off — only the afternoon is gone.'
      }
    }
  ]

  // ── Workloads: the capacity heatmap ───────────────────────────────────────
  const workloads: DemoDataset['workloads'] = []
  const activeProjectKeys = ['pNorthwindSite', 'pLumenPortal', 'pKiteLanding']
  const loadPlan: Record<string, number[]> = {
    pNorthwindSite: [240, 240, 180],
    pLumenPortal: [120, 120, 120],
    pKiteLanding: [180, 150, 0]
  }
  const pastDays = recentWeekdays(now, 6)
  for (const [dayIndex, offset] of pastDays.entries()) {
    const day = startOfDay(dayAt(now, offset))
    for (const projectKey of activeProjectKeys) {
      const planned = loadPlan[projectKey][dayIndex % 3] ?? 120
      const actual = Math.max(0, planned - (dayIndex % 3) * 30)
      workloads.push({
        projectKey,
        data: { day, plannedMinutes: planned, actualMinutes: actual, isCommitted: true, note: null }
      })
    }
  }
  const aheadDays = upcomingWeekdays(now, 8)
  for (const [dayIndex, offset] of aheadDays.entries()) {
    const day = startOfDay(dayAt(now, offset))
    for (const projectKey of activeProjectKeys) {
      const base = loadPlan[projectKey][dayIndex % 3] ?? 120
      // Deliberately overload one day so the capacity heatmap shows amber/red.
      const planned = dayIndex === 3 ? base + 150 : base
      workloads.push({
        projectKey,
        data: { day, plannedMinutes: planned, actualMinutes: 0, isCommitted: dayIndex < 5, note: null }
      })
    }
  }

  // ── Playbook scripts ──────────────────────────────────────────────────────
  const scripts: DemoDataset['scripts'] = DEFAULT_SCRIPTS.map((script) => ({
    data: {
      title: script.title,
      category: script.category,
      tone: script.tone,
      level: script.level,
      body: script.body,
      placeholderKeys: JSON.stringify(placeholdersIn(script.body)),
      language: script.language,
      isBuiltIn: true,
      usageCount: script.category === 'deposit_request' ? 6 : script.category === 'scope_creep' ? 4 : 1,
      lastUsedAt: script.category === 'deposit_request' ? dayAt(now, -6, 9) : null
    }
  }))
  scripts.push({
    data: {
      title: 'Copy chase — third reminder',
      category: 'late_feedback',
      tone: 'polite',
      level: 2,
      body: [
        'Hi {clientName},',
        '',
        'Quick nudge on {outstandingItem} for {projectName}. This is the third reminder since {firstRequestDate}.',
        '',
        'The build is ready to continue, but {blockedAreas} cannot progress without it.',
        '',
        'Day {waitingDays} of the wait is now logged, which shifts the delivery date by the same amount.',
        '',
        'Happy to jump on a five-minute call if it is easier.',
        '',
        'Thanks!'
      ].join('\n'),
      placeholderKeys: JSON.stringify(
        placeholdersIn(
          ['{clientName}', '{outstandingItem}', '{projectName}', '{firstRequestDate}', '{blockedAreas}', '{waitingDays}'].join(' ')
        )
      ),
      language: 'en',
      isBuiltIn: false,
      usageCount: 3,
      lastUsedAt: dayAt(now, -4, 10)
    }
  })
  scripts.push({
    data: {
      title: 'Rate increase notice',
      category: 'general',
      tone: 'professional',
      level: 1,
      body: [
        'Hi {clientName},',
        '',
        'From {effectiveDate} my rate for {projectName} moves from {oldRate} to {newRate} per hour.',
        '',
        'Current milestones stay at the agreed price. The new rate applies to work booked after {effectiveDate}.',
        '',
        'Happy to lock the current rate for one more month if we commit to the next block now.',
        '',
        'Thanks for the continued work — it is a pleasure.',
      ].join('\n'),
      placeholderKeys: JSON.stringify(
        placeholdersIn('{clientName} {effectiveDate} {projectName} {oldRate} {newRate}')
      ),
      language: 'en',
      isBuiltIn: false,
      usageCount: 0,
      lastUsedAt: null
    }
  })

  // ── Scratchpad notes ──────────────────────────────────────────────────────
  const notes: DemoDataset['notes'] = [
    {
      projectKey: 'pNorthwindSite',
      clientKey: 'northwind',
      data: {
        title: 'Northwind — brand tokens',
        content: [
          'Brand hex codes:',
          '  ink      #0E1420',
          '  paper    #F7F5F2',
          '  accent   #C6512B',
          '  support  #2F6B4F',
          'Type:  Söhne (licensed) / Inter fallback. Never outline the licensed face.',
          'Grid:  12-column, 24px gutter, 8px baseline.'
        ].join('\n'),
        kind: 'brand',
        isPinned: true,
        tags: 'brand,northwind,colors'
      }
    },
    {
      projectKey: 'pNorthwindSite',
      clientKey: 'northwind',
      data: {
        title: 'Staging access',
        content: 'Staging: https://staging.northwind.studio  —  user: amara-readonly\nCMS admin: /wp-admin (client SSO only)',
        kind: 'credential',
        isPinned: true,
        tags: 'access,staging'
      }
    },
    {
      projectKey: 'pVantageDashboard',
      clientKey: 'vantage',
      data: {
        title: 'Vantage — repository and board',
        content: 'GitHub: github.com/vantage-legal/intake-dashboard (private)\nLinear board: VANT-INTAKE\nArchive: Dropbox/Handover/2025/vantage-dashboard.zip',
        kind: 'link',
        isPinned: false,
        tags: 'links,vantage'
      }
    },
    {
      projectKey: 'pLumenPortal',
      clientKey: 'lumen',
      data: {
        title: 'Lumen — compliance constraints',
        content: [
          'Every patient-facing string needs legal sign-off before release — allow five working days.',
          'No analytics scripts on any screen that renders patient data.',
          'Retainer hours reset on the 1st; unused hours roll over once only.'
        ].join('\n'),
        kind: 'note',
        isPinned: true,
        tags: 'compliance,lumen'
      }
    },
    {
      projectKey: 'pKiteLanding',
      clientKey: 'kite',
      data: {
        title: 'Kite — waiting on product photography',
        content: 'Shot list sent 12 days ago. Hero, three product angles and one lifestyle frame still outstanding.',
        kind: 'note',
        isPinned: false,
        tags: 'blocked,kite'
      }
    },
    {
      projectKey: null,
      data: {
        title: 'Invoice numbering & bank details',
        content: [
          'Invoice format: INV-<year>-####  (sequence continues across the year).',
          'Payment details: USD account ending 4417, reference required on every transfer.',
          'Late fee clause: 2% per month after the terms date, work pauses at 30 days.'
        ].join('\n'),
        kind: 'credential',
        isPinned: true,
        tags: 'admin,invoicing'
      }
    },
    {
      projectKey: null,
      data: {
        title: 'Quarterly tax checklist',
        content: [
          '1. Reconcile every payment against the bank feed.',
          '2. Confirm the vault balance equals 28% of received income.',
          '3. File the provisional return before the 15th of the second month.',
          '4. Move the difference into the tax account, not the current account.'
        ].join('\n'),
        kind: 'note',
        isPinned: false,
        tags: 'tax,admin'
      }
    },
    {
      projectKey: null,
      data: {
        title: 'Backup locations',
        content: 'Local: D:\\\\BizFlow\\\\backups (nightly, encrypted)\nOff-site: Dropbox/Client Handovers\nRestore drill: run once a quarter on a throwaway machine.',
        kind: 'link',
        isPinned: false,
        tags: 'backup,ops'
      }
    }
  ]

  return {
    clients,
    projects,
    deliverables,
    stageEvents,
    changeRequests,
    waitLogs,
    checklistTemplates,
    checklistItems,
    tasks,
    focusSessions,
    workLogs,
    invoices,
    payments,
    expenses,
    subscriptions,
    retainers,
    retainerUsages,
    rateProfile,
    taxVaultEntries,
    blackouts,
    workloads,
    scripts,
    notes
  }
}

/** Number of rows the dataset will create, per table. */
export function datasetCounts(dataset: DemoDataset): Record<string, number> {
  const counts: Record<string, number> = {
    PersonalClient: dataset.clients.length,
    PersonalProject: dataset.projects.length,
    PersonalDeliverable: dataset.deliverables.length,
    PersonalStageEvent: dataset.stageEvents.length,
    PersonalChangeRequest: dataset.changeRequests.length,
    PersonalWaitLog: dataset.waitLogs.length,
    PersonalChecklistTemplate: dataset.checklistTemplates.length,
    PersonalChecklistItem: dataset.checklistItems.length,
    PersonalTask: dataset.tasks.length,
    PersonalFocusSession: dataset.focusSessions.length,
    PersonalWorkLog: dataset.workLogs.length,
    PersonalInvoice: dataset.invoices.length,
    PersonalPayment: dataset.payments.length,
    PersonalExpense: dataset.expenses.length,
    PersonalSubscription: dataset.subscriptions.length,
    PersonalRetainer: dataset.retainers.length,
    PersonalRetainerUsage: dataset.retainerUsages.length,
    PersonalRateProfile: 1,
    PersonalTaxVaultEntry: dataset.taxVaultEntries.length,
    PersonalBlackout: dataset.blackouts.length,
    PersonalWorkload: dataset.workloads.length,
    PersonalScript: dataset.scripts.length,
    PersonalNote: dataset.notes.length + 1
  }
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0)
  return { ...counts, __total: total }
}
