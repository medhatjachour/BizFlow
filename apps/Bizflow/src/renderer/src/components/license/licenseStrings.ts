/**
 * Licence surfaces, in both languages.
 *
 * The activation gate is the first screen a customer sees when the trial ends,
 * and until now it was English-only in an app that ships with Arabic as its
 * default. Same local-dictionary pattern the Settings panels already use, so the
 * wording stays next to the screen that consumes it.
 */

export type LicenseTone = 'trial' | 'active' | 'grace' | 'expired' | 'trial_expired'

export interface LicenseStrings {
  // Gate
  gateTitleTrialEnded: string
  gateTitleLocked: string
  gateLead: string
  tabActivate: string
  tabRequest: string
  dataSafetyTitle: string
  dataSafetyBody: string

  // Panel shell + activation panel
  panelTitle: string
  panelLead: string
  changeLicence: string
  activateHeading: string

  // Activation
  activateTitle: string
  activateLead: string
  emailLabel: string
  emailPlaceholder: string
  keyLabel: string
  keyPlaceholder: string
  keyHint: string
  /** Inline, non-blocking hint under the key field for an obviously mistyped key. */
  keyShapeWarning: string
  activateButton: string
  activating: string
  activateSuccess: string
  activateFailed: string
  /** The request never reached us — say so instead of blaming the details. */
  activateOffline: string
  activateRateLimited: string
  /** The licence is already live somewhere else; say where, then offer the move. */
  activateLockedToOtherDevice: (device?: string) => string
  activateNotFound: string
  activateStorageFailed: string
  whereIsKeyTitle: string
  whereIsKeyBody: string

  // Device
  deviceLabel: string
  deviceIdLabel: string
  copy: string
  copied: string
  copyDeviceId: string

  // Request
  requestTitle: string
  requestLead: string
  fullNameLabel: string
  fullNamePlaceholder: string
  businessLabel: string
  businessPlaceholder: string
  phoneLabel: string
  phonePlaceholder: string
  productLabel: string
  seatsLabel: string
  seatsPlaceholder: string
  messageLabel: string
  messagePlaceholder: string
  requestSubmit: string
  requesting: string
  requestSuccessTitle: string
  requestSuccessLead: string
  requestReference: string
  requestNextSteps: string[]
  requestAnother: string
  requestDisputeNote: string

  // Support
  supportTitle: string
  supportBody: string
  emailSupport: string
  supportSubject: string
  supportMailBody: (details: { key: string; device: string; deviceId: string }) => string
  gateSubject: string
  gateMailBody: (details: { device: string; deviceId: string }) => string
  backToActivate: string
  close: string

  // Status
  statusTrial: string
  statusActive: string
  statusGrace: string
  statusExpired: string
  statusTrialExpired: string
  trialDaysLeft: (days: number) => string
  daysUntilExpiry: (days: number) => string
  /** Shown instead of `daysUntilExpiry` when the window has already closed. */
  revalidationDueNow: string
  /** The real schedule, e.g. `Next automatic check on 14 October 2026.` */
  nextCheckOn: (date: string) => string
  /** Explains that the 30-day check is automatic, so nobody hunts for a button. */
  autoCheckNote: string
  graceDaysLeft: (days: number) => string
  clockWarning: string
  keyRow: string
  licensedToRow: string
  issuedRow: string
  expiresRow: string
  lastCheckedRow: string
  notActivated: string
  revalidate: string
  revalidating: string
  revalidateOk: string
  /** The check could not reach us — say so instead of reporting success. */
  revalidateOffline: string
  revalidateFailed: string
  never: string

  // Owner panel
  ownerTitle: string
  ownerLead: string
  planRow: string
  planSuite: string
  planSingle: (module: string) => string
  modulesTitle: string
  /** "1 of 9 included" — the headline for the entitlement list. */
  modulesSummary: (included: number, total: number) => string
  moduleEntitled: string
  moduleLocked: string
  moduleEnabled: string
  moduleDisabled: string
  openModules: string
  moveTitle: string
  moveBody: string
  moveButton: string
  securityTitle: string
  securityBody: string
}

