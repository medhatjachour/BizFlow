import { useState, useCallback, useEffect } from 'react'
import { useToast } from '@renderer/contexts/ToastContext'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import logger from '@/shared/utils/logger'
import type { Period, MatFinanceSummary } from '../types'

export function useClinicMaterialsFinance(period: Period, enabled: boolean) {
  const { showToast } = useToast()
  const { t } = useLanguage()

  const [matFinance, setMatFinance] = useState<MatFinanceSummary | null>(null)
  const [loading, setLoading] = useState(false)

  const loadMaterials = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const data = await (window.api.clinic.materials as any).financeSummary(period)
      setMatFinance(data ?? null)
    } catch (e) {
      logger.error('ClinicFinance: loadMaterials failed', e)
      showToast('error', t('failedLoadMaterials') || 'Failed to load material finances')
    } finally {
      setLoading(false)
    }
  }, [enabled, period, showToast, t])

  useEffect(() => {
    if (enabled) {
      loadMaterials()
    }
  }, [enabled, period, loadMaterials])

  return {
    matFinance,
    loading,
    reload: loadMaterials
  }
}