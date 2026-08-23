export const QUICK_NAV_LINKS = [
  {
    tab: 'locations',
    route: '/warehouse?tab=locations',
    label: 'Facility Nodes',
    description: 'Manage zones, aisles & storage bins',
    iconColor: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200/60 dark:border-purple-800/40'
  },
  {
    tab: 'inventory',
    route: '/warehouse?tab=inventory',
    label: 'Inventory Control',
    description: 'Live catalog balances & lot records',
    iconColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/60 dark:border-indigo-800/40'
  },
  {
    tab: 'transfers',
    route: '/warehouse?tab=transfers',
    label: 'Inter-Site Transfers',
    description: 'Dispatch manifests & transit ledger',
    iconColor: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200/60 dark:border-sky-800/40'
  },
  {
    tab: 'reports',
    route: '/warehouse?tab=reports',
    label: 'Audits & Valuations',
    description: 'Export PDF manifests & compliance data',
    iconColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40'
  }
]