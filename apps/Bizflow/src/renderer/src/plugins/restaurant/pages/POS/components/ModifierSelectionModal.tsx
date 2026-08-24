// src/pages/POS/components/ModifierSelectionModal.tsx
import React, { useState, useMemo } from 'react'
import { X, Check, AlertCircle, Plus, Minus, Layers } from 'lucide-react'
import { PosMenuItem, CourseType, ModifierOptionChoice } from '../types'
import { COURSE_OPTIONS } from '../constants'
import { sounds } from '../../utils/sound'

interface Props {
  isOpen: boolean
  onClose: () => void
  item: PosMenuItem | null
  activeSeat: number
  onConfirm: (
    item: PosMenuItem,
    qty: number,
    course: CourseType,
    seatNumber: number,
    modifiers: ModifierOptionChoice[],
    notes: string
  ) => void
}

export const ModifierSelectionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  item,
  activeSeat,
  onConfirm
}) => {
  if (!isOpen || !item) return null

  const [quantity, setQuantity] = useState(1)
  const [course, setCourse] = useState<CourseType>('main')
  const [seatNumber, setSeatNumber] = useState<number>(activeSeat || 1)
  const [selectedMods, setSelectedMods] = useState<Record<string, ModifierOptionChoice[]>>({})
  const [notes, setNotes] = useState('')

  const groups = item.modifierGroups || []

  // Toggle modifier option with min/max constraint validation
  const handleToggleOption = (groupTitle: string, option: ModifierOptionChoice, maxSelect: number) => {
    sounds.playBump()
    setSelectedMods((prev) => {
      const currentList = prev[groupTitle] || []
      const exists = currentList.some((o) => o.name === option.name)

      // Radio Behavior: if max is 1, replace choice
      if (maxSelect === 1) {
        return { ...prev, [groupTitle]: exists ? [] : [option] }
      }

      // Multi-select Behavior
      if (exists) {
        return { ...prev, [groupTitle]: currentList.filter((o) => o.name !== option.name) }
      }

      if (currentList.length < maxSelect) {
        return { ...prev, [groupTitle]: [...currentList, option] }
      }

      return prev
    })
  }

  // Calculate live financial additions
  const flatModifiers = useMemo(() => Object.values(selectedMods).flat(), [selectedMods])
  const extraCost = useMemo(() => flatModifiers.reduce((acc, m) => acc + (m.priceDelta || 0), 0), [flatModifiers])
  const unitPrice = item.price + extraCost
  const totalPrice = unitPrice * quantity

  // Validate required modifier groups
  const validationErrors = useMemo(() => {
    const errors: string[] = []
    for (const grp of groups) {
      const count = (selectedMods[grp.title] || []).length
      if (grp.minSelect > 0 && count < grp.minSelect) {
        errors.push(`"${grp.title}" requires at least ${grp.minSelect} selection${grp.minSelect > 1 ? 's' : ''}`)
      }
    }
    return errors
  }, [groups, selectedMods])

  const isValid = validationErrors.length === 0

  const handleSave = () => {
    if (!isValid) {
      sounds.playError()
      return
    }
    sounds.playSuccess()
    onConfirm(item, quantity, course, seatNumber, flatModifiers, notes)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/60 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{item.name}</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-xs">
                ${unitPrice.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{item.category} • Station: {item.station}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Configuration Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Seat & Course Selector */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-amber-500" /> Target Seat
              </span>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5, 6].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      sounds.playBump()
                      setSeatNumber(st)
                    }}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all ${
                      seatNumber === st
                        ? 'bg-amber-500 text-white shadow-xs shadow-amber-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    S{st}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Course Timing
              </span>
              <div className="grid grid-cols-4 gap-1">
                {COURSE_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => {
                      sounds.playBump()
                      setCourse(c.value)
                    }}
                    className={`py-1.5 rounded-xl text-[11px] font-black capitalize transition-all truncate ${
                      course === c.value
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {c.value.slice(0, 4)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Modifier Groups Matrix */}
          <div className="space-y-4">
            {groups.map((grp) => {
              const selectedList = selectedMods[grp.title] || []
              const count = selectedList.length
              const isSatisfied = grp.minSelect === 0 || count >= grp.minSelect

              return (
                <div
                  key={grp.id || grp.title}
                  className={`p-4 rounded-2xl border transition-all ${
                    isSatisfied
                      ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                      : 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        {grp.title}
                      </span>
                      {grp.minSelect > 0 && (
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            isSatisfied
                              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {isSatisfied ? 'Ready' : `Select ${grp.minSelect}`}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">
                      {grp.maxSelect === 1 ? 'Pick 1' : `${count}/${grp.maxSelect} chosen`}
                    </span>
                  </div>

                  {/* Options Tiles */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {grp.options.map((opt) => {
                      const isChecked = selectedList.some((o) => o.name === opt.name)

                      return (
                        <button
                          key={opt.name}
                          type="button"
                          onClick={() => handleToggleOption(grp.title, opt, grp.maxSelect)}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col justify-between items-start transition-all text-left ${
                            isChecked
                              ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-2 ring-amber-500/30 shadow-xs'
                              : 'border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="truncate">{opt.name}</span>
                            {isChecked && <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                          </div>
                          <span className="text-[10px] font-black text-slate-400 mt-1">
                            {opt.priceDelta > 0 ? `+$${opt.priceDelta.toFixed(2)}` : 'Included'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Kitchen Special Notes */}
          <label className="block">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Custom Kitchen Instructions
            </span>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Extra dressing on side, allergy alert..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 font-medium focus:outline-none"
            />
          </label>
        </div>

        {/* Footer & Live Calculations */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 space-y-3">
          {validationErrors.length > 0 && (
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationErrors[0]}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            {/* Quantity Stepper */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  sounds.playBump()
                  setQuantity((q) => Math.max(1, q - 1))
                }}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-700 dark:text-slate-300 active:scale-95 transition-transform"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center text-sm font-black text-slate-900 dark:text-white">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => {
                  sounds.playBump()
                  setQuantity((q) => q + 1)
                }}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-700 dark:text-slate-300 active:scale-95 transition-transform"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Confirm Button with Total */}
            <button
              type="button"
              disabled={!isValid}
              onClick={handleSave}
              className={`flex-1 py-3 px-4 rounded-2xl text-xs font-black flex items-center justify-between shadow-md transition-all active:scale-[0.98] ${
                isValid
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-orange-500/20'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>Add to Seat #{seatNumber}</span>
              <span>${totalPrice.toFixed(2)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}