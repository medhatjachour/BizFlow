import { useEffect, useRef, useState } from 'react'
import { Plus, RefreshCw, AlertCircle, Edit2, Trash2, ChevronRight, Search } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useToast } from '@renderer/contexts/ToastContext'

interface Location { id: string; name: string; code: string; type: string; parentId: string | null; isActive: boolean; children?: Location[] }

const TYPE_COLORS: Record<string, string> = {
  zone: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  aisle: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  shelf: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  bin: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
}

const TYPES = ['zone', 'aisle', 'shelf', 'bin']

function buildTree(locations: Location[]): Location[] {
  const map = new Map<string, Location>()
  locations.forEach(l => map.set(l.id, { ...l, children: [] }))
  const roots: Location[] = []
  locations.forEach(l => {
    if (l.parentId && map.has(l.parentId)) map.get(l.parentId)!.children!.push(map.get(l.id)!)
    else roots.push(map.get(l.id)!)
  })
  return roots
}

function LocationRow({ loc, depth, onEdit, onDelete, t }: { loc: Location; depth: number; onEdit: (l: Location) => void; onDelete: (l: Location) => void; t: (key: string) => string }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = (loc.children?.length ?? 0) > 0
  return (
    <>
      <div className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors border-b border-slate-50 dark:border-slate-700/30`}
        style={{ paddingLeft: `${16 + depth * 24}px` }}>
        <button onClick={() => setExpanded(e => !e)} className={`w-5 h-5 flex items-center justify-center flex-shrink-0 text-slate-400 transition-transform ${hasChildren ? '' : 'invisible'} ${expanded ? 'rotate-90' : ''}`}>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900 dark:text-white text-sm">{loc.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TYPE_COLORS[loc.type]}`}>{loc.type}</span>
            {!loc.isActive && <span className="text-xs text-slate-400 dark:text-slate-500">{t('warehouseInactive')}</span>}
          </div>
          <div className="text-xs text-slate-400 font-mono">{loc.code}</div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(loc)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
          <button onClick={() => onDelete(loc)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      {expanded && hasChildren && loc.children!.map(child => (
        <LocationRow key={child.id} loc={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} t={t} />
      ))}
    </>
  )
}

export default function LocationsTab() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [typeFilter, setTypeFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Location | null>(null)
  const [form, setForm] = useState({ name: '', code: '', type: 'bin', parentId: '' })
  const { t } = useLanguage()
  const toast = useToast()

  const load = async () => {
    setLoading(true); setError('')
    try { setLocations(await window.api.warehouse.getLocations()) }
    catch { setError(t('warehouseLoadLocationsFailed')) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        openAdd()
        return
      }

      if (!typing && e.key === '/') {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      if (e.key === 'Escape' && showForm) {
        setShowForm(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showForm])

  const openAdd = () => { setEditing(null); setForm({ name: '', code: '', type: 'bin', parentId: '' }); setShowForm(true) }
  const openEdit = (l: Location) => { setEditing(l); setForm({ name: l.name, code: l.code, type: l.type, parentId: l.parentId || '' }); setShowForm(true) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = { name: form.name, code: form.code, type: form.type, parentId: form.parentId || undefined }
      if (editing) await window.api.warehouse.updateLocation({ id: editing.id, ...data })
      else await window.api.warehouse.createLocation(data)
      setShowForm(false)
      toast.success(editing ? 'Location updated' : 'Location created')
      load()
    } catch (err: any) { toast.error(err?.message || 'Failed to save location') }
  }

  const del = async (l: Location) => {
    if (!confirm(t('warehouseDeleteLocationConfirm').replace('{name}', l.name))) return
    const before = locations
    setLocations(prev => prev.filter(x => x.id !== l.id))
    try {
      await window.api.warehouse.deleteLocation(l.id)
      toast.success('Location deleted')
    }
    catch (err: any) {
      setLocations(before)
      toast.error(err?.message || 'Failed to delete location')
    }
  }

  const filteredLocations = locations.filter((l) => {
    if (typeFilter !== 'all' && l.type !== typeFilter) return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    return `${l.name} ${l.code} ${l.type}`.toLowerCase().includes(q)
  })

  const tree = buildTree(filteredLocations)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">{filteredLocations.length} {filteredLocations.length !== 1 ? t('warehouseLocationsCountPlural') : t('warehouseLocationsCount')}</p>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search location name/code"
                className="pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm w-full sm:w-56"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
            >
              <option value="all">All Types</option>
              {TYPES.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
            </select>
            <button onClick={load} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-700 transition-colors"><RefreshCw className="w-4 h-4" /></button>
            <button onClick={openAdd} className="flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors"><Plus className="w-4 h-4" /> {t('warehouseAddLocation')}</button>
          </div>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 text-red-500 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}

      {loading ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
              <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-700 mb-2" />
              <div className="h-2.5 w-1/4 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      ) : tree.length === 0 ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">{t('warehouseNoLocations')}</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          {tree.map(loc => <LocationRow key={loc.id} loc={loc} depth={0} onEdit={openEdit} onDelete={del} t={t} />)}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{editing ? t('warehouseEditLocation') : t('warehouseNewLocation')}</h3>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('warehouseLocationName')} *</span>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('warehouseLocationCode')} * <span className="text-xs text-slate-400">({t('warehouseLocationCodeHint')})</span></span>
                <input required value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. A-01-03"
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm font-mono" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('warehouseLocationType')} *</span>
                <select required value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm capitalize">
                  {TYPES.map(tp => <option key={tp} value={tp}>{t(`warehouseType${tp.charAt(0).toUpperCase() + tp.slice(1)}` as any)}</option>)}
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('warehouseParentLocation')}</span>
              <select value={form.parentId} onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm">
                <option value="">{t('warehouseNoParent')}</option>
                {locations.filter(l => l.id !== editing?.id).map(l => <option key={l.id} value={l.id}>[{l.type}] {l.name} ({l.code})</option>)}
              </select>
            </label>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700">{t('warehouseCancel')}</button>
              <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">{t('warehouseSave')}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
