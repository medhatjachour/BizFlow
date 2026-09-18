/**
 * Copy for the native dialogs the MAIN process raises.
 *
 * These dialogs are drawn by the OS, so they cannot read the renderer
 * dictionary in `src/renderer/src/i18n`. They also fire where renderer
 * localStorage is out of reach: the window `close` handler, the update-ready
 * prompt and the startup database migration all run without a round trip to the
 * UI. The selected language is therefore mirrored into `ui-language.json` in
 * userData whenever the renderer changes it - the same trick
 * `close-backup-prefs.json` already uses for the backup-on-close prompt.
 *
 * Both tables must stay in step: `StringKey` is derived from the English table,
 * so a key missing from the Arabic one is a compile error.
 */
import { app, ipcMain } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createLogger } from './utils/logger'

const log = createLogger('MainI18n')

export type UiLanguage = 'ar' | 'en'

const STRINGS = {
  en: {
    // Update-ready prompt (updater.ts)
    updReadyTitle: 'Update ready',
    updReadyMessage: 'BizFlow {version} has been downloaded.',
    updReadyDetail: 'Restart to install it now. Your data and settings are preserved.',
    updReadyNow: 'Restart now',
    updReadyLater: 'Later',
    // Backup-on-close prompt (index.ts)
    backupQuitTitle: 'Back up before closing?',
    backupQuitMessage: 'Do you want to back up your data before closing BizFlow?',
    backupQuitDetail: 'A copy of your database will be saved so you can restore it later.',
    backupQuitYes: 'Back up & Quit',
    backupQuitNo: 'Quit without backup',
    backupQuitCancel: 'Cancel',
    backupFailedTitle: 'Backup failed',
    backupFailedMessage: 'Could not create a backup.',
    backupFailedDetail: '{error}\n\nThe app will now close.',
    // Database migration dialogs (MigrationManager.ts)
    migRequiredTitle: 'Database Update Required',
    migRequiredMessage: 'This new version requires updating your database.',
    migRequiredDetail:
      'Your data will be preserved. A backup has been created automatically.\n\nBackup location: {path}\n\nThis may take a few moments. Do not close the application during this process.',
    migRequiredNow: 'Update Now',
    migRequiredExit: 'Exit',
    migDoneTitle: 'Update Complete',
    migDoneMessage: 'Your database has been successfully updated!',
    migDoneDetail: 'All your data has been preserved and the application is ready to use.',
    migFailTitle: 'Update Failed',
    migFailMessage: 'The database update failed.',
    migFailDetail:
      'Error: {error}\n\nWould you like to restore from the backup? Your data will be safe and you can try updating again later.',
    migFailRestore: 'Restore Backup',
    migFailExit: 'Exit',
    migBackupFailed: 'Cannot proceed without a backup. Please make sure the app can write to disk.',
    migRestoredTitle: 'Backup Restored',
    migRestoredMessage: 'Your database has been restored to its previous state.',
    migRestoredDetail: 'Please contact support before trying to update again.',
    migCriticalTitle: 'Critical Error',
    migCriticalMessage: 'Failed to restore backup.',
    migCriticalDetail:
      'Original error: {error}\nRestore error: {restoreError}\n\nBackup location: {path}\n\nPlease restore manually or contact support.',
    migOk: 'OK',
    // Personal work OS tray widget (tray.ts)
    trayShow: 'Open BizFlow',
    trayQuickCapture: 'Quick capture…',
    trayQuit: 'Quit BizFlow',
    trayTooltipIdle: 'BizFlow — Personal Work OS',
    trayTooltipFocus: 'Focusing: {task}',
    trayTooltipDeadline: 'Next: {project} — {when}',
    trayTooltipEmpty: 'No timer running, nothing due',
    trayNoTimer: 'No timer running',
    trayNoDeadline: 'Nothing due',
    trayTimerTitle: 'Focus timer',
    trayDeadlineTitle: 'Next deadline',
    trayDueNow: 'due now',
    trayInMinutes: 'in {count} min',
    trayInHours: 'in {count} h',
    trayInDays: 'in {count} d',
    trayOverdueMinutes: 'overdue by {count} min',
    trayOverdueHours: 'overdue by {count} h',
    trayOverdueDays: 'overdue by {count} d',
    trayElapsedMinutes: '{minutes} min elapsed',
    trayElapsedHours: '{hours} h elapsed',
    trayElapsedHoursMinutes: '{hours} h {minutes} min elapsed',
    trayUntitled: 'Untitled',
    // Encrypted backups (backup.handlers.ts)
    backupEncUnsupported: 'Backup encryption is not available on this system.',
    backupEncWrongPassphrase: 'That passphrase cannot decrypt this backup.',
    backupEncPromptMessage: 'This backup is encrypted. Enter its passphrase to restore it.',
    backupEncMissingPassphrase:
      'Backup encryption is on but no passphrase is stored. Set one in Settings before backing up.'
  },
  ar: {
    // Update-ready prompt (updater.ts)
    updReadyTitle: 'التحديث جاهز',
    updReadyMessage: 'تم تنزيل BizFlow {version}.',
    updReadyDetail: 'أعد التشغيل للتثبيت الآن. تُحفظ بياناتك وإعداداتك.',
    updReadyNow: 'إعادة التشغيل الآن',
    updReadyLater: 'لاحقاً',
    // Backup-on-close prompt (index.ts)
    backupQuitTitle: 'هل تريد نسخاً احتياطياً قبل الإغلاق؟',
    backupQuitMessage: 'هل تريد نسخ بياناتك احتياطياً قبل إغلاق BizFlow؟',
    backupQuitDetail: 'ستُحفظ نسخة من قاعدة بياناتك حتى تتمكن من استعادتها لاحقاً.',
    backupQuitYes: 'نسخ احتياطي وإغلاق',
    backupQuitNo: 'إغلاق بدون نسخ احتياطي',
    backupQuitCancel: 'إلغاء',
    backupFailedTitle: 'فشل النسخ الاحتياطي',
    backupFailedMessage: 'تعذّر إنشاء نسخة احتياطية.',
    backupFailedDetail: '{error}\n\nسيُغلق التطبيق الآن.',
    // Database migration dialogs (MigrationManager.ts)
    migRequiredTitle: 'يلزم تحديث قاعدة البيانات',
    migRequiredMessage: 'يتطلب هذا الإصدار تحديث قاعدة بياناتك.',
    migRequiredDetail:
      'ستُحفظ بياناتك. وقد أُنشئت نسخة احتياطية تلقائياً.\n\nموقع النسخة الاحتياطية: {path}\n\nقد يستغرق هذا بعض الوقت. لا تُغلق التطبيق أثناء العملية.',
    migRequiredNow: 'تحديث الآن',
    migRequiredExit: 'خروج',
    migDoneTitle: 'اكتمل التحديث',
    migDoneMessage: 'تم تحديث قاعدة بياناتك بنجاح!',
    migDoneDetail: 'حُفظت جميع بياناتك والتطبيق جاهز للاستخدام.',
    migFailTitle: 'فشل التحديث',
    migFailMessage: 'فشل تحديث قاعدة البيانات.',
    migFailDetail:
      'الخطأ: {error}\n\nهل تريد الاستعادة من النسخة الاحتياطية؟ ستكون بياناتك آمنة ويمكنك محاولة التحديث لاحقاً.',
    migFailRestore: 'استعادة النسخة الاحتياطية',
    migFailExit: 'خروج',
    migBackupFailed: 'لا يمكن المتابعة بدون نسخة احتياطية. تأكد من قدرة التطبيق على الكتابة إلى القرص.',
    migRestoredTitle: 'تمت استعادة النسخة الاحتياطية',
    migRestoredMessage: 'أُعيدت قاعدة بياناتك إلى حالتها السابقة.',
    migRestoredDetail: 'يُرجى التواصل مع الدعم قبل محاولة التحديث مرة أخرى.',
    migCriticalTitle: 'خطأ جسيم',
    migCriticalMessage: 'تعذّرت استعادة النسخة الاحتياطية.',
    migCriticalDetail:
      'الخطأ الأصلي: {error}\nخطأ الاستعادة: {restoreError}\n\nموقع النسخة الاحتياطية: {path}\n\nيُرجى الاستعادة يدوياً أو التواصل مع الدعم.',
    migOk: 'حسناً',
    // Personal work OS tray widget (tray.ts)
    trayShow: 'فتح BizFlow',
    trayQuickCapture: 'التقاط سريع…',
    trayQuit: 'إنهاء BizFlow',
    trayTooltipIdle: 'BizFlow — نظام العمل الشخصي',
    trayTooltipFocus: 'التركيز على: {task}',
    trayTooltipDeadline: 'التالي: {project} — {when}',
    trayTooltipEmpty: 'لا يوجد مؤقت ولا مواعيد قريبة',
    trayNoTimer: 'لا يوجد مؤقت يعمل',
    trayNoDeadline: 'لا يوجد تسليم قريب',
    trayTimerTitle: 'مؤقت التركيز',
    trayDeadlineTitle: 'التسليم التالي',
    trayDueNow: 'مستحق الآن',
    trayInMinutes: 'خلال {count} د',
    trayInHours: 'خلال {count} س',
    trayInDays: 'خلال {count} ي',
    trayOverdueMinutes: 'متأخر بـ {count} د',
    trayOverdueHours: 'متأخر بـ {count} س',
    trayOverdueDays: 'متأخر بـ {count} ي',
    trayElapsedMinutes: 'مضى {minutes} د',
    trayElapsedHours: 'مضى {hours} س',
    trayElapsedHoursMinutes: 'مضى {hours} س {minutes} د',
    trayUntitled: 'بدون عنوان',
    // Encrypted backups (backup.handlers.ts)
    backupEncUnsupported: 'تشفير النسخ الاحتياطية غير متاح على هذا النظام.',
    backupEncWrongPassphrase: 'هذه العبارة السرية لا يمكنها فك تشفير هذه النسخة الاحتياطية.',
    backupEncPromptMessage: 'هذه النسخة الاحتياطية مشفّرة. أدخل عبارتها السرية لاستعادتها.',
    backupEncMissingPassphrase:
      'تشفير النسخ الاحتياطية مُفعّل لكن لا توجد عبارة سرية محفوظة. عيّن واحدة من الإعدادات قبل النسخ الاحتياطي.'
  }
} as const

