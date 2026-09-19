/**
 * The "?" that sits in the Tax & Receipt header.
 *
 * Receipt printing fails in the operating system long before it fails in the
 * app: an app can only print to a printer the OS already knows about. The guide
 * therefore names the system it detected and gives that system's install steps
 * first, then walks through the four tabs in the order they are meant to be used.
 */

import { useLanguage } from '../../../contexts/LanguageContext'
import { InfoHint } from './formControls'
import { detectPlatform, platformLabel, type Platform } from './platform'

const OS_STEP_KEYS: Record<Platform, string> = {
  windows: 'trGuideOsWindows',
  macos: 'trGuideOsMac',
  linux: 'trGuideOsLinux',
  other: 'trGuideOsOther'
}

const STEP_KEYS = ['trGuideStepDetect', 'trGuideStepPaper', 'trGuideStepArabic', 'trGuideStepTax']

export default function ReceiptGuide() {
  const { t } = useLanguage()
  const platform = detectPlatform()
  const osName = platformLabel(platform) || t('trGuideOsUnknown')

  return (
    <InfoHint label={t('trGuideOpen')} title={t('trGuideTitle')}>
      <p>{t('trGuideIntro')}</p>
      <p className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 font-semibold text-slate-600 dark:text-slate-200">
        {t('trGuideOsDetected', { os: osName })}
      </p>
      <ol className="list-decimal space-y-1.5 ps-4">
        <li>{t(OS_STEP_KEYS[platform])}</li>
        {STEP_KEYS.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ol>
      <p className="text-slate-500 dark:text-slate-400">{t('trGuideDevNote')}</p>
    </InfoHint>
  )
}
