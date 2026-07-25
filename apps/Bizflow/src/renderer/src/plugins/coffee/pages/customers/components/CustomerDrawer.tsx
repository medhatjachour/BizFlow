import {
  X,
  Edit2,
  Phone,
  MapPin,
  StickyNote,
  Star,
  Coffee,
} from 'lucide-react'
import { PROFILE_STATS, COLOR_STYLES } from '../constants'
import { formatCurrency, formatDateTime, getInitials, getAvatarGradient } from '../utils'
import type { CustomerDetail } from '../types'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  profile: CustomerDetail | null
  loading: boolean
  onClose: () => void
  onEdit: (c: CustomerDetail) => void
}

export function CustomerDrawer({ profile, loading, onClose, onEdit }: Props) {
  // ✅ Only render if loading or we have a profile
  if (!loading && !profile) return null
  const { t } = useLanguage()
  const avgOrder =
    profile && profile.visitCount > 0 ? profile.totalSpent / profile.visitCount : 0


  const stats = {
    totalSpent: formatCurrency(profile?.totalSpent ?? 0),
    visitCount: String(profile?.visitCount ?? 0),
    orders: String(profile?.orders?.length ?? 0), // This shows how many are loaded in the list
    avgOrder: formatCurrency(avgOrder)
  }
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto animate-in slide-in-from-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {loading ? (
                <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
              ) : (
                <div
                  className={`relative w-14 h-14 rounded-full bg-gradient-to-br ${getAvatarGradient(profile?.name ?? '')} flex items-center justify-center text-white font-bold text-lg shrink-0`}
                >
                  {getInitials(profile?.name ?? '')}
                  {profile?.isVip && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                      <Star className="w-3 h-3 text-white fill-white" />
                    </div>
                  )}
                </div>
              )}

              <div className="min-w-0 flex-1">
                {loading ? (
                  <div className="space-y-2">
                    <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                        {profile?.name}
                      </h2>
                      {profile?.isVip && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
                          VIP
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {profile?.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {profile.phone}
                        </span>
                      )}
                      {profile?.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {profile.address}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-5 space-y-6">
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : profile ? (
          <div className="p-5 space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              {PROFILE_STATS.map(({ key, label, icon: Icon, color }) => {
                const styles = COLOR_STYLES[color]
                return (
                  <div key={key} className={`p-4 rounded-xl ${styles.bg} border ${styles.border}`}>
                    <div
                      className={`w-8 h-8 rounded-lg ${styles.bg} ${styles.text} flex items-center justify-center mb-2`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white">
                      {(stats as any)[key]}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
                  </div>
                )
              })}
            </div>

            {/* Notes */}
            {profile.notes && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">
                  <StickyNote className="w-4 h-4" /> {t('cfNotes') || 'Notes'}
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{profile.notes}</p>
              </div>
            )}

            {/* Order History */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Coffee className="w-4 h-4 text-amber-500" />
                {t('cfOrderHistory') || 'Order History'} ({profile.orders.length})
              </h3>

              {profile.orders.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">
                  {t('cfNoOrdersYet') || 'No orders yet'}
                </div>
              ) : (
                <div className="space-y-2">
                  {profile.orders.map((order) => (
                    <div
                      key={order.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-slate-900 dark:text-white text-sm">
                              #{order.orderNumber}
                            </span>
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded capitalize">
                              {order.type.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm shrink-0">
                          {formatCurrency(order.total)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 mb-2">
                        {formatDateTime(order.closedAt)}
                      </div>

                      {/* Items */}
                      <div className="flex flex-wrap gap-1">
                        {order.items.slice(0, 4).map((item, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 text-[11px] bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-md border border-slate-200 dark:border-slate-700"
                          >
                            {item.quantity}× {item.productName}
                          </span>
                        ))}
                        {order.items.length > 4 && (
                          <span className="px-2 py-0.5 text-[11px] text-slate-400">
                            +{order.items.length - 4} {t('cfMore') || 'more'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Edit Button */}
            <button
              onClick={() => onEdit(profile)}
              className="w-full py-2.5 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-xl text-sm font-medium hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center justify-center gap-2 transition-colors"
            >
              <Edit2 className="w-4 h-4" /> {t('cfEditCustomer') || 'Edit Customer'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
