
import { useState, useEffect } from 'react'
import { X, Plus, Loader2, Pencil, Trash2, Check, Tag } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { VisitType } from '../types'
import { SWATCH_COLORS } from '../constants'
import { getVisitTypeLabel } from '../utils'

interface Props {
  onClose: () => void
  onChanged?: () => void
}

const inputCls =
  'w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all'

export function VetVisitTypesManager({ onClose, onChanged }: Props) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const toast = useToast()

  const [types, setTypes] = useState<VisitType[]>([])
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [color, setColor] = useState(SWATCH_COLORS[0])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState(SWATCH_COLORS[0])

  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string; count: number } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const rows = (await window.api.vet?.visitTypes?.getAll()) as any
      setTypes(Array.isArray(rows) ? rows : [])
    } catch {
      toast.error(isAr ? 'فشل تحميل أنواع الزيارات' : 'Failed to load visit types')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleAdd = async () => {
    const v = name.trim()
    if (!v) {
      setError(isAr ? 'اسم نوع الزيارة مطلوب' : 'Visit type name is required')
      return
    }

    setSaving(true)
    try {
      await window.api.vet?.visitTypes?.create({ name: v, color })
      setName('')
      setColor(SWATCH_COLORS[0])
      setError('')
      await load()
      onChanged?.()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to add visit type')
    } finally {
      setSaving(false)
    }
  }

  const saveEdit = async (id: string) => {
    try {
      await window.api.vet?.visitTypes?.update(id, { name: editName.trim(), color: editColor })
      setEditId(null)
      await load()
      onChanged?.()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update')
    }
  }

  const doDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await window.api.vet?.visitTypes?.delete(confirmDelete.id)
      toast.success(isAr ? 'تم حذف نوع الزيارة' : 'Visit type deleted')
      setConfirmDelete(null)
      await load()
      onChanged?.()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Tag size={16} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">
                {isAr ? 'إدارة أنواع الزيارات' : 'Manage Visit Types'}
              </h2>
              <p className="text-xs text-slate-400">{types.length} {isAr ? 'أنواع مسجلة' : 'types registered'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>

        {/* Add Input */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-2.5">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
              placeholder={isAr ? 'مثال: فحص دوري، تطعيم، سونار...' : 'e.g. Sonar, Vaccination, Surgery'}
              className={`${inputCls} flex-1`}
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-all flex items-center gap-1 disabled:opacity-50 shrink-0"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              <span>{isAr ? 'إضافة' : 'Add'}</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {SWATCH_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-5 h-5 rounded-full transition-transform ${
                  color === c ? 'ring-2 ring-offset-2 ring-violet-500 scale-110' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {error && <p className="text-xs font-bold text-rose-500">{error}</p>}
        </div>

        {/* List of Types */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={18} className="animate-spin text-violet-600" />
            </div>
          ) : (
            types.map((it) => (
              <div
                key={it.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs"
              >
                {editId === it.id ? (
                  <div className="flex-1 space-y-2">
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={inputCls}
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditId(null)}
                        className="px-3 py-1 rounded-lg text-slate-500 hover:bg-slate-200"
                      >
                        {isAr ? 'إلغاء' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEdit(it.id)}
                        className="px-3 py-1 font-bold text-white bg-violet-600 rounded-lg"
                      >
                        {isAr ? 'حفظ' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: it.color }} />
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {getVisitTypeLabel(it.name, language)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditId(it.id)
                          setEditName(it.name)
                          setEditColor(it.color)
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-violet-600"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete({ id: it.id, name: it.name, count: 0 })}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              {isAr ? 'حذف نوع الزيارة؟' : 'Delete Visit Type?'}
            </h3>
            <p className="text-xs text-slate-500">
              {isAr
                ? `هل أنت متأكد من إزالة "${getVisitTypeLabel(confirmDelete.name, language)}"`
                : `Remove "${confirmDelete.name}" from visit types?`}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={doDelete}
                disabled={deleting}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl"
              >
                {deleting ? '…' : isAr ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}