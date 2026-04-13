# BizFlow Code Conventions

> **AI INSTRUCTION:** Follow every rule in this document when writing or modifying code for BizFlow. These rules are derived from actual patterns in the codebase — they are not aspirational guidelines, they are how the code is actually written.

---

## 1. General Rules

### 1.1 Language
- All code is in **TypeScript** with strict mode
- All UI text is accessed through `t(key)` — never hardcode English strings in JSX
- All comments in code are in **English**

### 1.2 File Organization
- One React component per file (except small helper sub-components)
- Export default for page/tab components, named exports for hooks and utilities
- Co-locate index.tsx with its components/ subfolder within each plugin/page directory

---

## 2. TypeScript

### 2.1 Types
- Shared types (used in both main and renderer) → `src/shared/types.ts`
- Plugin-local types → defined inline in the component or handler file
- Use `interface` not `type` for object shapes (consistency with existing codebase)
- Use `any` only in handler function parameters (Prisma raw query results) — not in renderer components

### 2.2 Nullability
- Database optional fields are `string | null` (not `string | undefined`)
- Form state for optional fields: `useState('')` with `.trim() || null` when sending to backend
- API responses may have `Date` objects as serialized strings → always treat date fields as `string | Date`

### 2.3 Global Build Flags
```typescript
// These are boolean globals injected by Vite at build time
declare const __PLUGIN_COMMERCE__: boolean
declare const __PLUGIN_BAKERY__: boolean
declare const __PLUGIN_RESTAURANT__: boolean
declare const __PLUGIN_WAREHOUSE__: boolean
declare const __PLUGIN_CLINIC__: boolean

// Always guard with existence check in conditional code:
typeof __PLUGIN_CLINIC__ !== 'undefined' && __PLUGIN_CLINIC__
```

---

## 3. React Components

### 3.1 Component Structure Order
```typescript
// 1. Imports
import { useState, useEffect } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
// ...

// 2. Types/interfaces local to this component
interface Props { ... }

// 3. Constants (outside component)
const SOME_CONSTANT = ...

// 4. Component function
export default function MyComponent({ prop }: Props) {
  // 4a. Context hooks
  const { t } = useLanguage()
  const { user } = useAuth()

  // 4b. State
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  // 4c. Effects
  useEffect(() => { ... }, [])

  // 4d. Event handlers
  const handleSubmit = async () => { ... }

  // 4e. JSX
  return ( ... )
}
```

### 3.2 Data Fetching
Always use this exact pattern. Never use React Query, SWR, or other data fetching libraries:

```typescript
const [data, setData] = useState<ItemType[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.clinic.patients.getAll()
      setData(result ?? [])
    } catch (e) {
      console.error('Failed to load:', e)
      setError(t('errorLoadingData'))
    } finally {
      setLoading(false)
    }
  }
  fetchData()
}, [])
```

### 3.3 Loading States
Show a spinner/skeleton rather than nothing. Keep loading states simple:

```tsx
if (loading) return (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
  </div>
)
```

### 3.4 Error States
```tsx
if (error) return (
  <div className="flex items-center gap-2 justify-center py-8 text-red-500">
    <AlertCircle className="h-5 w-5" />
    <span>{error}</span>
  </div>
)
```

### 3.5 Empty States
```tsx
{data.length === 0 && !loading && (
  <div className="text-center py-12 text-slate-400 dark:text-slate-500">
    <SomeIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
    <p className="text-sm">{t('noItemsFound')}</p>
  </div>
)}
```

---

## 4. Styling with Tailwind

### 4.1 Required Supporting Classes
Always include both light and dark mode classes:

```tsx
// ✅ Correct — supports both modes
<div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">

// ❌ Wrong — breaks dark mode
<div className="bg-white text-slate-900">
```

### 4.2 Card Pattern
```tsx
<div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
```

### 4.3 Table Pattern
```tsx
<table className="w-full text-sm">
  <thead>
    <tr className="border-b border-slate-200 dark:border-slate-700">
      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {t('columnName')}
      </th>
    </tr>
  </thead>
  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
      <td className="py-3 px-4 text-slate-900 dark:text-white">...</td>
    </tr>
  </tbody>
</table>
```

### 4.4 Button Variants
```tsx
// Primary
<button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm">

// Secondary
<button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors text-sm">

// Danger
<button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors text-sm">

// Icon button
<button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
```

### 4.5 Form Inputs
```tsx
<input
  type="text"
  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
/>
```

### 4.6 Select Dropdowns
```tsx
<select className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
```

### 4.7 Modal Backdrop + Panel
```tsx
// Overlay
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
  // Panel
  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
```

### 4.8 KPI Card (Stat Card)
```tsx
<div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
  <div className="flex items-center justify-between mb-2">
    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t('label')}</span>
    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
      <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
    </div>
  </div>
  <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
</div>
```

