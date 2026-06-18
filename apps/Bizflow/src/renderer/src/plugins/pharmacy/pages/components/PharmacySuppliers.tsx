import { useState, useEffect, useCallback } from 'react'
import { Search, Loader2, Plus, Pencil, Trash2, X, Truck, Phone, Mail } from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { pharma, inputCls } from './_shared'

export default function PharmacySuppliers() {
  const toast = useToast()
  const { t } = useLanguage()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [edit, setEdit] = useState<any | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [del, setDel] = useState<any | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await pharma()?.suppliers.getAll({ search }); setRows(r ?? []) }
    catch (e: any) { toast.error(e?.message ?? 'Failed') }
    finally { setLoading(false) }
  }, [search])
  useEffect(() => { const id = setTimeout(load, 200); return () => clearTimeout(id) }, [load])

  async function doDelete() {
    if (!del) return
    try { await pharma()?.suppliers.delete(del.id); toast.success(t('phSupplierDeleted') || 'Supplier deleted'); setDel(null); load() }
    catch (e: any) { toast.error(e?.message ?? 'Failed') }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('phSearchSuppliers') || 'Search suppliers…'} className={inputCls + ' pl-9'} />
        </div>
        <button onClick={() => { setEdit(null); setShowForm(true) }} className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 whitespace-nowrap"><Plus size={15} /> {t('phAddSupplier') || 'Add Supplier'}</button>
      </div>

      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
      : rows.length === 0 ? <p className="text-sm text-slate-400 text-center py-16">{t('phNoSuppliers') || 'No suppliers yet.'}</p>
      : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map(s => (
            <div key={s.id} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0"><Truck size={16} className="text-emerald-600 dark:text-emerald-400" /></div>
                  <div className="min-w-0"><p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{s.name}</p><p className="text-[11px] text-slate-400">{s.orderCount} {t('phOrders') || 'orders'} · {s.batchCount} {t('phBatchesLc') || 'batches'}</p></div>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEdit(s); setShowForm(true) }} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"><Pencil size={14} /></button>
                  <button onClick={() => setDel(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} /></button>
                </div>
              </div>
              {(s.phone || s.email) && (
                <div className="mt-2 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {s.phone && <p className="flex items-center gap-1.5"><Phone size={11} /> {s.phone}</p>}
                  {s.email && <p className="flex items-center gap-1.5 truncate"><Mail size={11} /> {s.email}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && <SupplierModal initial={edit} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
      {del && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setDel(null)}>
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <p className="font-semibold text-slate-900 dark:text-white mb-1">{t('phDeleteSupplier') || 'Delete supplier'}?</p>
            <p className="text-sm text-slate-500 mb-5">{del.name}</p>
            <div className="flex gap-2">
              <button onClick={() => setDel(null)} className="flex-1 px-4 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 rounded-lg">{t('phCancel') || 'Cancel'}</button>
              <button onClick={doDelete} className="flex-1 px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg">{t('phDelete') || 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SupplierModal({ initial, onClose, onSaved }: { initial: any | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const { t } = useLanguage()
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: initial?.name ?? '', phone: initial?.phone ?? '', email: initial?.email ?? '', address: initial?.address ?? '', notes: initial?.notes ?? '' })
  const set = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    try {
      if (initial) await pharma()?.suppliers.update(initial.id, form)
      else await pharma()?.suppliers.create(form)
      toast.success(initial ? (t('phSupplierUpdated') || 'Supplier updated') : (t('phSupplierAdded') || 'Supplier added')); onSaved()
    } catch (err: any) { toast.error(err?.message ?? 'Save failed') }
    finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-900 dark:text-white">{initial ? (t('phEditSupplier') || 'Edit Supplier') : (t('phAddSupplier') || 'Add Supplier')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-3">
          <input value={form.name} onChange={set('name')} required placeholder={t('phName') || 'Name'} className={inputCls} />
          <div className="grid grid-cols-2 gap-3">
            <input value={form.phone} onChange={set('phone')} placeholder={t('phPhone') || 'Phone'} className={inputCls} />
            <input value={form.email} onChange={set('email')} placeholder={t('phEmail') || 'Email'} className={inputCls} />
          </div>
          <input value={form.address} onChange={set('address')} placeholder={t('phAddress') || 'Address'} className={inputCls} />
          <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder={t('phNotes') || 'Notes'} className={inputCls} />
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 rounded-lg">{t('phCancel') || 'Cancel'}</button>
            <button type="submit" disabled={busy} className="flex-1 px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">{busy && <Loader2 size={14} className="animate-spin" />}{t('phSave') || 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
