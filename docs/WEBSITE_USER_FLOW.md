# BizFlow customer journey — website, demo, trial and licence

This document describes the path a new customer actually walks, end to end, and
names the URL, endpoint and app state at every step so the journey can be
verified rather than described.

The promise the whole flow is built around:

> **Try the full app in a browser, download it and work for 14 days, then ask
> for a licence key when you are ready. No card, no pre-sales, no sales call —
> at any step.**

Everything below is implemented; `apps/website/tests/user-flow.test.ts` asserts
the parts that are easy to break by accident (the demo-first entry point, the
trial copy, the absence of a required checkout, the licence states).

## The journey at a glance

```mermaid
flowchart TD
    A["Landing page<br/>/"] -->|"Try free in browser"| B["Live demo<br/>/app"]
    A -->|"Modules &amp; Pricing"| C["Module detail<br/>/plugins/[id]"]
    B --> C
    C -->|"Need custom features? →"| D["Custom feature request<br/>/#request"]
    A -->|"Need custom features? →"| D
    C -->|"Download"| E["Download page<br/>/download"]
    D -->|"estimate by email"| E
    E --> F["Installer (Windows / macOS / Linux)"]
    F --> G["First launch<br/>14-day trial starts automatically"]
    G -->|"trial ends or ready to buy"| H["Ask for a licence<br/>in-app  ·  /support  ·  /account"]
    H --> I["Key emailed after admin review"]
    I --> J["Activate in the app<br/>POST /api/license/activate"]
    J --> K["Status: active<br/>revalidated every 30 days"]
    G -.->|"optional: pay by card now"| L["/api/checkout → key emailed instantly"]
    L --> J
```

Nothing in the solid arrows requires a payment method, an account, or a
conversation with a human before the software is running on the customer's
machine.

## Stage by stage

| # | Stage | Where | What the customer sees | What backs it |
|---|-------|-------|------------------------|---------------|
| 0 | Land | `/` | Hero offers three entries: **Try free in browser**, *Modules & Pricing*, *Need custom features?* | `components/landing/Hero.tsx` |
| 1 | Try the demo | `/app` | The **full desktop app in the browser** with demo data — the real UI, not screenshots | `app/app/page.tsx` → `components/desktop/Desktop` |
| 2 | Evaluate a module | `/plugins/[id]`, `#plugins` | What the module includes, plus the shared back office (HR, finance, expenses, reports, roles) | `components/landing/Plugins.tsx` |
| 3 | Decide about custom features | `/#request` | Request form with a **live itemised estimate** (scope, complexity, rush, support) and an ETA | `components/landing/RequestForm.tsx` → `POST /api/requests` |
| 4 | Download | `/download` | Pick module + OS (`windows` / `mac` / `linux`), installer starts. Deep links: `/download?module=<id>&os=<os>&autoStart=1` | `app/api/download/route.ts` |
| 4b | Get past the OS warning | `/download` (step 3) | Per-OS instructions for the unsigned-build warning: SmartScreen *More info → Run anyway*, macOS *Privacy & Security → Open Anyway*, Linux `chmod +x` | `app/download/page.tsx` (`FIRST_RUN`) |
| 5 | First launch | Desktop app | *"First launch starts a 14-day free trial. No licence key needed yet."* Trial clock is created and mirrored on first run | `main/ipc/handlers/license.handlers.ts` (`TRIAL_PERIOD_MS`) |
| 6 | Work normally | Desktop app | The whole product is usable; the only difference is the trial counter | licence status `trial` |
| 7 | Ask for a licence | In-app licence screen · `/support` · `/account` | Customer sends name, business, requested module; the app attaches device name and fingerprint automatically | `POST /api/license/request` (rate limited 8/h per IP) |
| 8 | Key issued | Email | An admin reviews the request in `/admin` and mints a `BIZ-…` key; the key is emailed | `app/api/admin/licenses` |
| 9 | Activate | Desktop app | Paste the email + key → device is bound to the licence | `POST /api/license/activate` |
| 10 | Stay activated | Desktop app | Status `active`; the app silently revalidates with `POST /api/license/validate` | see the states below |

### Optional accelerator, not a required step

Payment by card exists (`POST /api/checkout` → Stripe → `POST /api/webhooks/stripe`
mints the key immediately) for a customer who does **not** want to wait for an
admin. It is a shortcut on the arrow marked *optional* in the diagram: skipping
it changes the delivery time of the key, not the ability to run the software.

There is deliberately **no `/checkout` page in the free path** — in fact there is
no `app/checkout/page.tsx` at all, only `checkout/success` and `checkout/cancel`,
so no visitor can be pushed into a payment form while browsing. The load harness
records this as `GET /checkout → 404` so that adding a page there is noticed.

### The one step the operating system inserts on purpose

