import React, { useState } from 'react'
import { X } from 'lucide-react'
import { PosMenuItem, CourseType } from '../types'
import { COURSE_OPTIONS } from '../constants'
import { formatCurrency } from '../utils'

interface Props {
  isOpen: boolean
  onClose: () => void
  item: PosMenuItem | null
  onConfirm: (
    item: PosMenuItem,
    qty: number,
    course: CourseType,
    modifiers: any[],
    notes: string
  ) => void
}

export const ModifierSelectionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  item,
  onConfirm
}) => {
  const [quantity, ] = useState(1)
  const [course, setCourse] = useState<CourseType>('main')
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, any[]>>({})
  const [notes, setNotes] = useState('')

  if (!isOpen || !item) return null

  const handleOptionToggle = (groupTitle: string, option: any, maxSelect: number) => {
    setSelectedModifiers((prev) => {
      const current = prev[groupTitle] || []
      const exists = current.find((o) => o.name === option.name)

      if (maxSelect === 1) {
        return { ...prev, [groupTitle]: exists ? [] : [option] }
      }

      if (exists) {
        return { ...prev, [groupTitle]: current.filter((o) => o.name !== option.name) }
      }

      if (current.length < maxSelect) {
        return { ...prev, [groupTitle]: [...current, option] }
      }
      return prev
    })
  }

  const allSelectedOptions = Object.values(selectedModifiers).flat()
  const extraTotal = allSelectedOptions.reduce((acc, m) => acc + (m.priceDelta || 0), 0)
  const finalUnitPrice = item.price + extraTotal

  const handleSave = () => {
    onConfirm(item, quantity, course, allSelectedOptions, notes)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-200 dark:border-slate-700">
        <div className="flex items-start justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">{item.name}</h3>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">
              Base: {formatCurrency(item.price)} • Total: {formatCurrency(finalUnitPrice * quantity)}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Course Picker */}
        <div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
            Assign Course
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {COURSE_OPTIONS.map((c) => (
              <button
                key={c.value}
                onClick={() => setCourse(c.value)}
                className={`py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                  course === c.value
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modifier Groups */}
        <div className="max-h-56 overflow-y-auto space-y-3 pr-1">
          {(item.modifierGroups || []).map((grp) => (
            <div key={grp.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span>{grp.title}</span>
                <span className="text-[10px] text-slate-400">
                  {grp.maxSelect === 1 ? 'Choose 1' : `Up to ${grp.maxSelect}`}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {grp.options.map((opt) => {
                  const isSelected = (selectedModifiers[grp.title] || []).some(
                    (o) => o.name === opt.name
                  )
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleOptionToggle(grp.title, opt, grp.maxSelect)}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-bold'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{opt.name}</span>
                      {opt.priceDelta > 0 && (
                        <span className="text-[10px] text-slate-400 ml-1">
                          +{formatCurrency(opt.priceDelta)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Special Prep Notes */}
        <label className="block">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Kitchen Prep Notes</span>
          <input
            type="text"
            placeholder="e.g. Extra spicy, dressing on side"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </label>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold shadow-md shadow-orange-500/20"
          >
            Add to Order
          </button>
        </div>
      </div>
    </div>
  )
}