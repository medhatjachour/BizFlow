import { X, Loader2, CalendarRange,  User, Dumbbell } from 'lucide-react'
import { Subscription } from '../types'
import { PAYMENT_METHODS } from '../constants'
import { useSubscriptionForm } from '../hooks/useSubscriptionForm'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface SubscriptionFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  renewTarget?: Subscription | null
}

export function SubscriptionFormModal({
  isOpen,
  onClose,
  onSaved,
  renewTarget
}: SubscriptionFormModalProps) {
  const { t } = useLanguage()
  const {
    form,
    setForm,
    saving,
    plans,
    coaches,
    selectedPlan,
    calculatedEndDate,
    traineeResults,
    searchingTrainee,
    showTraineeDropdown,
    setShowTraineeDropdown,
    searchTrainees,
    selectTrainee,
    selectPlan,
    handleSubmit
  } = useSubscriptionForm(isOpen, onSaved, onClose, renewTarget)

  if (!isOpen) return null

  const labelCls = 'block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1'
  const inputCls =
    'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/80 z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
              <CalendarRange size={16} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {renewTarget
                ? `Renew Membership (${renewTarget.trainee?.name})`
                : t('gymNewSubscription') || 'Register New Subscription'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Member Search Autocomplete */}
          <div className="relative">
            <label className={labelCls}>{t('gymTraineeName') || 'Member'} *</label>
            {form.traineeId ? (
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 text-sm font-bold">
                <div className="flex items-center gap-2">
                  <User size={14} />
                  <span>{form.traineeName}</span>
                </div>
                {!renewTarget && (
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, traineeId: '', traineeName: '', traineeSearch: '' }))}
                    className="text-xs text-slate-400 hover:text-rose-500 font-semibold"
                  >
                    Change
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="relative">
                  <input
                    className={inputCls}
                    value={form.traineeSearch}
                    onChange={e => searchTrainees(e.target.value)}
                    onFocus={() => form.traineeSearch && setShowTraineeDropdown(true)}
                    placeholder="Type member name or phone to search..."
                    required
                  />
                  {searchingTrainee && (
                    <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
                  )}
                </div>

                {showTraineeDropdown && traineeResults.length > 0 && (
                  <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
                    {traineeResults.map(t => (
                      <li
                        key={t.id}
                        onClick={() => selectTrainee(t)}
                        className="px-4 py-2.5 text-xs font-semibold cursor-pointer hover:bg-orange-500/10 text-slate-800 dark:text-slate-200 flex items-center justify-between"
                      >
                        <span>{t.name}</span>
                        <span className="font-mono text-slate-400">{t.phone}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          {/* Plan Selection */}
          <div>
            <label className={labelCls}>{t('gymPlanName') || 'Membership Plan'} *</label>
            <select
              className={inputCls}
              value={form.planId}
              onChange={e => selectPlan(e.target.value)}
              required
            >
              <option value="">Choose a plan...</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.durationDays} Days — ${p.price.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned Coach */}
          <div>
            <label className={labelCls}>{t('gymProgramCoach') || 'Personal Trainer (Optional)'}</label>
            <select
              className={inputCls}
              value={form.coachId}
              onChange={e => setForm(f => ({ ...f, coachId: e.target.value }))}
            >
              <option value="">No dedicated coach (General Access)</option>
              {coaches.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.specialty ? `(${c.specialty})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Dates (Start & Auto End) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t('gymStartDate') || 'Start Date'} *</label>
              <input
                type="date"
                className={inputCls}
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className={labelCls}>{t('gymEndDate') || 'Computed Expiry'}</label>
              <div className={`${inputCls} bg-slate-50 dark:bg-slate-900/40 text-slate-500 font-mono cursor-default`}>
                {calculatedEndDate ?? '—'}
              </div>
            </div>
          </div>

          {/* Payment & Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t('gymAmount') || 'Amount Paid ($)'}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={`${inputCls} tabular-nums font-bold`}
                value={form.amountPaid}
                onChange={e => setForm(f => ({ ...f, amountPaid: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className={labelCls}>Payment Method</label>
              <select
                className={inputCls}
                value={form.paymentMethod}
                onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
              >
                {PAYMENT_METHODS.map(pm => (
                  <option key={pm.value} value={pm.value}>
                    {pm.icon} {pm.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Plan Info Badge */}
          {selectedPlan && (
            <div className="rounded-2xl bg-orange-500/[0.06] border border-orange-500/20 p-3.5 text-xs text-orange-800 dark:text-orange-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Dumbbell size={13} />
                <span>{selectedPlan.name} ({selectedPlan.durationDays} Days Duration)</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Allows up to {selectedPlan.maxFreezeDays ?? 0} days freeze limit. {selectedPlan.features}
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={labelCls}>{t('gymNotes') || 'Notes & Receipt Details'}</label>
            <textarea
              className={inputCls}
              rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Discounts, promotional codes, contract terms..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {t('gymCancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving || !form.traineeId || !form.planId}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              <span>{renewTarget ? 'Confirm Renewal' : 'Enroll Subscription'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}