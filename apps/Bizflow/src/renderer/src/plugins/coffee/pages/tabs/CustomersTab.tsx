/**
 * Coffee – Customers Tab
 * CRUD for coffee shop regulars — name, phone, address, notes, visit count, total spent.
 * Includes inline customer profile drawer with order history.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Search, Plus, Edit2, Trash2, RefreshCw, Users, ChevronRight,
  Phone, Mail, Coffee, TrendingUp, X, User
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'

// ── Types ────────────────────────────────────────────────────────────────────
interface Customer {
  id: string; name: string; phone?: string; address?: string
  notes?: string; totalSpent: number; visitCount: number; lastVisit?: string
  _count?: { orders: number }
}

interface CustomerDetail extends Customer {
  orders: {
    id: string; orderNumber: string; type: string; total: number
    paymentMethod?: string; deliveryAddress?: string; closedAt?: string
    items: { productName: string; quantity: number; total: number }[]
  }[]
}

const INPUT = 'w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none'

// ── Component ────────────────────────────────────────────────────────────────
export default function CustomersTab() {
  const toast = useToast()

  const [customers,  setCustomers]  = useState<Customer[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [page,       setPage]       = useState(1)
  const [total,      setTotal]      = useState(0)

  // Modal state
  const [modalOpen,  setModalOpen]  = useState(false)
  const [editTarget, setEditTarget] = useState<Customer | null>(null)
  const [form,       setForm]       = useState({ name: '', phone: '', address: '', notes: '' })
  const [saving,     setSaving]     = useState(false)

  // Profile drawer
  const [profile,      setProfile]      = useState<CustomerDetail | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)

  const PAGE_SIZE = 30
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // ── Data ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await window.api.coffee.customers.getAll({ search: search || undefined, page, pageSize: PAGE_SIZE })
      setCustomers(res?.items ?? [])
      setTotal(res?.total ?? 0)
    } catch { toast.error('Failed to load customers') }
    finally { setLoading(false) }
  }, [search, page])

  useEffect(() => { load() }, [load])

  // Reset page on search change
  useEffect(() => { setPage(1) }, [search])

  async function loadProfile(id: string) {
    setLoadingProfile(true)
    try { setProfile(await window.api.coffee.customers.getById(id)) }
    catch { toast.error('Failed to load profile') }
    finally { setLoadingProfile(false) }
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  function openCreate() { setEditTarget(null); setForm({ name: '', phone: '', address: '', notes: '' }); setModalOpen(true) }
  function openEdit(c: Customer) { setEditTarget(c); setForm({ name: c.name, phone: c.phone ?? '', address: c.address ?? '', notes: c.notes ?? '' }); setModalOpen(true) }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      const data = { name: form.name.trim(), phone: form.phone || undefined, address: form.address || undefined, notes: form.notes || undefined }
      if (editTarget) await window.api.coffee.customers.update({ id: editTarget.id, ...data })
      else             await window.api.coffee.customers.create(data)
      setModalOpen(false); load(); toast.success(editTarget ? 'Customer updated' : 'Customer added')
    } catch (err: any) { toast.error(err?.message ?? 'Save failed') }
    finally { setSaving(false) }
  }

  async function handleDelete(c: Customer) {
    if (!confirm(`Delete customer "${c.name}"? Their order history will be unlinked.`)) return
    try { await window.api.coffee.customers.delete(c.id); load(); toast.success('Customer deleted') }
    catch (err: any) { toast.error(err?.message ?? 'Delete failed') }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search by name, phone, address..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none" />
        </div>
        <button onClick={load} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium">
          <Plus className="w-3.5 h-3.5" /> Add Customer
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Users className="w-4 h-4" />
        <span>{total} customer{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Customers list */}
      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-slate-400">
          <Users className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">{loading ? 'Loading…' : 'No customers found'}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
          {customers.map(c => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer group"
              onClick={() => loadProfile(c.id)}>
              <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{c.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {c.phone && <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{c.phone}</span>}
                  {c.address && <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Mail className="w-2.5 h-2.5" />{c.address}</span>}
                  {c.notes && <span className="text-[10px] text-slate-400 italic truncate max-w-[120px]">{c.notes}</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{c.totalSpent.toFixed(2)}</p>
                <p className="text-[10px] text-slate-400">{c.visitCount} visits</p>
              </div>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(c)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700">Prev</button>
          <span className="px-3 py-1.5 text-xs text-slate-500">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700">Next</button>
        </div>
      )}

      {/* ── Add/Edit Modal ───────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{editTarget ? 'Edit Customer' : 'Add Customer'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={INPUT} />
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Phone</label>
                  <input type="tel" value={form.phone} placeholder="01x…" onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Address</label>
                  <input type="text" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className={INPUT} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Notes / Preferences</label>
                <textarea rows={2} value={form.notes} placeholder="e.g. Prefers oat milk, no sugar…"
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  className={INPUT + ' resize-none'} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Customer Profile Drawer ──────────────────────────────────────── */}
      {(loadingProfile || profile) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setProfile(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-slate-100 dark:border-slate-700 shrink-0">
              {loadingProfile ? (
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  <div className="space-y-1.5">
                    <div className="w-32 h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    <div className="w-20 h-2.5 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  </div>
                </div>
              ) : profile && (
                <div className="flex gap-3 items-start flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white">{profile.name}</p>
                    <div className="flex flex-wrap gap-3 mt-0.5">
                      {profile.phone && <span className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" />{profile.phone}</span>}
                      {profile.address && <span className="text-xs text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" />{profile.address}</span>}
                    </div>
                    {profile.notes && <p className="text-xs text-amber-600 dark:text-amber-400 italic mt-1">{profile.notes}</p>}
                  </div>
                </div>
              )}
              <button onClick={() => setProfile(null)} className="text-slate-400 hover:text-slate-600 shrink-0 ml-3"><X className="w-5 h-5" /></button>
            </div>

            {profile && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 p-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
                  {[
                    { label: 'Total Spent', value: profile.totalSpent.toFixed(2), icon: TrendingUp },
                    { label: 'Visits',      value: String(profile.visitCount),       icon: Coffee    },
                    { label: 'Orders',      value: String(profile.orders.length),    icon: Coffee    }
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center">
                      <Icon className="w-4 h-4 text-amber-500 mx-auto mb-0.5" />
                      <p className="text-base font-bold text-amber-700 dark:text-amber-400">{value}</p>
                      <p className="text-[10px] text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Order history */}
                <div className="flex-1 overflow-y-auto p-4">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Order History</p>
                  {profile.orders.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">No orders yet</p>
                  ) : (
                    <div className="space-y-2">
                      {profile.orders.map(order => (
                        <div key={order.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{order.orderNumber}</span>
                              <span className="text-[10px] text-slate-400 capitalize">{order.type.replace('_', ' ')}</span>
                              {order.paymentMethod && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full capitalize">
                                  {order.paymentMethod.replace('_', ' ')}
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold text-amber-600 dark:text-amber-400">{order.total.toFixed(2)}</p>
                              {order.closedAt && <p className="text-[10px] text-slate-400">{new Date(order.closedAt).toLocaleDateString()}</p>}
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            {order.deliveryAddress && (
                              <p className="text-[10px] text-slate-500">Address: {order.deliveryAddress}</p>
                            )}
                            {order.items.slice(0, 3).map((item, i) => (
                              <p key={i} className="text-[10px] text-slate-500">{item.quantity}× {item.productName}</p>
                            ))}
                            {order.items.length > 3 && <p className="text-[10px] text-slate-400">+{order.items.length - 3} more</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Edit button */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-700 shrink-0">
                  <button
                    onClick={() => { setProfile(null); openEdit(profile) }}
                    className="w-full py-2 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-xl text-sm font-medium hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  >Edit Customer</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