const moduleNamesAr: Record<string, string> = {
  commerce: 'المتجر',
  bakery: 'المخبز',
  restaurant: 'المطعم',
  warehouse: 'المستودع',
  clinic: 'العيادة',
  vet: 'العيادة البيطرية',
  gym: 'الصالة الرياضية',
  pharmacy: 'الصيدلية',
  coffee: 'المقهى',
}

/** Arabic name for a module id, falling back to the registry's English name. */
export function moduleNameAr(moduleId: string, fallback: string): string {
  return moduleNamesAr[moduleId] ?? fallback
}

const ar: LicenseStrings = {
  gateTitleTrialEnded: 'انتهت فترة التجربة المجانية',
  gateTitleLocked: 'هذا الجهاز يحتاج إلى ترخيص',
  gateLead: 'فعّل هذا الجهاز لمواصلة استخدام BizFlow. بياناتك وكل ما أدخلته آمن ولم يُحذف منه شيء.',
  tabActivate: 'لديّ مفتاح ترخيص',
  tabRequest: 'أحتاج إلى ترخيص',
  dataSafetyTitle: 'بياناتك في مكانها',
  dataSafetyBody:
    'شاشة التفعيل تحجب الواجهة فقط. المنتجات والمبيعات والعملاء والمخزون كلها محفوظة على هذا الجهاز وتظهر مرة أخرى بمجرد التفعيل.',

  panelTitle: 'الترخيص',
  panelLead: 'حالة ترخيص هذا الجهاز، وما الذي يمنحه، وكيف تنقله إلى جهاز آخر.',
  changeLicence: 'تغيير الترخيص',
  activateHeading: 'تفعيل هذا الجهاز',

  activateTitle: 'تفعيل هذا الجهاز',
  activateLead: 'استخدم البريد الذي اشتريت به والمفتاح الذي أرسلناه لك.',
  emailLabel: 'البريد المستخدم في الشراء',
  emailPlaceholder: 'you@example.com',
  keyLabel: 'مفتاح الترخيص',
  keyPlaceholder: 'BIZ-XXXXX-XXXXX-XXXXX-XXXXX',
  keyHint: 'المفتاح يبدأ بـ BIZ- ثم أربع مجموعات من خمسة أحرف، والشرطات جزء منه.',
  keyShapeWarning: 'صيغة المفتاح تبدو غير مكتملة: BIZ- ثم أربع مجموعات من خمسة أحرف. تأكد من نسخه كاملاً.',
  activateButton: 'تفعيل هذا الجهاز',
  activating: 'جارٍ التفعيل…',
  activateSuccess: 'تم تفعيل الترخيص لهذا الجهاز.',
  activateFailed: 'لم يكتمل التفعيل. راجع البريد والمفتاح وحاول مرة أخرى.',
  activateOffline: 'تعذّر الوصول إلى الخادم. تأكد من الاتصال بالإنترنت ثم حاول مرة أخرى.',
  activateRateLimited: 'توقّفنا عن المحاولات بعد عدة محاولات غير صحيحة. انتظر ربع ساعة ثم أعد المحاولة.',
  activateLockedToOtherDevice: (device) =>
    device
      ? `هذا المفتاح مُفعّل بالفعل على جهاز آخر (${device}). إن كان الجهاز القديم لديك، اطلب نقل الترخيص إلى هذا الجهاز وسننقله بلا مقابل.`
      : 'هذا المفتاح مُفعّل بالفعل على جهاز آخر. اطلب نقل الترخيص إلى هذا الجهاز وسننقله بلا مقابل.',
  activateNotFound: 'لم نجد ترخيصاً بهذا البريد وهذا المفتاح. تأكد من البريد الذي اشتريت به، ثم راجع المفتاح أو اطلب منّا إعادة إرساله.',
  activateStorageFailed:
    'قَبِل الخادم الترخيص، لكن تعذّر تخزينه على هذا الجهاز. أعد تشغيل التطبيق ثم حاول مرة أخرى، وإن تكرّر الأمر راسل الدعم.',
  whereIsKeyTitle: 'أين أجد المفتاح؟',
  whereIsKeyBody:
    'وصل المفتاح في رسالة بريد عند الشراء. ابحث في بريدك عن «BizFlow». فإن لم تجده، اطلب منّا إعادة إرساله وسنرسله إلى البريد نفسه.',

  deviceLabel: 'الجهاز',
  deviceIdLabel: 'معرّف هذا الجهاز',
  copy: 'نسخ',
  copied: 'تم النسخ',
  copyDeviceId: 'نسخ معرّف الجهاز',

  requestTitle: 'طلب ترخيص لهذا الجهاز',
  requestLead:
    'املأ البيانات التالية وسنرسل لك مفتاح الترخيص بالبريد، وعادةً في يوم العمل نفسه. لا يوجد دفع في هذه الخطوة.',
  fullNameLabel: 'الاسم',
  fullNamePlaceholder: 'اسمك أو اسم المسؤول',
  businessLabel: 'اسم النشاط',
  businessPlaceholder: 'مثال: متجر النور',
  phoneLabel: 'رقم الهاتف أو واتساب',
  phonePlaceholder: 'اختياري — لكنه يسرّع التواصل',
  productLabel: 'ما تحتاجه',
  seatsLabel: 'عدد المستخدمين',
  seatsPlaceholder: 'مثال: 3',
  messageLabel: 'ما الذي تحتاجه بالتحديد؟',
  messagePlaceholder:
    'مثال: نحتاج ترخيص المتجر لجهازين، ولدينا فرع ثانٍ نريد ربطه لاحقاً…',
  requestSubmit: 'إرسال الطلب',
  requesting: 'جارٍ الإرسال…',
  requestSuccessTitle: 'وصلنا طلبك',
  requestSuccessLead: 'احتفظ بالرقم المرجعي أدناه، وأضفناه إلى بريد طلبك أيضاً.',
  requestReference: 'الرقم المرجعي',
  requestNextSteps: [
    'نراجع البيانات ونتأكد من الوحدة أو الباقة التي تحتاجها.',
    'نرسل مفتاح الترخيص إلى بريدك — عادةً في يوم العمل نفسه.',
    'في BizFlow، أدخل البريد نفسه والمفتاح في شاشة التفعيل.',
  ],
  requestAnother: 'إرسال طلب آخر',
  requestDisputeNote:
    'بإرسال الطلب تُرسل معه معرّف هذا الجهاز وإصدار التطبيق فقط — ولا تُرسل أرقام مبيعات ولا بيانات عملاء.',

  supportTitle: 'تفضّل البريد؟',
  supportBody: 'راسلنا مباشرة ومعرّف جهازك جاهز للنسخ في الأعلى، فنجيبك في رد واحد.',
  emailSupport: 'مراسلة الدعم',
  supportSubject: 'طلب دعم ترخيص BizFlow',
  supportMailBody: ({ key, device, deviceId }) =>
    `مرحباً،\n\nأحتاج إلى مساعدة بخصوص ترخيص BizFlow.\n\nمفتاح الترخيص: ${key}\nالجهاز: ${device}\nمعرّف الجهاز: ${deviceId}\n\nشكراً لكم.`,
  gateSubject: 'طلب ترخيص BizFlow',
  gateMailBody: ({ device, deviceId }) =>
    `مرحباً،\n\nأحتاج إلى ترخيص لـ BizFlow.\n\nالجهاز: ${device}\nمعرّف الجهاز: ${deviceId}\n\nشكراً لكم.`,
  backToActivate: 'لديّ مفتاح بالفعل',
  close: 'إغلاق',

  statusTrial: 'تجربة مجانية',
  statusActive: 'مُفعّل',
  statusGrace: 'إعادة التحقق متأخرة',
  statusExpired: 'انتهى الترخيص',
  statusTrialExpired: 'انتهت التجربة',
  trialDaysLeft: (days) => `بقي ${days} ${days === 1 ? 'يوم' : 'أيام'} من التجربة المجانية.`,
  daysUntilExpiry: (days) => `التحقق التلقائي القادم بعد ${days} ${days === 1 ? 'يوم' : 'أيام'}.`,
  revalidationDueNow: 'حان وقت التحقق التلقائي من الترخيص.',
  nextCheckOn: (date) => `التحقق التلقائي القادم في ${date}.`,
  autoCheckNote:
    'يتحقق BizFlow من الترخيص تلقائياً كل 30 يوماً عند وجود اتصال بالإنترنت، ويجدّد الصلاحية دون أي إجراء منك.',
  graceDaysLeft: (days) =>
    `التطبيق يعمل الآن، لكنه سيتوقف خلال ${days} ${days === 1 ? 'يوم' : 'أيام'} ما لم يتصل بالإنترنت مرة واحدة.`,
  clockWarning:
    'ساعة هذا الجهاز متأخرة عن آخر وقت مسجّل. اضبط التاريخ والوقت تلقائياً لتفادي مشكلات في الترخيص.',
  keyRow: 'مفتاح الترخيص',
  licensedToRow: 'مُرخّص لـ',
  issuedRow: 'تاريخ الإصدار',
  expiresRow: 'صالح حتى',
  lastCheckedRow: 'آخر تحقق',
  notActivated: 'لم يُفعّل بعد',
  revalidate: 'التحقق الآن',
  revalidating: 'جارٍ التحقق…',
  revalidateOk: 'تم التحقق من الترخيص بنجاح.',
  revalidateOffline:
    'تعذّر الوصول إلى الخادم الآن. ترخيصك ما زال صالحاً على هذا الجهاز، وسنعيد المحاولة تلقائياً.',
  revalidateFailed: 'فشل التحقق. تحقق من الاتصال بالإنترنت ثم حاول مرة أخرى.',
  never: 'لم يحدث بعد',

  ownerTitle: 'الترخيص والوحدات',
  ownerLead: 'ما الذي يمنحه ترخيصك، وعلى أي جهاز، وكيف تنقله إلى جهاز آخر.',
  planRow: 'نوع الترخيص',
  planSuite: 'الباقة الكاملة — كل الوحدات',
  planSingle: (module) => `وحدة ${module}`,
  modulesTitle: 'الوحدات',
  modulesSummary: (included, total) => `مشمولة ${included} من ${total}`,
  moduleEntitled: 'مشمولة',
  moduleLocked: 'غير مشمولة',
  moduleEnabled: 'مُشغّلة',
  moduleDisabled: 'متوقفة',
  openModules: 'إدارة الوحدات في الإعدادات',
  moveTitle: 'نقل الترخيص إلى جهاز آخر',
  moveBody:
    'الترخيص يرتبط بجهاز واحد في الوقت نفسه. وإذا استبدلت الجهاز، أرسل لنا طلباً ومعرّف الجهاز الجديد وسننقل الترخيص بلا مقابل.',
  moveButton: 'طلب نقل الترخيص',
  securityTitle: 'ما الذي يُرسل إلى خوادمنا؟',
  securityBody:
    'مفتاح الترخيص ومعرّف الجهاز فقط. لا تُرسل أرقام مبيعات ولا أسماء عملاء ولا كميات مخزون — كل ذلك يبقى على جهازك.',
}

