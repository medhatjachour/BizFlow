/**
 * useFormValidation Hook
 * Comprehensive form validation with visual feedback
 */

import { useState, useCallback } from 'react'
import logger from '../../../shared/utils/logger'

export interface ValidationRule<T = any> {
  validate: (value: T, formData?: Record<string, any>) => boolean | Promise<boolean>
  message: string
}

export interface FieldValidation {
  rules: ValidationRule[]
  value: any
  touched: boolean
  error: string | null
}

export interface FormValidationConfig {
  [fieldName: string]: ValidationRule[]
}

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationConfig: FormValidationConfig
) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Validate a single field
  const validateField = useCallback(
    async (fieldName: string, value: any): Promise<string | null> => {
      const rules = validationConfig[fieldName]
      if (!rules) return null

      for (const rule of rules) {
        const isValid = await rule.validate(value, values)
        if (!isValid) {
          return rule.message
        }
      }

      return null
    },
    [validationConfig, values]
  )

  // Validate all fields
  const validateAll = useCallback(async (): Promise<boolean> => {
    const newErrors: Record<string, string | null> = {}
    let hasErrors = false

    for (const fieldName of Object.keys(validationConfig)) {
      const error = await validateField(fieldName, values[fieldName])
      newErrors[fieldName] = error
      if (error) hasErrors = true
    }

    setErrors(newErrors)
    return !hasErrors
  }, [validationConfig, values, validateField])

  // Handle field change
  const handleChange = useCallback(
    async (fieldName: keyof T, value: any) => {
      setValues((prev) => ({ ...prev, [fieldName]: value }))

      // Validate if field has been touched
      if (touched[fieldName as string]) {
        const error = await validateField(fieldName as string, value)
        setErrors((prev) => ({ ...prev, [fieldName]: error }))
      }
    },
    [touched, validateField]
  )

  // Handle field blur (mark as touched)
  const handleBlur = useCallback(
    async (fieldName: keyof T) => {
      setTouched((prev) => ({ ...prev, [fieldName]: true }))

      // Validate on blur
      const error = await validateField(fieldName as string, values[fieldName])
      setErrors((prev) => ({ ...prev, [fieldName]: error }))
    },
    [values, validateField]
  )

  // Handle form submission
  const handleSubmit = useCallback(
    async (onSubmit: (values: T) => void | Promise<void>) => {
      setIsSubmitting(true)

      // Mark all fields as touched
      const allTouched = Object.keys(validationConfig).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {}
      )
      setTouched(allTouched)

      // Validate all fields
      const isValid = await validateAll()

      if (isValid) {
        try {
          await onSubmit(values)
        } catch (error) {
          // Handle submission error
          logger.error('Form submission error:', error)
        }
      }

      setIsSubmitting(false)
    },
    [validationConfig, validateAll, values]
  )

  // Reset form
  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
    setIsSubmitting(false)
  }, [initialValues])

  // Set multiple values at once
  const setFormValues = useCallback((newValues: Partial<T>) => {
    setValues((prev) => ({ ...prev, ...newValues }))
  }, [])

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setFormValues,
    validateField,
    validateAll
  }
}

// Common validation rules
export const validationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    validate: (value) => {
      if (typeof value === 'string') return value.trim().length > 0
      if (typeof value === 'number') return !isNaN(value)
      if (Array.isArray(value)) return value.length > 0
      return value != null
    },
    message
  }),

  email: (message = 'Invalid email address'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true // Optional field
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(value)
    },
    message
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true
      return value.length >= min
    },
    message: message || `Must be at least ${min} characters`
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true
      return value.length <= max
    },
    message: message || `Must be no more than ${max} characters`
  }),

  min: (min: number, message?: string): ValidationRule => ({
    validate: (value) => {
      if (value == null || value === '') return true
      return Number(value) >= min
    },
    message: message || `Must be at least ${min}`
  }),

  max: (max: number, message?: string): ValidationRule => ({
    validate: (value) => {
      if (value == null || value === '') return true
      return Number(value) <= max
    },
    message: message || `Must be no more than ${max}`
  }),

  pattern: (regex: RegExp, message = 'Invalid format'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true
      return regex.test(value)
    },
    message
  }),

  phone: (message = 'Invalid phone number'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true
      const phoneRegex = /^[\d\s\-\+\(\)]+$/
      return phoneRegex.test(value) && value.replace(/\D/g, '').length >= 10
    },
    message
  }),

  url: (message = 'Invalid URL'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true
      try {
        new URL(value)
        return true
      } catch {
        return false
      }
    },
    message
  }),

  number: (message = 'Must be a valid number'): ValidationRule => ({
    validate: (value) => {
      if (value === '' || value == null) return true
      return !isNaN(Number(value))
    },
    message
  }),

  integer: (message = 'Must be a whole number'): ValidationRule => ({
    validate: (value) => {
      if (value === '' || value == null) return true
      return Number.isInteger(Number(value))
    },
    message
  }),

  positive: (message = 'Must be a positive number'): ValidationRule => ({
    validate: (value) => {
      if (value === '' || value == null) return true
      return Number(value) > 0
    },
    message
  }),

  /**
   * Custom validation rule
   * @param validator - Function that validates the value
   * @param message - Error message if validation fails
   */
  custom: (
    validator: (value: unknown, formData?: Record<string, unknown>) => boolean | Promise<boolean>,
    message: string
  ): ValidationRule => ({
    validate: validator,
    message
  })
}

export default useFormValidation
