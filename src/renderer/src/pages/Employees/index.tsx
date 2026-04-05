import { useState } from 'react'
import { Plus, Search, Users, Filter, DollarSign, Stethoscope } from 'lucide-react'
import ClinicStaffPanel from '../../plugins/clinic/components/ClinicStaffPanel'
import { useLanguage } from '../../contexts/LanguageContext'
import Modal from '../../components/ui/Modal'
import StatsBar from './components/StatsBar'
import EmployeeCard from './components/EmployeeCard'
import EmployeeForm from './components/EmployeeForm'
import PayrollOverview from './components/PayrollOverview'
import { useEmployees, DEPARTMENTS, ROLES } from './hooks/useEmployees'

type TabView = 'team' | 'payroll' | 'clinic'

export default function Employees() {
  const { t } = useLanguage()
  const state = useEmployees()
  const [view, setView] = useState<TabView>('team')

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
        <button
          onClick={() => setView('clinic')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'clinic'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Stethoscope size={15} /> Clinic Staff
        </button>
      </div>


      {/* ── Payroll tab ─────────────────────────────────────────────── */}
      {view === 'payroll' && <PayrollOverview />}

      {/* ── Clinic Staff tab ────────────────────────────────────────── */}
      {view === 'clinic' && <ClinicStaffPanel />}

      {/* ── Team tab ────────────────────────────────────────────────── */}
      {view === 'team' && (<>
      {/* Stats */}
      {state.stats && <StatsBar stats={state.stats} />}

      {/* Search + Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm space-y-3">
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
            <Filter size={16} /> {t('empFilters')} {(state.filterStatus || state.filterDepartment || state.filterRole) ? '●' : ''}
          </button>
        </div>
        {state.showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <select value={state.filterStatus} onChange={e => state.setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white">
              <option value="">{t('empAllStatuses')}</option>
              <option value="active">{t('empStatusActive')}</option>
              <option value="on-leave">{t('empStatusOnLeave')}</option>
              <option value="terminated">{t('empStatusTerminated')}</option>
            </select>
            <select value={state.filterDepartment} onChange={e => state.setFilterDepartment(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white">
              <option value="">{t('empAllDepartments')}</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={state.filterRole} onChange={e => state.setFilterRole(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-white">
              <option value="">{t('empAllRoles')}</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
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
      <Modal isOpen={state.showAddModal} onClose={() => state.setShowAddModal(false)} title={t('addEmployee')}>
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
      <Modal isOpen={state.showEditModal} onClose={() => state.setShowEditModal(false)} title={t('editEmployee')}>
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

