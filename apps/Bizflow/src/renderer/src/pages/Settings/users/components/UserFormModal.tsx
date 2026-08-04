// features/settings/users-roles/components/UserFormModal.tsx

import { useEffect, useMemo, useState } from 'react'
import { Eye, EyeOff, X, ShieldCheck } from 'lucide-react'
import type { User, NewUserPayload, UpdateUserPayload, RoleId } from '../types'
import {
  getAvailableBuiltinRoles, getRoleMeta, getDefaultNewUserRole, PASSWORD_MIN_LENGTH,
  getRelevantCapabilities,
} from '../constants'
import { validateUsername, validateEmail, validatePassword, resolveCapabilities } from '../utils'

interface AddProps {
  mode: 'add'
  onSubmit: (p: NewUserPayload) => Promise<boolean>
}
interface EditProps {
  mode: 'edit'
  user: User
  onSubmit: (id: string, p: UpdateUserPayload) => Promise<boolean>
}
type Props = (AddProps | EditProps) & {
  onClose: () => void
  customRoleIds?: RoleId[]
  rolesData?: Record<RoleId, { capabilities: string[]; isWildcard: boolean }>
}

export function UserFormModal(props: Props) {
  const isEdit = props.mode === 'edit'
  const availableRoles = useMemo(
    () => [...getAvailableBuiltinRoles(), ...(props.customRoleIds ?? [])],
    [props.customRoleIds],
  )

  const [form, setForm] = useState(() => {
    if (isEdit) {
      const u = (props as EditProps).user
      return {
        username: u.username,
        fullName: u.fullName ?? '',
        email: u.email ?? '',
        phone: u.phone ?? '',
        role: u.role,
        isActive: u.isActive,
        password: '',
        confirmPassword: '',
      }
    }
    return {
      username: '',
      fullName: '',
      email: '',
      phone: '',
      role: getDefaultNewUserRole(),
      isActive: true,
      password: '',
      confirmPassword: '',
    }
  })

  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose()
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form])

  const selectedRoleCaps = useMemo(() => {
    if (!props.rolesData) return null
    const info = props.rolesData[form.role]
    if (!info) return null
    return resolveCapabilities(form.role, info.capabilities)
  }, [form.role, props.rolesData])

  async function submit() {
    const e: Record<string, string> = {}
    if (!isEdit) {
      const ue = validateUsername(form.username); if (ue) e.username = ue
      const pe = validatePassword(form.password); if (pe) e.password = pe
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match'
    }
    const emErr = validateEmail(form.email); if (emErr) e.email = emErr
    if (Object.keys(e).length) { setErrors(e); return }

    setSubmitting(true)
    try {
      if (isEdit) {
        const ok = await (props as EditProps).onSubmit((props as EditProps).user.id, {
          fullName: form.fullName || null,
          email: form.email || null,
          phone: form.phone || null,
          role: form.role,
          isActive: form.isActive,
        })
        if (ok) props.onClose()
      } else {
        const ok = await (props as AddProps).onSubmit({
          username: form.username,
          password: form.password,
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          role: form.role,
        })
        if (ok) props.onClose()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const roleMeta = getRoleMeta(form.role)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {isEdit ? 'Edit User' : 'Add New User'}
          </h2>
          <button onClick={props.onClose} className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm(p => ({ ...p, username: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                  ${errors.username ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                placeholder="username"
                autoComplete="off"
              />
              {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username}</p>}
            </div>
          )}

          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Username</label>
              <input
                type="text"
                value={form.username}
                disabled
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400"
              />
              <p className="text-xs text-slate-400 mt-1">Username cannot be changed</p>
            </div>
          )}

          {!isEdit && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                      ${errors.password ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(e) => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                      ${errors.confirmPassword ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => setForm(p => ({ ...p, fullName: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              placeholder="John Doe"
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                  ${errors.email ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`}
                placeholder="user@example.com"
                autoComplete="off"
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                placeholder="+1-555-0000"
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm(p => ({ ...p, role: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              {availableRoles.map(r => (
                <option key={r} value={r}>{getRoleMeta(r).label}</option>
              ))}
            </select>
            <div className="mt-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{roleMeta.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{roleMeta.description}</p>
                  {selectedRoleCaps && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      {selectedRoleCaps.length} capabilities enabled
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {isEdit && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Account is active</span>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : isEdit ? 'Update User' : 'Create User'}
          </button>
          <button
            onClick={props.onClose}
            className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
