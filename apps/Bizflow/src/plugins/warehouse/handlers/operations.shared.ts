/**
 * Shared helpers for the warehouse operations handlers.
 * Extracted from operations.ts so the query/lifecycle modules can share them.
 */

export type JourneyStage =
  | 'created' | 'receiving' | 'qc' | 'putaway' | 'picking' | 'packing' | 'shipping' | 'done'

export function normalizeStage(orderType: string, stage?: string | null): JourneyStage {
  if (stage && ['created', 'receiving', 'qc', 'putaway', 'picking', 'packing', 'shipping', 'done'].includes(stage)) {
    return stage as JourneyStage
  }

  if (orderType === 'inbound' || orderType === 'return') return 'receiving'
  if (orderType === 'outbound') return 'picking'
  return 'created'
}

export function stageDataPatch(stage: JourneyStage, actor?: string | null) {
  const now = new Date()
  switch (stage) {
    case 'receiving':
      return { workflowStage: stage, status: 'processing', receivedAt: now, receivedBy: actor ?? null }
    case 'qc':
      return { workflowStage: stage, status: 'processing', qcCompletedAt: now, qcBy: actor ?? null }
    case 'putaway':
      return { workflowStage: stage, status: 'processing', putawayAt: now, putawayBy: actor ?? null }
    case 'picking':
      return { workflowStage: stage, status: 'processing', pickedAt: now, pickedBy: actor ?? null }
    case 'packing':
      return { workflowStage: stage, status: 'processing', packedAt: now, packedBy: actor ?? null }
    case 'shipping':
      return { workflowStage: stage, status: 'processing', shippedAt: now, shippedBy: actor ?? null }
    case 'done':
      return { workflowStage: stage, status: 'completed', processedDate: now, processedBy: actor ?? null }
    default:
      return { workflowStage: stage, status: 'pending' }
  }
}

export function makeOrderNumber(orderType: string) {
  const type = (orderType || 'ORD').slice(0, 3).toUpperCase()
  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}${String(now.getMilliseconds()).padStart(3, '0')}`
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `WH-${type}-${stamp}-${rand}`
}
