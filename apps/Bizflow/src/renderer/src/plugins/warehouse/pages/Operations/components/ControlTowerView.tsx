import React from 'react'
import { WarehouseOrder, Stage } from '../types'
import { StageColumn } from './StageColumn'
import { getOrderCurrentStage, getStageLabel } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  inboundOrders: WarehouseOrder[]
  outboundOrders: WarehouseOrder[]
  onAdvance: (order: WarehouseOrder) => Promise<void>
  actingOrderId: string | null
}

export const ControlTowerView: React.FC<Props> = ({
  inboundOrders,
  outboundOrders,
  onAdvance,
  actingOrderId
}) => {
  const { t } = useLanguage()

  const inboundStages: Stage[] = ['created', 'receiving', 'qc', 'putaway']
  const outboundStages: Stage[] = ['created', 'picking', 'packing', 'shipping']

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      {/* Inbound Master Lane */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm space-y-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {t('warehouseInboundLane') || 'Inbound Dock Logistics'}
          </h3>
          <p className="text-xs text-slate-400">Receiving, QA verification, and shelf putaway</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {inboundStages.map(stage => {
            const list = inboundOrders.filter(o => getOrderCurrentStage(o) === stage)
            return (
              <StageColumn
                key={stage}
                title={getStageLabel(stage, t)}
                count={list.length}
                orders={list}
                onAdvance={onAdvance}
                actingOrderId={actingOrderId}
                compact
              />
            )
          })}
        </div>
      </div>

      {/* Outbound Master Lane */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm space-y-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {t('warehouseOutboundLane') || 'Outbound Dispatch Flow'}
          </h3>
          <p className="text-xs text-slate-400">Picking routes, item packing, and carrier dispatch</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {outboundStages.map(stage => {
            const list = outboundOrders.filter(o => getOrderCurrentStage(o) === stage)
            return (
              <StageColumn
                key={stage}
                title={getStageLabel(stage, t)}
                count={list.length}
                orders={list}
                onAdvance={onAdvance}
                actingOrderId={actingOrderId}
                compact
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}