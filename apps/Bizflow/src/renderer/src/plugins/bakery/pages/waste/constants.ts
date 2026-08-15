import { FlaskConical, Box, PackageX, HelpCircle } from 'lucide-react'
import { WasteTypeMeta } from './types'

export const WASTE_TYPES: WasteTypeMeta[] = [
  {
    value: 'ingredient',
    labelKey: 'bakeryWasteTypeIngredient',
    defaultLabel: 'Raw Ingredient',
    descKey: 'bakeryWasteTypeIngredientDesc',
    defaultDesc: 'Pantry stock loss (auto-deducted from pantry)',
    icon: FlaskConical,
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800/40',
    barColor: '#f59e0b',
  },
  {
    value: 'finished_product',
    labelKey: 'bakeryWasteTypeProduct',
    defaultLabel: 'Finished Product',
    descKey: 'bakeryWasteTypeProductDesc',
    defaultDesc: 'Packaged or display items lost',
    icon: Box,
    color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-300 dark:border-rose-700',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800/40',
    barColor: '#f43f5e',
  },
  {
    value: 'production_batch',
    labelKey: 'bakeryWasteTypeBatch',
    defaultLabel: 'Production Batch',
    descKey: 'bakeryWasteTypeBatchDesc',
    defaultDesc: 'Entire batch scrapped during bake/prep',
    icon: PackageX,
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600',
    barColor: '#64748b',
  },
  {
    value: 'other',
    labelKey: 'bakeryWasteTypeOther',
    defaultLabel: 'Other / Custom',
    descKey: 'bakeryWasteTypeOtherDesc',
    defaultDesc: 'Miscellaneous loss with no automated deduction',
    icon: HelpCircle,
    color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 border-violet-300 dark:border-violet-700',
    badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800/40',
    barColor: '#8b5cf6',
  },
]

export const WASTE_REASON_OPTIONS = [
  { value: 'Spoilage', key: 'bakeryWasteReasonSpoilage', defaultLabel: 'Spoilage' },
  { value: 'Overproduction', key: 'bakeryWasteReasonOverproduction', defaultLabel: 'Overproduction' },
  { value: 'Damage', key: 'bakeryWasteReasonDamage', defaultLabel: 'Handling / Drop Damage' },
  { value: 'Expiry', key: 'bakeryWasteReasonExpiry', defaultLabel: 'Expired Date' },
  { value: 'Quality Issue', key: 'bakeryWasteReasonQuality', defaultLabel: 'Failed Quality Check' },
  { value: 'Other', key: 'bakeryWasteReasonOther', defaultLabel: 'Other Reason' },
]

export const DEFAULT_PAGE_SIZE = 20