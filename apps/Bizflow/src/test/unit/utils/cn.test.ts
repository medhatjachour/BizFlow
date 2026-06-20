/**
 * Unit tests for cn utility function
 * Tests class name combination and filtering functionality
 */

import { describe, it, expect } from 'vitest'
import { cn } from '../../../renderer/src/utils/cn'

describe('cn utility function', () => {
  describe('Basic functionality', () => {
    it('should combine string class names', () => {
      expect(cn('class1', 'class2', 'class3')).toBe('class1 class2 class3')
    })

    it('should handle single class name', () => {
      expect(cn('single-class')).toBe('single-class')
    })

    it('should handle empty input', () => {
      expect(cn()).toBe('')
    })
  })

  describe('Falsy value filtering', () => {
    it('should filter out false values', () => {
      expect(cn('class1', false, 'class2')).toBe('class1 class2')
    })

    it('should filter out null values', () => {
      expect(cn('class1', null, 'class2')).toBe('class1 class2')
    })

    it('should filter out undefined values', () => {
      expect(cn('class1', undefined, 'class2')).toBe('class1 class2')
    })

    it('should filter out empty strings', () => {
      expect(cn('class1', '', 'class2')).toBe('class1 class2')
    })

    it('should filter out zero', () => {
      expect(cn('class1', 0, 'class2')).toBe('class1 class2')
    })

    it('should keep non-zero numbers', () => {
      expect(cn('class1', 1, 'class2')).toBe('class1 1 class2')
    })
  })

  describe('Conditional classes', () => {
    it('should handle conditional classes with && operator', () => {
      const isActive = true
      const isDisabled = false

      expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe('base active')
    })

    it('should handle ternary operators', () => {
      const variant = 'primary'

      expect(cn('btn', variant === 'primary' ? 'btn-primary' : 'btn-secondary')).toBe('btn btn-primary')
    })
  })

  describe('Object syntax', () => {
    it('should handle object with truthy values', () => {
      expect(cn('base', { active: true, disabled: false, visible: true })).toBe('base active visible')
    })

    it('should handle mixed object and string classes', () => {
      expect(cn('base', { active: true }, 'extra')).toBe('base active extra')
    })
  })

  describe('Array flattening', () => {
    it('should flatten nested arrays', () => {
      expect(cn(['class1', 'class2'], 'class3')).toBe('class1 class2 class3')
    })

    it('should handle deeply nested arrays', () => {
      expect(cn(['class1', ['class2', 'class3']], 'class4')).toBe('class1 class2 class3 class4')
    })

    it('should filter falsy values in arrays', () => {
      expect(cn(['class1', false, 'class2'], null)).toBe('class1 class2')
    })
  })

  describe('Edge cases', () => {
    it('should handle numbers as strings', () => {
      expect(cn('class', 123)).toBe('class 123')
    })

    it('should handle boolean true as string', () => {
      expect(cn('class', true)).toBe('class true')
    })

    it('should handle mixed types', () => {
      expect(cn('base', 'string', 42, true, { obj: true })).toBe('base string 42 true obj')
    })

    it('should handle empty arrays', () => {
      expect(cn('base', [], 'extra')).toBe('base extra')
    })

    it('should handle arrays with only falsy values', () => {
      expect(cn('base', [false, null, undefined, ''])).toBe('base')
    })
  })

  describe('Tailwind CSS compatibility', () => {
    it('should work with Tailwind utility classes', () => {
      expect(cn('flex', 'items-center', 'justify-between')).toBe('flex items-center justify-between')
    })

    it('should handle responsive classes', () => {
      expect(cn('md:flex', 'lg:block')).toBe('md:flex lg:block')
    })

    it('should handle conditional Tailwind classes', () => {
      const isMobile = true
      expect(cn('p-4', isMobile && 'md:p-8')).toBe('p-4 md:p-8')
    })
  })

  describe('Performance and consistency', () => {
    it('should produce consistent results', () => {
      const result1 = cn('a', 'b', 'c')
      const result2 = cn('a', 'b', 'c')

      expect(result1).toBe(result2)
    })

    it('should handle large number of classes', () => {
      const classes = Array.from({ length: 100 }, (_, i) => `class${i}`)
      const result = cn(...classes)

      expect(result.split(' ')).toHaveLength(100)
      expect(result).toContain('class0')
      expect(result).toContain('class99')
    })

    it('should not modify input arrays', () => {
      const input = ['class1', 'class2']
      const original = [...input]

      cn(input)

      expect(input).toEqual(original)
    })
  })
})