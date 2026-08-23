import React, { useState } from 'react'
import {
  ChevronRight,
  Edit2,
  Trash2,
  Plus,
  Box,
  Eye} from 'lucide-react'
import { LocationItem } from '../types'
import { TYPE_THEMES } from '../constants'

interface Props {
  loc: LocationItem
  depth: number
  onSelect: (l: LocationItem) => void
  onEdit: (l: LocationItem) => void
  onDelete: (l: LocationItem) => void
  onAddChild: (parent: LocationItem) => void
}

export const LocationRow: React.FC<Props> = ({
  loc,
  depth,
  onSelect,
  onEdit,
  onDelete,
  onAddChild
}) => {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = (loc.children?.length ?? 0) > 0
  const theme = TYPE_THEMES[loc.type] || TYPE_THEMES.bin

  return (
    <>
      <div
        className="group flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/60 transition-colors"
        style={{ paddingLeft: `${16 + depth * 22}px` }}
      >
        {/* Toggle + Icon + Names */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className={`w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-transform ${
              hasChildren ? '' : 'invisible'
            } ${expanded ? 'rotate-90' : ''}`}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <div
            onClick={() => onSelect(loc)}
            className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1 group-hover:text-indigo-600 transition-colors"
          >
            <span
              className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${theme.iconBg} ${theme.iconColor}`}
            >
              <Box className="w-3.5 h-3.5" />
            </span>

            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {loc.name}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border capitalize ${theme.badge}`}
                >
                  {loc.type}
                </span>
                {!loc.isActive && (
                  <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                    Inactive
                  </span>
                )}
              </div>
              <div className="text-[11px] font-mono text-slate-400">{loc.code}</div>
            </div>
          </div>
        </div>

        {/* Counter Pills & Action Buttons */}
        <div className="flex items-center gap-2">
          {loc._count && (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 pr-2">
              {loc._count.stockEntries > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[10.5px]">
                  {loc._count.stockEntries} SKUs
                </span>
              )}
              {loc._count.children > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[10.5px]">
                  {loc._count.children} sub-nodes
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onSelect(loc)}
              title="Open Location Profile"
              className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAddChild(loc)}
              title="Add Child Sub-location"
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onEdit(loc)}
              title="Edit Location"
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(loc)}
              title="Archive Location"
              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recursive Children Rows */}
      {expanded &&
        hasChildren &&
        loc.children!.map(child => (
          <LocationRow
            key={child.id}
            loc={child}
            depth={depth + 1}
            onSelect={onSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddChild={onAddChild}
          />
        ))}
    </>
  )
}