export type StringKey = keyof (typeof STRINGS)['en']

/** Exposed so tests can assert the two tables stay in step. */
export const MAIN_STRINGS = STRINGS

/** The renderer defaults to Arabic, so the main process does too. */
let language: UiLanguage = 'ar'

const getPrefsPath = (): string => join(app.getPath('userData'), 'ui-language.json')

export const getLanguage = (): UiLanguage => language

export const loadLanguage = (): void => {
  try {
    if (!existsSync(getPrefsPath())) return
    const parsed = JSON.parse(readFileSync(getPrefsPath(), 'utf-8')) as { language?: unknown }
    if (parsed.language === 'ar' || parsed.language === 'en') language = parsed.language
  } catch (error) {
    log.warn('Failed to read the saved UI language:', error)
  }
}

export const setLanguage = (value: unknown): UiLanguage => {
  if (value === 'ar' || value === 'en') language = value
  try {
    writeFileSync(getPrefsPath(), JSON.stringify({ language }), 'utf-8')
  } catch (error) {
    log.warn('Failed to save the UI language:', error)
  }
  return language
}

export const mainT = (key: StringKey, params?: Record<string, string | number>): string => {
  const template: string = STRINGS[language][key] ?? STRINGS.en[key]
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match
  )
}

/**
 * Native dialogs on Windows list buttons left to right, so Arabic - which reads
 * right to left - expects them mirrored, with the default action on the right.
 * `indexOf` maps a button's position in the array you passed in to the position
 * it actually occupies on screen, which is what `showMessageBox` returns.
 */
export const dialogButtons = (
  labels: string[],
  opts: { defaultIndex?: number; cancelIndex?: number } = {}
): {
  buttons: string[]
  defaultId: number
  cancelId: number
  indexOf: (originalIndex: number) => number
} => {
  const last = labels.length - 1
  const mirrored = language === 'ar'
  const indexOf = (i: number): number => (mirrored && i >= 0 ? last - i : i)
  return {
    buttons: mirrored ? [...labels].reverse() : [...labels],
    defaultId: indexOf(opts.defaultIndex ?? 0),
    cancelId: indexOf(opts.cancelIndex ?? last),
    indexOf
  }
}

let ipcRegistered = false

/** Lets the renderer keep the language file in step with its own choice. */
export const registerLanguageIpc = (): void => {
  if (ipcRegistered) return
  ipcRegistered = true
  ipcMain.handle('app:getLanguage', () => language)
  ipcMain.handle('app:setLanguage', (_event, value: unknown) => setLanguage(value))
}

loadLanguage()
