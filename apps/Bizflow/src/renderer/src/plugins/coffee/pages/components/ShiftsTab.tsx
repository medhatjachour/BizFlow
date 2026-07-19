import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  RefreshCw, Timer, CheckCircle, Banknote, CreditCard,
  Smartphone, TrendingUp, Clock, ClipboardList, Eye, X, CalendarRange, FileText
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useAuth } from '@renderer/contexts/AuthContext'

interface ShiftOrder {
  id: string
  orderNumber: string
  type: string
  status: string
  total: number
  subtotal?: number
  paymentMethod?: string
  customerName?: string
  openedAt: string
  closedAt?: string
  table?: { number: number; name?: string }
  items?: { productName: string; quantity: number; total: number }[]
}

interface Shift {
  id: string
  status: string
  cashier: { id: string; username: string; fullName?: string }
  openingCash: number
  closingCash?: number
  totalSales: number
  totalOrders: number
  cashTotal: number
  cardTotal: number
  vodafoneCashTotal: number
  cashDifference?: number
  notes?: string
  openedAt: string
  closedAt?: string
  orders?: ShiftOrder[]
  _count?: { orders: number }
}

interface ShiftSummary {
  totalShifts: number
  closedShifts: number
  totalSales: number
  totalOrders: number
  averageShiftSales: number
  averageOrdersPerShift: number
  averageOpeningCash: number
  averageCashDifference: number
  longestShiftMinutes: number
  topCashiers: Array<{ id: string; name: string; shifts: number; revenue: number; orders: number }>
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfToday() {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

function fmtDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function applyPreset(preset: 'today' | 'week' | 'month' | 'all') {
  if (preset === 'all') return { from: '', to: '' }
  const to = endOfToday()
  const from = startOfToday()
  if (preset === 'week') from.setDate(from.getDate() - 6)
  if (preset === 'month') from.setDate(1)
  return { from: fmtDate(from), to: fmtDate(to) }
}

function shiftDurationMinutes(shift: Shift) {
  const end = shift.closedAt ? new Date(shift.closedAt) : new Date()
  return Math.floor((end.getTime() - new Date(shift.openedAt).getTime()) / 60000)
}

function shiftDuration(shift: Shift) {
  const mins = shiftDurationMinutes(shift)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function avgOrdersPerHour(shift: Shift) {
  const mins = Math.max(shiftDurationMinutes(shift), 1)
  return (shift.totalOrders / (mins / 60)).toFixed(1)
}

function avgTicket(shift: Shift) {
  return shift.totalOrders > 0 ? (shift.totalSales / shift.totalOrders).toFixed(2) : '0.00'
}

export default function ShiftsTab() {
  const { user } = useAuth()
  const toast = useToast()
  const initial = applyPreset('month')

  const [activeShift, setActiveShift] = useState<Shift | null>(null)
  const [summary, setSummary] = useState<ShiftSummary | null>(null)
  const [history, setHistory] = useState<Shift[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [detailShift, setDetailShift] = useState<Shift | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [openModal, setOpenModal] = useState(false)
  const [openingCash, setOpeningCash] = useState('0')
  const [openingNote, setOpeningNote] = useState('')
  const [opening, setOpening] = useState(false)

  const [closeModal, setCloseModal] = useState(false)
  const [closingCash, setClosingCash] = useState('')
  const [closingNote, setClosingNote] = useState('')
  const [closing, setClosing] = useState(false)

  const filters = useMemo(() => ({
    startDate: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
    endDate: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined
  }), [from, to])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [active, hist, sum] = await Promise.all([
        window.api.coffee.shifts.getActive(),
        window.api.coffee.shifts.getHistory({ ...filters, status: statusFilter, page, pageSize: 12 }),
        window.api.coffee.shifts.getSummary(filters)
      ])
      setActiveShift(active)
      setHistory(hist?.items ?? [])
      setTotal(hist?.total ?? 0)
      setSummary(sum)
    } catch {
      toast.error('Failed to load shifts')
    } finally {
      setLoading(false)
    }
  }, [filters, statusFilter, page, toast])

  useEffect(() => { setPage(1) }, [from, to, statusFilter])
  useEffect(() => { load() }, [load])

  async function openShiftDetail(shiftId: string) {
    setLoadingDetail(true)
    try {
      setDetailShift(await window.api.coffee.shifts.getDetails(shiftId))
    } catch {
      toast.error('Failed to load shift details')
    } finally {
      setLoadingDetail(false)
    }
  }

  async function handleOpen() {
    if (!user?.id) { toast.error('You must be logged in'); return }
    setOpening(true)
    try {
      await window.api.coffee.shifts.open({ cashierId: user.id, openingCash: Number(openingCash), notes: openingNote || undefined })
      setOpenModal(false)
      setOpeningCash('0')
      setOpeningNote('')
      load()
      toast.success('Shift opened')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to open shift')
    } finally {
      setOpening(false)
    }
  }

  async function handleClose() {
    if (!activeShift) return
    setClosing(true)
    try {
      await window.api.coffee.shifts.close({ shiftId: activeShift.id, closingCash: Number(closingCash), notes: closingNote || undefined })
      setCloseModal(false)
      setClosingCash('')
      setClosingNote('')
      load()
      toast.success('Shift closed')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to close shift')
    } finally {
      setClosing(false)
    }
  }

  const totalPages = Math.ceil(total / 12)
  const activeExpectedDrawer = activeShift ? activeShift.openingCash + activeShift.cashTotal : 0
  const activeVariancePreview = activeShift ? Number(closingCash || activeExpectedDrawer) - activeExpectedDrawer : 0

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white flex-1">Shifts Operations</h2>
        {(['today', 'week', 'month', 'all'] as const).map(preset => (
          <button
            key={preset}
            onClick={() => {
              const range = applyPreset(preset)
              setFrom(range.from)
              setTo(range.to)
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
          >
            {preset === 'all' ? 'All Time' : preset[0].toUpperCase() + preset.slice(1)}
          </button>
        ))}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <CalendarRange className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="pl-8 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
          </div>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
          <button onClick={load} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {!activeShift && (
            <button onClick={() => setOpenModal(true)} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium">
              <Timer className="w-3.5 h-3.5" /> Open Shift
            </button>
          )}
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3"><p className="text-[11px] text-slate-500">Total Sales</p><p className="text-lg font-bold text-emerald-600">{summary.totalSales.toFixed(2)}</p></div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3"><p className="text-[11px] text-slate-500">Shift Count</p><p className="text-lg font-bold text-indigo-600">{summary.totalShifts}</p></div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3"><p className="text-[11px] text-slate-500">Avg Shift Sales</p><p className="text-lg font-bold text-sky-600">{summary.averageShiftSales.toFixed(2)}</p></div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3"><p className="text-[11px] text-slate-500">Avg Orders / Shift</p><p className="text-lg font-bold text-violet-600">{summary.averageOrdersPerShift.toFixed(1)}</p></div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3"><p className="text-[11px] text-slate-500">Avg Cash Diff</p><p className="text-lg font-bold text-amber-600">{summary.averageCashDifference.toFixed(2)}</p></div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3"><p className="text-[11px] text-slate-500">Longest Shift</p><p className="text-lg font-bold text-rose-600">{Math.floor(summary.longestShiftMinutes / 60)}h {summary.longestShiftMinutes % 60}m</p></div>
        </div>
      )}

      {activeShift && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-700 p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                <span className="text-sm font-bold text-amber-800 dark:text-amber-300">Active Shift</span>
              </div>
              <p className="text-xs text-amber-700/80 dark:text-amber-300/70 mt-1">{activeShift.cashier.fullName ?? activeShift.cashier.username} · started {new Date(activeShift.openedAt).toLocaleString()}</p>
            </div>
            <button onClick={() => { setCloseModal(true); setClosingCash(String(activeExpectedDrawer)) }} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium">
              Close Shift
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              ['Revenue', activeShift.totalSales.toFixed(2), TrendingUp],
              ['Orders', String(activeShift.totalOrders), CheckCircle],
              ['Duration', shiftDuration(activeShift), Clock],
              ['Avg Ticket', avgTicket(activeShift), Banknote],
              ['Orders / Hour', avgOrdersPerHour(activeShift), ClipboardList]
            ].map(([label, value, Icon]: any) => (
              <div key={label} className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-amber-100 dark:border-amber-800/30">
                <Icon className="w-4 h-4 text-amber-500 mb-1" />
                <p className="text-[10px] text-slate-500">{label}</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-amber-100 dark:border-amber-800/30">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Payment Split</p>
              {[['Cash', activeShift.cashTotal, Banknote], ['Card', activeShift.cardTotal, CreditCard], ['Vodafone', activeShift.vodafoneCashTotal, Smartphone]].map(([label, value, Icon]: any) => (
                <div key={label} className="flex items-center justify-between text-xs py-1">
                  <span className="flex items-center gap-1"><Icon className="w-3.5 h-3.5 text-slate-400" />{label}</span>
                  <span className="font-semibold">{Number(value).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-amber-100 dark:border-amber-800/30">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Drawer Position</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>Opening</span><span>{activeShift.openingCash.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Cash Sales</span><span>{activeShift.cashTotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Expected</span><span>{activeExpectedDrawer.toFixed(2)}</span></div>
                <div className={`flex justify-between font-semibold ${activeVariancePreview < 0 ? 'text-red-600' : activeVariancePreview > 0 ? 'text-blue-600' : 'text-emerald-600'}`}><span>Variance Preview</span><span>{activeVariancePreview > 0 ? '+' : ''}{activeVariancePreview.toFixed(2)}</span></div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-amber-100 dark:border-amber-800/30">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Current Shift Notes</p>
              <p className="text-xs text-slate-500 whitespace-pre-wrap">{activeShift.notes || 'No notes recorded for this shift.'}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-amber-100 dark:border-amber-800/30">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recent Shift Orders</p>
            </div>
            {(activeShift.orders ?? []).length === 0 ? (
              <p className="text-xs text-slate-400">No orders recorded yet in this shift.</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {(activeShift.orders ?? []).map(order => (
                  <div key={order.id} className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-700/50 px-3 py-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{order.orderNumber}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{order.type.replace('_', ' ')} · {order.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-amber-600">{order.total.toFixed(2)}</p>
                      <p className="text-[10px] text-slate-400">{new Date(order.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!activeShift && !loading && (
        <div className="flex flex-col items-center justify-center h-28 text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
          <Timer className="w-8 h-8 mb-1 opacity-40" />
          <p className="text-sm">No active shift</p>
          <p className="text-xs">Open a shift to start taking orders</p>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Shift History</p>
            <p className="text-xs text-slate-400">Filter by date range and open any shift for detailed order review.</p>
          </div>
          <p className="text-xs text-slate-400">{history.length} on page</p>
        </div>
        <div className="p-4 space-y-3">
          {history.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">{loading ? 'Loading...' : 'No shift history yet'}</p>
          ) : history.map(shift => {
            const diff = shift.cashDifference ?? 0
            return (
              <div key={shift.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${shift.status === 'open' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>{shift.status}</span>
                      <span className="text-xs text-slate-500">{new Date(shift.openedAt).toLocaleDateString()} · {shiftDuration(shift)}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{shift.cashier.fullName ?? shift.cashier.username}</p>
                    <p className="text-[11px] text-slate-400">Opened {new Date(shift.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{shift.closedAt ? ` · closed ${new Date(shift.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-amber-600">{shift.totalSales.toFixed(2)}</p>
                    <p className="text-xs text-slate-400">{shift.totalOrders} orders</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-3 text-xs">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50"><p className="text-slate-400">Open Cash</p><p className="font-semibold">{shift.openingCash.toFixed(2)}</p></div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50"><p className="text-slate-400">Cash</p><p className="font-semibold">{shift.cashTotal.toFixed(2)}</p></div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50"><p className="text-slate-400">Card</p><p className="font-semibold">{shift.cardTotal.toFixed(2)}</p></div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50"><p className="text-slate-400">Vodafone</p><p className="font-semibold">{shift.vodafoneCashTotal.toFixed(2)}</p></div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50"><p className="text-slate-400">Avg Ticket</p><p className="font-semibold">{avgTicket(shift)}</p></div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50"><p className="text-slate-400">Cash Diff</p><p className={`font-semibold ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>{diff > 0 ? '+' : ''}{diff.toFixed(2)}</p></div>
                </div>
                {(shift.orders ?? []).length > 0 && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(shift.orders ?? []).slice(0, 4).map(order => (
                      <div key={order.id} className="rounded-lg border border-slate-100 dark:border-slate-700 px-3 py-2">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">{order.orderNumber}</span>
                          <span className="text-amber-600 font-semibold">{order.total.toFixed(2)}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 capitalize">{order.type.replace('_', ' ')} · {(order.paymentMethod || '-').replace('_', ' ')}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
                  <p className="text-xs text-slate-400">{shift.notes || 'No notes'}</p>
                  <button onClick={() => openShiftDetail(shift.id)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> View Details
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40">Prev</button>
            <span className="px-3 py-1.5 text-xs text-slate-500">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40">Next</button>
          </div>
        )}
      </div>

      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpenModal(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Open Shift</h3>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Opening Cash in Drawer</label>
              <input type="number" min={0} step={0.01} value={openingCash} onChange={e => setOpeningCash(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Opening Notes</label>
              <textarea rows={3} value={openingNote} onChange={e => setOpeningNote(e.target.value)} placeholder="Drawer notes, handover notes, expected issues..." className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 resize-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setOpenModal(false)} className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400">Cancel</button>
              <button onClick={handleOpen} disabled={opening} className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium">{opening ? 'Opening...' : 'Open Shift'}</button>
            </div>
          </div>
        </div>
      )}

      {closeModal && activeShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCloseModal(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Close Shift</h3>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-sm text-amber-800 dark:text-amber-300 space-y-1">
              <p>Sales: <strong>{activeShift.totalSales.toFixed(2)}</strong></p>
              <p>Cash sales: <strong>{activeShift.cashTotal.toFixed(2)}</strong></p>
              <p>Expected in drawer: <strong>{activeExpectedDrawer.toFixed(2)}</strong></p>
              <p>Orders / hour: <strong>{avgOrdersPerHour(activeShift)}</strong></p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Actual Cash in Drawer *</label>
              <input type="number" min={0} step={0.01} value={closingCash} onChange={e => setClosingCash(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800" />
              <p className={`text-xs mt-1 ${activeVariancePreview < 0 ? 'text-red-500' : activeVariancePreview > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>Variance preview: {activeVariancePreview > 0 ? '+' : ''}{activeVariancePreview.toFixed(2)}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Closing Notes</label>
              <textarea rows={3} value={closingNote} onChange={e => setClosingNote(e.target.value)} placeholder="Cash issues, missing items, summary, remarks..." className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 resize-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCloseModal(false)} className="flex-1 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400">Cancel</button>
              <button onClick={handleClose} disabled={closing || !closingCash} className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium">{closing ? 'Closing...' : 'Close Shift'}</button>
            </div>
          </div>
        </div>
      )}

      {detailShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDetailShift(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Shift Details</p>
                <p className="text-xs text-slate-400">{detailShift.cashier.fullName ?? detailShift.cashier.username} · {shiftDuration(detailShift)}</p>
              </div>
              <button onClick={() => setDetailShift(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              {loadingDetail ? (
                <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50"><p className="text-slate-400">Opening</p><p className="font-semibold">{detailShift.openingCash.toFixed(2)}</p></div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50"><p className="text-slate-400">Closing</p><p className="font-semibold">{(detailShift.closingCash ?? 0).toFixed(2)}</p></div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50"><p className="text-slate-400">Revenue</p><p className="font-semibold">{detailShift.totalSales.toFixed(2)}</p></div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50"><p className="text-slate-400">Orders</p><p className="font-semibold">{detailShift.totalOrders}</p></div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50"><p className="text-slate-400">Cash Diff</p><p className="font-semibold">{(detailShift.cashDifference ?? 0).toFixed(2)}</p></div>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-500" />
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Shift Orders</p>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                      {(detailShift.orders ?? []).map(order => (
                        <div key={order.id} className="px-4 py-3 space-y-1">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{order.orderNumber}</p>
                              <p className="text-[11px] text-slate-400 capitalize">{order.type.replace('_', ' ')} · {(order.paymentMethod || '-').replace('_', ' ')}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-amber-600">{order.total.toFixed(2)}</p>
                              <p className="text-[10px] text-slate-400">{order.closedAt ? new Date(order.closedAt).toLocaleString() : new Date(order.openedAt).toLocaleString()}</p>
                            </div>
                          </div>
                          {(order.items ?? []).length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                              {(order.items ?? []).slice(0, 4).map((item, index) => (
                                <div key={`${order.id}-${index}`} className="rounded-lg bg-slate-50 dark:bg-slate-700/40 px-2 py-1.5 text-[11px] flex justify-between">
                                  <span>{item.quantity}x {item.productName}</span>
                                  <span>{item.total.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
