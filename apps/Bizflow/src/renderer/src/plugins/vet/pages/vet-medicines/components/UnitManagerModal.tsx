
import React, { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { INPUT_BASE_CLS } from '../constants'
import type { UnitItem } from '../types'

interface UnitManagerModalProps {
  unitRecords: UnitItem[]
  onRefresh: () => void
  onClose: () => void
}

export const UnitManagerModal: React.FC<UnitManagerModalProps> = ({ unitRecords, onRefresh, onClose }) => {
  const { t } = useLanguage()
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  async function add() {
    const v = input.trim().toLowerCase()
    if (!v) {
      setError(t('vetUnitNameRequired') || 'Unit name is required')
      return
    }
    if (unitRecords.some(u => u.name === v)) {
      setError(t('vetUnitExists') || 'Unit already exists')
      return
    }
    try {
      await (window as any).api?.vet?.medicineUnits?.create({ name: v })
      setInput('')
      setError('')
      onRefresh()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to add')
    }
  }

  async function remove(u: UnitItem) {
    try {
      await (window as any).api?.vet?.medicineUnits?.delete(u.id)
      onRefresh()
    } catch {
      setError('Failed to remove')
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-900 dark:text-white text-sm">
            {t('vetManageUnits') || 'Manage Container Units'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => {
                setInput(e.target.value)
                setError('')
              }}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
              placeholder={t('vetUnitNamePlaceholder') || 'e.g. ampoule, strip, pack'}
              className={`${INPUT_BASE_CLS} flex-1`}
            />
            <button
              onClick={add}
              className="px-3 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg"
            >
              <Plus size={16} />
            </button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex flex-wrap gap-2">
            {unitRecords.map(u => (
              <span
                key={u.id}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300"
              >
                <span className="capitalize">{u.name}</span>
                <button
                  onClick={() => remove(u)}
                  className="text-violet-400 hover:text-red-500"
                  title={t('vetDeleteUnit') || 'Remove'}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}