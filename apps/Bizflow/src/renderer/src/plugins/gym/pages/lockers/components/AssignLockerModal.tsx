import { X, Search, Loader2, Calendar, UserCheck, ShieldCheck } from 'lucide-react'
import { Locker } from '../types'
import { useAssignLocker } from '../hooks/useAssignLocker'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface AssignLockerModalProps {
  locker: Locker | null
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}

export function AssignLockerModal({ locker, isOpen, onClose, onSaved }: AssignLockerModalProps) {
  const { t } = useLanguage()
  const {
    form,
    setForm,
    results,
    searching,
    saving,
    searchMembers,
    selectMember,
    clearMember,
    setQuickEndDate,
    handleSubmit
  } = useAssignLocker(locker, isOpen, onSaved, onClose)

  if (!isOpen || !locker) return null

  const labelCls = 'block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1'
  const inputCls =
    'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
              <UserCheck size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('gymAssignMember') || 'Assign Locker Unit'}
              </h3>
              <p className="text-xs text-slate-400">
                Unit <strong>{locker.number}</strong> · <span className="capitalize">{locker.zone} Section</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Member Search Autocomplete */}
          <div className="relative">
            <label className={labelCls}>Assignee Member *</label>
            {form.selectedMember ? (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-orange-500/[0.08] border border-orange-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center text-xs font-bold">
                    {form.selectedMember.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {form.selectedMember.name}
                    </p>
                    {form.selectedMember.phone && (
                      <p className="text-[11px] text-slate-400 font-mono">{form.selectedMember.phone}</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearMember}
                  className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    className={`${inputCls} pl-10 pr-9`}
                    placeholder={t('gymSearchMemberAssign') || 'Search active member by name or phone...'}
                    value={form.memberSearch}
                    onChange={e => searchMembers(e.target.value)}
                    autoFocus
                  />
                  {searching && (
                    <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
                  )}
                </div>

                {results.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-44 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
                    {results.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => selectMember(m)}
                        className="w-full text-left px-4 py-2.5 text-xs hover:bg-orange-500/10 flex items-center justify-between transition-colors"
                      >
                        <span className="font-bold text-slate-900 dark:text-white">{m.name}</span>
                        {m.phone && <span className="font-mono text-slate-400">{m.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* End Date & Quick Preset Chips */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelCls}>{t('gymEndDate') || 'Expiration Date (Optional)'}</label>
              <div className="flex gap-1">
                {[
                  { label: '+1m', months: 1 },
                  { label: '+3m', months: 3 },
                  { label: '+1y', months: 12 }
                ].map(chip => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => setQuickEndDate(chip.months)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-orange-400 text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="date"
                className={`${inputCls} pl-10`}
                value={form.endDate}
                onChange={e => setForm(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Assignment Notes */}
          <div>
            <label className={labelCls}>{t('gymNotes') || 'Handover & Security Notes'}</label>
            <textarea
              className={inputCls}
              rows={2}
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g. Physical key #4 given, combination 4821 set..."
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
              disabled={saving || !form.selectedMember}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              <span>{t('gymAssign') || 'Confirm Assignment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}