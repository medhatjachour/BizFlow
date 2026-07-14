import { TrendingDown, TrendingUp } from "lucide-react"

export const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
     <div
  className="custom-tooltip"
  style={{
    background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
    padding: '12px 16px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    color: '#333',
    fontFamily: 'Segoe UI, sans-serif',
    fontSize: '14px',
    transition: 'opacity 0.3s ease',
    opacity: 0.95,
    position: 'relative'
  }}
>
  <p style={{ margin: 0, fontWeight: 500,color: '#787777' }}>
    {`${label} : ${payload[0].value}`} $
  </p>
  {/* Arrow */}
  <span
    style={{
      position: 'absolute',
      bottom: '-6px',
      left: '20px',
      width: 0,
      height: 0,
      borderLeft: '6px solid transparent',
      borderRight: '6px solid transparent',
      borderTop: '6px solid #f0f0f0'
    }}
  />
</div>

    )
  }
  return null
}

export const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  color
}: {
  icon: any
  label: string
  value: string | number
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
  color: string
}) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
    <div className="flex items-start justify-between mb-3">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {label}
      </span>
      <div className={`p-2 rounded-xl ${color}`}>
        <Icon size={16} />
      </div>
    </div>
    <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub}</p>}
    {trend && trend !== 'neutral' && (
      <div
        className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}
      >
        {trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        vs previous period
      </div>
    )}
  </div>
)

export function TabButton({
  active,
  onClick,
  icon,
  label
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${active ? 'bg-amber-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
    >
      {icon}
      {label}
    </button>
  )
}