import { useState } from 'react'
import { Plus, Search, Users, Filter, DollarSign, X } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import Modal from '../../components/ui/Modal'
import StatsBar from './components/StatsBar'
import EmployeeCard from './components/EmployeeCard'
import EmployeeForm from './components/EmployeeForm'
import PayrollOverview from './components/PayrollOverview'
import { useEmployees } from './hooks/useEmployees'
import { usePluginRoles } from './hooks/usePluginRoles'

type TabView = 'team' | 'payroll'

export default function Employees() {
  const { t } = useLanguage()
  const state = useEmployees()
  const { allDepartments } = usePluginRoles()
  const [view, setView] = useState<TabView>('team')

  // Count helpers for the quick-status pills
  const countAll        = state.employees.length
  const countActive     = state.employees.filter(e => e.status === 'active').length
  const countOnLeave    = state.employees.filter(e => e.status === 'on-leave').length
  const countTerminated = state.employees.filter(e => e.status === 'terminated').length

  const hasActiveFilters = state.filterStatus || state.filterDepartment || state.filterRole

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="text-primary" size={28} /> {t('employeeManagement')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{t('empTrackTeam')}</p>
        </div>
        {view === 'team' && (
          <button onClick={state.openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> {t('addEmployee')}
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setView('team')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'team'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Users size={15} /> {t('empTeam') ?? 'Team'}
        </button>
        <button
          onClick={() => setView('payroll')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'payroll'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <DollarSign size={15} /> {t('empPayroll') ?? 'Payroll'}
        </button>
      </div>


      {/* ── Payroll tab ─────────────────────────────────────────────── */}
      {view === 'payroll' && <PayrollOverview />}

      {/* ── Team tab ────────────────────────────────────────────────── */}
      {view === 'team' && (<>
      {/* Stats */}
      {state.stats && <StatsBar stats={state.stats} />}

      {/* Search + Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm space-y-3">

        {/* Row 1: search + toggle */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              value={state.searchQuery}
              onChange={e => state.setSearchQuery(e.target.value)}
              placeholder={t('empSearchPlaceholder')}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
            />
          </div>
          <button
            onClick={() => state.setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${state.showFilters ? 'bg-primary text-white border-primary' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            <Filter size={16} /> {t('empFilters')} {hasActiveFilters ? '●' : ''}
          </button>
        </div>

        {/* Row 2: quick status pills */}
        <div className="flex gap-2 flex-wrap">
          {([
            { value: '',           label: t('empAllStatuses') ?? 'All',        count: countAll },
            { value: 'active',     label: t('empStatusActive'),               count: countActive },
            { value: 'on-leave',   label: t('empStatusOnLeave'),              count: countOnLeave },
            { value: 'terminated', label: t('empStatusTerminated'),           count: countTerminated },
          ] as const).map(pill => {
            const active = state.filterStatus === pill.value
            const baseClass = 'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all border'
            const activeClass =
              pill.value === 'active'     ? 'bg-green-600 text-white border-green-600' :
              pill.value === 'on-leave'   ? 'bg-amber-500 text-white border-amber-500' :
              pill.value === 'terminated' ? 'bg-red-600 text-white border-red-600' :
                                            'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900 border-slate-700 dark:border-slate-200'
            const inactiveClass = 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
            return (
              <button
                key={pill.value}
                onClick={() => state.setFilterStatus(pill.value)}
                className={`${baseClass} ${active ? activeClass : inactiveClass}`}
              >
                {pill.label}
                <span className={`tabular-nums font-semibold ${active ? 'opacity-90' : 'opacity-60'}`}>
                  {pill.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Row 3: dept + role filters (expandable) */}
        {state.showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <select
              value={state.filterDepartment}
              onChange={e => state.setFilterDepartment(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white"
            >
              <option value="">{t('empAllDepartments')}</option>
              {allDepartments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <input
              value={state.filterRole}
              onChange={e => state.setFilterRole(e.target.value)}
              placeholder={t('empAllRoles') ?? 'Filter by role…'}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        {/* Active filter chips */}
        {(state.filterDepartment || state.filterRole) && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Active:</span>
            {state.filterDepartment && (
              <button
                onClick={() => state.setFilterDepartment('')}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
              >
                {state.filterDepartment} <X size={10} />
              </button>
            )}
            {state.filterRole && (
              <button
                onClick={() => state.setFilterRole('')}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
              >
                Role: {state.filterRole} <X size={10} />
              </button>
            )}
            <button
              onClick={() => { state.setFilterDepartment(''); state.setFilterRole('') }}
              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline transition-colors"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Employee grid */}
      {state.loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : state.filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-16 text-center">
          <Users size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 dark:text-slate-400">{t('empNoEmployeesFound')}</p>
          <button onClick={state.openAdd} className="btn-primary mt-4">
            <Plus size={16} className="inline mr-1" /> {t('addEmployee')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {state.filtered.map(emp => (
            <EmployeeCard
              key={emp.id}
              emp={emp}
              onEdit={state.openEdit}
              onDelete={state.handleDelete}
              onCheckIn={state.handleCheckIn}
              onCheckOut={state.handleCheckOut}
              checkingIn={state.checkingIn}
            />
          ))}
        </div>
      )}
      </>)}

      {/* Add Modal */}
      <Modal isOpen={state.showAddModal} onClose={() => state.setShowAddModal(false)} title={t('addEmployee')} size="lg">
        <div className="space-y-5">
          <EmployeeForm formData={state.formData} onChange={updates => state.setFormData(p => ({ ...p, ...updates }))} />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button onClick={() => state.setShowAddModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
              {t('cancel')}
            </button>
            <button onClick={state.handleAdd} disabled={state.saving} className="btn-primary">
              {state.saving ? t('empSaving') : t('addEmployee')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={state.showEditModal} onClose={() => state.setShowEditModal(false)} title={t('editEmployee')} size="lg">
        <div className="space-y-5">
          <EmployeeForm formData={state.formData} onChange={updates => state.setFormData(p => ({ ...p, ...updates }))} />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button onClick={() => state.setShowEditModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
              {t('cancel')}
            </button>
            <button onClick={state.handleEdit} disabled={state.saving} className="btn-primary">
              {state.saving ? t('empSaving') : t('empSaveChanges')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

