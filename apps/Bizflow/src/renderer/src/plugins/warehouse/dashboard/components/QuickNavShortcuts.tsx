import React from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Boxes, ArrowRightLeft, BarChart3, ArrowUpRight } from 'lucide-react'
import { QUICK_NAV_LINKS } from '../constants'

export const QuickNavShortcuts: React.FC = () => {
  const navigate = useNavigate()

  const iconsMap: Record<string, any> = {
    locations: MapPin,
    inventory: Boxes,
    transfers: ArrowRightLeft,
    reports: BarChart3
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {QUICK_NAV_LINKS.map(link => {
        const Icon = iconsMap[link.tab] || Boxes
        return (
          <button
            key={link.tab}
            onClick={() => navigate(link.route)}
            className="group p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-left hover:border-indigo-300 dark:hover:border-indigo-800 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className={`p-2 rounded-xl border ${link.iconColor}`}>
                <Icon className="w-4 h-4" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {link.label}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                {link.description}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}