/**
 * Help content for the in-app Help Centre.
 *
 * Written for the person behind the counter, not for a developer. Anything
 * described here must match what the app actually does — if a screen is renamed,
 * the string is renamed with it.
 *
 * `contact` is an interactive block: HelpCentre renders it with the live Device
 * ID and a copy button.
 *
 * The Arabic translation lives in `helpContent.ar.ts` and mirrors this file's
 * structure exactly (same ids, icons, anchors and key combos) so switching
 * language never breaks deep links, search or the guided tour. Read the content
 * through `getHelpContent(language)` rather than importing the arrays directly.
 */

import { HELP_SECTIONS_AR, HELP_TOUR_STEPS_AR } from './helpContent.ar'
import { SUPPORT_EMAIL } from './support'

export type HelpIcon =
  | 'rocket'
  | 'book'
  | 'key'
  | 'lifebuoy'
  | 'wrench'
  | 'database'
  | 'keyboard'

export type HelpBlock =
  | { kind: 'text'; text: string }
  | { kind: 'steps'; title?: string; steps: { title: string; text: string }[] }
  | { kind: 'list'; title?: string; items: string[] }
  | { kind: 'callout'; tone: 'info' | 'tip' | 'warning'; title?: string; text: string }
  | { kind: 'keys'; title?: string; keys: { combo: string; text: string }[] }
  | { kind: 'contact' }

export interface HelpSection {
  id: string
  title: string
  summary: string
  icon: HelpIcon
  keywords: string[]
  blocks: HelpBlock[]
}

