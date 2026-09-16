import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { MenuItemData, MenuItemFormData } from '../types'
import { analyzeDishFinancials } from '../utils'
import { DEFAULT_MENU_CATEGORIES, KITCHEN_STATIONS } from '../constants'

interface Props {
  isOpen: boolean
  onClose: () => void
  editingItem: MenuItemData | null
  existingCategories: string[]
  onSave: (data: MenuItemFormData, editingId?: string) => Promise<boolean>
}

export const MenuItemFormModal: React.FC<Props> = ({
  isOpen,
  onClose,
  editingItem,
  existingCategories,
  onSave
}) => {
  const { t } = useLanguage()
  const [form, setForm] = useState<MenuItemFormData>({
    name: '',
    category: 'Main Dishes',
    description: '',
    price: '',
    cost: '0',
    preparationTime: '15',
    station: 'Kitchen',
    colorTag: '#f59e0b',
    notes: '',
    modifierGroups: []
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (editingItem) {
      setForm({
        name: editingItem.name,
        category: editingItem.category,
        description: editingItem.description || '',
        price: String(editingItem.price),
        cost: String(editingItem.cost || 0),
        preparationTime: String(editingItem.preparationTime || 15),
        station: editingItem.station || 'Kitchen',
        colorTag: editingItem.colorTag || '#f59e0b',
        notes: editingItem.notes || '',
        modifierGroups: editingItem.modifierGroups || []
      })
    } else {
      setForm({
        name: '',
        category: existingCategories[0] || 'Main Dishes',
        description: '',
        price: '',
        cost: '0',
        preparationTime: '15',
        station: 'Kitchen',
        colorTag: '#f59e0b',
        notes: '',
        modifierGroups: []
      })
    }
  }, [editingItem, isOpen])

  if (!isOpen) return null

  const allCategories = Array.from(new Set([...DEFAULT_MENU_CATEGORIES, ...existingCategories]))

  // Live margin read-out so the operator sees the impact of price/cost before saving.
  const formFinancials = analyzeDishFinancials(Number(form.price) || 0, Number(form.cost) || 0)

  const handleAddModifierGroup = () => {
    setForm((prev) => ({
      ...prev,
      modifierGroups: [
        ...prev.modifierGroups,
        {
          title: t('restMenuFormDefaultGroupTitle'),
          minSelect: 0,
          maxSelect: 1,
          options: [{ name: t('restMenuFormDefaultOption'), priceDelta: 0 }]
        }
      ]
    }))
  }

  const handleUpdateGroupTitle = (idx: number, title: string) => {
    setForm((prev) => {
      const copy = [...prev.modifierGroups]
      copy[idx].title = title
      return { ...prev, modifierGroups: copy }
    })
  }

  const handleAddOptionToGroup = (grpIdx: number) => {
    setForm((prev) => {
      const copy = [...prev.modifierGroups]
      copy[grpIdx].options.push({ name: t('restMenuFormNewOption'), priceDelta: 0 })
      return { ...prev, modifierGroups: copy }
    })
  }

  const handleUpdateOption = (grpIdx: number, optIdx: number, field: string, value: any) => {
    setForm((prev) => {
      const copy = [...prev.modifierGroups]
      ;(copy[grpIdx].options[optIdx] as any)[field] = field === 'priceDelta' ? Number(value) : value
      return { ...prev, modifierGroups: copy }
    })
  }

  const handleRemoveOption = (grpIdx: number, optIdx: number) => {
    setForm((prev) => {
      const copy = [...prev.modifierGroups]
      copy[grpIdx].options.splice(optIdx, 1)
      return { ...prev, modifierGroups: copy }
    })
  }

  const handleRemoveGroup = (grpIdx: number) => {
    setForm((prev) => {
      const copy = [...prev.modifierGroups]
      copy.splice(grpIdx, 1)
      return { ...prev, modifierGroups: copy }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const ok = await onSave(form, editingItem?.id)
    setIsSubmitting(false)
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700"
      >
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
            {editingItem ? t('restMenuFormEditTitle') : t('restMenuFormCreateTitle')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('restMenuFormClose')}
            title={t('restMenuFormClose')}
            className="p-1.5 -m-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dish Name & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('restMenuFormTitleLabel')} *
            </span>
            <input
              type="text"
              required
              placeholder={t('restMenuFormTitlePlaceholder')}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('restMenuFormCategory')} *
            </span>
            <input
              type="text"
              list="menu-cat-list"
              required
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
            <datalist id="menu-cat-list">
              {allCategories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
        </div>

        {/* Price, Cost & Prep Time */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('restMenuFormPrice')} *
            </span>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('restMenuFormCost')}
            </span>
            <input
              type="number"
              step="0.01"
              value={form.cost}
              onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('restMenuFormPrep')}
            </span>
            <input
              type="number"
              value={form.preparationTime}
              onChange={(e) => setForm((f) => ({ ...f, preparationTime: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </label>
        </div>

        {/* Live cost / margin feedback, plus how a recipe overrides the manual cost */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
          <span
            className={`px-2.5 py-1 rounded-full ${
              formFinancials.rating === 'high'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : formFinancials.rating === 'medium'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
            }`}
          >
            {t('restMenuFormMargin', { percent: formFinancials.marginPercent })}
          </span>
          {editingItem?.recipe ? (
            <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
              {t('restMenuFormRecipeCost', { cost: `$${(editingItem.cost || 0).toFixed(2)}` })}
            </span>
          ) : (
            <span className="text-slate-400 font-semibold">{t('restMenuFormCostHint')}</span>
          )}
        </div>

        {formFinancials.costPercent > 40 && Number(form.price) > 0 && (
          <p className="text-[11px] font-bold text-rose-500">{t('restMenuFormMarginWarning')}</p>
        )}

        {/* Station Assignment */}
        <label className="block">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {t('restMenuFormStation')}
          </span>
          <select
            value={form.station}
            onChange={(e) => setForm((f) => ({ ...f, station: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
            {KITCHEN_STATIONS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </label>

        {/* Description */}
        <label className="block">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {t('restMenuFormDescription')}
          </span>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder={t('restMenuFormDescriptionPlaceholder')}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
          />
        </label>

        {/* ─── Modifier Groups Builder ─── */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">
              {t('restMenuFormModifiers')}
            </span>
            <button
              type="button"
              onClick={handleAddModifierGroup}
              className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> {t('restMenuFormAddGroup')}
            </button>
          </div>

          <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
            {form.modifierGroups.map((grp, grpIdx) => (
              <div
                key={grpIdx}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={grp.title}
                    onChange={(e) => handleUpdateGroupTitle(grpIdx, e.target.value)}
                    placeholder={t('restMenuFormGroupTitlePlaceholder')}
                    className="flex-1 min-w-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-bold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveGroup(grpIdx)}
                    aria-label={t('restMenuFormRemoveGroup')}
                    title={t('restMenuFormRemoveGroup')}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 ps-2 border-s-2 border-amber-500/40">
                  {grp.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt.name}
                        onChange={(e) => handleUpdateOption(grpIdx, optIdx, 'name', e.target.value)}
                        placeholder={t('restMenuFormOptionPlaceholder')}
                        className="flex-1 min-w-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-medium"
                      />
                      <div className="flex items-center gap-1 w-20 sm:w-24 shrink-0">
                        <span className="text-xs text-slate-400">+$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={opt.priceDelta}
                          onChange={(e) =>
                            handleUpdateOption(grpIdx, optIdx, 'priceDelta', e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-bold"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(grpIdx, optIdx)}
                        aria-label={t('restMenuFormRemoveOption')}
                        title={t('restMenuFormRemoveOption')}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => handleAddOptionToGroup(grpIdx)}
                    className="text-[10px] font-bold text-amber-600 hover:underline pt-1 block"
                  >
                    + {t('restMenuFormAddChoice')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            {t('restMenuFormCancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-60 text-white text-xs font-bold shadow-md shadow-orange-500/20 active:scale-98 transition-all"
          >
            {isSubmitting ? t('restMenuFormSaving') : t('restMenuFormSave')}
          </button>
        </div>
      </form>
    </div>
  )
}
