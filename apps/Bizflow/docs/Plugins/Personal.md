# Personal Work OS Plugin — Features & Screenshots

The **Personal** plugin (`personal`) is the tooling for running your own work as a
business of one: freelancing, solo consulting, agency-of-one. It is not a shop
till — there is no counter, no walk-in customer and no shared stock. Everything
in it belongs to a single operator, so the whole plugin is built around three
questions: _what did I promise, what am I actually earning, and how much of me is
left to give?_

It ships as a normal BizFlow plugin: its own Prisma models, its own IPC surface
and its own tabbed page under `/personal`, enabled from the plugin selector.

Screenshots go in `docs/assets/personal/` as `overview.png`, `projects.png`,
`finance.png` and `capacity.png`.

**Quick summary**

| Tab                              | What it is for                                                                                                               |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Today** (`overview`)           | The one screen that answers "what now?" — deadlines, unlocked stages, waiting-on-client days, cash position.                 |
| **Clients** (`clients`)          | Client records plus the private working-style and red-flag notes you never send them.                                        |
| **Projects** (`projects`)        | Stage-gated delivery, deliverables, pre-flight checklists and the paid/unpaid gate on every stage move.                      |
| **Change Requests** (`requests`) | The scope-creep guard: price the extra work, generate a quote, get it approved before starting.                              |
| **Waiting On Client** (`waits`)  | Client bottleneck tracker — logs the days the client cost you and shifts the deadline by exactly that many.                  |
| **Daily 3 & Tasks** (`tasks`)    | A board deliberately limited to three high-impact items, with the rest held in the backlog.                                  |
| **Focus Timer** (`focus`)        | Deep-work intervals bound to a project, logged as focus sessions.                                                            |
| **Work Log** (`worklog`)         | Daily log plus a generated standup paragraph you can paste to a client.                                                      |
| **Invoices** (`invoices`)        | Deposit and balance invoices per project, with the payment milestones they gate, live discount previews and a late-fee scan. |
| **Finance & Rate** (`finance`)   | Rate engineering, a three-tier price card, retainers, subscription audit, escrow split and the tax vault.                    |
| **Capacity** (`capacity`)        | Workload heatmap, blackout dates and the amber/red over-capacity warning.                                                    |
| **Playbook** (`playbook`)        | Canned client scripts for the awkward conversations, ready to copy.                                                          |
| **Notes** (`notes`)              | Per-project scratchpad for links, brand hex codes and API keys.                                                              |

