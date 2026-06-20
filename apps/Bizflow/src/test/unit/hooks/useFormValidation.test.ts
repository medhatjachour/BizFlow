/**
 * Unit tests for useFormValidation hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFormValidation, validationRules } from '../../../renderer/src/hooks/useFormValidation'

// Mock logger
vi.mock('../../../shared/utils/logger', () => ({
  default: {
    error: vi.fn()
  }
}))

describe('useFormValidation', () => {
  const initialValues = {
    name: '',
    email: '',
    age: 0
  }

  const validationConfig = {
    name: [validationRules.required('Name is required'), validationRules.minLength(2, 'Name too short')],
    email: [validationRules.required('Email is required'), validationRules.email('Invalid email')],
    age: [validationRules.min(18, 'Must be 18 or older')]
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with correct initial state', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationConfig)
    )

    expect(result.current.values).toEqual(initialValues)
    expect(result.current.errors).toEqual({})
    expect(result.current.touched).toEqual({})
    expect(result.current.isSubmitting).toBe(false)
  })

  it('should update values on handleChange', async () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationConfig)
    )

    await act(async () => {
      await result.current.handleChange('name', 'John')
    })

    expect(result.current.values.name).toBe('John')
  })

  it('should validate field on handleChange if touched', async () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationConfig)
    )

    // Mark as touched first
    await act(async () => {
      await result.current.handleBlur('name')
    })

    // Now change should validate
    await act(async () => {
      await result.current.handleChange('name', 'J')
    })

    expect(result.current.errors.name).toBe('Name too short')
  })

  it('should mark field as touched on handleBlur', async () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationConfig)
    )

    await act(async () => {
      await result.current.handleBlur('name')
    })

    expect(result.current.touched.name).toBe(true)
  })

  it('should validate field on handleBlur', async () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationConfig)
    )

    await act(async () => {
      await result.current.handleBlur('name')
    })

    expect(result.current.errors.name).toBe('Name is required')
  })

  it('should call onSubmit when form is valid on handleSubmit', async () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationConfig)
    )

    const mockOnSubmit = vi.fn()

    // Set valid values
    await act(async () => {
      await result.current.handleChange('name', 'John Doe')
      await result.current.handleChange('email', 'john@example.com')
      await result.current.handleChange('age', 25)
    })

    await act(async () => {
      await result.current.handleSubmit(mockOnSubmit)
    })

    expect(mockOnSubmit).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@example.com',
      age: 25
    })
    expect(result.current.isSubmitting).toBe(false)
  })

  it('should not call onSubmit when form is invalid on handleSubmit', async () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationConfig)
    )

    const mockOnSubmit = vi.fn()

    await act(async () => {
      await result.current.handleSubmit(mockOnSubmit)
    })

    expect(mockOnSubmit).not.toHaveBeenCalled()
    expect(result.current.isSubmitting).toBe(false)
    expect(result.current.errors.name).toBe('Name is required')
    expect(result.current.errors.email).toBe('Email is required')
  })

  it('should validate all fields with validateAll', async () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationConfig)
    )

    let isValid: boolean
    await act(async () => {
      isValid = await result.current.validateAll()
    })

    expect(isValid).toBe(false)
    expect(result.current.errors.name).toBe('Name is required')
    expect(result.current.errors.email).toBe('Email is required')
  })

  it('should validate single field with validateField', async () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationConfig)
    )

    let error: string | null
    await act(async () => {
      error = await result.current.validateField('name', '')
    })

    expect(error).toBe('Name is required')
  })

  it('should reset form with reset', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationConfig)
    )

    act(() => {
      result.current.setFormValues({ name: 'Test', email: 'test@example.com' })
      result.current.reset()
    })

    expect(result.current.values).toEqual(initialValues)
    expect(result.current.errors).toEqual({})
    expect(result.current.touched).toEqual({})
    expect(result.current.isSubmitting).toBe(false)
  })

  it('should set multiple values with setFormValues', () => {
    const { result } = renderHook(() =>
      useFormValidation(initialValues, validationConfig)
    )

    act(() => {
      result.current.setFormValues({ name: 'Test', age: 30 })
    })

    expect(result.current.values.name).toBe('Test')
    expect(result.current.values.age).toBe(30)
    expect(result.current.values.email).toBe('')
  })
})

describe('validationRules', () => {
  describe('required', () => {
    const rule = validationRules.required('Required field')

    it('should validate string', () => {
      expect(rule.validate('')).toBe(false)
      expect(rule.validate('test')).toBe(true)
      expect(rule.validate('   ')).toBe(false)
    })

    it('should validate number', () => {
      expect(rule.validate(0)).toBe(true)
      expect(rule.validate(NaN)).toBe(false)
    })

    it('should validate array', () => {
      expect(rule.validate([])).toBe(false)
      expect(rule.validate(['item'])).toBe(true)
    })

    it('should validate null/undefined', () => {
      expect(rule.validate(null)).toBe(false)
      expect(rule.validate(undefined)).toBe(false)
    })
  })

  describe('email', () => {
    const rule = validationRules.email('Invalid email')

    it('should validate email format', () => {
      expect(rule.validate('')).toBe(true) // Optional
      expect(rule.validate('test@example.com')).toBe(true)
      expect(rule.validate('invalid')).toBe(false)
      expect(rule.validate('test@')).toBe(false)
    })
  })

  describe('minLength', () => {
    const rule = validationRules.minLength(3, 'Too short')

    it('should validate minimum length', () => {
      expect(rule.validate('')).toBe(true) // Optional
      expect(rule.validate('ab')).toBe(false)
      expect(rule.validate('abc')).toBe(true)
      expect(rule.validate('abcd')).toBe(true)
    })
  })

  describe('maxLength', () => {
    const rule = validationRules.maxLength(3, 'Too long')

    it('should validate maximum length', () => {
      expect(rule.validate('')).toBe(true) // Optional
      expect(rule.validate('ab')).toBe(true)
      expect(rule.validate('abc')).toBe(true)
      expect(rule.validate('abcd')).toBe(false)
    })
  })

  describe('min', () => {
    const rule = validationRules.min(10, 'Too small')

    it('should validate minimum value', () => {
      expect(rule.validate('')).toBe(true) // Optional
      expect(rule.validate(5)).toBe(false)
      expect(rule.validate(10)).toBe(true)
      expect(rule.validate(15)).toBe(true)
    })
  })

  describe('max', () => {
    const rule = validationRules.max(10, 'Too big')

    it('should validate maximum value', () => {
      expect(rule.validate('')).toBe(true) // Optional
      expect(rule.validate(5)).toBe(true)
      expect(rule.validate(10)).toBe(true)
      expect(rule.validate(15)).toBe(false)
    })
  })

  describe('pattern', () => {
    const rule = validationRules.pattern(/^\d+$/, 'Only numbers')

    it('should validate pattern', () => {
      expect(rule.validate('')).toBe(true) // Optional
      expect(rule.validate('123')).toBe(true)
      expect(rule.validate('abc')).toBe(false)
    })
  })

  describe('phone', () => {
    const rule = validationRules.phone('Invalid phone')

    it('should validate phone number', () => {
      expect(rule.validate('')).toBe(true) // Optional
      expect(rule.validate('1234567890')).toBe(true)
      expect(rule.validate('+1 234 567 890')).toBe(true)
      expect(rule.validate('123')).toBe(false) // Too short
      expect(rule.validate('abc')).toBe(false)
    })
  })

  describe('url', () => {
    const rule = validationRules.url('Invalid URL')

    it('should validate URL', () => {
      expect(rule.validate('')).toBe(true) // Optional
      expect(rule.validate('https://example.com')).toBe(true)
      expect(rule.validate('invalid')).toBe(false)
    })
  })

  describe('number', () => {
    const rule = validationRules.number('Not a number')

    it('should validate number', () => {
      expect(rule.validate('')).toBe(true) // Optional
      expect(rule.validate('123')).toBe(true)
      expect(rule.validate(123)).toBe(true)
      expect(rule.validate('abc')).toBe(false)
    })
  })

  describe('integer', () => {
    const rule = validationRules.integer('Not an integer')

    it('should validate integer', () => {
      expect(rule.validate('')).toBe(true) // Optional
      expect(rule.validate('123')).toBe(true)
      expect(rule.validate(123)).toBe(true)
      expect(rule.validate('123.5')).toBe(false)
    })
  })

  describe('positive', () => {
    const rule = validationRules.positive('Not positive')

    it('should validate positive number', () => {
      expect(rule.validate('')).toBe(true) // Optional
      expect(rule.validate(1)).toBe(true)
      expect(rule.validate(-1)).toBe(false)
      expect(rule.validate(0)).toBe(false)
    })
  })

  describe('custom', () => {
    const rule = validationRules.custom((value) => (value as number) > 10, 'Too small')

    it('should use custom validator', () => {
      expect(rule.validate(5)).toBe(false)
      expect(rule.validate(15)).toBe(true)
    })
  })
})