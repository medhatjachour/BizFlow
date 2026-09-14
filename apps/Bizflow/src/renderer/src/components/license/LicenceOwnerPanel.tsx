/**
 * Owner panel: what the licence covers, and where it is activated.
 *
 * Honest scope note: a BizFlow licence is one key, one device, one product (a
 * single module or the full suite). There is no server-side seat table, so this
 * panel does not pretend to sell seats — it shows the entitlement we actually
 * hold, which modules are switched on locally, and gives a one-click way to ask
 * for the licence to be moved to another computer.
 *
 * The key, the address it was issued to and the device ID are all spelled out
 * in the status card above, so this panel deliberately does not repeat them:
 * it answers only "what does this key unlock".
 */

import { useState } from 'react'
import { CheckCircle2, Lock, ShieldCheck } from 'lucide-react'

import { MODULE_REGISTRY, MODULE_IDS, type ModuleId } from '../../../../shared/modules'
import {
  coversModule,
  moduleNameAr,
  type LicenseStrings,
} from './licenseStrings'
import LicenceRequestForm from './LicenceRequestForm'

export interface OwnerPanelState {
  itemId?: string
  email?: string
}

interface Props {
  isAr: boolean
  strings: LicenseStrings
  state: OwnerPanelState
  enabledModules: ModuleId[]
  onOpenModules?: () => void
}

export default function LicenceOwnerPanel({
  isAr,
  strings,
  state,
  enabledModules,
  onOpenModules,
}: Props) {
  const [moving, setMoving] = useState(false)
  const allModules = Object.values(MODULE_IDS) as ModuleId[]
  const suite = state.itemId === 'suite'
  const includedCount = allModules.filter((id) => coversModule(state.itemId, id)).length

  // Entitled modules first: a wall of "not included" buries the one line that
  // matters. Presentation only — the entitlement set is the same either way.
  const orderedModules = [
    ...allModules.filter((id) => coversModule(state.itemId, id)),
    ...allModules.filter((id) => !coversModule(state.itemId, id)),
  ]

  const plan = !state.itemId
    ? strings.notActivated
    : suite
      ? strings.planSuite
      : strings.planSingle(
          moduleNameAr(
            state.itemId.replace('module:', ''),
            MODULE_REGISTRY[state.itemId.replace('module:', '') as ModuleId]?.name ??
              state.itemId.replace('module:', '')
          )
        )

  return (
    <div className="space-y-4">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <ShieldCheck className="h-5 w-5" />
          {strings.ownerTitle}
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{strings.ownerLead}</p>
      </div>

      {/* Entitlement — the only thing this panel owns. */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{strings.modulesTitle}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-200">{strings.planRow}:</span>{' '}
              {plan} · {strings.modulesSummary(includedCount, allModules.length)}
            </p>
          </div>
          {onOpenModules ? (
            <button
              type="button"
              onClick={onOpenModules}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {strings.openModules}
            </button>
          ) : null}
        </div>

        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {orderedModules.map((moduleId) => {
            const meta = MODULE_REGISTRY[moduleId]
            const included = coversModule(state.itemId, moduleId)
            const enabled = enabledModules.includes(moduleId)
            return (
              <li
                key={moduleId}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {included ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                  ) : (
                    <Lock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-slate-800 dark:text-slate-100">
                      {isAr ? moduleNameAr(moduleId, meta.name) : meta.name}
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      {included ? strings.moduleEntitled : strings.moduleLocked}
                      {included ? ` · ${enabled ? strings.moduleEnabled : strings.moduleDisabled}` : ''}
                    </span>
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Moving the licence is an email, not a setting: it is our decision to
          release the old binding, and that has to be recorded on our side. */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{strings.moveTitle}</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{strings.moveBody}</p>

        {moving ? (
          <div className="mt-4">
            <LicenceRequestForm
              isAr={isAr}
              strings={strings}
              initialProduct={state.itemId ?? 'suite'}
              initialMessage={
                isAr
                  ? `أرغب في نقل الترخيص إلى جهاز آخر.\nالجهاز الجديد: \nالبريد المستخدم في الشراء: ${state.email ?? ''}`
                  : `I would like to move my licence to another computer.\nNew device: \nPurchase email: ${state.email ?? ''}`
              }
            />
            <button
              type="button"
              onClick={() => setMoving(false)}
              className="mt-3 text-xs font-semibold text-slate-500 hover:underline dark:text-slate-400"
            >
              {strings.close}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setMoving(true)}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {strings.moveButton}
          </button>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{strings.securityTitle}</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{strings.securityBody}</p>
      </div>
    </div>
  )
}
