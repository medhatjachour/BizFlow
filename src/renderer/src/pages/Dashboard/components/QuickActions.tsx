/**
 * QuickActions Component
 * Role-based quick action shortcuts
 */

import { useNavigate } from 'react-router-dom'
import {
  ShoppingCart,
  ClipboardList,
  Users,
  Store,
  UserCog,
  BarChart3,
  Settings,
  Plus
} from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { useToast } from '../../../contexts/ToastContext'
import { useLanguage } from '../../../contexts/LanguageContext'
import { useModuleEnabled } from '../../../hooks/useModuleEnabled'
import { MODULE_IDS } from '@/shared/modules'

interface Props {
  userRole: string
}

export default function QuickActions({ userRole }: Props) {
  const { user } = useAuth()
  const { warning } = useToast()
  const { t } = useLanguage()
  const navigate = useNavigate()

  // Runtime module checks — mirrors the build-flag guards so toggling a module
  // in settings immediately hides/shows the related quick actions.
  const commerceEnabled = useModuleEnabled(MODULE_IDS.COMMERCE)
  const bakeryEnabled   = useModuleEnabled(MODULE_IDS.BAKERY)
  const restaurantEnabled = useModuleEnabled(MODULE_IDS.RESTAURANT)
  const warehouseEnabled  = useModuleEnabled(MODULE_IDS.WAREHOUSE)
  const clinicEnabled     = useModuleEnabled(MODULE_IDS.CLINIC)

  const allActions = [
    // --- Commerce actions ---
    {
      label: t('newSale'),
      icon: ShoppingCart,
      href: '/pos',
      color: 'primary',
      roles: ['admin', 'manager', 'sales'],
      visible: __PLUGIN_COMMERCE__ && commerceEnabled,
    },
    {
      label: t('addProduct'),
      icon: Plus,
      href: '/products',
      color: 'blue',
      roles: ['admin', 'manager', 'inventory'],
      visible: __PLUGIN_COMMERCE__ && commerceEnabled,
    },
    {
      label: t('checkInventory'),
      icon: ClipboardList,
      href: '/inventory',
      color: 'purple',
      roles: ['admin', 'manager', 'inventory'],
      visible: __PLUGIN_COMMERCE__ && commerceEnabled,
    },
    {
      label: t('manageStores'),
      icon: Store,
      href: '/stores',
      color: 'indigo',
      roles: ['admin', 'manager'],
      visible: __PLUGIN_COMMERCE__ && commerceEnabled,
    },
    // --- Bakery actions ---
    {
      label: t('bakerySchedule') || 'Production',
      icon: ClipboardList,
      href: '/bakery',
      color: 'amber',
      roles: ['admin', 'manager', 'sales'],
      visible: __PLUGIN_BAKERY__ && bakeryEnabled,
    },
    // --- Restaurant actions ---
    {
      label: t('manageTables') || 'Tables',
      icon: Store,
      href: '/restaurant',
      color: 'rose',
      roles: ['admin', 'manager', 'sales'],
      visible: __PLUGIN_RESTAURANT__ && restaurantEnabled,
    },
    // --- Warehouse actions ---
    {
      label: t('warehouseStock') || 'Warehouse',
      icon: ClipboardList,
      href: '/warehouse',
      color: 'blue',
      roles: ['admin', 'manager', 'inventory'],
      visible: __PLUGIN_WAREHOUSE__ && warehouseEnabled,
    },
    // --- Clinic actions ---
    {
      label: t('clinicPatients') || 'Patients',
      icon: Users,
      href: '/clinic',
      color: 'teal',
      roles: ['admin', 'manager', 'sales'],
      visible: __PLUGIN_CLINIC__ && clinicEnabled,
    },
    // --- Kernel actions (always visible) ---
    {
      label: t('viewReports'),
      icon: BarChart3,
      href: '/reports',
      color: 'emerald',
      roles: ['admin', 'manager', 'finance'],
      visible: true,
    },
    {
      label: t('manageCustomers'),
      icon: Users,
      href: '/customers',
      color: 'amber',
      roles: ['admin', 'manager', 'sales'],
      visible: true,
    },
    {
      label: t('manageEmployees'),
      icon: UserCog,
      href: '/employees',
      color: 'pink',
      roles: ['admin', 'manager'],
      visible: true,
    },
    {
      label: t('settings'),
      icon: Settings,
      href: '/settings',
      color: 'slate',
      roles: ['admin', 'manager'],
      visible: true,
    },
  ]

  const availableActions = allActions.filter(
    action => action.visible && action.roles.includes(userRole)
  )

  const colorClasses: Record<string, { bg: string; hover: string; icon: string }> = {
    primary: { bg: 'bg-primary/10', hover: 'hover:bg-primary/20', icon: 'text-primary' },
    blue: { bg: 'bg-blue-500/10', hover: 'hover:bg-blue-500/20', icon: 'text-blue-600' },
    purple: { bg: 'bg-purple-500/10', hover: 'hover:bg-purple-500/20', icon: 'text-purple-600' },
    emerald: { bg: 'bg-emerald-500/10', hover: 'hover:bg-emerald-500/20', icon: 'text-emerald-600' },
    amber: { bg: 'bg-amber-500/10', hover: 'hover:bg-amber-500/20', icon: 'text-amber-600' },
    indigo: { bg: 'bg-indigo-500/10', hover: 'hover:bg-indigo-500/20', icon: 'text-indigo-600' },
    pink: { bg: 'bg-pink-500/10', hover: 'hover:bg-pink-500/20', icon: 'text-pink-600' },
    slate: { bg: 'bg-slate-500/10', hover: 'hover:bg-slate-500/20', icon: 'text-slate-600' },
    rose: { bg: 'bg-rose-500/10', hover: 'hover:bg-rose-500/20', icon: 'text-rose-600' },
    teal: { bg: 'bg-teal-500/10', hover: 'hover:bg-teal-500/20', icon: 'text-teal-600' },
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
      <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
        {t('quickActions')}
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {availableActions.slice(0, 6).map((action, index) => {
          const Icon = action.icon
          const colors = colorClasses[action.color]
          
          return (
            <button
              key={index}
              onClick={() => {
                if (!user) {
                  warning('Please log in to access this feature', 4000)
                } else {
                  navigate(action.href)
                }
              }}
              className={`flex flex-col items-center justify-center p-3 rounded-lg ${colors.bg} ${colors.hover} transition-colors group cursor-pointer border-0`}
            >
              <Icon className={`w-6 h-6 ${colors.icon} mb-1 group-hover:scale-110 transition-transform`} />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center">
                {action.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