const en: LicenseStrings = {
  gateTitleTrialEnded: 'Your free trial has ended',
  gateTitleLocked: 'This device needs a licence',
  gateLead: 'Activate this device to keep using BizFlow. Your data is safe and nothing has been deleted.',
  tabActivate: 'I have a licence key',
  tabRequest: 'I need a licence',
  dataSafetyTitle: 'Your data is still here',
  dataSafetyBody:
    'This screen blocks the interface, not your records. Products, sales, customers and stock are all still on this computer and come straight back once you activate.',

  panelTitle: 'Licence',
  panelLead: 'This device’s licence, what it covers, and how to move it to another computer.',
  changeLicence: 'Change licence',
  activateHeading: 'Activate this device',

  activateTitle: 'Activate this device',
  activateLead: 'Use the email address you bought with, and the key we sent you.',
  emailLabel: 'Purchase email',
  emailPlaceholder: 'you@example.com',
  keyLabel: 'Licence key',
  keyPlaceholder: 'BIZ-XXXXX-XXXXX-XXXXX-XXXXX',
  keyHint: 'The key starts with BIZ- followed by four groups of five characters. The dashes are part of it.',
  keyShapeWarning: 'That does not look like a full key yet: BIZ- then four groups of five characters. Check you copied all of it.',
  activateButton: 'Activate this device',
  activating: 'Activating…',
  activateSuccess: 'Licence activated for this device.',
  activateFailed: 'Activation did not complete. Check the email and the key, then try again.',
  activateOffline: 'We could not reach the server. Check your internet connection and try again.',
  activateRateLimited: 'We paused after several failed attempts. Wait fifteen minutes, then try again.',
  activateLockedToOtherDevice: (device) =>
    device
      ? `This key is already activated on another device (${device}). If that is an old computer of yours, request a licence move and we will move it across at no charge.`
      : 'This key is already activated on another device. Request a licence move and we will move it across at no charge.',
  activateNotFound: 'We found no licence for that email and key. Check the address you bought with, review the key, or ask us to resend it.',
  activateStorageFailed:
    'The server accepted the licence, but it could not be stored on this device. Restart the app and try again — if it keeps happening, email support.',
  whereIsKeyTitle: 'Where is my key?',
  whereIsKeyBody:
    'It arrived by email when you bought. Search your inbox for “BizFlow”. If it is missing, ask us to resend it and it will go to the same address.',

  deviceLabel: 'Device',
  deviceIdLabel: 'This device’s ID',
  copy: 'Copy',
  copied: 'Copied',
  copyDeviceId: 'Copy device ID',

  requestTitle: 'Request a licence for this device',
  requestLead:
    'Fill this in and we will email your licence key — usually the same working day. There is no payment on this screen.',
  fullNameLabel: 'Your name',
  fullNamePlaceholder: 'You or whoever we should reply to',
  businessLabel: 'Business name',
  businessPlaceholder: 'e.g. Al Noor Store',
  phoneLabel: 'Phone or WhatsApp',
  phonePlaceholder: 'Optional — but it speeds things up',
  productLabel: 'What you need',
  seatsLabel: 'Users',
  seatsPlaceholder: 'e.g. 3',
  messageLabel: 'What do you need, exactly?',
  messagePlaceholder:
    'e.g. We need the Commerce licence for two computers, and we want to add a second branch later…',
  requestSubmit: 'Send request',
  requesting: 'Sending…',
  requestSuccessTitle: 'Request received',
  requestSuccessLead: 'Keep the reference below — it is in your confirmation email too.',
  requestReference: 'Reference',
  requestNextSteps: [
    'We check your details and confirm the module or suite you need.',
    'We email the licence key — usually the same working day.',
    'In BizFlow, enter that email and the key on the activation screen.',
  ],
  requestAnother: 'Send another request',
  requestDisputeNote:
    'Sending this shares this device’s ID and app version only — never your sales figures or customer records.',

  supportTitle: 'Prefer email?',
  supportBody: 'Write to us directly. Your device ID is ready to copy above, so we can answer in one reply.',
  emailSupport: 'Email support',
  supportSubject: 'BizFlow licence support request',
  supportMailBody: ({ key, device, deviceId }) =>
    `Hello,\n\nI need help with my BizFlow licence.\n\nLicence key: ${key}\nDevice: ${device}\nDevice ID: ${deviceId}\n\nThank you.`,
  gateSubject: 'BizFlow licence request',
  gateMailBody: ({ device, deviceId }) =>
    `Hello,\n\nI would like a licence for BizFlow.\n\nDevice: ${device}\nDevice ID: ${deviceId}\n\nThank you.`,
  backToActivate: 'I already have a key',
  close: 'Close',

  statusTrial: 'Free trial',
  statusActive: 'Activated',
  statusGrace: 'Revalidation overdue',
  statusExpired: 'Licence expired',
  statusTrialExpired: 'Trial ended',
  trialDaysLeft: (days) => `${days} ${days === 1 ? 'day' : 'days'} left in your free trial.`,
  daysUntilExpiry: (days) => `Next automatic check in ${days} ${days === 1 ? 'day' : 'days'}.`,
  revalidationDueNow: 'This licence is due for its automatic check.',
  nextCheckOn: (date) => `Next automatic check on ${date}.`,
  autoCheckNote:
    'BizFlow checks the licence automatically every 30 days while you are online and renews it for you — there is nothing to do.',
  graceDaysLeft: (days) =>
    `The app keeps working, but stops in ${days} ${days === 1 ? 'day' : 'days'} unless it reaches the internet once.`,
  clockWarning:
    'This computer’s clock is behind the last recorded time. Set the date and time automatically to avoid licence problems.',
  keyRow: 'Licence key',
  licensedToRow: 'Licensed to',
  issuedRow: 'Issued',
  expiresRow: 'Valid until',
  lastCheckedRow: 'Last checked',
  notActivated: 'Not activated yet',
  revalidate: 'Check now',
  revalidating: 'Checking…',
  revalidateOk: 'Licence checked and confirmed.',
  revalidateOffline:
    'We could not reach the server just now. Your licence is still valid on this device and we will retry automatically.',
  revalidateFailed: 'Revalidation failed. Check your internet connection and try again.',
  never: 'Not yet',

  ownerTitle: 'Licence & modules',
  ownerLead: 'What your licence covers, where it is activated, and how to move it to another computer.',
  planRow: 'Licence type',
  planSuite: 'Full suite — every module',
  planSingle: (module) => `${module} module`,
  modulesTitle: 'Modules',
  modulesSummary: (included, total) => `${included} of ${total} included`,
  moduleEntitled: 'Included',
  moduleLocked: 'Not included',
  moduleEnabled: 'Enabled',
  moduleDisabled: 'Off',
  openModules: 'Manage modules in Settings',
  moveTitle: 'Move the licence to another computer',
  moveBody:
    'A licence is bound to one device at a time. If you replace this computer, send us a request with the new device’s ID and we will move it across at no charge.',
  moveButton: 'Request a licence move',
  securityTitle: 'What reaches our servers?',
  securityBody:
    'Only the licence key and the device identifier. Sales figures, customer names and stock counts never leave this computer.',
}

