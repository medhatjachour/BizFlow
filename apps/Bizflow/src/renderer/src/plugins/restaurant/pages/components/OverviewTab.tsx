import { useEffect, useState } from 'react'
import { Table2, CalendarDays, ClipboardList, BookOpen, RefreshCw, AlertCircle } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Overview {
  totalTables: number; available: number; occupied: number; reserved: number; cleaning: number
  openOrders: number; todayReservations: number; availableMenuItems: number
}

const STATUS_COLOR: Record<string, string> = {
  available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  occupied:  'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400',
  reserved:  'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
  cleaning:  'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',
}

export default function OverviewTab({ onNavigate }: { onNavigate: (tab: any) => void }) {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { t } = useLanguage()

  const load = async () => {
    setLoading(true); setError('')
    try { setData(await window.api.restaurant.getOverview()) }
    catch { setError(t('restaurantOverviewLoadFailed')) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="flex items-center justify-center h-40"><RefreshCw className="animate-spin text-slate-400 w-6 h-6" /></div>
  if (error)   return <div className="flex items-center gap-2 text-red-500 p-4"><AlertCircle className="w-5 h-5" />{error}</div>
  if (!data)   return null

  const stats = [
    { label: t('restaurantTotalTables'),     value: data.totalTables,        icon: Table2,        color: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300', nav: 'tables' },
    { label: t('restaurantOpenOrders'),      value: data.openOrders,         icon: ClipboardList, color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',       nav: 'orders' },
    { label: t('restaurantTodayReservations'),  value: data.todayReservations,  icon: CalendarDays,  color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400', nav: 'reservations' },
    { label: t('restaurantMenuItems'),       value: data.availableMenuItems, icon: BookOpen,      color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400', nav: 'menu' },
  ]

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, nav }) => (
          <button key={label} onClick={() => onNavigate(nav)}
            className="text-left p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
            <div className={`inline-flex p-2.5 rounded-xl mb-3 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
          </button>
        ))}
      </div>

      {/* Table status breakdown */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">{t('restaurantTableStatus')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['available','occupied','reserved','cleaning'] as const).map(s => {
            const labelKey = `restaurant${s.charAt(0).toUpperCase() + s.slice(1)}` as any
            return (
            <div key={s} className={`p-4 rounded-xl text-center ${STATUS_COLOR[s]}`}>
              <div className="text-2xl font-bold">{(data as any)[s]}</div>
              <div className="text-xs font-medium capitalize mt-0.5">{t(labelKey)}</div>
            </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