---

## 5. Icons (lucide-react)

### 5.1 Version Constraint

**lucide-react version is 0.287.0** — this is an old version. Many icons available in newer versions do NOT exist here.

### 5.2 Verification Before Use

Before using any icon that isn't listed below, verify it exists:
```bash
node -e "const l = require('lucide-react'); console.log(Object.keys(l).filter(k => k.toLowerCase().includes('KEYWORD')))"
```
Run in project root (`c:\Users\medha\Documents\BizFlow`).

### 5.3 Confirmed Working Icons (Common Ones)

```
Layout & Navigation:  LayoutDashboard, Menu, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp
                      LayoutGrid, List, Filter, Search, SlidersHorizontal

Actions:              Plus, Edit, Edit2, Trash2, Save, Download, Upload, Share2, Copy, Check, 
                      CheckCircle, RefreshCw, RotateCcw, Eye, EyeOff, Lock, Unlock

Files & Documents:    FileText, File, Folder, FolderOpen, FilePlus, FileDown, FileBarChart
                      Clipboard, ClipboardList

People & Business:    User, Users, UserCircle, UserSquare2, UserCheck, Building, Building2, Store
                      Stethoscope, ChefHat, UtensilsCrossed, Warehouse (import as WarehouseIcon)

Finance:              Wallet, DollarSign, TrendingUp, TrendingDown, BarChart, BarChart2, 
                      BarChart3, PieChart, LineChart, Receipt, CreditCard, Banknote, Coins

Products & Inventory: Package, PackageOpen, BoxIcon, Tag, Tags, ShoppingCart, ShoppingBag
                      Archive, Layers, Boxes, QrCode

Status & Alerts:      AlertCircle, AlertTriangle, Info, CheckCircle2, XCircle, Bell, BellOff, Clock

Misc:                 Settings, Settings2, LogOut, Globe, Calendar, MapPin, Phone, Mail, Link
                      ExternalLink, Loader2, Star, Heart, Zap, Shield, Cpu, Database, Server
                      Printer, Wifi, WifiOff, Battery, Monitor, Maximize, Minimize
```

### 5.4 Known Missing Icons (Do NOT Use)

```
ReceiptText    → use Receipt
ReceiptEuro    → use Receipt
CircleUserRound → use User or UserCircle
```

---

## 6. Translation Keys

### 6.1 Rules

1. Always add to BOTH `en` and `ar` sections in `src/renderer/src/i18n/translations.ts`
2. Never use the same key in two different sections (causes Vite duplicate-key warnings)
3. Keys are camelCase: `folderNumber`, `errorLoadingData`, `savedSuccessfully`
4. Use `t('key')` in all JSX — never hardcode English text

### 6.2 Standard Keys Already in the Translation File

These common keys exist — use them rather than creating duplicates:

```
Loading states:     loading, errorLoadingData
Success messages:   savedSuccessfully, createdSuccessfully, updatedSuccessfully, deletedSuccessfully
Error messages:     errorSavingRecord, errorUpdatingRecord, errorDeletingRecord
Form labels:        name, email, phone, address, date, notes, description, amount, status
Actions:            save, cancel, delete, edit, add, create, update, back, search, filter, reset
Modals:             confirm, areYouSure
Pagination:         showing, of, next, previous
Misc:               yes, no, none, all, total, optional
```

### 6.3 Clinic-Specific Keys (Already Added)

```
clinicFollowUps, clinicExpenses, searchPatients, newPatient, patient, gender, select, 
male, female, nationalId, folderNumber, dateOfBirth, allergies, address, diagnosis, 
prescriptions, medicine, frequency, duration, followUpDate, visits, sessions, method, 
thisMonth, errorLoadingData, deletedSuccessfully, errorDeletingRecord, savedSuccessfully, 
createdSuccessfully, errorSavingRecord, updatedSuccessfully, errorUpdatingRecord, 
financeSummary, nextFollowUp, totalPaid, back, totalVisits, clinicOverview, followUpsDue, 
date, netIncome
```

**Expense keys** (`addExpense`, `noExpensesFound`, `expenseCategory`, etc.) exist in the **main** finance/expenses section — do NOT duplicate them in the clinic section.

---

## 7. IPC Handler Pattern

### 7.1 Main Process Handler
```typescript
// In src/main/ipc/handlers/<domain>.handlers.ts
import { ipcMain } from 'electron'

export function registerXxxHandlers(prisma: any): void {
  ipcMain.handle('namespace:action', async (_event, params) => {
    try {
      const result = await prisma.someModel.findMany({ ... })
      return result
    } catch (error) {
      console.error('namespace:action failed:', error)
      throw error  // or return { error: message }
    }
  })
}
```