export function licenseStrings(isAr: boolean): LicenseStrings {
  return isAr ? ar : en
}

/** `BIZ-` plus four groups of five Crockford base32 characters. */
const KEY_SHAPE = /^BIZ(-[0-9A-HJKMNP-TV-Z]{5}){4}$/

/**
 * Does the typed key at least look like a key?
 *
 * A typo costs a round trip and counts against the server's failed-attempt
 * limiter, so both activation screens flag the shape while the customer is still
 * typing. This is a hint, never a gate: the server stays the authority.
 */
export function licenceKeyShapeOk(key: string): boolean {
  return KEY_SHAPE.test(key.trim())
}

/**
 * Turn a licence-server failure into something the customer can read.
 *
 * The server answers in English and sends a stable `code` next to its message,
 * so translate the cases we can act on and fall back to our own sentence rather
 * than leaking raw English into an Arabic panel.
 */
export function activationErrorText(
  strings: LicenseStrings,
  failure: { code?: string; currentDeviceName?: string }
): string {
  switch (failure.code) {
    case 'LOCKED_TO_OTHER_DEVICE':
      return strings.activateLockedToOtherDevice(failure.currentDeviceName)
    case 'NOT_FOUND':
      return strings.activateNotFound
    case 'RATE_LIMITED':
      return strings.activateRateLimited
    case 'OFFLINE':
      return strings.activateOffline
    case 'STORAGE':
      return strings.activateStorageFailed
    default:
      return strings.activateFailed
  }
}

/** Status label for a licence state. */
export function statusLabel(strings: LicenseStrings, status: LicenseTone | 'unknown'): string {
  switch (status) {
    case 'trial':
      return strings.statusTrial
    case 'active':
      return strings.statusActive
    case 'grace':
      return strings.statusGrace
    case 'expired':
      return strings.statusExpired
    case 'trial_expired':
      return strings.statusTrialExpired
    default:
      return strings.statusTrial
  }
}

/** Licence item ids look like `suite` or `module:gym`. */
export function entitledModuleIds(itemId: string | undefined | null): 'all' | string[] {
  if (!itemId) return []
  if (itemId === 'suite') return 'all'
  if (itemId.startsWith('module:')) return [itemId.slice('module:'.length)]
  return []
}

/** Does this licence cover the given module? */
export function coversModule(itemId: string | undefined | null, moduleId: string): boolean {
  const entitled = entitledModuleIds(itemId)
  return entitled === 'all' || entitled.includes(moduleId)
}
