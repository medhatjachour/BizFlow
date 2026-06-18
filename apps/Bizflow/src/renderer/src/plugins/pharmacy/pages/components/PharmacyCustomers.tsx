import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Loader2, Plus, Pencil, Trash2, X, Users, Phone, Mail, Wallet, Receipt, Percent
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { pharma, money, int, PAY_BADGE } from './_shared'
import { Toolbar, SearchBox, inputCls } from './ui'

export default function PharmacyCustomers() {
  const toast = useToast()
  const { t } = useLanguage()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [edit, setEdit] = useState<any | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [del, setDel] = useState<any | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setRows(await pharma()?.customers.getAll({ search }) ?? []) }
    catch (e: any) { toast.error(e?.message ?? 'Failed') }
    finally { setLoading(false) }
  }, [search])
  useEffect(() => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(load, 220); return () => { if (timer.current) clearTimeout(timer.current) } }, [load])

  const totalOutstanding = rows.reduce((s, c) => s + (c.outstanding || 0), 0)

  async function doDelete() {
    if (!del) return
    try { await pharma()?.customers.delete(del.id); toast.success(t('phCustomerDeleted') || 'Customer deleted'); setDel(null); load() }
    catch (e: any) { toast.error(e?.message ?? 'Failed') }
  }

  return (
    <div className="p-6 space-y-4">
      <Toolbar right={
        <button onClick={() => { setEdit(null); setShowForm(true) }} className="px-3.5 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 whitespace-nowrap"><Plus size={15} /> {t('phAddCustomer') || 'Add Customer'}</button>
      }>
        <SearchBox value={search} onChange={setSearch} placeholder={t('phSearchCustomers') || 'Search customers by name or phone…'} />
        {totalOutstanding > 0.005 && (
          <span className="text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2.5 py-1.5 rounded-xl whitespace-nowrap">{t('phTotalOutstanding') || 'Outstanding'}: ${money(totalOutstanding)}</span>
        )}
      </Toolbar>

      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
      : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400"><Users size={36} className="mb-2 opacity-30" /><p className="text-sm font-medium">{t('phNoCustomers') || 'No customers yet'}</p><p className="text-xs mt-1">{t('phAddCustomerHint') || 'Add a customer to track their purchases and balance.'}</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map(c => (
            <div key={c.id} onClick={() => setProfileId(c.id)} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 group cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0 text-emerald-700 dark:text-emerald-300 font-bold">{(c.name || '?').slice(0, 1).toUpperCase()}</div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{c.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{c.phone || (t('phNoPhone') || 'no phone')}</p>
                  </div>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { setEdit(c); setShowForm(true) }} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"><Pencil size={14} /></button>
                  <button onClick={() => setDel(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div><p className="text-sm font-bold text-slate-800 dark:text-slate-200">{int(c.salesCount)}</p><p className="text-[10px] text-slate-400">{t('phSalesLc') || 'sales'}</p></div>
                <div><p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">${money(c.totalSpent)}</p><p className="text-[10px] text-slate-400">{t('phSpent') || 'spent'}</p></div>
                <div><p className={`text-sm font-bold ${c.outstanding > 0.005 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>${money(c.outstanding)}</p><p className="text-[10px] text-slate-400">{t('phDue') || 'due'}</p></div>
              </div>
              {c.defaultDiscount > 0 && <p className="mt-2 text-[10px] text-violet-500 flex items-center gap-1"><Percent size={9} /> {c.defaultDiscount}% {t('phDefaultDiscount') || 'default discount'}</p>}
            </div>
          ))}
        </div>
      )}

      {showForm && <CustomerModal initial={edit} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
      {profileId && <CustomerProfile id={profileId} onClose={() => setProfileId(null)} onChanged={load} />}
      {del && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setDel(null)}>
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <p className="font-semibold text-slate-900 dark:text-white mb-1">{t('phDeleteCustomer') || 'Delete customer'}?</p>
            <p className="text-sm text-slate-500 mb-5">{del.name}. {t('phSalesKept') || 'Their sales history is kept but unlinked.'}</p>
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

function CustomerModal({ initial, onClose, onSaved }: { initial: any | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast(); const { t } = useLanguage()
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: initial?.name ?? '', phone: initial?.phone ?? '', email: initial?.email ?? '', address: initial?.address ?? '', notes: initial?.notes ?? '', defaultDiscount: String(initial?.defaultDiscount ?? '') })
  const set = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }))
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    try {
      const data = { ...form, defaultDiscount: parseFloat(form.defaultDiscount) || 0 }
      if (initial) await pharma()?.customers.update(initial.id, data); else await pharma()?.customers.create(data)
      toast.success(initial ? (t('phCustomerUpdated') || 'Customer updated') : (t('phCustomerAdded') || 'Customer added')); onSaved()
    } catch (err: any) { toast.error(err?.message ?? 'Save failed') } finally { setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800"><h2 className="font-bold text-slate-900 dark:text-white">{initial ? (t('phEditCustomer') || 'Edit Customer') : (t('phAddCustomer') || 'Add Customer')}</h2><button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button></div>
        <form onSubmit={submit} className="p-6 space-y-3">
          <input value={form.name} onChange={set('name')} required placeholder={t('phName') || 'Name'} className={inputCls} />
          <div className="grid grid-cols-2 gap-3"><input value={form.phone} onChange={set('phone')} placeholder={t('phPhone') || 'Phone'} className={inputCls} /><input value={form.email} onChange={set('email')} placeholder={t('phEmail') || 'Email'} className={inputCls} /></div>
          <input value={form.address} onChange={set('address')} placeholder={t('phAddress') || 'Address'} className={inputCls} />
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{t('phDefaultDiscountPct') || 'Default discount (%)'}</label>
            <input value={form.defaultDiscount} onChange={set('defaultDiscount')} type="number" min="0" max="100" step="0.1" placeholder="0" className={inputCls} />
          </div>
          <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder={t('phNotes') || 'Notes'} className={inputCls} />
          <div className="flex gap-2 pt-1"><button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 rounded-lg">{t('phCancel') || 'Cancel'}</button><button type="submit" disabled={busy} className="flex-1 px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">{busy && <Loader2 size={14} className="animate-spin" />}{t('phSave') || 'Save'}</button></div>
        </form>
      </div>
    </div>
  )
}

function CustomerProfile({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const toast = useToast(); const { t } = useLanguage()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [settling, setSettling] = useState(false)
  const [payAmt, setPayAmt] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setData(await pharma()?.customers.profile(id)) }
    catch (e: any) { toast.error(e?.message ?? 'Failed') } finally { setLoading(false) }
  }, [id])
  useEffect(() => { load() }, [load])

  async function settle(full: boolean) {
    setBusy(true)
    try {
      const r = await pharma()?.customers.settle(id, full ? {} : { amount: parseFloat(payAmt) })
      toast.success(`${t('phSettled') || 'Settled'} $${money(r?.applied)} · ${r?.settledCount} ${t('phSalesLc') || 'sales'}`)
      setSettling(false); setPayAmt(''); await load(); onChanged()
    } catch (e: any) { toast.error(e?.message ?? 'Failed') } finally { setBusy(false) }
  }

  const f = data?.finance
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {loading || !data ? <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-emerald-500" /></div> : (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold text-lg">{(data.customer.name || '?').slice(0, 1).toUpperCase()}</div>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white">{data.customer.name}</h2>
                  <div className="flex items-center gap-3 text-xs text-slate-400">{data.customer.phone && <span className="flex items-center gap-1"><Phone size={11} />{data.customer.phone}</span>}{data.customer.email && <span className="flex items-center gap-1"><Mail size={11} />{data.customer.email}</span>}</div>
                </div>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Finance */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {[
                  { label: t('phTotalCharged') || 'Charged', value: `$${money(f.totalCharged)}`, color: 'text-slate-800 dark:text-white' },
                  { label: t('phTotalPaid') || 'Paid', value: `$${money(f.totalPaid)}`, color: 'text-emerald-600 dark:text-emerald-400' },
                  { label: t('phOutstanding') || 'Outstanding', value: `$${money(f.outstanding)}`, color: f.outstanding > 0.005 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400' },
                  { label: t('phSalesLc') || 'sales', value: int(f.salesCount), color: 'text-slate-800 dark:text-white' },
                  { label: t('phUnits') || 'units', value: int(f.unitsBought), color: 'text-slate-800 dark:text-white' },
                ].map(k => (
                  <div key={k.label} className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 text-center"><p className={`text-lg font-bold ${k.color}`}>{k.value}</p><p className="text-[10px] text-slate-400 capitalize">{k.label}</p></div>
                ))}
              </div>

              {/* Settle */}
              {f.outstanding > 0.005 && (
                settling ? (
                  <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/15 rounded-xl p-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{t('phOutstanding') || 'Outstanding'}: <span className="font-bold text-amber-600">${money(f.outstanding)}</span></span>
                    <span className="relative ml-auto"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span><input value={payAmt} onChange={e => setPayAmt(e.target.value)} type="number" min="0" max={f.outstanding} placeholder={money(f.outstanding)} autoFocus className={inputCls + ' w-28 pl-5 py-1.5 text-xs'} /></span>
                    <button onClick={() => settle(false)} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-200">{t('phPayAmount') || 'Pay'}</button>
                    <button onClick={() => settle(true)} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700">{t('phPayAll') || 'Pay all'}</button>
                    <button onClick={() => setSettling(false)} className="text-slate-400 hover:text-slate-600"><X size={15} /></button>
                  </div>
                ) : (
                  <button onClick={() => setSettling(true)} className="w-full py-2.5 rounded-xl text-sm font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-200 flex items-center justify-center gap-1.5"><Wallet size={15} /> {t('phSettleOutstanding') || 'Settle outstanding'} (${money(f.outstanding)})</button>
                )
              )}

              {/* Sales history */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2"><Receipt size={14} className="text-emerald-500" /> {t('phPurchaseHistory') || 'Purchase History'} <span className="text-xs font-normal text-slate-400">({data.sales.length})</span></h3>
                {data.sales.length === 0 ? <p className="text-xs text-slate-400 text-center py-6">{t('phNoPurchases') || 'No purchases yet'}</p> : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/60 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                    {data.sales.map((s: any) => {
                      const out = s.status === 'refunded' ? 0 : Math.max(0, (s.total - (s.refundedAmount ?? 0)) - s.amountPaid)
                      return (
                        <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                          <span className="text-slate-400 text-xs w-10">#{s.saleNumber ?? '—'}</span>
                          <span className="text-slate-500 text-xs flex-1">{new Date(s.saleDate).toLocaleDateString()} · {s.items?.length} {t('phItems') || 'items'}</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">${money(s.total)}</span>
                          {out > 0.005 && <span className="text-[10px] text-amber-500">−${money(out)}</span>}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${PAY_BADGE[s.paymentStatus] ?? PAY_BADGE.unpaid}`}>{s.paymentStatus}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
