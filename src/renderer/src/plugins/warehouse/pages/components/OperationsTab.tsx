import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Plus,
  RefreshCw,
  Truck,
  UserCircle2,
  History,
  Search,
  ArrowRight,
  PackageCheck,
  Boxes,
  ClipboardList,
  ShieldCheck,
  ScanLine,
  ShoppingBag,
  Rocket,
  X
} from 'lucide-react'
import { useToast } from '@renderer/contexts/ToastContext'

type OrderType = 'inbound' | 'outbound'
type Stage = 'created' | 'receiving' | 'qc' | 'putaway' | 'picking' | 'packing' | 'shipping' | 'done'
type View = 'control' | 'receiving' | 'outbound' | 'activity'

interface Location {
  id: string
  name: string
  code: string
}

interface WarehouseOrderLine {
  id?: string
  productName: string
  sku?: string | null
  requestedQty: number
  processedQty?: number
  unit: string
}

interface WarehouseOrder {
  id: string
  orderNumber: string
  orderType: OrderType
  status: string
  workflowStage?: Stage | null
  sourceRef?: string | null
  partnerName?: string | null
  locationId?: string | null
  createdBy?: string | null
  processedBy?: string | null
  createdAt: string
  lines: WarehouseOrderLine[]
}

interface Movement {
  id: string
  movementType: string
  productName: string
  quantity: number
  unit: string
  actedBy?: string | null
  createdAt: string
  location?: { name: string; code: string }
}

interface AuditLog {
  id: string
  entityType: string
  action: string
  actor?: string | null
  details?: string | null
  createdAt: string
}

interface JourneyBoard {
  activeOrders: number
  receiving: number
  qc: number
  putaway: number
  picking: number
  packing: number
  shipping: number
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
}

const INBOUND_STEPS: Stage[] = ['created', 'receiving', 'qc', 'putaway', 'done']
const OUTBOUND_STEPS: Stage[] = ['created', 'picking', 'packing', 'shipping', 'done']

function getStage(order: WarehouseOrder): Stage {
  if (order.workflowStage) return order.workflowStage
  if (order.status === 'completed') return 'done'
  return order.orderType === 'inbound' ? 'receiving' : 'picking'
}

function stageLabel(stage: Stage) {
  const labels: Record<Stage, string> = {
    created: 'Created',
    receiving: 'Receiving',
    qc: 'Quality Check',
    putaway: 'Putaway',
    picking: 'Picking',
    packing: 'Packing',
    shipping: 'Shipping',
    done: 'Completed'
  }
  return labels[stage]
}

function nextStage(orderType: OrderType, stage: Stage): Stage | null {
  const steps = orderType === 'inbound' ? INBOUND_STEPS : OUTBOUND_STEPS
  const i = steps.indexOf(stage)
  if (i < 0 || i === steps.length - 1) return null
  return steps[i + 1]
}

function primaryActionLabel(order: WarehouseOrder): string {
  const stage = getStage(order)
  if (order.orderType === 'inbound') {
    if (stage === 'created') return 'Start Receiving'
    if (stage === 'receiving') return 'Move to QC'
    if (stage === 'qc') return 'Approve Putaway'
    if (stage === 'putaway') return 'Post Stock'
  }

  if (order.orderType === 'outbound') {
    if (stage === 'created') return 'Start Picking'
    if (stage === 'picking') return 'Move to Packing'
    if (stage === 'packing') return 'Move to Shipping'
    if (stage === 'shipping') return 'Confirm Shipment'
  }

  return 'View'
}

function isPostAction(order: WarehouseOrder): boolean {
  const stage = getStage(order)
  return (order.orderType === 'inbound' && stage === 'putaway') || (order.orderType === 'outbound' && stage === 'shipping')
}