export { SUPPORT_EMAIL }

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Your first 30 minutes',
    summary: 'Set up your business, add a product and ring up your first sale.',
    icon: 'rocket',
    keywords: [
      'setup', 'start', 'begin', 'new', 'install', 'configure', 'store',
      'currency', 'tax', 'first', 'onboard',
    ],
    blocks: [
      {
        kind: 'text',
        text: 'BizFlow runs on this computer, not in the cloud. Everything you enter is stored here, so you can keep selling when the internet drops. It only needs a connection to activate your licence and to re-check it every so often.',
      },
      {
        kind: 'steps',
        title: 'Set up the basics',
        steps: [
          {
            title: 'Tell BizFlow about your business',
            text: 'Settings, then General. Fill in your store name, phone, currency and timezone. These details print on every receipt, so it is worth getting them right before you sell anything.',
          },
          {
            title: 'Set your tax and receipt layout',
            text: 'Settings, then Tax & Receipt. Set your tax rate and choose what appears at the top and bottom of a receipt. This page is also where the receipt printer is set up.',
          },
          {
            title: 'Add your first product',
            text: 'Commerce, then Products & SKUs. Add a product with a name, a price and its barcode. If you want a warning before you run out, set a low-stock level too.',
          },
          {
            title: 'Ring up a sale',
            text: 'Commerce, then POS Touch Register. Tap or scan products into the cart, then take payment. Stock goes down and the receipt prints by itself.',
          },
          {
            title: 'Give your team their own logins',
            text: 'Settings, then Users. Each person gets their own account, so a cashier does not need to see your profit margins or change prices.',
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'One shortcut worth learning now',
        text: 'Ctrl + K opens the command palette from anywhere in the app. Start typing the name of a page and press Enter — it is much faster than hunting through the sidebar.',
      },
      {
        kind: 'list',
        title: 'Worth doing in your first week',
        items: [
          'Turn on automatic backups (Settings, then Backup). Do this before you have data you care about.',
          'Set low-stock levels on the lines you sell most, so you reorder in time.',
          'Add your regular customers, so credit, balances and receipts are attached to a person.',
          'After one day of real selling, open Reports and check the totals match your till. If they do not, better to find out now than in a month.',
        ],
      },
    ],
  },

  {
    id: 'using-bizflow',
    title: 'How to use BizFlow',
    summary: 'Modules, selling, stock, customers and the reports worth checking.',
    icon: 'book',
    keywords: [
      'modules', 'pos', 'sell', 'sale', 'inventory', 'stock', 'products',
      'customers', 'credit', 'reports', 'discount', 'refund', 'payment',
      'suppliers', 'expenses', 'basics', 'how to',
    ],
    blocks: [
      {
        kind: 'text',
        text: 'BizFlow is built from modules, and the ones you have licensed appear in the left sidebar. A module you have not licensed simply is not there — nothing is hidden from you. Dashboard, Employees, Reports, Finance and Settings are shared by every module.',
      },
      {
        kind: 'steps',
        title: 'Choosing the right module',
        steps: [
          {
            title: 'Commerce — retail and general shops',
            text: 'The register, products, stock, customers and credit, suppliers and expenses. This is the one most businesses use.',
          },
          {
            title: 'Bakery, Coffee Shop and Restaurant',
            text: 'Selling flows shaped around production, tables and quick tickets, rather than a plain retail checkout.',
          },
          {
            title: 'Pharmacy, Clinic and Vet Clinic',
            text: 'Batches and expiry dates, prescriptions, and patient or animal records alongside the usual selling.',
          },
          {
            title: 'Gym',
            text: 'Memberships, plans and check-ins for a recurring-revenue business.',
          },
          {
            title: 'Warehouse',
            text: 'Stock held across locations, with transfers and audits.',
          },
          {
            title: 'Moving between them',
            text: 'Use the module switcher in the sidebar. Your data is shared, so switching module does not lose anything.',
          },
        ],
      },
      {
        kind: 'steps',
        title: 'Ringing up a sale',
        steps: [
          {
            title: 'Open the register',
            text: 'Commerce, then POS Touch Register. For a single item at a fixed price, Turbo QuickSale is quicker.',
          },
          {
            title: 'Build the cart',
            text: 'Scan a barcode or tap the product. The scanner behaves like a fast keyboard, so it needs the cursor to be in a search or barcode field first.',
          },
          {
            title: 'Apply a discount, if your role allows it',
            text: 'Discounts are capped in Settings, then Tax & Receipt. If a discount needs a reason, BizFlow will ask for one and record it against the sale.',
          },
          {
            title: 'Take payment',
            text: 'Choose cash, card or another method. For cash, type the amount handed over and BizFlow works out the change.',
          },
          {
            title: 'Finish',
            text: 'Stock is deducted automatically, the sale appears under Sales & Orders, and the receipt can print or be emailed.',
          },
        ],
      },
      {
        kind: 'list',
        title: 'Inventory, in plain terms',
        items: [
          'Products & SKUs is your catalogue — what you sell and what it costs you.',
          'Stock & Audits is the count — what you actually have on the shelf right now.',
          'Stock changes on its own with every sale, refund and supplier delivery. You only need to touch it when something is wrong: breakage, a miscount, or stock arriving.',
          'When you do adjust stock, give a reason. It keeps the audit trail honest and explains the difference to whoever looks later.',
          'Selling from more than one place? Branches & Stores keeps each location\'s stock separate.',
        ],
      },
      {
        kind: 'list',
        title: 'Customers and credit',
        items: [
          'Add a customer to attach a sale to a person. That is what makes credit, receipts and purchase history possible.',
          'A customer profile shows their balance and everything they have bought.',
          'Deposits and installments are set up from the payment step of a sale.',
        ],
      },
      {
        kind: 'list',
        title: 'The reports worth checking weekly',
        items: [
          'Reports shows revenue, profit and margins. Profit is calculated from your cost prices, so if those are missing or out of date, your profit will look better than it really is.',
          'The low-stock and out-of-stock lists are your reorder list.',
          'Expenses live under Commerce and feed the Finance pages. Skip them and your profit is overstated.',
        ],
      },
    ],
  },

  {
    id: 'license',
    title: 'Licence, trial and activation',
    summary: 'The free trial, activating this device, and the monthly check.',
    icon: 'key',
    keywords: [
      'license', 'licence', 'activate', 'activation', 'trial', 'free', 'key',
      'expired', 'expire', 'renew', 'revalidate', 'device id', 'code',
      'grace', 'offline', 'locked',
    ],
    blocks: [
      {
        kind: 'list',
        title: 'How the licence works, end to end',
        items: [
          'Every new install starts a 14-day free trial. No key, no sign-up, no card. A badge in the corner counts the days down.',
          'When the trial ends, the app shows an activation screen instead of your data. Nothing is deleted — everything is still there and reappears the moment you activate.',
          'You send us your Device ID, we send you a licence key, you paste it in. That is the whole process.',
          'After activation, BizFlow re-checks your licence online roughly once every 30 days.',
          'If the computer is offline when that check is due, the app keeps working for a further 14 days while it waits. A machine that never sees the internet runs for up to 44 days between checks before it asks you to reconnect.',
        ],
      },
      {
        kind: 'steps',
        title: 'Activating this device',
        steps: [
          {
            title: 'Get your Device ID',
            text: 'The activation screen shows it at the bottom. Open the Contact support section of this help panel and it will copy the Device ID for you.',
          },
          {
            title: 'Send it to us',
            text: `Email it to ${SUPPORT_EMAIL}. We reply with your licence key, usually the same working day.`,
          },
          {
            title: 'Enter your details',
            text: 'On the activation screen, type the email address you bought with and the key exactly as sent. It looks like BIZ-XXXXX-XXXXX-XXXXX-XXXXX. The dashes matter.',
          },
          {
            title: 'Press Activate this device',
            text: 'The app checks the key with our server and unlocks straight away. If it fails, it tells you why — a mistyped key and no internet connection are the two usual causes.',
          },
          {
            title: 'You are done',
            text: 'The device stays activated. You will not need the key again unless BizFlow moves to a different computer.',
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'warning',
        title: 'A licence is tied to one device at a time.',
        text: 'Your key activates the computer whose Device ID you sent us. If you replace that computer, ask us to move the licence across — there is no charge, we just need the new Device ID.',
      },
      {
        kind: 'list',
        title: 'If the app says Revalidation overdue',
        items: [
          'It means the 30-day check has not been able to reach us yet.',
          'The app is still fully working. That badge is a warning, not a lock — you can keep selling normally.',
          'Connect the computer to the internet for a few minutes and it clears itself. There is nothing to press.',
          'If the countdown reaches zero, the app waits until it can reach the internet once. Your data is never affected either way.',
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'Why there is a monthly check at all',
        text: 'It lets us move your licence to a new computer without a fuss, and it stops a copied key being used on machines you do not own. No sales figures, customer names or stock counts are ever sent — only the licence key and the device identifier.',
      },
    ],
  },

  {
    id: 'support',
    title: 'Contact support',
    summary: 'Reach a real person, with your Device ID ready to paste.',
    icon: 'lifebuoy',
    keywords: [
      'support', 'contact', 'help', 'email', 'human', 'problem', 'stuck',
      'report', 'bug', 'complain', 'device id',
    ],
    blocks: [
      {
        kind: 'text',
        text: 'Support is a person, not a ticket queue — usually whoever built the software you are using. The more you tell us up front, the faster it gets fixed.',
      },
      { kind: 'contact' },
      {
        kind: 'list',
        title: 'To get a faster answer, include',
        items: [
          'What you were doing when it went wrong, and what you expected to happen instead.',
          'The exact wording of any error message. A screenshot is even better.',
          'Your Device ID — the block above copies it for you.',
          'Whether it happens every time or only now and then.',
        ],
      },
      {
        kind: 'list',
        title: 'What we aim for',
        items: [
          'Licence and activation requests: same working day.',
          'Bugs and anything involving missing or wrong data: first reply within one working day.',
          'Anything stopping you from selling: say so in the subject line and we will treat it as urgent.',
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        title: 'You can keep selling while you wait.',
        text: 'Unless the app is showing the activation screen, it keeps working normally. If you are worried about a data problem, take a backup first (Settings, then Backup) and mention that you have one.',
      },
    ],
  },

  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    summary: 'Receipt printer, barcode scanner, and when the numbers look wrong.',
    icon: 'wrench',
    keywords: [
      'printer', 'print', 'receipt', 'thermal', 'scanner', 'barcode', 'scan',
      'not working', 'broken', 'blank', 'error', 'crash', 'wrong', 'numbers',
      'profit', 'margin', 'stock wrong',
    ],
    blocks: [
      {
        kind: 'steps',
        title: 'The receipt printer is not printing',
        steps: [
          {
            title: 'Check the obvious things first',
            text: 'Is it switched on, loaded with paper, and showing a solid rather than flashing light? Unplug the USB cable and plug it back in.',
          },
          {
            title: 'Tell BizFlow which printer it is',
            text: 'Settings, then Tax & Receipt. Set the printer type (USB, network or HTML), the paper width (58mm or 80mm) and, for a network printer, its IP address.',
          },
          {
            title: 'Print a test page',
            text: 'Use the test print button on that page. If the test works but a real sale does not, the issue is in the receipt template rather than the printer.',
          },
          {
            title: 'For network printers',
            text: 'Confirm the printer and this computer are on the same network, and that the printer\'s IP address has not changed. If it keeps happening, reserve a fixed IP for the printer in your router.',
          },
          {
            title: 'If still nothing prints',
            text: 'Switch to HTML printing to prove BizFlow is producing a receipt at all. If that works, the fault lies between the computer and the printer — driver, cable or the printer itself.',
          },
        ],
      },
      {
        kind: 'steps',
        title: 'The barcode scanner is not scanning',
        steps: [
          {
            title: 'Click into a search or barcode field first',
            text: 'Almost all scanners type like a keyboard, so they need somewhere to type. With the cursor in a field, scan again.',
          },
          {
            title: 'Check the scanner mode',
            text: 'It should be in HID or keyboard mode, not a proprietary driver mode. Most scanners have a setup barcode in their manual that switches this.',
          },
          {
            title: 'Test it outside BizFlow',
            text: 'Open Notepad and scan. If nothing appears there either, the problem is the scanner, its cable or its settings — not BizFlow.',
          },
          {
            title: 'Try a different product',
            text: 'A crumpled, faded or badly printed label will not read whatever you do. Test with a clean one.',
          },
          {
            title: 'If it scans but finds nothing',
            text: 'The barcode is not on any product yet. Open Products & SKUs and add it to that product\'s barcode field.',
          },
        ],
      },
      {
        kind: 'steps',
        title: 'The app will not open, or a page is blank',
        steps: [
          {
            title: 'Close and reopen BizFlow',
            text: 'A problem on one page should not bring the whole app down. Reopen it and go somewhere else first.',
          },
          {
            title: 'Reload the window',
            text: 'Ctrl + R reloads the interface without touching your data.',
          },
          {
            title: 'Check whether it is the licence',
            text: 'If the trial or grace period has run out, you will see the activation screen rather than the app. That is expected behaviour, not a crash.',
          },
          {
            title: 'Note what the error says',
            text: 'If you see failed to load, that page hit an error. Tell us which page it was. Either way, your data is safe.',
          },
        ],
      },
      {
        kind: 'steps',
        title: 'The numbers look wrong',
        steps: [
          {
            title: 'Check your cost prices',
            text: 'Profit and margin come from product cost prices. A missing cost price makes profit look higher than it really is — this is the most common cause.',
          },
          {
            title: 'Check for unrecorded expenses',
            text: 'Expenses feed the Finance pages. Money you spent but never entered makes profit look too good.',
          },
          {
            title: 'Check the date range',
            text: 'Reports use a date range that may not be the one you have in mind. Widen it and look again.',
          },
          {
            title: 'Compare against Sales & Orders',
            text: 'The order list is the raw record of what happened. If a report disagrees with it, that is a bug — tell us, and include the dates you looked at.',
          },
        ],
      },
    ],
  },

  {
    id: 'data',
    title: 'Backups and your data',
    summary: 'Where your data lives, and how to get it back if you need to.',
    icon: 'database',
    keywords: [
      'backup', 'restore', 'data', 'database', 'lost', 'recover', 'export',
      'safe', 'cloud', 'privacy', 'move', 'new computer', 'reset',
    ],
    blocks: [
      {
        kind: 'list',
        title: 'Where your data lives',
        items: [
          'Everything is stored locally on this computer. There is no cloud account, and your sales figures are not uploaded anywhere.',
          'That is good for privacy and speed — but it also means backups are the one job nobody else can do for you.',
        ],
      },
      {
        kind: 'steps',
        title: 'Setting up backups',
        steps: [
          {
            title: 'Open Settings, then Backup',
            text: 'Choose a folder to write backup files into. A folder that syncs to cloud storage, or a USB drive, is far better than the same disk BizFlow is installed on.',
          },
          {
            title: 'Turn on automatic backups',
            text: 'Pick a schedule. Daily, at a time the shop is closed, suits most businesses.',
          },
          {
            title: 'Take one right now',
            text: 'Press the manual backup button and confirm a new file actually appears in that folder.',
          },
          {
            title: 'Check it once a month',
            text: 'A backup you have never opened is not really a backup. A minute a month is enough.',
          },
        ],
      },
      {
        kind: 'steps',
        title: 'Restoring from a backup',
        steps: [
          {
            title: 'Slow down for a second',
            text: 'Restoring replaces your current data. Anything entered since that backup was taken will be gone. If you are not certain, take a fresh backup first.',
          },
          {
            title: 'Open Settings, then Backup',
            text: 'Choose the restore option and pick the backup file you want to go back to.',
          },
          {
            title: 'Read the warning and confirm',
            text: 'BizFlow will tell you that this overwrites current data. Read it before you agree.',
          },
          {
            title: 'Let it finish',
            text: 'If you are asked to restart, wait for the app to finish writing before closing anything.',
          },
          {
            title: 'Spot-check the result',
            text: 'Look at a few recent sales and your stock levels, to confirm you restored the backup you meant to.',
          },
        ],
      },
      {
        kind: 'list',
        title: 'Habits that save businesses',
        items: [
          'Keep more than one backup, in more than one place. On-disk copies do not survive a dead disk.',
          'Take a backup before any big change — a new computer, an update, a stock take.',
          'Never edit a backup file by hand.',
          'Selling on more than one computer? Each keeps its own data. They do not sync automatically.',
        ],
      },
      {
        kind: 'callout',
        tone: 'warning',
        title: 'Before you uninstall or replace this computer',
        text: 'Take a backup to somewhere outside this machine — cloud storage or a USB drive. Uninstalling removes the app, and replacing the computer removes everything with it.',
      },
    ],
  },

  {
    id: 'shortcuts',
    title: 'Keyboard shortcuts',
    summary: 'The handful of keys that make BizFlow noticeably faster.',
    icon: 'keyboard',
    keywords: ['keyboard', 'shortcut', 'keys', 'hotkey', 'ctrl', 'speed', 'fast'],
    blocks: [
      {
        kind: 'keys',
        title: 'Work anywhere in the app',
        keys: [
          { combo: 'Ctrl + K', text: 'Open the command palette and jump to any screen, module or action by typing its name.' },
          { combo: 'Esc', text: 'Close the dialog you have open, or cancel what you are doing.' },
          { combo: 'Tab', text: 'Move to the next field in a form.' },
          { combo: 'Shift + Tab', text: 'Move back to the previous field.' },
          { combo: 'Enter', text: 'Confirm or save the value you are editing.' },
        ],
      },
      {
        kind: 'keys',
        title: 'Inside any module',
        keys: [
          { combo: 'Alt + 1…9', text: 'Jump straight to the 1st…9th tab of the module you are in. The fastest way to move around a module you know well.' },
          { combo: 'F1', text: 'Toggle that module\'s own guide. Every module has one, and each lists its own extra shortcuts.' },
          { combo: 'Ctrl + K', text: 'Hop to a completely different module.' },
        ],
      },
      {
        kind: 'keys',
        title: 'While the command palette is open',
        keys: [
          { combo: 'Up / Down', text: 'Move through the results.' },
          { combo: 'Home / End', text: 'Jump to the first or last result.' },
          { combo: 'Enter', text: 'Run the highlighted command.' },
          { combo: 'Esc', text: 'Close the palette without changing anything.' },
        ],
      },
      {
        kind: 'keys',
        title: 'Commerce — Turbo QuickSale',
        keys: [
          { combo: '/', text: 'Put the cursor in the search box, ready to scan or type.' },
          { combo: 'Esc', text: 'Clear the search, or close the results dropdown.' },
        ],
      },
      {
        kind: 'callout',
        tone: 'tip',
        title: 'Ctrl + K is the one to remember',
        text: 'It searches every module and every screen, so you stop hunting through the sidebar. Press it, type a few letters, press Enter.',
      },
      {
        kind: 'text',
        text: 'A barcode scanner types far faster than any human ever will. With one plugged in you rarely need to touch the keyboard during a sale — just make sure the cursor is in a field that can accept it. Press F1 inside a module for the shortcuts that only apply there.',
      },
    ],
  },
]

/** First-run walkthrough. Anchors are optional; steps without one show centred. */
export interface TourStep {
  title: string
  text: string
  /** Value of a data-tour attribute in the layout, if this step points at something. */
  anchor?: string
  placement?: 'right' | 'left' | 'bottom' | 'top'
}

export const HELP_TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to BizFlow',
    text: 'This is a two-minute tour of where everything lives. You can skip it now and read it again any time from the help button in the corner.',
  },
  {
    title: 'This is your sidebar',
    text: 'Dashboard, Employees, Reports, Finance and Settings live here, and your licensed modules sit with them — Commerce for retail, or Bakery, Pharmacy, Gym and so on. Switch modules freely; your data is shared, so nothing is lost.',
    anchor: 'sidebar-nav',
    placement: 'right',
  },
  {
    title: 'Press Ctrl + K to fly around',
    text: 'Start typing a page name and jump straight to it. This is the fastest way to get anywhere in the app, and it works from every screen.',
  },
  {
    title: 'Stuck? The help button is always there',
    text: 'It has step-by-step guides for selling, stock, your licence and support — plus your Device ID, ready to paste into an email to us.',
    anchor: 'help-button',
    placement: 'left',
  },
  {
    title: 'Your first 14 days are free',
    text: 'A badge in the corner counts down the trial. Nothing is charged and no card is needed. When the trial ends, the app asks you to activate rather than deleting anything.',
    anchor: 'trial-badge',
    placement: 'top',
  },
]

/* -------------------------------------------------------------------------- */
/* Language selection                                                          */
/* -------------------------------------------------------------------------- */

export interface HelpContent {
  sections: HelpSection[]
  tourSteps: TourStep[]
}

const HELP_CONTENT_EN: HelpContent = {
  sections: HELP_SECTIONS,
  tourSteps: HELP_TOUR_STEPS,
}

const HELP_CONTENT_AR: HelpContent = {
  sections: HELP_SECTIONS_AR,
  tourSteps: HELP_TOUR_STEPS_AR,
}

/**
 * Help content for a given app language.
 *
 * Anything that is not Arabic falls back to English, so a future third language
 * degrades to the source content instead of showing an empty panel.
 */
export function getHelpContent(language: string): HelpContent {
  return language === 'ar' ? HELP_CONTENT_AR : HELP_CONTENT_EN
}
