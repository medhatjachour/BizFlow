import { useNavigate } from 'react-router-dom'
import { Edit2, Trash2, LogIn, LogOut, ChevronRight, Mail, Phone, Building2, Briefcase, Calendar, Star } from 'lucide-react'
import type { Employee } from '../types'
import { useLanguage } from '../../../contexts/LanguageContext'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'on-leave': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  terminated: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
function avatarColor(name: string) {
  const colors = ['from-violet-500 to-purple-600', 'from-blue-500 to-cyan-600', 'from-emerald-500 to-teal-600', 'from-rose-500 to-pink-600', 'from-amber-500 to-orange-600']
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return colors[h % colors.length]
}

interface Props {
  emp: Employee
  onEdit: (emp: Employee) => void
  onDelete: (emp: Employee) => void
  onCheckIn: (emp: Employee) => void
  onCheckOut: (emp: Employee) => void
  checkingIn: string | null
}

export default function EmployeeCard({ emp, onEdit, onDelete, onCheckIn, onCheckOut, checkingIn }: Props) {
  const navigate = useNavigate()
  const { t } = useLanguage()

  const statusLabel: Record<string, string> = {
    active: t('empStatusActive'),
    'on-leave': t('empStatusOnLeave'),
    terminated: t('empStatusTerminated'),
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${avatarColor(emp.name)} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
            {getInitials(emp.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-white truncate">{emp.name}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_COLORS[emp.status] || ''}`}>
                {statusLabel[emp.status] ?? emp.status}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{emp.role}{emp.department ? ` · ${emp.department}` : ''}</p>
            {emp.performanceScore != null && emp.performanceScore > 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                <Star size={12} className="text-amber-400 fill-amber-400" />
                <span className="text-xs text-amber-600 dark:text-amber-400">{emp.performanceScore}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          {emp.email && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Mail size={12} className="shrink-0" /><span className="truncate">{emp.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Phone size={12} className="shrink-0" />{emp.phone}
          </div>
          {emp.department && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Building2 size={12} className="shrink-0" />{emp.department}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Briefcase size={12} className="shrink-0" />
            <span className="font-medium text-slate-700 dark:text-slate-300">${Number(emp.salary).toLocaleString()}</span>
            <span>/{emp.salaryType}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Calendar size={12} className="shrink-0" />
            {t('empHiredLabel')} {new Date(emp.hireDate).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="px-5 pb-3 flex gap-2 flex-wrap border-t border-slate-100 dark:border-slate-700 pt-3">
        {emp.status === 'active' && (
          <>
            <button
              onClick={() => onCheckIn(emp)}
              disabled={checkingIn === emp.id}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <LogIn size={12} /> {t('empCheckIn')}
            </button>
            <button
              onClick={() => onCheckOut(emp)}
              disabled={checkingIn === emp.id}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <LogOut size={12} /> {t('empCheckOut')}
            </button>
          </>
        )}
        <button
          onClick={() => navigate(`/employees/${emp.id}`)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-medium transition-colors ml-auto"
        >
          View <ChevronRight size={12} />
        </button>
        <button onClick={() => onEdit(emp)} className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <Edit2 size={14} />
        </button>
        <button onClick={() => onDelete(emp)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

