import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Users } from 'lucide-react'
import type { Employee } from '../types'
import { useLanguage } from '../../../contexts/LanguageContext'

interface Props {
  employees: Employee[]
  onFilterByDepartment: (dept: string) => void
}

/**
 * DepartmentsPanel — headcount per department with the member list. Clicking a
 * department jumps back to the team list filtered to that department.
 */
export default function DepartmentsPanel({ employees, onFilterByDepartment }: Props) {
  const navigate = useNavigate()
  const { t } = useLanguage()

  const depts = useMemo(() => {
    const map = new Map<string, Employee[]>()
    for (const e of employees) {
      if (e.status === 'terminated') continue
      const key = e.department?.trim() || 'Unassigned'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return Array.from(map.entries())
      .map(([name, members]) => ({ name, members, count: members.length }))
      .sort((a, b) => b.count - a.count)
  }, [employees])

  const maxCount = depts[0]?.count ?? 1

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center gap-2 px-5 pt-5">
        <Building2 size={15} className="text-primary" />
        <h3 className="font-semibold text-slate-900 dark:text-white">{t('empDepartments') ?? 'Departments'}</h3>
        <span className="ml-auto text-xs text-slate-400">{depts.reduce((s, d) => s + d.count, 0)}</span>
      </div>

      <div className="p-5 space-y-4 max-h-[360px] overflow-y-auto">
        {depts.length === 0 ? (
          <p className="text-xs text-slate-400">{t('empNoEmployeesFound') ?? 'No employees yet'}</p>
        ) : (
          depts.map(d => (
            <div key={d.name}>
              <button
                onClick={() => onFilterByDepartment(d.name === 'Unassigned' ? '' : d.name)}
                className="w-full flex items-center justify-between text-xs mb-1 group"
              >
                <span className="font-medium text-slate-600 dark:text-slate-300 group-hover:text-primary transition-colors truncate">{d.name}</span>
                <span className="text-slate-400 tabular-nums">{d.count}</span>
              </button>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(d.count / maxCount) * 100}%` }} />
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {d.members.slice(0, 5).map(m => (
                  <button
                    key={m.id}
                    onClick={() => navigate(`/employees/${m.id}`)}
                    title={m.name}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    <Users size={9} /> {m.name.split(' ')[0]}
                  </button>
                ))}
                {d.members.length > 5 && (
                  <span className="text-[11px] text-slate-400">+{d.members.length - 5} more</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
