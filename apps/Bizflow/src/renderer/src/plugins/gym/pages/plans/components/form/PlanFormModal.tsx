import { X, Loader2, ListChecks } from 'lucide-react'
import { Plan, FormSection } from '../../types'
import { usePlanForm } from '../../hooks/usePlanForm'
import { getPlanColor } from '../../utils'
import { SectionBasic } from './SectionBasic'
import { SectionSessions } from './SectionSessions'
import { SectionAmenities } from './SectionAmenities'
import { SectionDisplay } from './SectionDisplay'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface PlanFormModalProps {
  isOpen: boolean
  onClose: () => void
  initial: Plan | null
  onSaved: (plan: Plan) => void
}

export function PlanFormModal({ isOpen, onClose, initial, onSaved }: PlanFormModalProps) {
  const { t } = useLanguage()
  const {
    form,
    saving,
    section,
    setSection,
    updateField,
    handleInputChange,
    handleSubmit
  } = usePlanForm(isOpen, initial, onSaved, onClose)

  if (!isOpen) return null

  const col = getPlanColor(form.color)
  const tabs: { key: FormSection; label: string }[] = [
    { key: 'basic', label: '1. Basic Info' },
    { key: 'sessions', label: '2. Visits & PT' },
    { key: 'amenities', label: '3. Amenities' },
    { key: 'display', label: '4. Theme & Status' }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
              <ListChecks size={16} />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {initial ? t('gymEditPlan') || 'Edit Membership Package' : t('gymNewPlan') || 'Create Membership Package'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-700/80 px-4 bg-slate-50/50 dark:bg-slate-900/20 overflow-x-auto">
          {tabs.map(tTab => (
            <button
              key={tTab.key}
              type="button"
              onClick={() => setSection(tTab.key)}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                section === tTab.key
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              {tTab.label}
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col justify-between">
          <div className="p-6">
            {section === 'basic' && (
              <SectionBasic
                form={form}
                onChange={handleInputChange}
                onSelectCategory={cat => updateField('category', cat)}
                onSelectDuration={days => updateField('durationDays', String(days))}
              />
            )}
            {section === 'sessions' && (
              <SectionSessions form={form} onChange={handleInputChange} />
            )}
            {section === 'amenities' && (
              <SectionAmenities
                form={form}
                onToggleAmenity={k => updateField(k, !form[k])}
                onChange={handleInputChange}
              />
            )}
            {section === 'display' && (
              <SectionDisplay
                form={form}
                onSelectColor={c => updateField('color', c)}
                onToggleField={k => updateField(k, !form[k])}
              />
            )}
          </div>

          {/* Sticky Actions */}
          <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700/80 px-6 py-4 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {t('gymCancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 px-4 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-sm disabled:opacity-60 flex items-center justify-center gap-2 ${col.btn}`}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              <span>{initial ? t('gymSave') || 'Save Changes' : t('gymAddPlan') || 'Publish Plan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}