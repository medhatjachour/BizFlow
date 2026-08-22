import { LockerZone, LockerZoneFilter } from './types'

export const LOCKER_ZONES: { value: LockerZone; labelKey: string; fallbackLabel: string }[] = [
  { value: 'general', labelKey: 'gymZoneGeneral', fallbackLabel: 'General Locker Room' },
  { value: 'men', labelKey: 'gymZoneMen', fallbackLabel: "Men's Section" },
  { value: 'women', labelKey: 'gymZoneWomen', fallbackLabel: "Women's Section" },
  { value: 'vip', labelKey: 'gymZoneVip', fallbackLabel: 'VIP Lounge & Spa' }
]

export const ZONE_FILTERS: { id: LockerZoneFilter; label: string }[] = [
  { id: 'all', label: 'All Lockers' },
  { id: 'general', label: 'General' },
  { id: 'men', label: "Men's" },
  { id: 'women', label: "Women's" },
  { id: 'vip', label: 'VIP Lounge' }
]

export const ZONE_STYLES: Record<
  LockerZone,
  { label: string; badgeCls: string; borderCls: string; avatarCls: string }
> = {
  general: {
    label: 'General',
    badgeCls: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/20',
    borderCls: 'border-slate-200 dark:border-slate-700 hover:border-slate-300',
    avatarCls: 'bg-slate-100 dark:bg-slate-700 text-slate-600'
  },
  men: {
    label: "Men's",
    badgeCls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
    borderCls: 'border-blue-200/80 dark:border-blue-900/40 hover:border-blue-300',
    avatarCls: 'bg-blue-500/15 text-blue-600'
  },
  women: {
    label: "Women's",
    badgeCls: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20',
    borderCls: 'border-pink-200/80 dark:border-pink-900/40 hover:border-pink-300',
    avatarCls: 'bg-pink-500/15 text-pink-600'
  },
  vip: {
    label: 'VIP',
    badgeCls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    borderCls: 'border-amber-200/80 dark:border-amber-900/40 hover:border-amber-300',
    avatarCls: 'bg-amber-500/15 text-amber-600'
  }
}