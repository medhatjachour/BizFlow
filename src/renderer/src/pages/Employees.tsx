import { useState, useEffect } from 'react'
import { Plus, Users, Clock, Mail, Phone, Edit2, Trash2 } from 'lucide-react'
import Modal from '../components/ui/Modal'
import { ipc } from '../utils/ipc'
import { useToast } from '../contexts/ToastContext'
import { useLanguage } from '../contexts/LanguageContext'
import logger from '../../../shared/utils/logger'

type Employee = {
  id: string
  name: string
  role: string
  email: string
  phone: string
  salary?: number
  performance?: number
  createdAt?: string
  updatedAt?: string
}

export default function Employees(): JSX.Element {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()
  const { t } = useLanguage()

  const [formData, setFormData] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    salary: 0
  })

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    try {
      setLoading(true)
      const data = await ipc.employees.getAll()
      setEmployees(data)
    } catch (error) {
      logger.error('Failed to load employees:', error)
      toast.error('Failed to load employees')
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error(t('employeeNameRequired'))
      return false
    }
    if (!formData.role.trim()) {
      toast.error(t('employeeRoleRequired'))
      return false
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      toast.error(t('validEmailRequired'))
      return false
    }
    
    // Phone validation - accepts multiple formats
    if (!formData.phone.trim()) {
      toast.error(t('phoneRequired'))
      return false
    }
    
    // Remove all non-digit characters for validation
    const digitsOnly = formData.phone.replace(/\D/g, '')
    
    // Check if we have at least 10 digits (US phone number)
    if (digitsOnly.length < 10) {
      toast.error(t('phoneMinDigits'))
      return false
    }
    
    if (digitsOnly.length > 15) {
      toast.error(t('phoneMaxDigits'))
      return false
    }
    
    // Optional: Validate format (US format check)
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/
    if (!phoneRegex.test(formData.phone)) {
      toast.error(t('invalidPhoneFormat'))
      return false
    }
    
    return true
  }

  const handleAddEmployee = async () => {
    if (!validateForm()) return

    try {
      const result = await ipc.employees.create(formData)
      
      if (result && result.success) {
        await loadEmployees()
        setShowAddModal(false)
        resetForm()
        toast.success(t('employeeAddedSuccess'))
      } else {
        toast.error(t('employeeAddFailed'))
      }
    } catch (error) {
      logger.error('Error adding employee:', error)
      toast.error(t('employeeAddFailed'))
    }
  }

  const handleEditEmployee = async () => {
    if (!validateForm() || !selectedEmployee) return

    try {
      const result = await ipc.employees.update(selectedEmployee.id, formData)
      
      if (result.success) {
        await loadEmployees()
        setShowEditModal(false)
        resetForm()
        setSelectedEmployee(null)
        toast.success(t('employeeUpdatedSuccess'))
      } else {
        toast.error(t('employeeUpdateFailed'))
      }
    } catch (error) {
      logger.error('Error updating employee:', error)
      toast.error(t('employeeUpdateFailed'))
    }
  }

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm(t('confirmDeleteEmployee'))) return

    try {
      const result = await ipc.employees.delete(id)
      if (result.success) {
        await loadEmployees()
        toast.success(t('employeeDeletedSuccess'))
      } else {
        toast.error(t('employeeDeleteFailed'))
      }
    } catch (error) {
      logger.error('Error deleting employee:', error)
      toast.error(t('employeeDeleteFailed'))
    }
  }

  const openEditModal = (employee: Employee) => {
    setSelectedEmployee(employee)
    setFormData({
      name: employee.name,
      role: employee.role,
      email: employee.email,
      phone: employee.phone,
      salary: employee.salary || 0
    })
    setShowEditModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      role: '',
      email: '',
      phone: '',
      salary: 0
    })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r  bg-clip-text">
            {t('employeeManagement')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">{t('employeeManagementDesc')}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          {t('addEmployee')}
        </button>
      </div>

      {loading ? (
        <div className="glass-card p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">{t('loadingEmployees')}</p>
        </div>
      ) : employees.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Users size={48} className="mx-auto text-slate-400 mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('noEmployeesYet')}</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{t('addFirstEmployee')}</p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus size={20} className="inline mr-2" />
            {t('addEmployee')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((emp) => (
            <div key={emp.id} className="glass-card p-6 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold shrink-0">
                  {emp.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">{emp.name}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{emp.role}</p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Mail size={16} className="shrink-0" />
                  <span className="truncate">{emp.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Phone size={16} className="shrink-0" />
                  {emp.phone}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Clock size={16} className="shrink-0" />
                  <span className="font-medium">{t('salary')}:</span>
                  <span className="ml-1">{emp.salary !== undefined ? `$${Number(emp.salary).toFixed(2)}` : '—'}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => openEditModal(emp)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors"
                >
                  <Edit2 size={16} />
                  {t('edit')}
                </button>
                <button
                  onClick={() => handleDeleteEmployee(emp.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-error/10 text-error hover:bg-error/20 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                  {t('delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Employee Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          resetForm()
        }}
        title={t('addNewEmployee')}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('fullName')} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                placeholder={t('employeeNamePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('rolePosition')} *
              </label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="input-field"
                placeholder={t('rolePlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('email')} *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field"
                placeholder={t('emailPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('phone')} *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input-field"
                placeholder={t('phonePlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('salaryMonthly')}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
                className="input-field"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => {
                setShowAddModal(false)
                resetForm()
              }}
              className="px-6 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              {t('cancel')}
            </button>
            <button onClick={handleAddEmployee} className="btn-primary">
              {t('addEmployee')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          resetForm()
          setSelectedEmployee(null)
        }}
        title={t('editEmployee')}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('fullName')} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('rolePosition')} *
              </label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="input-field"
                placeholder={t('rolePlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('email')} *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('phone')} *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('salaryMonthly')}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
                className="input-field"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => {
                setShowEditModal(false)
                resetForm()
                setSelectedEmployee(null)
              }}
              className="px-6 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              {t('cancel')}
            </button>
            <button onClick={handleEditEmployee} className="btn-primary">
              {t('updateEmployee')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
