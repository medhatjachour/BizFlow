/**
 * FormTextarea Component
 * Reusable textarea with validation feedback
 */

import { TextareaHTMLAttributes, forwardRef } from 'react'
import { AlertCircle, Check } from 'lucide-react'

export interface FormTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: string
  error?: string | null
  touched?: boolean
  helperText?: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  showValidIcon?: boolean
  showCharCount?: boolean
  maxLength?: number
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
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
      showCharCount = false,
      maxLength,
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
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {showCharCount && maxLength && (
              <span className={`text-xs ${
                value.length > maxLength 
                  ? 'text-red-500' 
                  : value.length > maxLength * 0.9
                  ? 'text-amber-500'
                  : 'text-slate-400'
              }`}>
                {value.length}/{maxLength}
              </span>
            )}
          </div>
        )}

        <div className="relative">
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            maxLength={maxLength}
            className={`
              w-full px-4 py-2.5 rounded-lg border transition-all resize-y
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

          {/* Validation icon */}
          {touched && showValidIcon && (
            <div className="absolute right-3 top-3 pointer-events-none">
              {hasError ? (
                <AlertCircle className="text-red-500" size={18} aria-hidden="true" />
              ) : isValid ? (
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

FormTextarea.displayName = 'FormTextarea'

export default FormTextarea
