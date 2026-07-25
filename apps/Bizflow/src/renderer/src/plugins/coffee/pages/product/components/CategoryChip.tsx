import { Edit2, Trash2 } from 'lucide-react'
import { hexToRgba } from '../utils'
import type { Category } from '../types'

interface CategoryChipProps {
  category: Category
  active: boolean
  onClick: () => void
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}

export default function CategoryChip({
  category,
  active,
  onClick,
  onEdit,
  onDelete
}: CategoryChipProps) {
  return (
    <div 
      className={`flex items-center gap-1 px-3 py-1.5 rounded-full cursor-pointer transition-all border-2 ${
        active 
          ? 'border-transparent shadow-sm' 
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-'
      }`}
      style={active ? { backgroundColor: hexToRgba(category.color || '#f59e0b', 0.15), color: category.color || '#f59e0b' } : undefined}
      onClick={onClick}
    >
      {/* Icon and Name */}
      <div className="flex items-center gap-1.5 select-none">
        {category.icon && <span>{category.icon}</span>}
        <span className="text-sm font-medium whitespace-nowrap">{category.name}</span>
      </div>

      {/* Action Buttons - Always Visible */}
      <div className="flex items-center gap-0.5 ml-1">
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(category) }}
          className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          title="Edit Category"
        >
          <Edit2 className="w-3 h-3 text-slate-500 dark:text-slate-400" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(category) }}
          className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          title="Delete Category"
        >
          <Trash2 className="w-3 h-3 text-slate-500 dark:text-slate-400 hover:text-red-500" />
        </button>
      </div>
    </div>
  )
}
