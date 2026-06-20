/**
 * Financial Health Component
 * 
 * Overall business health dashboard:
 * - Health score (0-100)
 * - Key indicators
 * - Alerts & recommendations
 */

import { useState, useEffect } from 'react'
import { Activity, TrendingUp, Package, DollarSign, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react'
import { useLanguage } from '../../../contexts/LanguageContext'
import logger from '../../../../../shared/utils/logger'

type FinancialHealth = {
  score: number
  indicators: {
    profitMargin: { value: number; status: 'good' | 'fair' | 'poor' }
    inventoryTurnover: { value: number; status: 'good' | 'fair' | 'poor' }
    growthRate: { value: number; status: 'good' | 'fair' | 'poor' }
    cashPosition: { value: number; status: 'good' | 'fair' | 'poor' }
  }
  alerts: string[]
  recommendations: string[]
}

export default function FinancialHealthDashboard() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [health, setHealth] = useState<FinancialHealth | null>(null)

  useEffect(() => {
    loadHealth()
  }, [])

  const loadHealth = async () => {
    try {
      setLoading(true)
      // @ts-ignore
      const data = await window.api['health:financial']()
      setHealth(data)
    } catch (error) {
      logger.error('Error loading financial health:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
          <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (!health) {
    return null
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-600'
    if (score >= 60) return 'from-yellow-500 to-amber-600'
    return 'from-red-500 to-rose-600'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'bg-green-500'
      case 'fair':
        return 'bg-yellow-500'
      case 'poor':
        return 'bg-red-500'
      default:
        return 'bg-slate-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'good':
        return t('healthHealthy')
      case 'fair':
        return t('healthModerate')
      case 'poor':
        return t('healthNeedsAttention')
      default:
        return t('healthUnknown')
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity size={20} className="text-primary" />
          <h3 className="font-semibold text-slate-900 dark:text-white">{t('healthFinancialHealth')}</h3>
          <Tooltip text={t('healthTooltip')}>
            <HelpCircle size={16} className="text-slate-400 hover:text-slate-600 cursor-help" />
          </Tooltip>
        </div>
        
        <button
          onClick={loadHealth}
          className="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          {t('insightsRefresh')}
        </button>
      </div>

      {/* Health Score */}
      <div className={`relative mb-8 rounded-2xl bg-gradient-to-br ${getScoreBgColor(health.score)} p-10 text-white overflow-hidden`}>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm mb-2 font-medium">{t('healthOverallScore')}</p>
            <div className="flex items-end gap-3 mb-4">
              <span className="text-7xl font-bold tracking-tight">{health.score}</span>
              <span className="text-4xl font-medium mb-3 opacity-80">/100</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              {health.score >= 80 ? (
                <span className="text-2xl">🎉</span>
              ) : health.score >= 60 ? (
                <span className="text-2xl">👍</span>
              ) : (
                <span className="text-2xl">⚠️</span>
              )}
              <p className="text-white/90 text-lg font-medium">
                {health.score >= 80 
                  ? t('healthExcellent')
                  : health.score >= 60
                  ? t('healthGood')
                  : t('healthActionNeeded')}
              </p>
            </div>
          </div>
          
          {/* Circular Progress Indicator */}
          <div className="relative w-32 h-32">
            <svg className="transform -rotate-90 w-32 h-32">
              {/* Background circle */}
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth="8"
                fill="none"
              />
              {/* Progress circle */}
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="rgba(255, 255, 255, 0.9)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(health.score / 100) * 351.86} 351.86`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white/90 text-xs font-bold">
                {health.score >= 80 ? 'A+' : health.score >= 60 ? 'B' : 'C'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-12 -mt-12 blur-xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-8 -mb-8 blur-xl"></div>
      </div>

      {/* Key Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Profit Margin */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarSign size={18} className="text-slate-600 dark:text-slate-400" />
              <h4 className="font-medium text-slate-900 dark:text-white">{t('healthProfitMargin')}</h4>
              <Tooltip text={t('healthProfitMarginTooltip')}>
                <HelpCircle size={14} className="text-slate-400 opacity-60 cursor-help" />
              </Tooltip>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              health.indicators.profitMargin.status === 'good'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : health.indicators.profitMargin.status === 'fair'
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {getStatusText(health.indicators.profitMargin.status)}
            </div>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {health.indicators.profitMargin.value.toFixed(1)}%
            </span>
            <span className="text-sm text-slate-500 mb-1">
              {health.indicators.profitMargin.value >= 20 ? t('healthExcellentLabel') : 
               health.indicators.profitMargin.value >= 10 ? t('healthTarget20') : 
               t('healthTarget10')}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mb-2">
            <div
              className={`h-2.5 rounded-full ${getStatusColor(health.indicators.profitMargin.status)} transition-all duration-500`}
              style={{ width: `${Math.min(100, Math.max(5, health.indicators.profitMargin.value * 2))}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {health.indicators.profitMargin.value < 0 ? '❌ Operating at loss' :
             health.indicators.profitMargin.value < 5 ? '⚠️ Very tight margins' :
             health.indicators.profitMargin.value < 10 ? '📊 Below industry average' :
             health.indicators.profitMargin.value < 20 ? '✅ Decent profitability' :
             '🎯 Above industry average'}
          </p>
        </div>

        {/* Inventory Turnover */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-slate-600 dark:text-slate-400" />
              <h4 className="font-medium text-slate-900 dark:text-white">{t('healthInventoryTurnover')}</h4>
              <Tooltip text={t('healthInventoryTurnoverTooltip')}>
                <HelpCircle size={14} className="text-slate-400 opacity-60 cursor-help" />
              </Tooltip>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              health.indicators.inventoryTurnover.status === 'good'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : health.indicators.inventoryTurnover.status === 'fair'
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {getStatusText(health.indicators.inventoryTurnover.status)}
            </div>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {health.indicators.inventoryTurnover.value.toFixed(1)}x
            </span>
            <span className="text-sm text-slate-500 mb-1">
              {t('healthPerYear')}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mb-2">
            <div
              className={`h-2 rounded-full ${getStatusColor(health.indicators.inventoryTurnover.status)} transition-all duration-500`}
              style={{ width: `${Math.min(100, (health.indicators.inventoryTurnover.value / 10) * 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {health.indicators.inventoryTurnover.value < 2 ? '🐌 Very slow - inventory sits too long' :
             health.indicators.inventoryTurnover.value < 3 ? '⚠️ Below average - consider promotions' :
             health.indicators.inventoryTurnover.value < 6 ? '📊 Moderate pace - room to improve' :
             health.indicators.inventoryTurnover.value < 10 ? '✅ Good velocity - well managed' :
             '🚀 Excellent turnover - very efficient'}
          </p>
        </div>

        {/* Growth Rate */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-slate-600 dark:text-slate-400" />
              <h4 className="font-medium text-slate-900 dark:text-white">{t('healthGrowthRate')}</h4>
              <Tooltip text={t('healthGrowthRateTooltip')}>
                <HelpCircle size={14} className="text-slate-400 opacity-60 cursor-help" />
              </Tooltip>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              health.indicators.growthRate.status === 'good'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : health.indicators.growthRate.status === 'fair'
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {getStatusText(health.indicators.growthRate.status)}
            </div>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              {health.indicators.growthRate.value >= 0 ? '+' : ''}
              {health.indicators.growthRate.value.toFixed(1)}%
            </span>
            <span className="text-sm text-slate-500 mb-1">
              {health.indicators.growthRate.value >= 0 ? t('healthGrowing') : t('healthDeclining')}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mb-2">
            <div
              className={`h-2.5 rounded-full ${getStatusColor(health.indicators.growthRate.status)} transition-all duration-500`}
              style={{ width: `${Math.min(100, Math.max(5, (Math.abs(health.indicators.growthRate.value) / 20) * 100))}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {health.indicators.growthRate.value < -10 ? '📉 Significant decline - immediate action needed' :
             health.indicators.growthRate.value < 0 ? '⚠️ Revenue declining - investigate causes' :
             health.indicators.growthRate.value < 5 ? '📊 Slow growth - need more customers' :
             health.indicators.growthRate.value < 15 ? '✅ Steady growth - on the right track' :
             health.indicators.growthRate.value < 30 ? '🚀 Strong growth - scaling well' :
             '🔥 Explosive growth - manage capacity'}
          </p>
        </div>

        {/* Cash Position */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-slate-600 dark:text-slate-400" />
              <h4 className="font-medium text-slate-900 dark:text-white">{t('healthCashPosition')}</h4>
              <Tooltip text={t('healthCashPositionTooltip')}>
                <HelpCircle size={14} className="text-slate-400 opacity-60 cursor-help" />
              </Tooltip>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              health.indicators.cashPosition.status === 'good'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : health.indicators.cashPosition.status === 'fair'
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {getStatusText(health.indicators.cashPosition.status)}
            </div>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              ${health.indicators.cashPosition.value.toFixed(0)}
            </span>
            <span className="text-sm text-slate-500 mb-1">
              {t('healthAvailable')}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mb-2">
            <div
              className={`h-2.5 rounded-full ${getStatusColor(health.indicators.cashPosition.status)} transition-all duration-500`}
              style={{ width: `${Math.min(100, Math.max(5, (health.indicators.cashPosition.value / 20000) * 100))}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {health.indicators.cashPosition.value < 0 ? '🚨 Negative cash - urgent action needed' :
             health.indicators.cashPosition.value < 1000 ? '⚠️ Very low reserves - risky position' :
             health.indicators.cashPosition.value < 5000 ? '📊 Minimal buffer - build reserves' :
             health.indicators.cashPosition.value < 10000 ? '✅ Adequate cash - 1-2 month buffer' :
             '💰 Strong position - 2+ month reserves'}
          </p>
        </div>
      </div>

      {/* Alerts & Recommendations Combined */}
      {(health.alerts.length > 0 || health.recommendations.length > 0) && (
        <div className="space-y-4">
          {/* Critical Alerts */}
          {health.alerts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={20} className="text-red-600" />
                <h4 className="font-semibold text-slate-900 dark:text-white">
                  {t('healthActionRequired')} ({health.alerts.length})
                </h4>
              </div>
              <div className="space-y-2">
                {health.alerts.map((alert, index) => {
                  const isCritical = alert.includes('🚨')
                  return (
                    <div
                      key={index}
                      className={`flex items-start gap-3 p-4 rounded-lg border ${
                        isCritical
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800'
                          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      <span className="text-lg mt-0.5 flex-shrink-0">
                        {isCritical ? '🚨' : '⚠️'}
                      </span>
                      <div className="flex-1">
                        <p className={`font-medium ${
                          isCritical
                            ? 'text-red-900 dark:text-red-200'
                            : 'text-amber-900 dark:text-amber-200'
                        }`}>
                          {alert.replace('🚨', '').replace('⚠️', '').trim()}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actionable Recommendations */}
          {health.recommendations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={20} className="text-blue-600" />
                <h4 className="font-semibold text-slate-900 dark:text-white">
                  {t('healthRecommendations')} ({health.recommendations.length})
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {health.recommendations.map((rec, index) => {
                  const isPositive = rec.includes('Excellent') || rec.includes('Strong') || rec.includes('Good progress')
                  return (
                    <div
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-all hover:shadow-md ${
                        isPositive
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      <span className="text-base mt-0.5 flex-shrink-0">
                        {isPositive ? '✅' : '💡'}
                      </span>
                      <p className={`text-sm ${
                        isPositive
                          ? 'text-green-900 dark:text-green-200'
                          : 'text-blue-900 dark:text-blue-200'
                      }`}>
                        {rec}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Tooltip Component
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="relative group inline-block">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-64 whitespace-normal">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
      </div>
    </div>
  )
}
