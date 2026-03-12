import { useEffect, useState } from 'react'
import { Plus, RefreshCw, AlertCircle, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Item { id: string; name: string; category: string; description: string | null; price: number; cost: number; preparationTime: number; isAvailable: boolean; notes: string | null }

const CATEGORIES = ['Starters', 'Main', 'Sides', 'Desserts', 'Drinks', 'Specials']

export default function MenuTab() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Item | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [filterCat, setFilterCat] = useState('')
  const [form, setForm] = useState({ name: '', category: 'Main', description: '', price: '', cost: '0', preparationTime: '15', notes: '' })
  const { t } = useLanguage()

  const load = async () => {
    setLoading(true); setError('')
    try { setItems(await window.api.restaurant.getMenuItems()) }
    catch { setError(t('restaurantLoadMenuFailed')) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setEditing(null); setForm({ name: '', category: 'Main', description: '', price: '', cost: '0', preparationTime: '15', notes: '' }); setShowForm(true) }
  const openEdit = (i: Item) => {
    setEditing(i)
    setForm({ name: i.name, category: i.category, description: i.description || '', price: String(i.price), cost: String(i.cost), preparationTime: String(i.preparationTime), notes: i.notes || '' })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const data = { name: form.name, category: form.category, description: form.description || undefined, price: Number(form.price), cost: Number(form.cost), preparationTime: Number(form.preparationTime), notes: form.notes || undefined }
      if (editing) await window.api.restaurant.updateMenuItem({ id: editing.id, ...data })
      else await window.api.restaurant.createMenuItem(data)
      setShowForm(false); load()
    } catch (err: any) { alert(err?.message || 'Failed to save') }
  }

  const toggleAvailability = async (item: Item) => {
    await window.api.restaurant.updateMenuItem({ id: item.id, isAvailable: !item.isAvailable }); load()
  }

  const del = async (id: string) => {
    if (!confirm(t('restaurantDeleteMenuItemConfirm'))) return
    await window.api.restaurant.deleteMenuItem(id); load()
  }

  const categories = [...new Set(items.map(i => i.category))]
  const displayed = filterCat ? items.filter(i => i.category === filterCat) : items

  // Group by category for display
  const grouped = displayed.reduce<Record<string, Item[]>>((acc, item) => {
    ;(acc[item.category] = acc[item.category] || []).push(item)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterCat('')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!filterCat ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
            {t('restaurantAll')}
          </button>
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterCat === cat ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-700 transition-colors"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"><Plus className="w-4 h-4" /> {t('restaurantAddItem')}</button>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 text-red-500 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}

      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="animate-spin text-slate-400 w-6 h-6" /></div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">{t('restaurantNoMenuItems')}</div>
      ) : (
        Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat}>
            <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">{cat}</h3>
            <div className="space-y-2">
              {catItems.map(item => (
                <div key={item.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-opacity ${item.isAvailable ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-white">{item.name}</span>
                      {!item.isAvailable && <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">{t('restaurantUnavailable')}</span>}
                    </div>
                    {item.description && <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{item.description}</p>}
                    <div className="text-xs text-slate-400 mt-0.5">{item.preparationTime} {t('restaurantMinPrep')}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-semibold text-slate-900 dark:text-white">{item.price.toFixed(2)}</div>
                    <div className="text-xs text-slate-400">cost {item.cost.toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleAvailability(item)} title={item.isAvailable ? 'Mark unavailable' : 'Mark available'}
                      className={`p-1.5 rounded-lg transition-colors ${item.isAvailable ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                      {item.isAvailable ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => del(item.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{editing ? t('restaurantEditItem') : t('restaurantNewMenuItem')}</h3>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('restaurantItemName')} *</span>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('restaurantCategory')} *</span>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('restaurantPrepTime')}</span>
                <input type="number" min="0" value={form.preparationTime} onChange={e => setForm(f => ({ ...f, preparationTime: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('restaurantPrice')} *</span>
                <input type="number" required min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('restaurantCost')}</span>
                <input type="number" min="0" step="0.01" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm" />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('restaurantDescription')}</span>
              <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm resize-none" />
            </label>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">{t('restaurantCancel')}</button>
              <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium transition-colors">{t('restaurantSave')}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