None of the installers are signed with commercial certificates yet, so every
platform refuses the first launch: Windows shows *"Windows protected your PC"*,
macOS says it cannot verify the developer (the `.dmg` is built with
`CSC_IDENTITY_AUTO_DISCOVERY=false`), and a Linux AppImage arrives without the
execute bit. That is a wall between a visitor who already decided to try the
product and the product itself, and left unexplained it looks like malware.

`/download` therefore renders an OS-aware third step with the exact click path
per platform, and states plainly that the warning is about the publisher, not
the download. Until real certificates are bought the honest instruction is the
best available answer; `tests/user-flow.test.ts` fails if the guidance is
removed for any OS.

## Licence states the customer can be in

The desktop app is the source of truth for its own device; the server is only
consulted for activation and revalidation.

| Status | Meaning | Recovery |
|--------|---------|----------|
| `trial` | Inside the 14-day window since first launch on this device | Nothing to do |
| `trial_expired` | 14 days are up, no key activated yet | Request a licence, then activate |
| `active` | Key activated and the last revalidation is inside the 30-day window | Automatic |
| `grace` | A revalidation was due and the machine was offline | Works for up to 14 days, warns, retries every 6 h |
| `expired` | Missed revalidation beyond the grace period, or the server said `valid:false` | Reconnect, or contact support |

Revalidation details, so an offline shop is never locked out by accident:

- **Interval:** 30 days from the last successful check.
- **Sweep:** a running app re-checks the due date every 6 hours (cheap when it is
  not due), instead of only once per app start.
- **Lead:** checks start 3 days early, and every success rolls the window
  forward, so a daily user is always refreshed long before grace.
- **Grace:** 14 days of full function after a missed check.
- **Tolerance:** three consecutive `valid:false` answers are needed before the
  local activation is cleared, so a transient server hiccup cannot wipe a paying
  customer's licence.
- **Clock tampering:** a high-water mark is persisted hourly, so winding the
  system clock back does not extend the trial or skip revalidation.
- **Moving device:** the licence binds one device at a time; a device-transfer
  request binds the new fingerprint to the same key.

## Measuring this journey

The `user-journey` scenario in the load harness (`scripts/perf/scenarios.mjs`)
replays exactly the eight requests in stages 0-7 plus activation:

```
landing → demo → module → pricing → download → support → activate → account
```

Its reported p95 is literally "how long the whole journey takes a real visitor",
and each step is reported separately so a slow step is attributable. See
[PERFORMANCE_TESTING.md](./PERFORMANCE_TESTING.md) for the harness and the
measured numbers.

## Measuring the funnel

Speed is only half the story: a fast journey that nobody completes is still no
revenue. The site therefore reports each step below, and the whole set is
switched on by **two environment variables** — `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`
(cookieless, recommended) and/or `NEXT_PUBLIC_GA_ID`. Until one of them is set,
`ANALYTICS_ENABLED` is `false`, no script loads, **no consent banner renders**,
and every `track()` call is a no-op.

| # | Funnel step | Event | Properties | Where it is fired |
|---|-------------|-------|------------|-------------------|
| 0 | Landed | *(pageview — provider-side)* | — | `/` |
| 1 | Opened the demo | `demo_open` | — | `components/desktop/Desktop.tsx` |
| 2 | Explored a module | `demo_module_view` | `module` | `components/desktop/Desktop.tsx` |
| 3 | Asked for custom features | `custom_request_submitted` | `type, moduleId, complexity, rush, support, notified` | `components/landing/RequestForm.tsx` |
| 3b | Request failed | `custom_request_failed` | `type, complexity` | same |
| 4 | Asked for a licence | `support_ticket_submitted` | `category, priority` | `components/support/SupportTicketForm.tsx` |
| 4b | Ticket failed | `support_ticket_failed` | `category` | same |
| 5 | Started a download | `download_start` | `module, os` | `components/DownloadButton.tsx` |
| 5b | Download deep-link / fallback | `download_request`, `download_fallback` | `module, os` | same |
| 6 | Optional: paid by card | `checkout_start`, `checkout_redirect`, `checkout_fallback` | `item` | `components/BuyButton.tsx` |

Two details matter more than the rest:

- **`notified` on `custom_request_submitted`.** The request form is the highest
  value lead on the site, and the API returns whether the notification email
  actually left the server. Charting the share of `notified: false` turns a
  silent mail outage into a visible number instead of a customer who asked for a
  quote and never heard back. Verified against the live site: the transport falls
  back to direct-to-MX on port 25 from the VPS, which many providers block and
  which has no SPF/DKIM alignment, so it is worth sending one real request and
  confirming where it lands before spending on traffic.
- **No event fires without consent.** `getConsent() !== "granted"` returns early
  in `src/lib/analytics.ts`, and the banner only renders when a provider is
  configured. Declining analytics never disables a feature.

`apps/website/tests/funnel-events.test.ts` asserts that each step still reports
itself, that `track()` is gated on consent, and that the provider loader stays
dormant when nothing is configured — so a refactor cannot quietly drop a step
out of the funnel.
