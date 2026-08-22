import { Pencil, Trash2, Star, BadgeCheck, Ticket, Snowflake } from 'lucide-react'
import { Plan } from '../types'
import { AMENITIES } from '../constants'
import { getPlanColor, getPlanCategory, formatDurationLabel } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface PlanCardProps {
  plan: Plan
  onEdit: () => void
  onDelete: () => void
}

export function PlanCard({ plan, onEdit, onDelete }: PlanCardProps) {
  const { t } = useLanguage()
  const col = getPlanColor(plan.color)
  const cat = getPlanCategory(plan.category)
  const CatIcon = cat.icon
  const activeAmenities = AMENITIES.filter(a => plan[a.key as keyof Plan])

  return (
    <div
      className={`relative bg-gradient-to-br dark:from-slate-800/90 dark:to-slate-800/40 ${col.from} ${col.to} rounded-3xl border ${
        plan.isActive
          ? 'border-slate-200/80 dark:border-slate-700/80'
          : 'border-dashed border-slate-300 dark:border-slate-700 opacity-60'
      } overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between`}
    >
      <div>
        {/* Popular Tag */}
        {plan.isPopular && (
          <div
            className={`absolute top-4 right-4 flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black text-white ${col.badge} shadow-xs`}
          >
            <Star size={9} fill="currentColor" /> POPULAR
          </div>
        )}

        {/* Top Header info */}
        <div className="px-6 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/80 dark:bg-slate-700/80 shadow-2xs ${col.text}`}
            >
              <CatIcon size={11} /> {cat.label}
            </span>
            {!plan.isActive && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-700 text-slate-500">
                Inactive
              </span>
            )}
          </div>

          <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight pr-14">
            {plan.name}
          </h3>

          {plan.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {plan.description}
            </p>
          )}
        </div>

        {/* Pricing Banner */}
        <div className="mx-6 mb-3 rounded-2xl px-4.5 py-3 bg-white/70 dark:bg-slate-700/50 backdrop-blur-xs border border-white/50 dark:border-slate-600/30 flex items-baseline justify-between">
          <div>
            <span className={`text-2xl font-black tabular-nums tracking-tight ${col.text}`}>
              ${plan.price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {plan.durationDays} Days ({formatDurationLabel(plan.durationDays)})
          </span>
        </div>

        {/* Sessions Matrix */}
        <div className="px-6 mb-3 grid grid-cols-3 gap-1.5 text-center">
          {[
            { val: plan.sessionsPerWeek != null ? plan.sessionsPerWeek : '∞', lbl: 'Per Week' },
            { val: plan.sessionsTotal != null ? plan.sessionsTotal : '∞', lbl: 'Total Visits' },
            { val: plan.coachSessions > 0 ? plan.coachSessions : '—', lbl: 'PT Sessions', hi: plan.coachSessions > 0 }
          ].map(({ val, lbl, hi }) => (
            <div key={lbl} className="bg-white/60 dark:bg-slate-700/40 rounded-xl py-2 px-1">
              <p className={`text-sm font-black ${hi ? col.text : 'text-slate-800 dark:text-slate-100'}`}>
                {val}
              </p>
              <p className="text-[10px] font-semibold text-slate-400 leading-tight mt-0.5">{lbl}</p>
            </div>
          ))}
        </div>

        {/* Included Amenities Chips */}
        {(activeAmenities.length > 0 || plan.guestPasses > 0) && (
          <div className="px-6 mb-3 flex flex-wrap gap-1.5">
            {activeAmenities.map(a => {
              const Icon = a.icon
              return (
                <span
                  key={a.key}
                  className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg bg-white/70 dark:bg-slate-700/60 font-semibold shadow-2xs ${a.color}`}
                >
                  <Icon size={10} /> {a.label}
                </span>
              )
            })}
            {plan.guestPasses > 0 && (
              <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                <Ticket size={10} /> {plan.guestPasses} Guest Pass{plan.guestPasses !== 1 ? 'es' : ''}
              </span>
            )}
          </div>
        )}

        {/* Features & Freeze Tag */}
        {(plan.maxFreezeDays > 0 || plan.features) && (
          <div className="px-6 mb-3 flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {plan.maxFreezeDays > 0 && (
              <span className="flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md">
                <Snowflake size={10} /> {plan.maxFreezeDays}d Freeze Limit
              </span>
            )}
            {plan.features &&
              plan.features
                .split(',')
                .map(f => f.trim())
                .filter(Boolean)
                .map(f => (
                  <span key={f} className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                    <BadgeCheck size={11} className="text-emerald-500" /> {f}
                  </span>
                ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-auto px-6 py-3.5 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-orange-600 dark:text-slate-300 dark:hover:text-orange-400 transition-colors"
        >
          <Pencil size={13} />
          <span>{t('gymEdit') || 'Edit Package'}</span>
        </button>

        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
        >
          <Trash2 size={13} />
          <span>{t('gymDelete') || 'Delete'}</span>
        </button>
      </div>
    </div>
  )
}