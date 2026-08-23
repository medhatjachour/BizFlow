import React from 'react'
import { WarehouseOrder, Stage } from '../types'
import { StageColumn } from './StageColumn'
import { getOrderCurrentStage, getStageLabel } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  stages: Stage[]
  orders: WarehouseOrder[]
  onAdvance: (order: WarehouseOrder) => Promise<void>
  actingOrderId: string | null
}

export const StageQueueView: React.FC<Props> = ({
  stages,
  orders,
  onAdvance,
  actingOrderId
}) => {
  const { t } = useLanguage()

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stages.map(stage => {
        const list = orders.filter(o => getOrderCurrentStage(o) === stage)
        return (
          <StageColumn
            key={stage}
            title={getStageLabel(stage, t)}
            count={list.length}
            orders={list}
            onAdvance={onAdvance}
            actingOrderId={actingOrderId}
            compact={false}
          />
        )
      })}
    </div>
  )
}