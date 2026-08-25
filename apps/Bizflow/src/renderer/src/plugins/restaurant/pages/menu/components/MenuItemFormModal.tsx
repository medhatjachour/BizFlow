import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { MenuItemData, MenuItemFormData } from '../types'
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

  const handleAddModifierGroup = () => {
    setForm((prev) => ({
      ...prev,
      modifierGroups: [
        ...prev.modifierGroups,
        {
          title: 'Options Group',
          minSelect: 0,
          maxSelect: 1,
          options: [{ name: 'Option 1', priceDelta: 0 }]
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
      copy[grpIdx].options.push({ name: 'New Option', priceDelta: 0 })
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            {editingItem ? 'Edit Menu Dish' : 'Create New Menu Item'}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dish Name & Category */}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Dish Name *</span>
            <input
              type="text"
              required
              placeholder="e.g. Ribeye Steak 300g"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Category *</span>
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
        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Selling Price *</span>
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
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Ingredient Cost</span>
            <input
              type="number"
              step="0.01"
              value={form.cost}
              onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Prep (Mins)</span>
            <input
              type="number"
              value={form.preparationTime}
              onChange={(e) => setForm((f) => ({ ...f, preparationTime: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </label>
        </div>

        {/* Station Assignment */}
        <label className="block">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Kitchen Station Routing</span>
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
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Description / Ingredients</span>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Short culinary description for POS operators"
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
          />
        </label>

        {/* ─── Modifier Groups Builder ─── */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">
              Modifiers & Customizations
            </span>
            <button
              type="button"
              onClick={handleAddModifierGroup}
              className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Option Group
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
                    placeholder="Group Title (e.g. Meat Temperature)"
                    className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-bold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveGroup(grpIdx)}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 pl-2 border-l-2 border-amber-500/40">
                  {grp.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt.name}
                        onChange={(e) =>
                          handleUpdateOption(grpIdx, optIdx, 'name', e.target.value)
                        }
                        placeholder="Option name"
                        className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-medium"
                      />
                      <div className="flex items-center gap-1 w-24">
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
                        className="text-slate-400 hover:text-rose-500"
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
                    + Add choice option
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
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold shadow-md shadow-orange-500/20"
          >
            {isSubmitting ? 'Saving...' : 'Save Dish'}
          </button>
        </div>
      </form>
    </div>
  )
}