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
import { useLanguage } from '@renderer/contexts/LanguageContext'
import InfoTooltip from './InfoTooltip'

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

function stageLabel(stage: Stage, t: (key: string) => string) {
  const labels: Record<Stage, string> = {
    created: t('warehouseStageCreated'),
    receiving: t('warehouseStageReceiving'),
    qc: t('warehouseStageQc'),
    putaway: t('warehouseStagePutaway'),
    picking: t('warehouseStagePicking'),
    packing: t('warehouseStagePacking'),
    shipping: t('warehouseStageShipping'),
    done: t('warehouseStageDone')
  }
  return labels[stage]
}

function nextStage(orderType: OrderType, stage: Stage): Stage | null {
  const steps = orderType === 'inbound' ? INBOUND_STEPS : OUTBOUND_STEPS
  const i = steps.indexOf(stage)
  if (i < 0 || i === steps.length - 1) return null
  return steps[i + 1]
}

function primaryActionLabel(order: WarehouseOrder, t: (key: string) => string): string {
  const stage = getStage(order)
  if (order.orderType === 'inbound') {
    if (stage === 'created') return t('warehouseActionStartReceiving')
    if (stage === 'receiving') return t('warehouseActionMoveToQc')
    if (stage === 'qc') return t('warehouseActionApprovePutaway')
    if (stage === 'putaway') return t('warehouseActionPostStock')
  }

  if (order.orderType === 'outbound') {
    if (stage === 'created') return t('warehouseActionStartPicking')
    if (stage === 'picking') return t('warehouseActionMoveToPacking')
    if (stage === 'packing') return t('warehouseActionMoveToShipping')
    if (stage === 'shipping') return t('warehouseActionConfirmShipment')
  }

  return t('warehouseActionView')
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
  const { t } = useLanguage()

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
      toast.error(t('warehouseLoadOperationsFailed'))
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
      toast.warning(t('warehouseSelectLocationFirst'))
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
      toast.warning(t('warehouseAddAtLeastOneLineItem'))
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
      toast.success(t('warehouseOrderCreated'))
      await load()
    } catch (err: any) {
      toast.error(err?.message || t('warehouseCreateOrderFailed'))
    } finally {
      setCreating(false)
    }
  }

  const moveOrderForward = async (order: WarehouseOrder) => {
    if (!order.locationId) {
      toast.warning(t('warehouseOrderNoAssignedLocation'))
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
          notes: t('warehousePostedFromPhase2')
        })
        toast.success(t('warehouseOrderCompleted').replace('{orderNumber}', order.orderNumber))
      } else {
        if (!nxt) return
        await window.api.warehouse.advanceOrderStage({
          id: order.id,
          stage: nxt,
          actedBy: 'warehouse.operator',
          notes: t('warehouseAdvancedToStage').replace('{stage}', nxt)
        })
        toast.success(t('warehouseOrderMovedToStage').replace('{orderNumber}', order.orderNumber).replace('{stage}', stageLabel(nxt, t)))
      }
      await load()
    } catch (err: any) {
      setOrders(prev => prev.map((o) => o.id === before.id ? before : o))
      toast.error(err?.message || t('warehouseAdvanceOrderFailed'))
    } finally {
      setActingOrderId(null)
    }
  }

  const viewButtons: Array<{ id: View; label: string }> = [
    { id: 'control', label: t('warehouseControlTower') },
    { id: 'receiving', label: t('warehouseReceivingJourney') },
    { id: 'outbound', label: t('warehouseOutboundJourney') },
    { id: 'activity', label: t('warehouseActivityFeed') }
  ]

  const cards = [
    { label: t('warehouseActiveOrders'), hint: t('warehouseOpsInfoCardActiveOrders'), value: board?.activeOrders ?? activeOrders.length, icon: ClipboardList },
    { label: t('warehouseReceiving'), hint: t('warehouseOpsInfoCardReceiving'), value: board?.receiving ?? groupedInbound.receiving.length, icon: ScanLine },
    { label: 'QC', hint: t('warehouseOpsInfoCardQc'), value: board?.qc ?? groupedInbound.qc.length, icon: ShieldCheck },
    { label: t('warehousePutaway'), hint: t('warehouseOpsInfoCardPutaway'), value: board?.putaway ?? groupedInbound.putaway.length, icon: Boxes },
    { label: t('warehousePicking'), hint: t('warehouseOpsInfoCardPicking'), value: board?.picking ?? groupedOutbound.picking.length, icon: ShoppingBag },
    { label: t('warehousePacking'), hint: t('warehouseOpsInfoCardPacking'), value: board?.packing ?? groupedOutbound.packing.length, icon: PackageCheck },
    { label: t('warehouseShipping'), hint: t('warehouseOpsInfoCardShipping'), value: board?.shipping ?? groupedOutbound.shipping.length, icon: Rocket }
  ]

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-br from-cyan-600 via-blue-600 to-emerald-500 text-white p-5 shadow-md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold">{t('warehouseOperationsControlTowerTitle')}</h3>
            <p className="text-xs text-cyan-50 mt-1">{t('warehouseOperationsControlTowerSubtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void load()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/30 bg-white/15 hover:bg-white/25 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> {t('warehouseRefresh')}
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> {t('warehouseNewJourneyOrder')}
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
                <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{card.label}</span>
                  <InfoTooltip text={card.hint} />
                </div>
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
                placeholder={t('warehouseSearchOrderPartnerSourceSku')}
                className="pl-8 pr-3 py-2 w-full sm:w-64 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
              />
            </div>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
            >
              <option value="all">{t('warehouseAllLocations')}</option>
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
            title={t('warehouseInboundLane')}
            subtitle={t('warehouseInboundLaneSubtitle')}
            sections={[
              { key: 'created', title: t('warehouseStageCreated'), orders: groupedInbound.created },
              { key: 'receiving', title: t('warehouseStageReceiving'), orders: groupedInbound.receiving },
              { key: 'qc', title: t('warehouseStageQc'), orders: groupedInbound.qc },
              { key: 'putaway', title: t('warehouseStagePutaway'), orders: groupedInbound.putaway }
            ]}
            onAdvance={moveOrderForward}
            actingOrderId={actingOrderId}
            t={t}
          />

          <JourneyColumn
            title={t('warehouseOutboundLane')}
            subtitle={t('warehouseOutboundLaneSubtitle')}
            sections={[
              { key: 'created', title: t('warehouseStageCreated'), orders: groupedOutbound.created },
              { key: 'picking', title: t('warehouseStagePicking'), orders: groupedOutbound.picking },
              { key: 'packing', title: t('warehouseStagePacking'), orders: groupedOutbound.packing },
              { key: 'shipping', title: t('warehouseStageShipping'), orders: groupedOutbound.shipping }
            ]}
            onAdvance={moveOrderForward}
            actingOrderId={actingOrderId}
            t={t}
          />
        </div>
      )}

      {!loading && view === 'receiving' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <StagePanel icon={ScanLine} title={t('warehouseReceivingQueue')} orders={groupedInbound.receiving} onAdvance={moveOrderForward} actingOrderId={actingOrderId} t={t} />
          <StagePanel icon={ShieldCheck} title={t('warehouseQcQueue')} orders={groupedInbound.qc} onAdvance={moveOrderForward} actingOrderId={actingOrderId} t={t} />
          <StagePanel icon={Boxes} title={t('warehousePutawayQueue')} orders={groupedInbound.putaway} onAdvance={moveOrderForward} actingOrderId={actingOrderId} t={t} />
        </div>
      )}

      {!loading && view === 'outbound' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <StagePanel icon={ShoppingBag} title={t('warehousePickingQueue')} orders={groupedOutbound.picking} onAdvance={moveOrderForward} actingOrderId={actingOrderId} t={t} />
          <StagePanel icon={PackageCheck} title={t('warehousePackingQueue')} orders={groupedOutbound.packing} onAdvance={moveOrderForward} actingOrderId={actingOrderId} t={t} />
          <StagePanel icon={Truck} title={t('warehouseShippingQueue')} orders={groupedOutbound.shipping} onAdvance={moveOrderForward} actingOrderId={actingOrderId} t={t} />
        </div>
      )}

      {!loading && view === 'activity' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 mb-3 text-slate-700 dark:text-slate-200">
              <Truck className="w-4 h-4" />
              <h4 className="font-medium text-sm">{t('warehouseRecentStockMovements')}</h4>
            </div>
            <div className="space-y-2 max-h-[28rem] overflow-y-auto">
              {movements.length === 0 && <p className="text-xs text-slate-400">{t('warehouseNoMovementHistoryYet')}</p>}
              {movements.map(m => (
                <div key={m.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800 dark:text-slate-100">{m.productName}</span>
                    <span className="text-slate-500">{m.quantity > 0 ? '+' : ''}{m.quantity} {m.unit}</span>
                  </div>
                  <div className="mt-1 text-slate-500 dark:text-slate-400">{m.movementType} · {m.location?.name || t('warehouseNotAvailable')}</div>
                  <div className="mt-1 text-slate-500 dark:text-slate-400">{t('warehouseBy')}: {m.actedBy || t('warehouseSystem')}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 mb-3 text-slate-700 dark:text-slate-200">
              <History className="w-4 h-4" />
              <h4 className="font-medium text-sm">{t('warehouseWhoDidWhat')}</h4>
            </div>
            <div className="space-y-2 max-h-[28rem] overflow-y-auto">
              {auditLogs.length === 0 && <p className="text-xs text-slate-400">{t('warehouseNoAuditRecordsYet')}</p>}
              {auditLogs.map(a => (
                <div key={a.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800 dark:text-slate-100">{a.action}</span>
                    <span className="text-slate-400">{new Date(a.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="mt-1 text-slate-500 dark:text-slate-400">{a.entityType} · {a.details || '-'}</div>
                  <div className="mt-1 inline-flex items-center gap-1 text-slate-500 dark:text-slate-400"><UserCircle2 className="w-3 h-3" /> {a.actor || t('warehouseSystem')}</div>
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
              <h4 className="text-base font-semibold text-slate-900 dark:text-white">{t('warehouseCreateOperationalOrder')}</h4>
              <button type="button" onClick={() => setShowCreate(false)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <label className="block">
                <span className="text-xs text-slate-500">{t('warehouseOrderType')}</span>
                <select value={form.orderType} onChange={e => setForm(f => ({ ...f, orderType: e.target.value as OrderType }))} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm">
                  <option value="inbound">{t('warehouseInbound')}</option>
                  <option value="outbound">{t('warehouseOutbound')}</option>
                </select>
              </label>

              <label className="block col-span-2">
                <span className="text-xs text-slate-500">{t('warehouseLocation')}</span>
                <select required value={form.locationId} onChange={e => setForm(f => ({ ...f, locationId: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm">
                  <option value="">{t('warehouseSelectLocationOption')}</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
                </select>
              </label>

              <label className="block">
                <span className="text-xs text-slate-500">{t('warehousePriority')}</span>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm">
                  <option value="low">{t('warehousePriorityLow')}</option>
                  <option value="normal">{t('warehousePriorityNormal')}</option>
                  <option value="high">{t('warehousePriorityHigh')}</option>
                  <option value="urgent">{t('warehousePriorityUrgent')}</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-slate-500">{t('warehouseSourceRefLabel')}</span>
                <input value={form.sourceRef} onChange={e => setForm(f => ({ ...f, sourceRef: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" placeholder={t('warehouseSourceRefPlaceholder')} />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">{t('warehousePartner')}</span>
                <input value={form.partnerName} onChange={e => setForm(f => ({ ...f, partnerName: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm" placeholder={t('warehousePartnerPlaceholder')} />
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-medium text-slate-800 dark:text-slate-100">{t('warehouseOrderLines')}</h5>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, lines: [...f.lines, { productName: '', sku: '', requestedQty: '1', unit: 'pcs' }] }))}
                  className="text-xs px-2 py-1 rounded-md border border-slate-200 dark:border-slate-600"
                >
                  {t('warehouseAddLine')}
                </button>
              </div>

              {form.lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <input
                    value={line.productName}
                    onChange={e => setForm(f => ({ ...f, lines: f.lines.map((l, i) => i === idx ? { ...l, productName: e.target.value } : l) }))}
                    className="col-span-5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
                    placeholder={t('warehouseProductName')}
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
                    {t('warehouseRemove')}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm">{t('warehouseCancel')}</button>
              <button disabled={creating} type="submit" className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
                {creating ? t('warehouseCreating') : t('warehouseCreateOrder')}
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
  t: (key: string) => string
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-blue-500" />
        <h4 className="font-medium text-sm text-slate-800 dark:text-slate-100">{title}</h4>
      </div>

      <div className="space-y-2 max-h-[30rem] overflow-y-auto">
        {orders.length === 0 && <p className="text-xs text-slate-400">{t('warehouseNoOrdersInQueue')}</p>}
        {orders.map(order => (
          <OrderCard key={order.id} order={order} onAdvance={onAdvance} acting={actingOrderId === order.id} t={t} />
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
  actingOrderId,
  t
}: {
  title: string
  subtitle: string
  sections: Array<{ key: string; title: string; orders: WarehouseOrder[] }>
  onAdvance: (order: WarehouseOrder) => Promise<void>
  actingOrderId: string | null
  t: (key: string) => string
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
              {section.orders.length === 0 && <div className="text-[11px] text-slate-400">{t('warehouseNoOrders')}</div>}
              {section.orders.map(order => (
                <OrderCard key={order.id} order={order} onAdvance={onAdvance} acting={actingOrderId === order.id} compact t={t} />
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
  compact,
  t
}: {
  order: WarehouseOrder
  onAdvance: (order: WarehouseOrder) => Promise<void>
  acting: boolean
  compact?: boolean
  t: (key: string) => string
}) {
  const stage = getStage(order)
  const steps = order.orderType === 'inbound' ? INBOUND_STEPS : OUTBOUND_STEPS
  const progress = Math.max(0, steps.indexOf(stage))
  const action = primaryActionLabel(order, t)
  const disabled = order.status === 'completed' || stage === 'done' || !order.locationId || acting

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 bg-white dark:bg-slate-800 hover:border-cyan-200 dark:hover:border-cyan-700 transition-colors">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">{order.orderNumber}</div>
        <div className="inline-flex items-center gap-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[order.status] || STATUS_COLORS.draft}`}>{order.status}</span>
          <InfoTooltip text={t('warehouseOpsInfoStatusBadge')} />
        </div>
      </div>

      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
        {order.orderType === 'inbound' ? t('warehouseInbound') : t('warehouseOutbound')} · {order.lines.length} {t('warehouseLines')} · {stageLabel(stage, t)}
      </div>

      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
        {order.partnerName || t('warehouseNoPartner')} · {order.sourceRef || t('warehouseNoSourceRef')}
      </div>

      {!compact && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {steps.map((s, idx) => (
            <div
              key={s}
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${idx <= progress ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}
            >
              {stageLabel(s, t)}
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center gap-1.5">
        <button
          onClick={() => void onAdvance(order)}
          disabled={disabled}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium"
        >
          {acting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />} {action}
        </button>
        <InfoTooltip text={t('warehouseOpsInfoAdvanceAction')} />
      </div>
    </div>
  )
}
