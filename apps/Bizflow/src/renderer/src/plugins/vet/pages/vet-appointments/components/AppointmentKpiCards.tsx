import { CalendarClock, CheckCircle2, UserCheck, XCircle } from 'lucide-react'
import { AppointmentMetrics } from '../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export function AppointmentKpiCards({
  metrics,
  activeFilter,
  onSelectFilter
}: {
  metrics: AppointmentMetrics
  activeFilter: string
  onSelectFilter: (f: string) => void
}) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const cards = [
    {
      id: 'scheduled',
      title: isAr ? 'مواعيد مجدولة' : 'Scheduled Slots',
      count: metrics.scheduled,
      icon: CalendarClock,
      tone: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-200/80 dark:border-blue-900/60'
    },
    {
      id: 'confirmed',
      title: isAr ? 'مؤكدة الحضور' : 'Confirmed',
      count: metrics.confirmed,
      icon: UserCheck,
      tone: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50/60 dark:bg-teal-950/20 border-teal-200/80 dark:border-teal-900/60'
    },
    {
      id: 'completed',
      title: isAr ? 'مكتملة' : 'Completed',
      count: metrics.completed,
      icon: CheckCircle2,
      tone: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/60'
    },
    {
      id: 'cancelled',
      title: isAr ? 'ملغاة / لم يحضر' : 'Cancelled / No Show',
      count: metrics.cancelled + metrics.noShow,
      icon: XCircle,
      tone: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/60'
    }
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {cards.map((card) => {
        const Icon = card.icon
        const isSelected = activeFilter === card.id

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelectFilter(activeFilter === card.id ? 'all' : card.id)}
            className={`relative overflow-hidden rounded-3xl border p-4 text-left rtl:text-right transition-all ${card.bg} ${
              isSelected ? 'ring-2 ring-violet-500 shadow-md scale-[1.02]' : 'hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{card.title}</span>
              <Icon size={18} className={card.tone} />
            </div>
            <p className={`text-2xl font-black ${card.tone}`}>{card.count}</p>
          </button>
        )
      })}
    </div>
  )
}