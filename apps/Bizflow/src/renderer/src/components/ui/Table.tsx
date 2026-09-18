import React, { createContext, useContext } from 'react'

interface TableProps {
  children: React.ReactNode
  className?: string
  /** Compact row/header padding for dense data screens. Defaults to false. */
  dense?: boolean
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

const TableDensityContext = createContext(false)

export function Table({ children, className = '', dense = false }: TableProps) {
  return (
    <TableDensityContext.Provider value={dense}>
      <div className={`overflow-x-auto ${className}`}>
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          {children}
        </table>
      </div>
    </TableDensityContext.Provider>
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
  const dense = useContext(TableDensityContext)
  return (
    <th className={`${dense ? 'px-4 py-2' : 'px-6 py-3'} text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider ${className}`}>
      {children}
    </th>
  )
}

export function TableCell({ children, className = '', colSpan }: TableCellProps) {
  const dense = useContext(TableDensityContext)
  return (
    <td className={`${dense ? 'px-4 py-2.5' : 'px-6 py-4'} whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 ${className}`} colSpan={colSpan}>
      {children}
    </td>
  )
}

export default Table