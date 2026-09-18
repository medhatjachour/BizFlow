import React from 'react'

type BadgeVariant = 'default' | 'secondary' | 'success' | 'destructive' | 'outline' | 'accent'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'

  const variantClasses: Record<BadgeVariant, string> = {
    default: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    secondary: 'bg-gray-100 text-gray-800 dark:bg-slate-700/60 dark:text-slate-200',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    destructive: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    outline: 'border border-gray-300 text-gray-700 dark:border-slate-600 dark:text-slate-300',
    accent: 'bg-[color:var(--accent-tint)] text-[color:var(--accent-text)]'
  }

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}