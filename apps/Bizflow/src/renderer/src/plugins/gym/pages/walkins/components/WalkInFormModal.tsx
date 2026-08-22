import { useState } from 'react'
import { X, Loader2, Footprints, User, Minus, Plus } from 'lucide-react'
import { PAYMENT_METHODS, WALK_IN_PRESETS } from '../constants'
import { useWalkInForm } from '../hooks/useWalkInForm'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface WalkInFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}

export function WalkInFormModal({ isOpen, onClose, onSaved }: WalkInFormModalProps) {
  const { t } = useLanguage()
  const {
    form,
    setForm,
    saving,
    coaches,
    traineeResults,
    searchingTrainee,
    showTraineeDropdown,
    setShowTraineeDropdown,
    searchTrainees,
    selectTrainee,
    clearSelectedTrainee,
    handleSubmit
  } = useWalkInForm(isOpen, onSaved, onClose)

  const [presets, setPresets] = useState<number[]>(WALK_IN_PRESETS)
  const isWalkIn = form.type === 'walkin'

  if (!isOpen) return null

  const labelCls = 'block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1'
  const inputCls =
    'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
              <Footprints size={16} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t('gymLogVisit') || 'Log Gym Visit / Walk-In'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Member Search (Optional) */}
          <div className="relative">
            <label className={labelCls}>{t('gymTraineeOptional') || 'Registered Member (Leave blank for guest)'}</label>
            {form.traineeId ? (
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 text-sm font-bold">
                <div className="flex items-center gap-2">
                  <User size={14} />
                  <span>{form.traineeSearch}</span>
                </div>
                <button
                  type="button"
                  onClick={clearSelectedTrainee}
                  className="text-xs text-slate-400 hover:text-rose-500 font-semibold"
                >
                  Clear
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <input
                    className={inputCls}
                    value={form.traineeSearch}
                    onChange={e => searchTrainees(e.target.value)}
                    onFocus={() => form.traineeSearch && setShowTraineeDropdown(true)}
                    placeholder="Search by member name or phone (optional)..."
                  />
                  {searchingTrainee && (
                    <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
                  )}
                </div>

                {showTraineeDropdown && traineeResults.length > 0 && (
                  <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
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

          {/* Session Classification */}
          <div>
            <label className={labelCls}>{t('gymVisitType') || 'Visit Type'}</label>
            <select
              className={inputCls}
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
            >
              <option value="walkin">🚶 Paid Walk-In Entry</option>
              <option value="subscription_visit">✅ Subscription Visit ($0)</option>
            </select>
          </div>

          {/* Optional Coach Assignment */}
          <div>
            <label className={labelCls}>{t('gymCoachOptional') || 'Assigned Coach / Trainer'}</label>
            <select
              className={inputCls}
              value={form.coachId}
              onChange={e => setForm(f => ({ ...f, coachId: e.target.value }))}
            >
              <option value="">No Coach / General Floor</option>
              {coaches.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.specialty ? `(${c.specialty})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Amount Stepper */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t('gymDate') || 'Visit Date'}</label>
              <input
                type="date"
                className={inputCls}
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className={labelCls}>
                Amount ($) {isWalkIn && <span className="text-rose-500">*</span>}
              </label>
              <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-xs">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, amount: String(Math.max(0, (parseFloat(f.amount) || 0) - 5)) }))}
                  className="px-2.5 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <Minus size={13} />
                </button>
                <input
                  type="number"
                  min={isWalkIn ? '0.01' : '0'}
                  step="0.5"
                  className="w-full text-center text-sm font-bold text-slate-800 dark:text-slate-100 bg-transparent focus:outline-none py-1 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder={isWalkIn ? '0.00' : '0.00 (optional)'}
                  required={isWalkIn}
                />
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, amount: String((parseFloat(f.amount) || 0) + 5) }))}
                  className="px-2.5 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Quick preset chips for amount */}
          {isWalkIn && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {presets.map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, amount: String(amt) }))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                    parseFloat(form.amount) === amt
                      ? 'bg-orange-500 border-orange-500 text-white shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>
          )}

          {/* Payment Method */}
          {(isWalkIn || (form.amount && parseFloat(form.amount) > 0)) && (
            <div>
              <label className={labelCls}>{t('gymPaymentMethod') || 'Payment Method'}</label>
              <select
                className={inputCls}
                value={form.paymentMethod}
                onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
              >
                {PAYMENT_METHODS.map(pm => (
                  <option key={pm.value} value={pm.value}>
                    {pm.icon} {t(pm.labelKey) || pm.fallbackLabel}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className={labelCls}>{t('gymNotes') || 'Notes'}</label>
            <input
              className={inputCls}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Day pass, guest of member John..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {t('gymCancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              <span>{t('gymLogVisit') || 'Log Entry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}