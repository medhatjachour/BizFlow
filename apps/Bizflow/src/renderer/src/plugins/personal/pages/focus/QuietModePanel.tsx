import { useState } from 'react'
import { Moon, Play, Sunrise } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import Button from '@renderer/components/ui/Button'
import FormInput from '@renderer/components/ui/FormInput'
import SectionCard from '../components/SectionCard'
import StatusPill from '../components/StatusPill'
import {
  QUIET_COMMAND_MAX_LENGTH,
  hasQuietHook,
  quietReasonKey,
  useQuietMode
} from '../hooks/useQuietMode'
import {
  runQuietHook,
  syncQuietEnabled,
  useQuietState,
  useQuietToast
} from '../hooks/useQuietRuntime'

/**
 * Settings for the do-not-disturb hook (spec section 3).
 *
 * The command is the operator's own: BizFlow cannot switch another application's
 * focus mode, so it runs the command they point at their shortcut. Validation
 * lives in the main process - this panel only reports what came back.
 */

export default function QuietModePanel() {
  const { t } = useLanguage()
  const toast = useQuietToast()
  const { settings, setEnabled, setEnterCommand, setExitCommand } = useQuietMode()
  const quiet = useQuietState()
  const [testing, setTesting] = useState<'enter' | 'exit' | null>(null)

  const onToggle = (next: boolean) => {
    setEnabled(next)
    syncQuietEnabled()
  }

  const test = async (phase: 'enter' | 'exit') => {
    const command = phase === 'enter' ? settings.enterCommand : settings.exitCommand
    if (!command.trim()) {
      toast.warning(t('pwQuietNoCommand'))
      return
    }

    setTesting(phase)
    try {
      const result = await runQuietHook(command)
      if (result.ok) toast.success(t('pwQuietHookOk'))
      else toast.error(`${t('pwQuietHookFailed')} · ${t(quietReasonKey(result.reason))}`)
    } finally {
      setTesting(null)
    }
  }

  return (
    <SectionCard
      title={t('pwQuietTitle')}
      description={t('pwQuietHint')}
      actions={
        <StatusPill tone={quiet.enabled && quiet.active ? 'accent' : 'neutral'}>
          {quiet.enabled && quiet.active ? t('pwQuietStateActive') : t('pwQuietStateIdle')}
        </StatusPill>
      }
    >
      <div className="space-y-3">
        <label className="inline-flex h-7 items-center gap-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) => onToggle(event.target.checked)}
            className="h-4 w-4 accent-[color:var(--accent)]"
          />
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {t('pwQuietEnabled')}
          </span>
        </label>
        <p className="-mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          {t('pwQuietEnabledHint')}
        </p>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <FormInput
            size="sm"
            label={t('pwQuietEnterCommand')}
            value={settings.enterCommand}
            onChange={setEnterCommand}
            placeholder={t('pwQuietPlaceholder')}
            helperText={t('pwQuietCommandHint')}
            maxLength={QUIET_COMMAND_MAX_LENGTH}
            icon={<Moon className="h-4 w-4" />}
          />
          <FormInput
            size="sm"
            label={t('pwQuietExitCommand')}
            value={settings.exitCommand}
            onChange={setExitCommand}
            placeholder={t('pwQuietPlaceholder')}
            helperText={t('pwQuietCommandHint')}
            maxLength={QUIET_COMMAND_MAX_LENGTH}
            icon={<Sunrise className="h-4 w-4" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="xs"
            variant="secondary"
            loading={testing === 'enter'}
            onClick={() => test('enter')}
          >
            <Play className="h-3.5 w-3.5" />
            {t('pwQuietTestEnter')}
          </Button>
          <Button
            size="xs"
            variant="secondary"
            loading={testing === 'exit'}
            onClick={() => test('exit')}
          >
            <Play className="h-3.5 w-3.5" />
            {t('pwQuietTestExit')}
          </Button>

          {quiet.active && quiet.mutedCount > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t('pwQuietMutedNow', { count: quiet.mutedCount })}
            </span>
          )}
        </div>

        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {settings.enabled && !hasQuietHook(settings)
            ? t('pwQuietNoCommand')
            : t('pwQuietFootnote')}
        </p>
      </div>
    </SectionCard>
  )
}
