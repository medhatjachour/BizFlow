import { useEffect, useState } from 'react'
import { Plus, RefreshCw, AlertCircle, Trash2, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Reservation {
  id: string; customerName: string; customerPhone: string | null; partySize: number
  date: string; status: string; notes: string | null
  table: { id: string; number: number; capacity: number; section: string | null }
}
interface Table { id: string; number: number; capacity: number; section: string | null }

const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400',
  confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  seated:    'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',
  completed: 'bg-slate-100  text-slate-600  dark:bg-slate-700     dark:text-slate-300',
  cancelled: 'bg-red-100    text-red-600    dark:bg-red-900/30    dark:text-red-400',
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ReservationsTab() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [form, setForm] = useState({ tableId: '', customerName: '', customerPhone: '', partySize: '2', date: new Date().toISOString().slice(0, 16), notes: '' })
  const { t } = useLanguage()

  const load = async () => {
    setLoading(true); setError('')
    try {
      const [r, res] = await Promise.all([
        window.api.restaurant.getReservations({ date: filterDate }),
        window.api.restaurant.getTables()
      ])
      setReservations(r); setTables(res)
    } catch { setError(t('restaurantLoadReservationsFailed')) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterDate])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.api.restaurant.createReservation({
        tableId: form.tableId, customerName: form.customerName,
        customerPhone: form.customerPhone || undefined, partySize: Number(form.partySize),
        date: new Date(form.date).toISOString(), notes: form.notes || undefined
      })
      setShowForm(false); load()
    } catch (err: any) { alert(err?.message || 'Failed to create reservation') }
  }

  const updateStatus = async (id: string, status: string) => {
    await window.api.restaurant.updateReservation({ id, status }); load()
  }

  const remove = async (id: string) => {
    if (!confirm(t('restaurantDeleteReservationConfirm'))) return
    await window.api.restaurant.deleteReservation(id); load()
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-2">
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-700 transition-colors"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"><Plus className="w-4 h-4" /> {t('restaurantAddReservation')}</button>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 text-red-500 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}

      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="animate-spin text-slate-400 w-6 h-6" /></div>
      ) : reservations.length === 0 ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">{t('restaurantNoReservations')}</div>
      ) : (
        <div className="space-y-3">
          {reservations.map(r => (
            <div key={r.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-slate-900 dark:text-white">{r.customerName}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[r.status] || ''}`}>{r.status}</span>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 space-y-0.5">
                  <div>{t('restaurantTable')} {r.table.number} · {r.partySize} {t('restaurantGuests')} · {fmt(r.date)}</div>
                  {r.customerPhone && <div>{r.customerPhone}</div>}
                  {r.notes && <div className="italic">{r.notes}</div>}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {r.status === 'confirmed' && (
                  <button onClick={() => updateStatus(r.id, 'seated')} title="Mark seated"
                    className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"><CheckCircle2 className="w-4 h-4" /></button>
                )}
                {r.status === 'seated' && (
                  <button onClick={() => updateStatus(r.id, 'completed')} title="Mark completed"
                    className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"><CheckCircle2 className="w-4 h-4" /></button>
                )}
                {['pending','confirmed'].includes(r.status) && (
                  <button onClick={() => updateStatus(r.id, 'cancelled')} title="Cancel"
                    className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"><XCircle className="w-4 h-4" /></button>
                )}
                {r.status === 'pending' && (
                  <button onClick={() => updateStatus(r.id, 'confirmed')} title="Confirm"
                    className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"><Clock className="w-4 h-4" /></button>
                )}
                <button onClick={() => remove(r.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form onSubmit={handleCreate} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{t('restaurantNewReservation')}</h3>

            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('restaurantTable')} *</span>
              <select required value={form.tableId} onChange={e => setForm(f => ({ ...f, tableId: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm">
                <option value="">{t('restaurantSelectTable')}</option>
                {tables.map(tb => <option key={tb.id} value={tb.id}>{t('restaurantTable')} {tb.number} ({tb.capacity} {t('restaurantSeats')}){tb.section ? ` — ${tb.section}` : ''}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('restaurantCustomerName')} *</span>
              <input required value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('restaurantPhone')}</span>
                <input type="tel" value={form.customerPhone} onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('restaurantPartySize')}</span>
                <input type="number" min="1" value={form.partySize} onChange={e => setForm(f => ({ ...f, partySize: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm" />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('restaurantDateAndTime')} *</span>
              <input type="datetime-local" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('restaurantNotes')}</span>
              <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-3 py-2 text-sm resize-none" />
            </label>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">{t('restaurantCancel')}</button>
              <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium transition-colors">{t('restaurantBook')}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
