import { useState } from 'react'
import { Plus, Search, Users, Filter, DollarSign, X, BarChart3, Download, LayoutDashboard } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Dashboard from './components/Dashboard'
import EmployeeAnalytics from './components/EmployeeAnalytics'
import EmployeeCard from './components/EmployeeCard'
import EmployeeForm from './components/EmployeeForm'
import PayrollOverview from './components/PayrollOverview'
import { useEmployees } from './hooks/useEmployees'
import { usePluginRoles } from './hooks/usePluginRoles'

type TabView = 'dashboard' | 'team' | 'analytics' | 'payroll'

export default function Employees() {
  const { t } = useLanguage()
  const { can } = useAuth()
  const canFinance = can('view_finance')
  const state = useEmployees()
  const { allDepartments } = usePluginRoles()
  const [view, setView] = useState<TabView>('dashboard')

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
        <div className="flex items-center gap-2">
          {view === 'team' && (
            <button
              onClick={state.toggleSelectMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${state.selectMode ? 'bg-primary text-white border-primary' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              {state.selectMode ? (t('cancel') ?? 'Cancel') : (t('empSelect') ?? 'Select')}
            </button>
          )}
          <button onClick={state.openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> {t('addEmployee')}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setView('dashboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'dashboard'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <LayoutDashboard size={15} /> {t('empDashboard') ?? 'Dashboard'}
        </button>
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
          onClick={() => setView('analytics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'analytics'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <BarChart3 size={15} /> {t('empAnalytics') ?? 'Analytics'}
        </button>
        {canFinance && (
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
        )}
      </div>


      {/* ── Dashboard tab ───────────────────────────────────────────── */}
      {view === 'dashboard' && (
        <Dashboard
          employees={state.employees}
          stats={state.stats}
          checkingIn={state.checkingIn}
          onCheckIn={state.handleCheckIn}
          onCheckOut={state.handleCheckOut}
          onFilterByDepartment={(dept) => {
            state.setFilterDepartment(dept)
            setView('team')
          }}
        />
      )}

      {/* ── Payroll tab ─────────────────────────────────────────────── */}
      {view === 'payroll' && canFinance && <PayrollOverview />}

      {/* ── Analytics tab ───────────────────────────────────────────── */}
      {view === 'analytics' && <EmployeeAnalytics employees={state.employees} stats={state.stats} />}

      {/* ── Team tab ────────────────────────────────────────────────── */}
      {view === 'team' && (<>

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
          <select
            value={state.sortBy}
            onChange={e => state.setSortBy(e.target.value as typeof state.sortBy)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-700 dark:text-slate-300 cursor-pointer focus:ring-2 focus:ring-primary"
            title={t('empSortBy') ?? 'Sort by'}
          >
            <option value="name">{t('empSortName') ?? 'Name'}</option>
            <option value="hire">{t('empSortHire') ?? 'Recently hired'}</option>
            <option value="performance">{t('empSortPerformance') ?? 'Performance'}</option>
            <option value="department">{t('empSortDept') ?? 'Department'}</option>
          </select>
          <button
            onClick={state.exportCsv}
            disabled={state.filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            title={t('empExportCsv') ?? 'Export CSV'}
          >
            <Download size={16} /> {t('empExport') ?? 'Export'}
          </button>
        </div>

        {/* Result count */}
        <p className="text-xs text-slate-400">
          {t('empShowing') ?? 'Showing'} {state.filtered.length} {t('empOf') ?? 'of'} {state.totalCount}
        </p>

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

      {/* Bulk action bar */}
      {state.selectMode && (
        <div className="flex items-center gap-3 flex-wrap px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
          <label className="flex items-center gap-2 text-sm font-medium text-primary cursor-pointer select-none">
            <input type="checkbox" checked={state.allSelected} onChange={state.selectAllFiltered} className="w-4 h-4 accent-primary" />
            {state.allSelected ? (t('empDeselectAll') ?? 'Deselect all') : (t('empSelectAll') ?? 'Select all')} ({state.filtered.length})
          </label>
          {state.selectedIds.size > 0 && (
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <span className="text-sm text-primary">{state.selectedIds.size} {t('empSelected') ?? 'selected'}</span>
              <button disabled={state.bulkBusy} onClick={() => state.bulkSetStatus('active')} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors">{t('empStatusActive')}</button>
              <button disabled={state.bulkBusy} onClick={() => state.bulkSetStatus('on-leave')} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors">{t('empStatusOnLeave')}</button>
              <button disabled={state.bulkBusy} onClick={() => state.bulkSetStatus('terminated')} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">{t('empStatusTerminated')}</button>
              <button onClick={state.clearSelected} className="px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">{t('empClearSelection') ?? 'Clear'}</button>
            </div>
          )}
        </div>
      )}

      {/* Employee grid */}
      {state.loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : state.filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-16 text-center">
          <Users size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          {state.totalCount === 0 ? (
            <>
              <p className="text-slate-500 dark:text-slate-400">{t('empNoEmployeesFound')}</p>
              <button onClick={state.openAdd} className="btn-primary mt-4">
                <Plus size={16} className="inline mr-1" /> {t('addEmployee')}
              </button>
            </>
          ) : (
            <>
              <p className="text-slate-500 dark:text-slate-400">{t('empNoMatches') ?? 'No employees match your filters'}</p>
              <button
                onClick={() => { state.setSearchQuery(''); state.setFilterStatus(''); state.setFilterDepartment(''); state.setFilterRole('') }}
                className="mt-4 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                {t('empClearFilters') ?? 'Clear filters'}
              </button>
            </>
          )}
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
              selectMode={state.selectMode}
              selected={state.selectedIds.has(emp.id)}
              onToggleSelect={state.toggleSelected}
            />
          ))}
        </div>
      )}
      </>)}

      {/* Add Modal */}
      <Modal isOpen={state.showAddModal} onClose={() => state.setShowAddModal(false)} title={t('addEmployee')} size="lg">
        <div className="space-y-5">
          <EmployeeForm formData={state.formData} onChange={updates => state.setFormData(p => ({ ...p, ...updates }))} managerOptions={state.employees} />
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
          <EmployeeForm formData={state.formData} onChange={updates => state.setFormData(p => ({ ...p, ...updates }))} managerOptions={state.employees} excludeId={state.selected?.id} />
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

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!state.deleteTarget}
        title={t('empConfirmDeleteTitle') ?? 'Delete employee'}
        message={state.deleteTarget ? t('empConfirmDelete', { name: state.deleteTarget.name }) : ''}
        confirmLabel={t('delete') ?? 'Delete'}
        busy={state.deleting}
        onConfirm={state.confirmDelete}
        onCancel={state.cancelDelete}
      />
    </div>
  )
}

