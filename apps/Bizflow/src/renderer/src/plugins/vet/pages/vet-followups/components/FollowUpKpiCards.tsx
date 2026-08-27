import { AlertTriangle, Clock, CalendarCheck, CalendarRange } from 'lucide-react'
import { FollowUpMetrics } from '../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'

export function FollowUpKpiCards({
  metrics,
  activeFilter,
  onSelectFilter
}: {
  metrics: FollowUpMetrics
  activeFilter: string
  onSelectFilter: (f: any) => void
}) {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const cards = [
    {
      id: 'overdue',
      title: isAr ? 'متابعات متأخرة' : 'Overdue Callbacks',
      count: metrics.overdue,
      icon: AlertTriangle,
      tone: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/60',
      sub: isAr ? 'تتطلب اتصال فوري' : 'Action required'
    },
    {
      id: 'today',
      title: isAr ? 'مستحقة اليوم' : 'Due Today',
      count: metrics.today,
      icon: Clock,
      tone: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/60',
      sub: isAr ? 'مواعيد متابعة اليوم' : 'Scheduled for today'
    },
    {
      id: 'upcoming',
      title: isAr ? 'خلال هذا الأسبوع' : 'Next 7 Days',
      count: metrics.thisWeek,
      icon: CalendarCheck,
      tone: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50/60 dark:bg-teal-950/20 border-teal-200/80 dark:border-teal-900/60',
      sub: isAr ? 'متابعات قادمة' : 'Upcoming check-ins'
    },
    {
      id: 'all',
      title: isAr ? 'إجمالي المتابعات' : 'Total Active',
      count: metrics.total,
      icon: CalendarRange,
      tone: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50/60 dark:bg-violet-950/20 border-violet-200/80 dark:border-violet-900/60',
      sub: isAr ? 'في كافة الفترات' : 'All active records'
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
            onClick={() => onSelectFilter(card.id)}
            className={`relative overflow-hidden rounded-3xl border p-4 text-left rtl:text-right transition-all text-xs ${card.bg} ${
              isSelected ? 'ring-2 ring-violet-500 shadow-md scale-[1.02]' : 'hover:shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-500 dark:text-slate-400">{card.title}</span>
              <Icon size={18} className={card.tone} />
            </div>
            <p className={`text-2xl font-black ${card.tone}`}>{card.count}</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{card.sub}</p>
          </button>
        )
      })}
    </div>
  )
}