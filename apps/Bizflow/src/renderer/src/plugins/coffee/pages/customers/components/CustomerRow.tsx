import { useState } from 'react'
import { Edit2, Trash2, ChevronRight, Star, Phone, MapPin } from 'lucide-react'
import { formatCurrency, getInitials, getAvatarGradient, formatDate } from '../utils'
import type { Customer } from '../types'

interface Props {
  customer: Customer
  onEdit: (c: Customer) => void
  onDelete: (c: Customer) => void
  onView: (id: string) => void
}

export function CustomerRow({ customer, onEdit, onDelete, onView }: Props) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Delete ${customer.name}? This cannot be undone.`)) {
      setIsDeleting(true)
      onDelete(customer)
    }
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(customer)
  }

  return (
    <div
      onClick={() => onView(customer.id)}
      className="group flex items-center gap-4 p-4 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-700/50 cursor-pointer transition-colors"
    >
      {/* Avatar */}
      <div className={`relative w-11 h-11 rounded-full bg-gradient-to-br ${getAvatarGradient(customer.name)} flex items-center justify-center text-white font-semibold text-sm shadow-sm shrink-0`}>
        {getInitials(customer.name)}
        {customer.isVip && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center border-2 border-white dark:border-slate-800">
            <Star className="w-2.5 h-2.5 text-white fill-white" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-900 dark:text-white truncate">{customer.name}</h3>
          {customer.isVip && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 rounded">VIP</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {customer.phone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" /> {customer.phone}
            </span>
          )}
          {customer.address && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3" /> {customer.address}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex flex-col items-end shrink-0">
        <div className="font-bold text-slate-900 dark:text-white">{formatCurrency(customer.totalSpent)}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {customer.visitCount} visits · Last: {formatDate(customer.lastVisit)}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
        <button
          onClick={handleEdit}
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-2 rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
    </div>
  )
}
