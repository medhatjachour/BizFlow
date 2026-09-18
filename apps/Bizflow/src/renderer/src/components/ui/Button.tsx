import React from 'react'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger'
type ButtonSize = 'xs' | 'sm' | 'md'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  /**
   * Control height. `md` is the app default; `sm` and `xs` follow the same
   * scale as the HR module's primitives for dense data screens.
   * Approximate rendered heights: xs 24px, sm 32px, md 40px.
   */
  size?: ButtonSize
  loading?: boolean
  children: React.ReactNode
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: 'gap-1 rounded-md px-2 py-1 text-xs',
  sm: 'gap-1.5 rounded-lg px-3 py-1.5 text-sm',
  md: 'gap-2 rounded-xl px-4 py-2.5 text-sm'
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const baseClasses = `inline-flex items-center justify-center font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${SIZE_CLASSES[size]}`

  const variantClasses = {
    // Primary follows the active module's accent (see --accent in main.css).
    primary: 'text-[color:var(--accent-contrast)] bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] focus:ring-[color:var(--accent)] disabled:opacity-50',
    secondary: 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600 focus:ring-slate-400 disabled:opacity-50',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 disabled:bg-green-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-400'
  }

  const isDisabled = disabled || loading

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`${baseClasses} ${variantClasses[variant]} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {loading && (
        <Loader2
          className={`${size === 'md' ? 'w-4 h-4 mr-2' : 'w-3.5 h-3.5 mr-1.5'} animate-spin`}
        />
      )}
      {children}
    </button>
  )
}