### 7.2 Preload Binding
```typescript
// In src/plugins/<name>/preload.ts or src/preload/index.ts
someAction: (id: string) =>
  ipcRenderer.invoke('namespace:action', id),
```

### 7.3 Renderer Call
```typescript
// In component
const result = await window.api.clinic.patients.getAll({ search: query })
```

---

## 8. Plugin Schema Rules

### 8.1 Schema File Format
Plugin schema files (`src/plugins/<name>/schema.prisma`) must:
- **NOT** have a `datasource` block
- **NOT** have a `generator` block  
- Only contain `model` definitions

```prisma
// ✅ Correct plugin schema
model ClinicPatient {
  id   String @id @default(uuid())
  name String
  ...
}

// ❌ Wrong — datasource blocks cause merge failures
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

### 8.2 Adding Columns to Existing Tables
When adding a column to an existing table (that users already have in production), add it to:
1. `src/plugins/<name>/schema.prisma` — add the field
2. `src/plugins/<name>/migrate.ts` — add an entry to `columnMigrations` array:

```typescript
const columnMigrations = [
  {
    table: 'ClinicPatient',
    column: 'folderNumber',
    sql: `ALTER TABLE "ClinicPatient" ADD COLUMN "folderNumber" TEXT`
  }
]
```

The `applyColumnMigrations()` function checks via `PRAGMA table_info` and only applies if the column doesn't exist.

---

## 9. Chart Styling (recharts)

### 9.1 Standard Tooltip Style (Required for Dark Mode)
```typescript
// Always use this — itemStyle is critical for dark mode text visibility
const TOOLTIP_STYLE = {
  contentStyle: {
    fontSize: 12,
    borderRadius: 8,
    border: 'none',
    background: '#1e293b',
    color: '#fff'
  },
  labelStyle: { color: '#94a3b8' },
  itemStyle: { color: '#f1f5f9' }  // ← REQUIRED — without this, tooltip values are invisible in dark mode
}

// Usage:
<Tooltip {...TOOLTIP_STYLE} />
```

### 9.2 Standard Chart Colors
```typescript
const CHART_COLORS = {
  primary:   '#3b82f6',  // blue-500
  success:   '#22c55e',  // green-500
  warning:   '#f59e0b',  // amber-500
  danger:    '#ef4444',  // red-500
  teal:      '#14b8a6',  // teal-500
  purple:    '#a855f7',  // purple-500
  slate:     '#64748b',  // slate-500
}
```

---

## 10. Form Modals

### 10.1 Standard Modal Structure
```tsx
// Modal overlay + panel
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
    {/* Header */}
    <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('title')}</h2>
      <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
        <X className="h-5 w-5 text-slate-500" />
      </button>
    </div>
    {/* Body */}
    <div className="p-6 space-y-4">
      {/* form fields */}
    </div>
    {/* Footer */}
    <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
      <button onClick={onClose} className="flex-1 px-4 py-2 ...secondary button...">{t('cancel')}</button>
      <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 ...primary button...">
        {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : t('save')}
      </button>
    </div>
  </div>
</div>
```

### 10.2 Form Field Label Pattern
```tsx
<div>
  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
    {t('fieldName')}
    {isOptional && <span className="text-slate-400 font-normal ml-1">({t('optional')})</span>}
  </label>
  <input ... />
</div>
```

---

## 11. Error Handling

### 11.1 IPC Errors
- Main process: log with `console.error` (maps to electron-log), re-throw or return error object
- Renderer: catch in try/catch, show user-facing message via toast or inline error state

### 11.2 User Feedback
Use the `ToastContext` for success/error notifications:
```typescript
const { showToast } = useContext(ToastContext)  // or via useToast hook
showToast(t('savedSuccessfully'), 'success')
showToast(t('errorSavingRecord'), 'error')
```

---

## 12. Common Anti-Patterns to Avoid

| Anti-Pattern | Correct Approach |
|---|---|
| `import { ReceiptText } from 'lucide-react'` | Use `Receipt` instead |
| Hardcoded English text in JSX: `<span>Save</span>` | `<span>{t('save')}</span>` |
| `prisma db push --schema=prisma/schema.prisma` | Always use `prisma/merged.prisma` |
| Adding datasource block to plugin schema.prisma | Plugin schemas must NOT have datasource/generator |
| Duplicate translation keys in en/ar | Each key appears exactly once in each language section |
| Missing `dark:` classes in new components | Every color/bg class needs a matching `dark:` variant |
| Missing `itemStyle` in recharts Tooltip | Always include `itemStyle: { color: '#f1f5f9' }` |
| `async/await` without try/catch in useEffect | Always wrap async calls in try/catch/finally |
| `onClick` without `disabled` during async operations | Add `disabled={loading}` to prevent double-submit |
| Using BrowserRouter instead of HashRouter | Electron requires HashRouter for file:// protocol |
