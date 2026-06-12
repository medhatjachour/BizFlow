import React from 'react'

interface TableProps {
  children: React.ReactNode
  className?: string
}

interface TableHeaderProps {
  children: React.ReactNode
  className?: string
}

interface TableBodyProps {
  children: React.ReactNode
  className?: string
}

interface TableRowProps {
  children: React.ReactNode
  className?: string
}

interface TableCellProps {
  children: React.ReactNode
  className?: string
  colSpan?: number
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ children, className = '' }: TableHeaderProps) {
  return (
    <thead className={`bg-slate-50 dark:bg-slate-800/50 ${className}`}>
      {children}
    </thead>
  )
}

export function TableBody({ children, className = '' }: TableBodyProps) {
  return (
    <tbody className={`bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700 ${className}`}>
      {children}
    </tbody>
  )
}

export function TableRow({ children, className = '' }: TableRowProps) {
  return (
    <tr className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${className}`}>
      {children}
    </tr>
  )
}

export function TableHead({ children, className = '' }: TableCellProps) {
  return (
    <th className={`px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider ${className}`}>
      {children}
    </th>
  )
}

export function TableCell({ children, className = '', colSpan }: TableCellProps) {
  return (
    <td className={`px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 ${className}`} colSpan={colSpan}>
      {children}
    </td>
  )
}

export default Table