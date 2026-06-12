/**
 * cn - Class Names Utility
 * 
 * Combines multiple class names, handling conditionals and removing falsy values
 * Lightweight alternative to clsx/classnames
 * 
 * @example
 * ```tsx
 * cn('base', isActive && 'active', 'other')
 * // => 'base active other'
 * 
 * cn('base', { active: true, disabled: false })
 * // => 'base active'
 * ```
 */

type ClassValue = string | number | boolean | undefined | null | ClassValue[] | Record<string, any>

export function cn(...classes: ClassValue[]): string {
  const result: string[] = []

  function processValue(value: ClassValue): void {
    if (value === null || value === undefined || value === false) {
      return
    }

    if (typeof value === 'string' || typeof value === 'number') {
      if (value === '' || value === 0) return
      result.push(String(value))
      return
    }

    if (Array.isArray(value)) {
      value.forEach(processValue)
      return
    }

    if (typeof value === 'object') {
      Object.keys(value).forEach(key => {
        if (value[key]) {
          result.push(key)
        }
      })
      return
    }

    if (value === true) {
      result.push('true')
      return
    }
  }

  classes.forEach(processValue)
  return result.join(' ')
}