Every screen above is also reachable from the header: **Guide** (or `F1`) explains
the workflow, and the maximise button drops the chrome for a focus-only view. The
sample workspace is no longer a button — it is a CLI seed
(`npm run prisma:seed:personal`, see [section 8](#8-sample-workspace)).

Live shortcuts: `Alt + 1`…`Alt + 9` pick the first nine tabs, `Alt + 0` picks
the tenth, `Ctrl/Cmd + PageDown` and `Ctrl/Cmd + PageUp` walk the tab strip in
order (the only way to reach tabs 11–13 by key), `F1` opens the guide, `Esc`
closes the open overlay, and **`Ctrl/Cmd + K` opens the plugin's own command
palette** (inside the plugin it takes precedence over the app-wide palette). Each
tab also publishes its own `aria-keyshortcuts`, so assistive tech can announce
them without a separate legend. The tab keys stand down while a dialog is open or
the caret is in a field — see [Keyboard](#keyboard).

---

## Features (Detailed)

### 1. Project delivery & the scope guard

- **Stage-gated pipeline.** Every project moves through
  `Brief Approved → Deposit Received → Draft Staging → Feedback Locked → Final
Payment Received → Assets Handed Over`. Each stage declares what it requires
  (`none`, `deposit` or `final_payment`) and the UI refuses the move until the
  money has actually landed — the last two stages stay locked until the
  outstanding balance is settled to the cent. Moving _backwards_ is always
  allowed, so a client can re-open a feedback round without fighting the gate.
- **Deliverables per project**, each with its own status, so "3 logo concepts,
  2 rounds of edits" is a countable baseline rather than a memory.
- **Change requests.** Log the extra ask, and `priceChangeRequest` derives the
  extra cost and the working days it adds (honouring an explicit day override
  when you already know it). One click renders a client-ready quote naming the
  cost and the delay, and the text states plainly that work only starts once the
  change is approved.
- **Client bottleneck tracker.** Log a wait with the reason (assets, copy,
  credentials, review). The days are counted per client and
  `shiftDeadline` pushes the delivery date out by exactly those days — never
  pulling a deadline inwards, and never returning a date that is already past.
- **Pre-flight checklists.** Six per-profession templates ship with the plugin
  (developer, designer, photographer, writer, consultant, general) and are seeded
  on first use of the Projects tab. Each template is an editable list of
  deliverables; ticking them is what stands between you and sending the files.
- **Stage history** records who moved what and when, giving you an auditable
  trail of the client's own delays.

### 2. Smart financials

- **Rate engine.** Feed in living costs, taxes, software, savings and a realistic
  billable target, and get back the **baseline hourly rate**, the **floor rate**
  below which a project loses money, the rate your real utilisation implies, and
  the **minimum project price**. The floor is derived from survival costs only,
  so the gap between floor and baseline is visibly your savings target.
- **Quote calculator.** For any number of hours it shows the at-floor and
  at-baseline prices, a recommended price that never dips below the baseline or
  the project minimum, and the margin over the floor.
- **Real hourly rate analyser.** `money received ÷ real hours spent` — including
  revisions, calls and email — graded `excellent / healthy / thin / loss` against
  your baseline, so you can see which clients are actually profitable.
- **Split milestone & escrow log.** Deposit money is cash in hand but _not_ your
  income: it stays in **Unearned Retained Cash** until the project that it funds
  reaches hand-over, which is what stops you spending a deposit before earning
  it. Realized income and unearned cash always add back to the cash received.
- **Estimated tax pocket.** Every paid invoice reserves a configurable
  percentage into a **Tax Vault** view, so tax season is a lookup, not a shock.
- **Retainer manager.** Fixed monthly hours with optional rollover, showing hours
  available, percentage used and an explicit overspent flag rather than a
  silently negative number.
- **Software subscription audit.** Every tool normalised to a monthly cost
  (weekly × 4.33, quarterly ÷ 3, yearly ÷ 12) with keep / review / cancel
  verdicts driven by essential-ness and real usage, plus the honest annual burn.

### 3. Daily work operating system

- **Daily 3.** The board restricts itself to three high-impact items; everything
  else waits in the backlog until the three are closed.
- **Deep-work timer** with configurable work/rest intervals. Tracked minutes bind
  to the active project and are stored as focus sessions, which is what feeds the
  capacity heatmap and the work log.
- **Do-not-disturb trigger.** While a session runs the app goes quiet, and the
  machine can follow it: your own command runs on the start edge and your
  "come back" command on the stop edge. See section 14.
- **Work log & auto-standup.** The day's closed tasks, focus and billable minutes
  are rolled into a one-paragraph summary ("what I completed / what's next")
  written to be pasted straight into a client message.

### 4. Client communication

- **Canned scripts**, one-click copy, covering the conversations nobody enjoys:
  deposit request, scope-creep pushback, late-feedback notice, kickoff
  confirmation, draft-delivery request and a three-level overdue-invoice
  escalation (gentle → formal → work stopped). Nine scripts ship in English and
  the same nine in Arabic, and the seeder dedupes on `title + language` so it is
  safe to run again.
- **Private client notes.** Working-style and red-flag fields per client — slow
  payer, prefers Loom over email, only reachable in a given timezone — stored
  alongside the client record and never exposed in anything you send.

### 5. Burnout defense

- **Capacity heatmap.** Booked minutes against a personal daily maximum, read per
  day as `clear` (under 85 %), `amber` (85–100 %) or `red` (over 100 %), with the
  number of minutes overbooked.
- **Blackout dates & vacation shield.** Blackouts match inclusively on both ends
  and the scheduler refuses to propose a start date inside one — or on a weekend,
  or on a day that is already full. If nothing fits it returns nothing rather than
  promising a date it cannot keep.

### 6. Local notes

- **Per-project scratchpad** for links (Figma, GitHub, Dropbox), brand hex codes,
  credentials references and the throwaway notes that currently live in
  seventeen text files.

### 7. Desktop perks

These three are **core-shell** features rather than plugin-handler features, so
they live in `src/main/` and are gated on the plugin being enabled. They stay
dormant on an install where `personal` is off.

- **System tray quick-widget.** A tray icon shows the running focus timer and the
  next delivery deadline, refreshing every 30 seconds. The menu carries the
  active task, a countdown to the soonest open deadline and the quick-capture
  and quit actions. Overdue deadlines are deliberately _not_ hidden — the widget
  is the last warning before a client notices — and the countdown uses
  `adjustedDueDate`, so the client-delay tracker and the tray can never
  contradict each other.
- **Global quick capture (`Ctrl/Cmd + Shift + Space`).** Registers a
  system-wide accelerator that, from any application, opens a three-tab panel
  for logging a change request, recording an expense, or starting a focus timer
  without leaving what you were doing. The capture panel is only mounted when
  the plugin is enabled.
- **Encrypted backups (AES-256-GCM).** The existing backup engine gains optional
  encryption, so a backup copied into Dropbox / iCloud / OneDrive is useless
  without the passphrase and no third-party service ever sees the key. The key is
  derived with scrypt (`N=32768, r=8, p=1`); a fresh 16-byte salt and 12-byte IV
  are generated per backup, and GCM authentication covers both the ciphertext and
  the tag, so a tampered file is rejected rather than restored.

  The passphrase itself is stored through Electron's `safeStorage` — the OS
  keychain — and never in plain text. Restoring an encrypted backup decrypts the
  whole file **before** the live database is touched, so a wrong passphrase
  leaves your data exactly as it was. If `safeStorage` is unavailable on the
  machine, encryption is reported as unsupported instead of silently producing
  an unencrypted file.

### 8. Sample workspace (seed data)

A fresh install of the plugin is empty, which makes it hard to judge whether the
cash-flow charts, the capacity heatmap or the escrow split are saying anything
useful. The sample workspace loads a complete, self-consistent solo-freelancer
dataset — five clients, seven projects spread across every pipeline stage, ten
invoices with deposits and balances, payments, expenses, subscriptions, a monthly
retainer with rolled-over hours, work logs, focus sessions, the capacity heatmap,
blackout dates and the script playbook.

It is seeded from the repository, exactly like every other plugin's sample data:

```bash
npm run prisma:seed:personal            # seed (refuses if the workspace has rows)
npm run prisma:seed:personal -- --force # clear the previous sample rows, then seed
npm run prisma:seed:personal -- --status  # report what is loaded, change nothing
npm run prisma:seed:personal -- --clear   # remove only the sample rows
```

- **There is no in-app sample-data button.** The dataset lives in the codebase
  ([`handlers/demo.ts`](../../src/plugins/personal/handlers/demo.ts)) and the
  CLI entry point is
  [`prisma/seeds/personal/seed.ts`](../../prisma/seeds/personal/seed.ts), so the
  demo workspace is reproducible without shipping a mutation UI to end users.
- **Nothing is ever silently overwritten.** Seeding is refused unless the
  workspace is empty; the CLI prints the row counts it found and exits with a
  hint to use `--force` instead of clearing your work.
- **Removal only touches sample rows.** The seeder writes a marker note recording
  every id it created; `--clear` deletes exactly those ids, leaf-first so no
  foreign key is dangled, then the marker. Rows you added yourself — even rows you
  added on top of the sample data — are never in range.
- **The CLI tells the truth about what is there.** `--status` prints the total
  rows in the workspace, the sample rows still present, the 23 tables in the
  schema and a per-area breakdown, all read live from the marker rather than from
  a cached count. After a seed it prints a per-table expected/created comparison.
- **Same-name templates are reused, not duplicated.** Checklist templates and the
  rate profile are matched by name, so a row count lower than expected there is
  the designed reuse path; the CLI only warns when the workspace is genuinely
  short of a table's rows.
- **The dataset is deterministic and pure.** `buildDemoDataset(now)` returns plain
  rows keyed by symbolic references and is unit-tested without a database, so the
  numbers the screens display can be asserted (`283` rows across 23 tables, exactly
  three `isDailyThree` tasks, one over-capacity day, one overdue invoice, …).

### 9. Command palette

`Ctrl/Cmd + K` — from anywhere in the plugin, or the **Command palette** button in
the header — opens a single search box over everything the plugin can do. Rows are
grouped into _Go to_ (every tab you have permission for, each labelled with its
`Alt + <n>` shortcut), _Create_ (client, project, change request, waiting log, task,
script, note) and _Actions_ (guide, focus view).

- **Search matches both languages.** Rows match on the localised label, the seeded
  English label and a small keyword list, so typing `help` finds the guide and
  typing `waiting log` finds the waiting-log form even in Arabic.
- **Create rows land on the form.** Picking a _Create_ row switches to its tab and
  opens that tab's create dialog. The intent is parked in module state and claimed
  by the tab, because the tab is often not mounted yet when the row runs.
- **Keyboard first.** `↑`/`↓` move the highlight (wrapping), `Enter` runs, `Esc`
  closes. `Enter` with no matches does nothing rather than closing the palette.

### 10. Saved views and bulk actions

Two habits that save the most repetitive clicking in a long solo week: getting
back to the same filtered list, and acting on many rows at once.

- **Saved views.** The _All tasks_ and _Invoices_ toolbars carry a bookmark
  control. Save the filter you are looking at under a name — _Overdue_,
  _Awaiting deposit_, _This client_ — and it comes back in one click, with the
  active view's name shown on the trigger. Views are namespaced per tab
  (`personal:filterPresets:tasks`, `…:invoices`) and stored in `localStorage`,
  so they survive a restart without touching the database. Saving a name that
  already exists replaces it, so tweaking a view does not leave two near-copies
  behind. Capped at 12 views per tab, 40 characters per name.
- **Bulk task actions.** Every row in _All tasks_ gets a selection toggle, with a
  select-all in the header. A selection bar then appears offering **Complete**,
  **Reopen**, **Pin to Daily 3**, **Unpin**, **Delete** and **Clear**. They run
  through one IPC call (`personal:tasks:bulk`) and report what actually happened:
  deleting three rows that were already gone says so instead of failing.
  - _Pin_ is the exception, because the Daily 3 board is a hard limit: it fills
    the free slots in priority order, then tells you how many rows were skipped
    rather than refusing the whole batch.
  - The selection is pruned whenever the visible rows change, so a filter change
    or a reload can never leave a deleted or hidden row inside the selection.
- **Undo, for the one second of regret.** Completing a task — singly or as a
  batch — floats a strip at the bottom of the window naming what happened and
  offering to reverse it. The offer expires after eight seconds and is consumed
  by the first click, so a stale _Undo_ can never fire against a row that has
  moved on. It is deliberately scoped to the plugin rather than added to the
  shared toast context, which every module uses.

### 11. The invoice money engine

Three money questions that used to be answered by hand — _what does this
discount really cost me?_, _what is late fee on this overdue invoice?_, and
_what should I quote for this?_ — now run through one engine in
`handlers/domain.ts`, reusing the same rate profile the Finance tab already
holds. The renderer never does money arithmetic: it sends inputs over IPC and
renders the returned breakdown.

- **One source of truth for invoice totals.** `invoiceTotals()` computes gross,
  tax and amount due from line items plus a discount. `decorateInvoice()` and
  `syncStatus()` in `billing.ts` both delegate to it, so the invoice list, the
  invoice detail and the tax vault can no longer disagree about what an invoice
  is worth.
- **Discount preview.** The invoice discount dialog runs
  `personal:billing:discountPreview` as you type and shows the effect before you
  save: gross → percent off → early-payment bonus → flat amount → total due, as a
  labelled breakdown. Order of application is fixed, and the early-payment step
  only fires when all four conditions hold (a percent, a window of more than zero
  days, a positive `daysToPay`, and `daysToPay` inside the window). A flat amount
  is floored at zero, so a discount can never push an invoice negative; if a
  refunded or over-paid invoice is being discounted the dialog warns that the
  customer is already overpaid instead of silently under-billing.
- **Late-fee policy and scan.** A new _Late fees_ panel on the Invoices tab edits
  a policy — grace days, percent per period, period length, cap percent and a
  flat fee — and re-scans as you type. The scan returns every non-draft,
  non-void invoice past due, each with its breakdown (`daysLate`, chargeable days,
  prorated periods, percent fee, flat fee, cap applied, new balance) and badges
  for grace, capped and chargeable rows. Percent fees prorate on the exact
  `chargeableDays / periodDays` ratio; the cap is applied before the flat fee, and
  the flat fee is excluded from it. Per-row **Copy reminder** produces a ready
  email (subject, body, breakdown) you can paste into your mail client.
  - The policy is a **preview only** — there is no writable settings store in the
    plugin, so the last-used policy is not persisted. Defaults are 3 grace days,
    2% per 30-day period, flat fee 0, capped at 15%.
- **Price card.** `personal:finance:priceCard` turns the saved rate profile into a
  three-tier card — **standard**, **retainer** (default 10% off) and **rush**
  (default 25% surcharge) — priced off the engine's baseline hourly rate. Each
  tier lists its services with hours, base price and price, its subtotal and its
  total; a tier whose subtotal falls below the engine's minimum project price is
  raised to that floor and says so. Services can be added, renamed, repriced or
  removed live, and the whole card can be copied as plain text to paste into a
  proposal.

New IPC channels: `personal:billing:discountPreview`, `personal:billing:lateFeeScan`
and `personal:finance:priceCard`.

---

### 12. Capability enforcement on the money channels

The plugin registers through `ipcMain.handle` like every other plugin, so it
inherits the **universal permission guard** — `installPermissionGuard()` in
`src/main/ipc/handlers/permissionsGuard.ts` patches `ipcMain.handle` before any
handler is registered and derives its rules from the plugin registry. Every
`personal:*` channel therefore requires `access_personal`, and any channel whose
name looks like a reversal requires the action capability:

| Channel pattern                 | Capability           |
| ------------------------------- | -------------------- |
| `personal:billing:refund*`      | `personal_refund`    |
| `personal:billing:void*`        | `personal_void_sale` |
| anything else under `personal:` | `access_personal`    |

`requireCap()` fails **open** while no user is bound (an unauthenticated desktop
start must not be bricked) and fails closed afterwards, so the guard is real
enforcement only after a login. Because the same handlers are mounted on the
public web bridge, four actions additionally check their capability **inline**,
which makes them independent of whether the guard is installed at all:

| Action                                                | Capability           |
| ----------------------------------------------------- | -------------------- |
| `personal:billing:refundPayment`                      | `personal_refund`    |
| `personal:billing:voidInvoice`, `markStatus` → `void` | `personal_void_sale` |
| `personal:billing:applyDiscount`                      | `personal_discount`  |
| `personal:billing:writeOff`                           | `personal_write_off` |

Two further rules protect what those capabilities buy:

- **`updateInvoice` edits an allow-list, never a payload spread.** Only
  `clientId`, `projectId`, `kind`, `currency`, `amount`, `taxRate`, `issuedAt`,
  `dueAt` and `notes` are copied through. `discount`, `status` and `paidAt` change
  what an invoice is worth or whether it is still alive, so they are refused by
  name with a pointer at the channel that does guard them — a bulk update can no
  longer stand in for a capability-gated action.
- **`recordPayment` requires a positive amount.** Zero, negative and
  non-numeric amounts are rejected before any row is written, so a payment can no
  longer produce a negative tax-vault reservation or a nonsense balance.

**On the web bridge** (`web/server.ts`, the demo site) there is no login, and
`requireCap()` fails open while nobody is bound — which on a public bridge means
it gates nothing. `web/bridge-auth.ts` therefore holds the list of
capability-protected channels (plus `markStatus` with a `void` payload) and the
bridge refuses them with _"Authentication required"_ until someone has signed in
on that process; from then on the universal guard enforces the real capability.
The seeded demo account is `admin`, whose role is a wildcard, so signing in
restores the full feature set. The residual caveat is that the bound user is
process-wide rather than per-request, so this is a deny-list for anonymous
callers rather than per-visitor authorisation.

**Backup paths are validated too.** `backup:restore` and `backup:delete` take a
path from the renderer, so `src/main/backup-path.ts` refuses network/device paths
(a UNC path makes the main process authenticate outbound to an attacker-hosted
SMB share), anything that is not a backup extension, and the live database
itself. Rules live in a dependency-free module so they are unit-tested directly.

---

### 13. Client-facing documents and automatic retainer renewal

Two gaps closed the loop between _recording_ money and _handing something to the
client_: nothing could turn an invoice into a PDF or a statement, and a retainer
only rolled when you remembered to roll it.

**The document renderer.** `handlers/domain.ts` gained a self-contained renderer
that produces **HTML, Markdown and plain text** for an invoice and for a client
statement, plus the file name for each (`INV-2026-0009.html`,
`Statement-ST-2026-0001.html`). It stays pure — no Electron, no Prisma, no i18n —
so every visible string arrives in a `DocumentLabels` object (24 keys) that the
renderer builds from `t()`, and `direction: 'ltr' | 'rtl'` is passed explicitly
for the Arabic interface. Money is formatted with an explicit `en-US` locale
(`USD 1,200.00`) and dates as `Jan 5, 2026`, independent of the app's own
formatters. Every value is escaped before it reaches the HTML, and the discount,
tax, paid and balance rows are omitted when they are zero, so a simple invoice
prints as a simple invoice.

Rendering happens **in the main process** on purpose: the file the operator
downloads is byte-identical to the preview they approved, because both come from
one call. The invoice line carries the gross amount while the totals block shows
what the discount and tax did to it, so `discount + net = subtotal` reconciles and
an invoice can never look like it lost money.

| Channel                            | Purpose                                                   |
| ---------------------------------- | --------------------------------------------------------- |
| `personal:billing:exportInvoice`   | One invoice → `{ fileName, title, html, markdown, text }` |
| `personal:billing:exportStatement` | One client's invoices (+ `from`/`to`) → the same shape    |

A statement takes its reference from the shared invoice counter
(`nextInvoiceNumber(count + 1, 'ST')`, so no separate sequence), excludes voided
invoices, prints every remaining invoice with its total, paid and balance, and
totals those three columns. When no period is given it runs from the client's
first invoice to today.

**The document studio.** The Invoices tab now opens
[`InvoiceDocumentModal`](../../../src/renderer/src/plugins/personal/pages/invoices/InvoiceDocumentModal.tsx)
from any row and from the invoice detail. It has two modes — invoice and
statement (with a from/to range) — a live preview, and five ways out:

- **Copy Markdown** and **Copy plain text** for pasting into an email or a chat.
- **Markdown** and **HTML** downloads via `downloadTextFile()`.
- **Print / Save as PDF**, which opens the rendered HTML in a hidden `blob:`
  iframe and calls `print()` on it, so the browser's own _Save as PDF_ produces the
  document. Print and preview both use `blob:` URLs — never `srcdoc` — because
  `src/renderer/index.html` allows `frame-src blob:`; the preview iframe is
  `sandbox=""`, so the document cannot script the app it is embedded in.

Your own invoicing identity (business name, detail line, email) is edited in the
same dialog and persisted **locally** in `localStorage` under
`personal:documentIssuer`, debounced by 400 ms, and normalised on read and write so
a hand-edited entry can never break an export. It is not a business record, so it
deliberately did not earn a schema migration.

**Retainer renewal automation.** `planRetainerRenewal()` in `domain.ts` turns a
retainer into a plan: the period that just closed, whether it is due, how many
boundaries were missed, the hours to carry, the hours forfeited and the note
marker. The rules:

- **Catch-up.** A retainer that was not touched for three months reports
  `periodsDue: 3`, advances the period by three boundaries and — if invoicing is
  on — bills three periods, so a quiet quarter does not silently lose revenue.
- **Carry-over, capped.** Only the most recent period's unused hours carry, capped
  at one month's allowance, and only when the contract includes hours at all.
  Everything above the cap is reported as forfeited rather than dropped silently.
- **Idempotency by marker.** Each renewal invoice carries the deterministic note
  `RETAINER-RENEWAL <retainer> <YYYY-MM-DD>` where the date is the period the
  invoice pays for. Before billing, the handler counts invoices with that marker,
  so running the roll twice — or pressing it twice — cannot bill a client twice. A
  second pass reports `already_invoiced`.

| Channel                                   | Purpose                                                               |
| ----------------------------------------- | --------------------------------------------------------------------- |
| `personal:finance:retainers:renewalScan`  | Every active retainer with its plan, the due count and the amount due |
| `personal:finance:retainers:rollRenewals` | Preview (`dryRun`) or apply; optionally raises draft invoices         |

`rollRenewals` runs the same planner for the preview and for the apply, so the
number the dialog promises is the number that runs; the dry run writes nothing but
still reports `wouldInvoice`, and it can be limited to specific `retainerIds`.

**The renewals panel.** A sixth panel on the Finance tab shows a KPI strip (due
now, hours to carry, would-invoice, next boundary), a table of every active
retainer with its period, usage, carry, forfeiture, and amount and a _Due_ /
_Scheduled_ badge — then a _Roll renewals_ dialog that previews the dry run,
lets you choose whether to create draft invoices (which re-runs the preview), and
applies it. After applying, the panel re-scans rather than trusting the response,
and a failed roll surfaces a toast instead of closing as if it had worked.

New IPC channels: `personal:billing:exportInvoice`,
`personal:billing:exportStatement`,
`personal:finance:retainers:renewalScan`,
`personal:finance:retainers:rollRenewals`. For the exact rules, see
`src/test/unit/personalDocuments.test.ts` (29 tests),
`src/test/unit/personalRenewals.test.ts` (40 tests — including the carry-over cap,
multi-period catch-up and the marker check) and
`src/test/unit/components/personalDocumentStudio.test.tsx` (13 tests).

### 14. Quiet mode: the do-not-disturb trigger

The last item of section 3's focus mode. BizFlow cannot switch another
application's focus mode by itself, so the feature has two halves: the app goes
quiet on its own, and it runs **a command you wrote** so your OS shortcut,
launcher script or focus app can follow.

**The app half.** While a session is open, routine toasts are held back —
successes, warnings and info — and a quiet badge appears in the plugin header
next to the command-palette button. **Errors are never held back**, because a
failed save that looks like a success is worse than an interruption. The
held-back count is not dropped either: when the session ends you get one message
saying how many there were.

That is enforced in one place. Every personal screen takes its toasts from
`useQuietToast()` instead of `useToast()`, so the rule lives in a wrapper rather
than at ninety call sites. The quiet-mode diagnostics in the page shell
deliberately use the **raw** toast API: a hook that failed to run must be
reported while the quiet session that triggered it is still open, which is
exactly when the gate is holding messages back.

**The machine half.** Settings live on the Focus tab (below the timer) and in
`localStorage`, not in the database — they describe the machine you are sitting
at, not a business record. Two fields, each run without a shell:

```
Command when a session starts   "C:\Tools\focus-on.exe" --quiet
Command when a session ends     "C:\Tools\focus-off.exe"
```

Both are **edge-triggered**, not poll-triggered. The shell refreshes the running
session on a 15-second timer (a session can start from the tray widget or
another window), and the focus screens refresh straight after starting or
stopping a timer so the machine reacts in the same click — but the command only
runs when `active` actually changes, so a slow poll cannot re-run it every tick.

**Why the command is not a shell string.** `src/main/focus-quiet.ts` is the only
place in the plugin that starts a process, and it treats the stored command as
hostile input:

| Rule                                                                | Why                                                                                                                                                                                                     |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shell: false` always                                               | The string is tokenised by our own quote-aware tokenizer and handed to `spawn` as `file` + `args`, so there is no shell to inject into                                                                  |
| `;` `&` `\|` `>` `<` `$` and backticks are refused                  | They only mean something to a shell, so a command containing one was not the command the operator meant                                                                                                 |
| Shells and re-parsers are refused as the program                    | `cmd`, `powershell`, `pwsh`, `sh`, `bash`, `wscript`, `cscript`, `mshta`, `rundll32`, `regsvr32`, `wsl`, `osascript`, `open`, `explorer` would re-interpret their own arguments and undo the rule above |
| `.bat` `.cmd` `.ps1` `.vbs` `.wsf` `.sh` are refused as the program | Same reason, one step removed: their host would parse them for us                                                                                                                                       |
| A hook that never finishes is killed after 5 s                      | The caller tracks a timer, not a helper script, so a hung command cannot wedge a session                                                                                                                |
| Unbalanced quotes, empty input and > 300 characters are refused     | A half-typed command is a typo, not a request                                                                                                                                                           |

A quoted path with spaces survives as one token — `"C:\Program Files\Focus\focus.exe" --on` —
and a `.lnk` is deliberately **allowed** as the program, because pointing the
feature at your own shortcut is the intended Windows mechanism.

Two structural guards back that up. The channel
(`personal:focus:quietHook`) is registered from the **Electron main process**
(`src/main/index.ts`) and never from the plugin's own registrar, so the bundled
web bridge — which shims `ipcMain` — can never expose it; and the runner refuses
to spawn at all unless `process.versions.electron` is present, so the same code
path in a browser build answers `desktop_only` instead of throwing. Because the
guard patches `ipcMain.handle` globally, reaching the channel still requires
`access_personal`.

Every outcome is a **value, never an exception**: `runQuietCommand` resolves
`{ ok: true }`, or `{ ok: false, reason }` with one of `empty`, `too_long`,
`unsafe_characters`, `unbalanced_quotes`, `blocked_program`, `blocked_extension`,
`desktop_only`, `spawn_failed`, `timeout` or `exit_code`. The panel shows the
reason next to the field, and the shell turns a failed edge into a toast naming
the same reason.

Test the machinery without a runtime: see `src/test/unit/personalQuietHook.test.ts`
(20 tests — every refusal, the spawn arguments, both failure edges, the timeout
kill and the registration gate) and
`src/test/unit/components/personalQuietMode.test.tsx` (20 tests — the settings
survive a corrupt entry, the toast gate, the session edges and the panel).

---

## UI conventions

The plugin runs on the shared primitives but at a tighter density than the rest
of the app, because a solo operator reads thirteen tabs of dense tables in one
sitting. It also carries a small design system of its own under
`pages/components/`, so a new screen is assembled from the same vocabulary as
the existing ones instead of re-inventing rows, headers and KPI bands.

### Layout

- **Tab shell.** Every tab root is `space-y-4 p-4 md:p-5`; the tab strip, its
  index chips and the header live in `pages/index.tsx` and are not re-styled per
  tab.
- **One `PageHeader` per tab.** `PageHeader` owns the title (a `t('pwTab…')`
  key), a one-line description, the tab's icon, and the `actions` slot. Refresh
  buttons, range pickers and primary CTAs belong in `actions`, not in the
  `Toolbar` below — the toolbar is for filters and view switchers only.
- **KPI bands.** Use `MetricStrip` (`size="three" | "four" | "six"`) instead of a
  hand-rolled grid, so every band has the same gutter (`gap-2.5`) and the same
  responsive breakpoints. Wrap it in `KpiSection sectionKey="personal:<tab>-…"`
  when the figures should be hideable.
- **Three tiers of container.** `SectionCard` for a titled block with an icon and
  optional `actions`/`footer`; `FormSection` for a titled group inside a modal;
  and `base.ts`'s `CARD`/`ROW_SHELL` tokens for anything bespoke.

### Type, colour and radii

- **Type scale.** Five tiers only: `text-lg` (18px) for KPI values, `text-base`
  (16px) for the `PageHeader` title, `text-sm` (14px) body, `text-xs` (12px) meta,
  `text-[10px]` badges and `kbd` hints. Nothing in the plugin uses 8, 9, 11 or
  13px.
- **Weights.** `font-semibold` for values, headings and active chips;
  `font-medium` for labels and row titles; plain for meta. There is no
  `font-bold` in the plugin — it reads as shouting at this density.
- **Radii.** `rounded-xl` for cards and overlays (12px, hard-coded in
  `tailwind.config.js`), `rounded-lg` for controls, rows, banners and textareas
  (8px), `rounded-md` for small chips (6px). The command palette is the one
  deliberate `rounded-2xl`, matching the app-wide palette. `rounded-lg`/`md`/`sm`
  all derive from the `--radius` token in `src/renderer/src/assets/main.css` —
  if that token is ever missing, they collapse to square corners app-wide.
- **Colour vocabulary.** Four semantic tones and nothing else: `--accent-text`
  for structural/identity emphasis, `amber` for warnings and guardrails,
  `emerald` for good/complete, `rose` for negative money and over-capacity.
  Field-level validation messages stay `red` so they match the shared
  `FormInput`/`FormTextarea` error styling. Reach for `StatusPill tone=…` rather
  than hand-writing a badge.
- **Shared class tokens** (`pages/components/base.ts`): `CARD`, `CARD_HEADER`,
  `MICRO_LABEL` (uppercase captions only — never a date), `META_TEXT`,
  `TITLE_TEXT`, `ROW_SHELL`, `FOCUS_RING`, `HOVER_ROW`.

### Controls

- **Control size.** `size="sm"` on `Button`, `FormInput` and `CustomSelect` is
  the default choice here (`size="xs"` for in-row and icon-only actions). The
  props are additive: `size="md"` stays the app-wide default everywhere else.
  Measured inside the plugin: buttons land at ~24px (`xs`), 32px (`sm`) and
  40px (`md`), and `FormInput`/`CustomSelect` `sm` fields render ~38px — so the
  dense control radius is `rounded-lg` across all three primitives.
- **Overlays and tables.** Pass `dense` to `Modal`, `ConfirmDialog` and `Table`.
  `Table` forwards it through `TableDensityContext`, so `<Table dense>` is enough
  — individual cells never take a density prop.
- **Modal anatomy.** Body = `space-y-4` of `FormSection`s (`title` uses
  `pwFormBasics` / `pwFormAmounts` / `pwFormSchedule` / `pwFormFlags` /
  `pwFormLinks`), then a single `ModalFooter`: destructive action first via
  `start`, secondary Cancel, primary Save last.
- **Field label.** `mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300`.
  Helper text and hints use `META_TEXT`. Checkbox rows are
  `inline-flex h-7 items-center gap-2` so they line up with inputs.
- **Native checkboxes.** A raw `<input type="checkbox">` keeps `appearance: auto`,
  so author `border-*` and `rounded-*` utilities are inert on it — the browser
  paints its own box. The only effective styling is size plus the accent, hence
  the house pattern `h-4 w-4 accent-[color:var(--accent)]` (add `shrink-0` inside
  a flex row). Do not "fix" a missing dark variant on a checkbox: there is nothing
  to fix, and a `border-slate-300` without a `dark:` sibling there is dead code.
- **Segmented control.** `inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800/60`
  with `inline-flex h-6 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold`
  chips; the active chip is `bg-[color:var(--accent)] text-white shadow-sm`. Add
  `role="tablist"`/`role="tab"`/`aria-selected` when it switches content and
  `role="group"`/`aria-pressed` when it toggles a form mode.
- **Filter chip.** `inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium`
  plus `aria-pressed`, accented with `--accent-line`/`--accent-tint` when active.
- **Warning banner.** `flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700`
  with dark-mode variants and a `h-3.5 w-3.5 mt-0.5 shrink-0` icon. Rose
  banners use the same shape.
- **Icons.** `h-4 w-4` in a `PageHeader`, `h-3.5 w-3.5` inside a `SectionCard`
  title or a button, `h-5 w-5` inside `EmptyState`. Class names, never the
  `size={…}` prop.
- **Lists and rows.** `ListRow` takes `title`/`subtitle`/`icon`/`trailing` props
  and renders a `<button>` when `onClick` is set — never wrap it around another
  button. `KeyValueList` and `Stepper` cover definition rows and multi-step
  flows.
- **Hit targets.** Rows, chips and buttons are ≥22px tall and comfortably wide;
  icon-only buttons use `size="xs"` with both `aria-label` and `title`, not a
  bare icon.
- **RTL.** Use logical utilities (`text-start`, `ms-*`, `me-*`) so the Arabic
  layout mirrors without per-surface overrides.
- **Plugin-local primitives.** `pages/components/` holds the vocabulary the tabs
  share: `PageHeader`, `MetricStrip`, `StatCard`, `SectionCard`, `StatusPill`,
  `FormSection`/`ModalFooter`/`DangerZone`, `Toolbar`, `SearchField`,
  `EmptyState`, `Skeleton`, `ProgressBar`, `BreakdownList`, `ListRow`,
  `KeyValueList`, `Stepper`, `FilterPresets`, `UndoStrip` and
  `PersonalCommandPalette`. Reach for these before inventing a new block.

### Loading and empty states

Both states are the same component, because a panel that flashes "nothing here"
for 200 ms is worse than one that stays quiet.

- **Always pass a shape.** `<EmptyState loading loadingShape="…" />` renders a
  skeleton; pick the shape that mirrors the body it replaces, so the panel does
  not collapse and then jump when data lands. The six shapes live in
  `components/Skeleton.tsx` (`LOADING_SHAPES`) and each also has a standalone
  export for partial bodies:

  | Shape    | Mirrors                                           | Default bulk     |
  | -------- | ------------------------------------------------- | ---------------- |
  | `rows`   | a `ListRow` list (the default)                    | 4 rows           |
  | `cards`  | a stack of authored records                       | 3 cards          |
  | `tiles`  | the capacity heatmap grid                         | 14 tiles         |
  | `lines`  | `BreakdownList` / `KeyValueList` label-value rows | 4 rows           |
  | `detail` | a detail pane: metric band plus supporting rows   | 4 tiles + 3 rows |
  | `text`   | rendered documents and long notes                 | 6 lines          |

- **Announce it once.** `EmptyState` renders `role="status"` with
  `aria-busy="true"` while loading, so screen readers hear the wait. Pass
  `loadingLabel={t('pwLoading')}` when the element only ever loads; omit it when
  the same element also renders the empty state, and never reuse `message` as the
  loading label.
- **Keep the placeholder silent.** The shape root is `aria-hidden` and every
  block is an empty element, so a pulse is never read out. The pulse sits on the
  shape's root rather than on each block, so a panel runs exactly one animation —
  keep it that way when adding a shape.
- **Then the real empty state.** Once loaded, `EmptyState` takes `title` (what is
  missing), `message` (what to do about it, defaulting to a neutral `—`), `icon`
  and `action`, at `size="compact"` for a panel body and the default for a whole
  tab.
- **Do not hand-roll either state.** `personalLoadingStates.test.tsx` pins the
  contract: one announced status, one animated root, no text, no spinner.

### Motion

- **Reuse the app's utilities.** `animate-fade-in` for overlays and popups,
  `animate-scale-up` for panels that grow from a point (command palette, guide,
  `FilterPresets`). There is no plugin-local `@keyframes` and no inline
  transition timing — both would drift from the rest of the app.
- **Overlay pairs.** An overlay fades while its panel scales, and the two
  elements stay separate: see `PersonalCommandPalette.tsx` (overlay `z-[130]`
  carrying `animate-fade-in`, panel child carrying `animate-scale-up`) and the
  guide modal (`z-[120]`). Do not add motion to a third wrapper.
- **Tab changes.** The tab body in `pages/index.tsx` is wrapped in a keyed
  `<div key={activeTab} className="animate-fade-in">`, so switching tabs
  re-mounts the wrapper and replays the fade. Keep the key.
- **Reduced motion is already handled globally.** The
  `@media (prefers-reduced-motion: reduce)` guard in
  `src/renderer/src/assets/main.css` neutralises every animation and transition
  app-wide, including the skeleton pulse — never add a per-component
  `motion-reduce:` variant or a JS media-query check.
- **Transition, don't decorate.** Interactive states (hover, focus, pressed) get
  a short transition; nothing else moves. No bouncing, no parallax, no
  entering-motion on a row that is merely re-rendered.

### Keyboard

| Keys                             | Effect                                                          |
| -------------------------------- | --------------------------------------------------------------- |
| `Alt + 1` … `Alt + 9`            | Open tabs 1–9                                                   |
| `Alt + 0`                        | Open the tenth tab (`invoices`)                                 |
| `Ctrl/Cmd + PageDown` / `PageUp` | Next / previous visible tab (wraps; the only key path to 11–13) |
| `F1`                             | Toggle the workflow guide                                       |
| `Ctrl/Cmd + K`                   | Open the command palette                                        |
| `Esc`                            | Close the guide, then the palette                               |
| `↑` `↓` `Enter`                  | Move the palette highlight, then run the item                   |

- The handler is the single `keydown` listener in `pages/index.tsx`; the tab
  cycling branch sits **above** the `!e.altKey` guard so it is not swallowed.
- **Why `PageUp`/`PageDown` and not `Alt + ←/→`.** `Alt + ←/→` are Chromium's
  own history-back/forward accelerators: they fire even when the handler calls
  `preventDefault()`, which navigated the app away from the plugin. `PageUp` and
  `PageDown` are unclaimed app-wide, and the `Alt + <digit>` pattern matches every
  other plugin in the codebase.
- **Esc and `Ctrl/Cmd + K` are global; tab switching is not.** The overlay keys
  work wherever focus is, but the tab keys go inert when a dialog is open
  (`showGuide`/`showPalette`) or when the caret is in an `input`, `textarea` or
  `select` — otherwise `Alt + 2` would silently swap the tab behind an open form.
  The check is the `ownsScreen` guard in the handler: extend it, don't add a
  second listener.
- **`Ctrl/Cmd + K` is claimed from the app palette while the plugin is open.**
  `App.tsx` binds the same chord app-wide, and its listener was registered first,
  so pressing the key inside the plugin used to open two palettes at once — with
  focus in the wrong one. The plugin's listener therefore registers in the
  **capture phase** (`addEventListener('keydown', handleKeyDown, true)`) and calls
  `stopPropagation()` for that chord only: the plugin palette opens, and the
  app-wide palette still works on every other route. Keep the
  `stopPropagation()` scoped to that branch — swallowing the event for `Esc`
  would break the close handler of the shared `Modal`.
- **AltGr is safe.** The `Alt + <digit>` branch bails when `ctrlKey` or `metaKey`
  is also held, so layouts that synthesise characters with `Ctrl + Alt` never
  trigger a tab switch mid-word.
- **Document new shortcuts in three places.** The guide's shortcut list in
  `pages/index.tsx`, the `aria-keyshortcuts` attribute on the element the key
  targets, and the table above (plus an i18n key in `en.part.10.ts` /
  `ar.part.10.ts`, which a parity test enforces).

---

## Where to find code

- Plugin entry & schema: `src/plugins/personal/index.ts`, `src/plugins/personal/schema.prisma`
- Handlers (13 registrars): `src/plugins/personal/handlers/`
- Pure business logic, no Electron/Prisma imports: `src/plugins/personal/handlers/domain.ts`
- Shipped templates & taxonomy: `src/plugins/personal/handlers/templates.ts`
- Sample-workspace dataset (pure, no Prisma): `src/plugins/personal/handlers/demo.ts`
- Sample-workspace seeder (Prisma + marker): `src/plugins/personal/handlers/demo-seed.ts`
- CLI seed entry point: `prisma/seeds/personal/seed.ts` (`npm run prisma:seed:personal`)
- Preload API surface: `src/plugins/personal/preload.ts`
- Renderer page & tabs: `src/renderer/src/plugins/personal/pages/index.tsx`
- Plugin-local design system: `src/renderer/src/plugins/personal/pages/components/`
  (`base.ts` class tokens; `PageHeader`, `MetricStrip`, `StatCard`, `SectionCard`,
  `StatusPill`, `FormSection`/`ModalFooter`/`DangerZone`, `Toolbar`, `ListRow`,
  `KeyValueList`, `Stepper`, `BreakdownList`, `EmptyState`, `ProgressBar`)
- Command palette: `src/renderer/src/plugins/personal/pages/components/PersonalCommandPalette.tsx`,
  with the cross-tab intent bus in `src/renderer/src/plugins/personal/pages/hooks/useIntent.ts`
- Saved filter views: `src/renderer/src/plugins/personal/pages/components/FilterPresets.tsx`
  and `…/pages/hooks/useFilterPresets.ts`
- Undo strip: `src/renderer/src/plugins/personal/pages/components/UndoStrip.tsx`
  and `…/pages/hooks/useUndoBar.ts`
- Unit tests for the domain rules: `src/test/unit/personalWorkOs.test.ts`
- Unit tests for the sample dataset & seeder: `src/test/unit/personalDemoData.test.ts`
- Unit tests for the command palette: `src/test/unit/components/personalCommandPalette.test.tsx`
- Unit tests for saved views: `src/test/unit/personalFilterPresets.test.ts`,
  `src/test/unit/components/personalFilterPresets.test.tsx`
- Unit tests for bulk task actions: `src/test/unit/personalTaskBulk.test.ts`
- Unit tests for the undo bar: `src/test/unit/personalUndoBar.test.ts`,
  `src/test/unit/components/personalUndoStrip.test.tsx`
- Invoice money engine (totals, discounts, late fees, price card) and its three
  IPC handlers: `src/test/unit/personalMoney.test.ts`
- Money-panel components (`BreakdownList`, `LateFeePanel`, `PriceCardPanel`):
  `src/test/unit/components/personalMoneyPanels.test.tsx`
- Document renderer & retainer renewal planner (pure): `src/plugins/personal/handlers/domain.ts`
  (`renderInvoiceDocument`, `renderStatementDocument`, `planRetainerRenewal`)
- Document studio dialog: `src/renderer/src/plugins/personal/pages/invoices/InvoiceDocumentModal.tsx`;
  issuer identity in `…/pages/hooks/useIssuerProfile.ts`; `downloadTextFile()` /
  `printHtml()` in `…/pages/utils.ts`
- Renewal panel: `src/renderer/src/plugins/personal/pages/finance/RenewalsPanel.tsx`
- Unit tests for documents and renewals: `src/test/unit/personalDocuments.test.ts`,
  `src/test/unit/personalRenewals.test.ts`; the two dialogs are covered by
  `src/test/unit/components/personalDocumentStudio.test.tsx`
- Capability & validation regressions for the billing channels:
  `src/test/unit/personalBillingSecurity.test.ts`
- The universal guard's coverage of the plugin's channels:
  `src/test/unit/permissionsGuardCoverage.test.ts`; the web-bridge gate is
  `web/bridge-auth.ts`, tested by `src/test/unit/bridgeAuth.test.ts`

Desktop perks (core shell, gated on the plugin):

- Tray widget: `src/main/tray.ts`; pure status maths in `src/main/tray-status.ts`
  (tested by `src/test/unit/trayStatus.test.ts`)
- Global shortcut: `src/main/quick-capture.ts`
- Capture panel: `src/renderer/src/components/QuickCapture.tsx`
- Backup encryption: `src/main/backup-crypto.ts` (tested by
  `src/test/unit/backupCrypto.test.ts`); caller-supplied paths are validated by
  `src/main/backup-path.ts` (tested by `src/test/unit/backupPath.test.ts`); the
  backup handlers and the Settings UI that drive it live in
  `src/main/ipc/handlers/backup.handlers.ts` and
  `src/renderer/src/pages/Settings/BackupSettings.tsx`
- Tray/shutdown wiring: `src/main/index.ts`; the `quickCapture` preload bridge in
  `src/preload/index.ts`

Quiet mode (the do-not-disturb trigger):

- Command parsing, spawning and the IPC channel: `src/main/focus-quiet.ts`,
  registered from `src/main/index.ts`; bridged through the `focus.quietHook`
  binding in `src/plugins/personal/preload.ts`
- Settings, reason taxonomy and the pure tokenizer contract:
  `src/renderer/src/plugins/personal/pages/hooks/useQuietMode.ts`
- Runtime store, toast gate, session-edge applier and hook runner:
  `…/pages/hooks/useQuietRuntime.ts`
- Settings panel (mounted by the Focus tab): `…/pages/focus/QuietModePanel.tsx`;
  the quiet badge and the 15-second session poll live in `…/pages/index.tsx`
- Tests: `src/test/unit/personalQuietHook.test.ts`,
  `src/test/unit/components/personalQuietMode.test.tsx`

The `domain.ts` / `templates.ts` / `utils.ts` files are deliberately **not**
registered as handlers — they hold the rules that the handlers call, and keeping
them dependency-free is what lets the test above import them directly.

---

## Data model

23 models, all prefixed `Personal`: `Client`, `Project`, `Deliverable`,
`StageEvent`, `ChangeRequest`, `WaitLog`, `ChecklistTemplate`, `ChecklistItem`,
`Task`, `FocusSession`, `WorkLog`, `Invoice`, `Payment`, `Expense`,
`Subscription`, `Retainer`, `RetainerUsage`, `RateProfile`, `TaxVaultEntry`,
`Blackout`, `Workload`, `Script` and `Note`.

The models are standalone — no relation to the shared `User` model — so the
plugin can be enabled alongside any mix of the vertical plugins.

> **Naming note:** `PersonalProject.notes` is a free-text `String?` field used by
> the UI. The `PersonalNote` relation is therefore exposed as `noteEntries`; a
> scalars-and-relation name collision on the same model is a Prisma validation
> error, not a warning.

---

## Seeding behaviour

Nothing is written at migrate time. Defaults are seeded lazily through
idempotent IPC calls, which is why a fresh install starts empty and fills in as
you use it:

- `personal:playbook:seedDefaults` — run from the Playbook tab's seed button.
- `personal:meta:seedChecklists` — invoked automatically by the Projects tab the
  first time it finds no checklist templates, then the list is reloaded.

Both taxonomy seeders are safe to call repeatedly: they skip records that already
exist.

The **sample workspace** is deliberately not exposed over IPC. It is a repo-level
seed, run with `npm run prisma:seed:personal` (`--force` to replace a previous
batch, `--clear` to remove it, `--status` to inspect it), so no end user can
trigger a bulk write from the UI. The logic the CLI calls lives in
`src/plugins/personal/handlers/demo-seed.ts`: `seedDemoData` refuses a non-empty
workspace unless it is forced, and `clearDemoData` deletes only the ids recorded
in the marker note — a batch, not an idempotent default. `demoStatus` reports
whether sample rows are present, when they were loaded, how many rows the
workspace holds in total and how many rows per table the marker accounts for.

---

## Adding screenshots

Place production screenshots in `docs/assets/personal/` as `overview.png`,
`projects.png`, `finance.png` and `capacity.png`. Use PNG or JPG and keep sizes
under 400 KB.
