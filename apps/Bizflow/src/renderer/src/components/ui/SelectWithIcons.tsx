/**
 * SelectWithIcons Component
 * Custom select dropdown with icons support
 */

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { LucideIcon } from 'lucide-react'

interface SelectOption {
  value: string | number
  label: string
  icon?: LucideIcon
}

interface SelectWithIconsProps {
  label?: string
  value: string | number
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  required?: boolean
  className?: string
}

export default function SelectWithIcons({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  required,
  className = ''
}: SelectWithIconsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(option => option.value === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative" ref={selectRef}>
        {/* Selected value display */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-2.5 text-left bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            {selectedOption?.icon && (
              <selectedOption.icon size={16} className="text-slate-500" />
            )}
            <span className={selectedOption ? 'text-slate-900 dark:text-white' : 'text-slate-500'}>
              {selectedOption?.label || placeholder}
            </span>
          </div>
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown options */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-auto">
            {options.map((option) => {
              const Icon = option.icon
              const isSelected = option.value === value

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value.toString())
                    setIsOpen(false)
                  }}
                  className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center justify-between first:rounded-t-lg last:rounded-b-lg"
                >
                  <div className="flex items-center gap-3">
                    {Icon && <Icon size={16} className="text-slate-500" />}
                    <span className={isSelected ? 'font-medium text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}>
                      {option.label}
                    </span>
                  </div>
                  {isSelected && <Check size={16} className="text-primary" />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}