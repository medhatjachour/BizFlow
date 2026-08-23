import React from 'react'
import { FolderTree, MapPinOff } from 'lucide-react'
import { LocationItem } from '../types'
import { LocationRow } from './LocationRow'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  tree: LocationItem[]
  onSelect: (l: LocationItem) => void
  onEdit: (l: LocationItem) => void
  onDelete: (l: LocationItem) => void
  onAddChild: (parent: LocationItem) => void
}

export const LocationHierarchyTree: React.FC<Props> = ({
  tree,
  onSelect,
  onEdit,
  onDelete,
  onAddChild
}) => {
  const { t } = useLanguage()

  if (tree.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center flex flex-col items-center justify-center space-y-2">
        <MapPinOff className="w-8 h-8 text-slate-300 dark:text-slate-600" />
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {t('warehouseNoLocations') || 'No location nodes found'}
        </h4>
        <p className="text-xs text-slate-400 max-w-sm">
          No warehouse locations matched your query or filter criteria.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
        <span className="flex items-center gap-1.5">
          <FolderTree className="w-3.5 h-3.5" />
          Location Hierarchy
        </span>
        <span>Actions</span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
        {tree.map(rootNode => (
          <LocationRow
            key={rootNode.id}
            loc={rootNode}
            depth={0}
            onSelect={onSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
          />
        ))}
      </div>
    </div>
  )
}