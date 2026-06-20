/**
 * FormInput Component
 * Reusable input with validation feedback
 */

import { InputHTMLAttributes, forwardRef, ReactNode } from 'react'
import { AlertCircle, Check } from 'lucide-react'

export interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string
  error?: string | null
  touched?: boolean
  helperText?: string
  required?: boolean
  value: string | number
  onChange: (value: string) => void
  onBlur?: () => void
  showValidIcon?: boolean
  icon?: ReactNode
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      label,
      error,
      touched,
      helperText,
      required,
      value,
      onChange,
      onBlur,
      showValidIcon = true,
      icon,
      className = '',
      ...props
    },
    ref
  ) => {
    const hasError = touched && error
    const isValid = touched && !error && value

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className={`
              w-full ${icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 rounded-lg border transition-all
              ${hasError
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50 dark:bg-red-900/10'
                : isValid && showValidIcon
                ? 'border-green-500 focus:ring-green-500 focus:border-green-500'
                : 'border-slate-300 dark:border-slate-600 focus:ring-primary focus:border-primary'
              }
              bg-white dark:bg-slate-700
              text-slate-900 dark:text-white
              placeholder-slate-400 dark:placeholder-slate-500
              focus:ring-2 focus:outline-none
              disabled:opacity-50 disabled:cursor-not-allowed
              ${className}
            `}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={
              hasError ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined
            }
            {...props}
          />

          {/* Validation icons */}
          {touched && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {hasError ? (
                <AlertCircle className="text-red-500" size={18} aria-hidden="true" />
              ) : isValid && showValidIcon ? (
                <Check className="text-green-500" size={18} aria-hidden="true" />
              ) : null}
            </div>
          )}
        </div>

        {/* Error message */}
        {hasError && (
          <p
            id={`${props.id}-error`}
            className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
            role="alert"
          >
            <AlertCircle size={14} aria-hidden="true" />
            {error}
          </p>
        )}

        {/* Helper text */}
        {!hasError && helperText && (
          <p
            id={`${props.id}-helper`}
            className="mt-1.5 text-sm text-slate-500 dark:text-slate-400"
          >
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

FormInput.displayName = 'FormInput'

export default FormInput
