import { useEffect, useState } from 'react'
import { Plus, RefreshCw, AlertCircle, Users, Edit2, Trash2 } from 'lucide-react'

interface Table { id: string; number: number; capacity: number; status: string; section: string | null; _count: { orders: number; reservations: number } }

const STATUS_STYLES: Record<string, { bg: string; badge: string; dot: string }> = {
  available: { bg: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400', dot: 'bg-emerald-500' },
  occupied:  { bg: 'border-red-200    dark:border-red-800    bg-red-50    dark:bg-red-950/30',         badge: 'bg-red-100    text-red-700    dark:bg-red-900/40    dark:text-red-400',    dot: 'bg-red-500' },
  reserved:  { bg: 'border-amber-200  dark:border-amber-800  bg-amber-50  dark:bg-amber-950/30',       badge: 'bg-amber-100  text-amber-700  dark:bg-amber-900/40  dark:text-amber-400',  dot: 'bg-amber-500' },
  cleaning:  { bg: 'border-blue-200   dark:border-blue-800   bg-blue-50   dark:bg-blue-950/30',        badge: 'bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-400',   dot: 'bg-blue-500' },
}

export default function TablesTab() {
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Table | null>(null)
  const [form, setForm] = useState({ number: '', capacity: '4', section: '', status: 'available' })

  const load = async () => {
    setLoading(true); setError('')
    try { setTables(await window.api.restaurant.getTables()) }
    catch { setError('Failed to load tables') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setEditing(null); setForm({ number: '', capacity: '4', section: '', status: 'available' }); setShowForm(true) }
  const openEdit = (t: Table) => { setEditing(t); setForm({ number: String(t.number), capacity: String(t.capacity), section: t.section || '', status: t.status }); setShowForm(true) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editing) {
        await window.api.restaurant.updateTable({ id: editing.id, number: Number(form.number), capacity: Number(form.capacity), section: form.section || null, status: form.status })
      } else {
        await window.api.restaurant.createTable({ number: Number(form.number), capacity: Number(form.capacity), section: form.section || undefined })
      }
      setShowForm(false); load()
    } catch (err: any) { alert(err?.message || 'Failed to save') }
  }

  const handleStatusChange = async (id: string, status: string) => {
    await window.api.restaurant.updateTable({ id, status }); load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this table?')) return
    await window.api.restaurant.deleteTable(id); load()
  }

  const sections = [...new Set(tables.map(t => t.section).filter(Boolean))]
  const [filterSection, setFilterSection] = useState('')
  const displayed = filterSection ? tables.filter(t => t.section === filterSection) : tables

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterSection('')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!filterSection ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
            All
          </button>
          {sections.map(s => (
            <button key={s} onClick={() => setFilterSection(s!)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterSection === s ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-700 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Table
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <div className="flex items-center gap-2 text-red-500 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="animate-spin text-slate-400 w-6 h-6" /></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {displayed.map(table => {
            const style = STATUS_STYLES[table.status] || STATUS_STYLES.available
            return (
              <div key={table.id} className={`relative rounded-xl border-2 p-4 transition-all ${style.bg}`}>
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xl font-bold text-slate-900 dark:text-white">T{table.number}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${style.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                    {table.status}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-sm mb-2">
                  <Users className="w-3.5 h-3.5" /> {table.capacity} seats
                </div>
                {table.section && <div className="text-xs text-slate-400 dark:text-slate-500 mb-3">{table.section}</div>}

                {/* Status quick-change */}
                <select
                  value={table.status}
                  onChange={e => handleStatusChange(table.id, e.target.value)}
                  className="w-full text-xs rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 mb-2"
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="reserved">Reserved</option>
                  <option value="cleaning">Cleaning</option>
                </select>

                <div className="flex gap-1">
                  <button onClick={() => openEdit(table)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 text-xs transition-colors">
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                  <button onClick={() => handleDelete(table.id)} className="p-1.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}

          {displayed.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-400 dark:text-slate-500">
              No tables found. Add your first table.
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{editing ? 'Edit Table' : 'Add Table'}</h3>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Table Number *</span>
              <input type="number" required min="1" value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Capacity (seats) *</span>
              <input type="number" required min="1" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Section</span>
              <input type="text" placeholder="e.g. Indoor, Outdoor, Bar" value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </label>
            {editing && (
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</span>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="reserved">Reserved</option>
                  <option value="cleaning">Cleaning</option>
                </select>
              </label>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
              <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium transition-colors">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
