import React, { useState } from 'react'
import {
  X,
  Boxes,
  Activity,
  ClipboardList,
  FolderTree,
  ChevronRight,
  Building2,
  Clock,
  ArrowRight
} from 'lucide-react'
import { LocationItem } from '../types'
import { TYPE_THEMES } from '../constants'
import { getLocationBreadcrumbs } from '../utils'
import { useLocationProfile } from '../hooks/useLocationProfile'

interface Props {
  location: LocationItem | null
  allLocations: LocationItem[]
  onClose: () => void
  onSelectSubLocation: (l: LocationItem) => void
}

type ProfileTab = 'stock' | 'movements' | 'orders' | 'children'

export const LocationProfileDrawer: React.FC<Props> = ({
  location,
  allLocations,
  onClose,
  onSelectSubLocation
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('stock')
  const { profileData, loading } = useLocationProfile(location, allLocations)

  if (!location) return null

  const breadcrumbs = getLocationBreadcrumbs(location.id, allLocations)
  const theme = TYPE_THEMES[location.type] || TYPE_THEMES.bin

  const tabs: Array<{ id: ProfileTab; label: string; count?: number; icon: any }> = [
    { id: 'stock', label: 'Stock on Hand', count: profileData?.stocks.length, icon: Boxes },
    { id: 'movements', label: 'Activity & Movements', count: profileData?.movements.length, icon: Activity },
    { id: 'orders', label: 'Active Orders', count: profileData?.orders.length, icon: ClipboardList },
    { id: 'children', label: 'Sub-Locations', count: profileData?.children.length, icon: FolderTree }
  ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Top Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            {/* Breadcrumb Hierarchy */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 overflow-x-auto">
              <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.id}>
                  {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-400" />}
                  <span
                    onClick={() => onSelectSubLocation(crumb)}
                    className="hover:underline cursor-pointer truncate max-w-[120px]"
                  >
                    {crumb.name}
                  </span>
                </React.Fragment>
              ))}
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Title & Type Badge */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {location.name}
              </h2>
              <p className="text-xs font-mono text-slate-400">{location.code}</p>
            </div>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${theme.badge}`}
            >
              {location.type}
            </span>
          </div>

          {/* Tab Strip */}
          <div className="flex items-center gap-1 pt-2 border-t border-slate-100 dark:border-slate-800/80 overflow-x-auto">
            {tabs.map(tab => {
              const active = activeTab === tab.id
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        active ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Drawer Body Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800" />
              ))}
            </div>
          ) : (
            <>
              {/* TAB 1: Stock on Hand */}
              {activeTab === 'stock' && (
                <div className="space-y-2.5">
                  {(profileData?.stocks ?? []).length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      No stock entries recorded in this location node.
                    </div>
                  ) : (
                    profileData?.stocks.map(st => (
                      <div
                        key={st.id}
                        className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between text-xs hover:border-slate-300 transition-all"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {st.productName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {st.sku || 'No SKU'} {st.lotNumber && `• Lot: ${st.lotNumber}`}
                          </div>
                        </div>
                        <div className="text-right font-mono font-bold text-slate-900 dark:text-white">
                          {st.quantity.toLocaleString()} {st.unit}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 2: Movements Log */}
              {activeTab === 'movements' && (
                <div className="space-y-2.5">
                  {(profileData?.movements ?? []).length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      No stock movements recorded here yet.
                    </div>
                  ) : (
                    profileData?.movements.map(mv => (
                      <div
                        key={mv.id}
                        className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {mv.productName}
                          </span>
                          <span
                            className={`font-mono font-bold ${
                              mv.quantity > 0 ? 'text-emerald-600' : 'text-slate-600'
                            }`}
                          >
                            {mv.quantity > 0 ? '+' : ''}
                            {mv.quantity} {mv.unit}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="uppercase font-semibold text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800">
                            {mv.movementType}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(mv.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: Active Orders */}
              {activeTab === 'orders' && (
                <div className="space-y-2.5">
                  {(profileData?.orders ?? []).length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      No operational orders assigned to this facility.
                    </div>
                  ) : (
                    profileData?.orders.map(o => (
                      <div
                        key={o.id}
                        className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {o.orderNumber}
                          </span>
                          <span className="capitalize text-[10.5px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 font-medium">
                            {o.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {o.orderType.toUpperCase()} • {o.lines.length} lines • Partner: {o.partnerName || 'None'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 4: Sub Locations */}
              {activeTab === 'children' && (
                <div className="space-y-2.5">
                  {(profileData?.children ?? []).length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      No sub-locations configured under this node.
                    </div>
                  ) : (
                    profileData?.children.map(child => (
                      <button
                        key={child.id}
                        onClick={() => onSelectSubLocation(child)}
                        className="w-full p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between text-xs hover:border-indigo-400 text-left transition-all"
                      >
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {child.name}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {child.code} • <span className="capitalize">{child.type}</span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}