export default function OperationsTab() {
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [actingOrderId, setActingOrderId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [view, setView] = useState<View>('control')
  const [query, setQuery] = useState('')
  const [locationFilter, setLocationFilter] = useState('all')
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const [locations, setLocations] = useState<Location[]>([])
  const [orders, setOrders] = useState<WarehouseOrder[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [board, setBoard] = useState<JourneyBoard | null>(null)

  const [form, setForm] = useState({
    orderType: 'inbound' as OrderType,
    sourceRef: '',
    partnerName: '',
    locationId: '',
    createdBy: 'warehouse.manager',
    priority: 'normal',
    lines: [{ productName: '', sku: '', requestedQty: '1', unit: 'pcs' }]
  })
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const [locs, orderRes, movementRes, auditRes, boardRes] = await Promise.all([
        window.api.warehouse.getLocations(),
        window.api.warehouse.getOrders({ take: 200 }),
        window.api.warehouse.getMovements({ take: 30 }),
        window.api.warehouse.getAuditLogs({ take: 30 }),
        window.api.warehouse.getJourneyBoard()
      ])
      setLocations(Array.isArray(locs) ? locs : [])
      setOrders(orderRes?.data ?? [])
      setMovements(movementRes?.data ?? [])
      setAuditLogs(auditRes?.data ?? [])
      setBoard(boardRes ?? null)
    } catch {
      toast.error('Failed to load operations data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        setShowCreate(true)
        return
      }

      if (!typing && e.key === '/') {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      if (e.key === 'Escape' && showCreate) {
        setShowCreate(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showCreate])

  const activeOrders = useMemo(
    () => orders.filter(o => ['pending', 'processing'].includes(o.status)),
    [orders]
  )

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase()
    return activeOrders.filter((o) => {
      if (locationFilter !== 'all' && o.locationId !== locationFilter) return false
      if (!q) return true
      return [
        o.orderNumber,
        o.sourceRef || '',
        o.partnerName || '',
        o.createdBy || '',
        ...o.lines.map(l => l.productName),
        ...o.lines.map(l => l.sku || '')
      ].join(' ').toLowerCase().includes(q)
    })
  }, [activeOrders, locationFilter, query])

  const inboundOrders = useMemo(() => filteredOrders.filter(o => o.orderType === 'inbound'), [filteredOrders])
  const outboundOrders = useMemo(() => filteredOrders.filter(o => o.orderType === 'outbound'), [filteredOrders])

  const groupedInbound = useMemo(() => {
    return {
      created: inboundOrders.filter(o => getStage(o) === 'created'),
      receiving: inboundOrders.filter(o => getStage(o) === 'receiving'),
      qc: inboundOrders.filter(o => getStage(o) === 'qc'),
      putaway: inboundOrders.filter(o => getStage(o) === 'putaway')
    }
  }, [inboundOrders])

  const groupedOutbound = useMemo(() => {
    return {
      created: outboundOrders.filter(o => getStage(o) === 'created'),
      picking: outboundOrders.filter(o => getStage(o) === 'picking'),
      packing: outboundOrders.filter(o => getStage(o) === 'packing'),
      shipping: outboundOrders.filter(o => getStage(o) === 'shipping')
    }
  }, [outboundOrders])

  const createOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.locationId) {
      toast.warning('Select a location first')
      return
    }
    const lines = form.lines
      .filter(line => line.productName.trim())
      .map(line => ({
        productName: line.productName.trim(),
        sku: line.sku || undefined,
        requestedQty: Number(line.requestedQty),
        unit: line.unit || 'pcs'
      }))

    if (lines.length === 0) {
      toast.warning('Add at least one line item')
      return
    }

    setCreating(true)
    try {
      await window.api.warehouse.createOrder({
        orderType: form.orderType,
        sourceRef: form.sourceRef || undefined,
        partnerName: form.partnerName || undefined,
        locationId: form.locationId,
        createdBy: form.createdBy || 'warehouse.manager',
        priority: form.priority,
        lines
      })

      setShowCreate(false)
      setForm({
        orderType: form.orderType,
        sourceRef: '',
        partnerName: '',
        locationId: form.locationId,
        createdBy: form.createdBy,
        priority: 'normal',
        lines: [{ productName: '', sku: '', requestedQty: '1', unit: 'pcs' }]
      })
      toast.success('Order created')
      await load()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create order')
    } finally {
      setCreating(false)
    }
  }

  const moveOrderForward = async (order: WarehouseOrder) => {
    if (!order.locationId) {
      toast.warning('Order has no assigned location')
      return
    }

    setActingOrderId(order.id)
    const stage = getStage(order)
    const nxt = nextStage(order.orderType, stage)
    const before = order

    setOrders(prev => prev.map((o) => {
      if (o.id !== order.id) return o
      if (isPostAction(order)) return { ...o, workflowStage: 'done', status: 'completed' }
      if (!nxt) return o
      return { ...o, workflowStage: nxt, status: nxt === 'done' ? 'completed' : 'processing' }
    }))

    try {
      if (isPostAction(order)) {
        await window.api.warehouse.processOrder({
          orderId: order.id,
          locationId: order.locationId,
          actedBy: 'warehouse.operator',
          notes: 'Posted from phase 2 operations journey'
        })
        toast.success(`${order.orderNumber} completed`)
      } else {
        if (!nxt) return
        await window.api.warehouse.advanceOrderStage({
          id: order.id,
          stage: nxt,
          actedBy: 'warehouse.operator',
          notes: `Advanced to ${nxt} from operations journey`
        })
        toast.success(`${order.orderNumber} moved to ${stageLabel(nxt)}`)
      }
      await load()
    } catch (err: any) {
      setOrders(prev => prev.map((o) => o.id === before.id ? before : o))
      toast.error(err?.message || 'Failed to advance order')
    } finally {
      setActingOrderId(null)
    }
  }

  const viewButtons: Array<{ id: View; label: string }> = [
    { id: 'control', label: 'Control Tower' },
    { id: 'receiving', label: 'Receiving Journey' },
    { id: 'outbound', label: 'Outbound Journey' },
    { id: 'activity', label: 'Activity Feed' }
  ]

  const cards = [
    { label: 'Active Orders', value: board?.activeOrders ?? activeOrders.length, icon: ClipboardList },
    { label: 'Receiving', value: board?.receiving ?? groupedInbound.receiving.length, icon: ScanLine },
    { label: 'QC', value: board?.qc ?? groupedInbound.qc.length, icon: ShieldCheck },
    { label: 'Putaway', value: board?.putaway ?? groupedInbound.putaway.length, icon: Boxes },
    { label: 'Picking', value: board?.picking ?? groupedOutbound.picking.length, icon: ShoppingBag },
    { label: 'Packing', value: board?.packing ?? groupedOutbound.packing.length, icon: PackageCheck },
    { label: 'Shipping', value: board?.shipping ?? groupedOutbound.shipping.length, icon: Rocket }
  ]

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-br from-cyan-600 via-blue-600 to-emerald-500 text-white p-5 shadow-md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Warehouse Operations Control Tower</h3>
            <p className="text-xs text-cyan-50 mt-1">Phase 2 journey: ASN and receiving flow, QC and putaway handoff, then pick-pack-ship with full actor traceability.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void load()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/30 bg-white/15 hover:bg-white/25 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> New Journey Order
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{card.label}</div>
                <Icon className="w-4 h-4 text-blue-500" />
              </div>
              <div className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{card.value}</div>
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-700 p-1">
            {viewButtons.map(v => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`px-3 py-1.5 text-xs rounded-md transition ${view === v.id ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-300'}`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search order, partner, source, SKU"
                className="pl-8 pr-3 py-2 w-full sm:w-64 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
              />
            </div>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
            >
              <option value="all">All Locations</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 animate-pulse">
              <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-4/5 mb-2" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/5" />
            </div>
          ))}
        </div>
      ) : view === 'control' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <JourneyColumn
            title="Inbound Lane"
            subtitle="Receiving -> QC -> Putaway"
            sections={[
              { key: 'created', title: 'Created', orders: groupedInbound.created },
              { key: 'receiving', title: 'Receiving', orders: groupedInbound.receiving },
              { key: 'qc', title: 'Quality Check', orders: groupedInbound.qc },
              { key: 'putaway', title: 'Putaway', orders: groupedInbound.putaway }
            ]}
            onAdvance={moveOrderForward}
            actingOrderId={actingOrderId}
          />

          <JourneyColumn
            title="Outbound Lane"
            subtitle="Picking -> Packing -> Shipping"
            sections={[
              { key: 'created', title: 'Created', orders: groupedOutbound.created },
              { key: 'picking', title: 'Picking', orders: groupedOutbound.picking },
              { key: 'packing', title: 'Packing', orders: groupedOutbound.packing },
              { key: 'shipping', title: 'Shipping', orders: groupedOutbound.shipping }
            ]}
            onAdvance={moveOrderForward}
            actingOrderId={actingOrderId}
          />
        </div>
      )}

      {!loading && view === 'receiving' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <StagePanel icon={ScanLine} title="Receiving Queue" orders={groupedInbound.receiving} onAdvance={moveOrderForward} actingOrderId={actingOrderId} />
          <StagePanel icon={ShieldCheck} title="QC Queue" orders={groupedInbound.qc} onAdvance={moveOrderForward} actingOrderId={actingOrderId} />
          <StagePanel icon={Boxes} title="Putaway Queue" orders={groupedInbound.putaway} onAdvance={moveOrderForward} actingOrderId={actingOrderId} />
        </div>
      )}

      {!loading && view === 'outbound' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <StagePanel icon={ShoppingBag} title="Picking Queue" orders={groupedOutbound.picking} onAdvance={moveOrderForward} actingOrderId={actingOrderId} />
          <StagePanel icon={PackageCheck} title="Packing Queue" orders={groupedOutbound.packing} onAdvance={moveOrderForward} actingOrderId={actingOrderId} />
          <StagePanel icon={Truck} title="Shipping Queue" orders={groupedOutbound.shipping} onAdvance={moveOrderForward} actingOrderId={actingOrderId} />
        </div>
      )}

      {!loading && view === 'activity' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 mb-3 text-slate-700 dark:text-slate-200">
              <Truck className="w-4 h-4" />
              <h4 className="font-medium text-sm">Recent Stock Movements</h4>
            </div>
            <div className="space-y-2 max-h-[28rem] overflow-y-auto">
              {movements.length === 0 && <p className="text-xs text-slate-400">No movement history yet.</p>}
              {movements.map(m => (
                <div key={m.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800 dark:text-slate-100">{m.productName}</span>
                    <span className="text-slate-500">{m.quantity > 0 ? '+' : ''}{m.quantity} {m.unit}</span>
                  </div>
                  <div className="mt-1 text-slate-500 dark:text-slate-400">{m.movementType} · {m.location?.name || 'N/A'}</div>
                  <div className="mt-1 text-slate-500 dark:text-slate-400">By: {m.actedBy || 'system'}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 mb-3 text-slate-700 dark:text-slate-200">
              <History className="w-4 h-4" />
              <h4 className="font-medium text-sm">Who Did What</h4>
            </div>
            <div className="space-y-2 max-h-[28rem] overflow-y-auto">
              {auditLogs.length === 0 && <p className="text-xs text-slate-400">No audit records yet.</p>}
              {auditLogs.map(a => (
                <div key={a.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800 dark:text-slate-100">{a.action}</span>
                    <span className="text-slate-400">{new Date(a.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="mt-1 text-slate-500 dark:text-slate-400">{a.entityType} · {a.details || '-'}</div>
                  <div className="mt-1 inline-flex items-center gap-1 text-slate-500 dark:text-slate-400"><UserCircle2 className="w-3 h-3" /> {a.actor || 'system'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form onSubmit={createOrder} className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold text-slate-900 dark:text-white">Create Operational Order</h4>
              <button type="button" onClick={() => setShowCreate(false)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <label className="block">
                <span className="text-xs text-slate-500">Order Type</span>
                <select value={form.orderType} onChange={e => setForm(f => ({ ...f, orderType: e.target.value as OrderType }))} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm">
                  <option value="inbound">Inbound</option>
                  <option value="outbound">Outbound</option>
                </select>
              </label>

              <label className="block col-span-2">
                <span className="text-xs text-slate-500">Location</span>
                <select required value={form.locationId} onChange={e => setForm(f => ({ ...f, locationId: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm">
                  <option value="">Select location</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
                </select>
              </label>

              <label className="block">
                <span className="text-xs text-slate-500">Priority</span>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-slate-500">Source Ref (PO, SO, ASN)</span>
                <input value={form.sourceRef} onChange={e => setForm(f => ({ ...f, sourceRef: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" placeholder="PO-1023 / SO-559 / ASN-77" />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">Partner</span>
                <input value={form.partnerName} onChange={e => setForm(f => ({ ...f, partnerName: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" placeholder="Supplier / Customer" />
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-medium text-slate-800 dark:text-slate-100">Order Lines</h5>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, lines: [...f.lines, { productName: '', sku: '', requestedQty: '1', unit: 'pcs' }] }))}
                  className="text-xs px-2 py-1 rounded-md border border-slate-200 dark:border-slate-600"
                >
                  Add Line
                </button>
              </div>

              {form.lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <input
                    value={line.productName}
                    onChange={e => setForm(f => ({ ...f, lines: f.lines.map((l, i) => i === idx ? { ...l, productName: e.target.value } : l) }))}
                    className="col-span-5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                    placeholder="Product Name"
                  />
                  <input
                    value={line.sku}
                    onChange={e => setForm(f => ({ ...f, lines: f.lines.map((l, i) => i === idx ? { ...l, sku: e.target.value } : l) }))}
                    className="col-span-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                    placeholder="SKU"
                  />
                  <input
                    type="number"
                    min="1"
                    value={line.requestedQty}
                    onChange={e => setForm(f => ({ ...f, lines: f.lines.map((l, i) => i === idx ? { ...l, requestedQty: e.target.value } : l) }))}
                    className="col-span-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, lines: f.lines.length === 1 ? f.lines : f.lines.filter((_, i) => i !== idx) }))}
                    className="col-span-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm">Cancel</button>
              <button disabled={creating} type="submit" className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
                {creating ? 'Creating...' : 'Create Order'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function StagePanel({
  icon: Icon,
  title,
  orders,
  onAdvance,
  actingOrderId
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  orders: WarehouseOrder[]
  onAdvance: (order: WarehouseOrder) => Promise<void>
  actingOrderId: string | null
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-blue-500" />
        <h4 className="font-medium text-sm text-slate-800 dark:text-slate-100">{title}</h4>
      </div>

      <div className="space-y-2 max-h-[30rem] overflow-y-auto">
        {orders.length === 0 && <p className="text-xs text-slate-400">No orders in this queue.</p>}
        {orders.map(order => (
          <OrderCard key={order.id} order={order} onAdvance={onAdvance} acting={actingOrderId === order.id} />
        ))}
      </div>
    </div>
  )
}

function JourneyColumn({
  title,
  subtitle,
  sections,
  onAdvance,
  actingOrderId
}: {
  title: string
  subtitle: string
  sections: Array<{ key: string; title: string; orders: WarehouseOrder[] }>
  onAdvance: (order: WarehouseOrder) => Promise<void>
  actingOrderId: string | null
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-4 shadow-sm">
      <div>
        <h4 className="font-semibold text-slate-900 dark:text-white">{title}</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sections.map(section => (
          <div key={section.key} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 bg-slate-50/60 dark:bg-slate-900/20">
            <div className="text-xs font-medium text-slate-700 dark:text-slate-200 mb-2 flex items-center justify-between">
              <span>{section.title}</span>
              <span className="text-slate-400">{section.orders.length}</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {section.orders.length === 0 && <div className="text-[11px] text-slate-400">No orders</div>}
              {section.orders.map(order => (
                <OrderCard key={order.id} order={order} onAdvance={onAdvance} acting={actingOrderId === order.id} compact />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function OrderCard({
  order,
  onAdvance,
  acting,
  compact
}: {
  order: WarehouseOrder
  onAdvance: (order: WarehouseOrder) => Promise<void>
  acting: boolean
  compact?: boolean
}) {
  const stage = getStage(order)
  const steps = order.orderType === 'inbound' ? INBOUND_STEPS : OUTBOUND_STEPS
  const progress = Math.max(0, steps.indexOf(stage))
  const action = primaryActionLabel(order)
  const disabled = order.status === 'completed' || stage === 'done' || !order.locationId || acting

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 bg-white dark:bg-slate-800 hover:border-cyan-200 dark:hover:border-cyan-700 transition-colors">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">{order.orderNumber}</div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[order.status] || STATUS_COLORS.draft}`}>{order.status}</span>
      </div>

      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
        {order.orderType.toUpperCase()} · {order.lines.length} line(s) · {stageLabel(stage)}
      </div>

      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
        {order.partnerName || 'No partner'} · {order.sourceRef || 'No source ref'}
      </div>

      {!compact && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {steps.map((s, idx) => (
            <div
              key={s}
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${idx <= progress ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}
            >
              {stageLabel(s)}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => void onAdvance(order)}
        disabled={disabled}
        className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium"
      >
        {acting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />} {action}
      </button>
    </div>
  )
}
