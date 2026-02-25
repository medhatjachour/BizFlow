/**
 * Cash Flow Projection Component
 * 
 * Displays cash flow forecasts with:
 * - Burn rate calculation
 * - Runway estimation
 * - Inflow vs Outflow tracking
 * - Cumulative cash position
 */

import { useState, useEffect } from 'react'
import { DollarSign, TrendingDown, TrendingUp, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react'
import { useLanguage } from '../../../contexts/LanguageContext'
import { Chart } from 'react-chartjs-2'
import {
import logger from '../../../../../shared/utils/logger'
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
)

type CashFlowData = {
  projections: Array<{
    date: string
    expectedInflow: number
    expectedOutflow: number
    netCashFlow: number
    cumulativeCash: number
  }>
  burnRate: number
  runway: number | null
  recommendation: string
}

export default function CashFlowProjection() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [cashFlow, setCashFlow] = useState<CashFlowData | null>(null)
  const [days, setDays] = useState(30)

  useEffect(() => {
    loadCashFlow()
  }, [days])

  const loadCashFlow = async () => {
    try {
      setLoading(true)
      // @ts-ignore
      const data = await window.api['forecast:cashflow']({ days })
      setCashFlow(data)
    } catch (error) {
      logger.error('Error loading cash flow:', error)
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

  if (!cashFlow) {
    return null
  }

  const isHealthy = cashFlow.burnRate === 0 || cashFlow.runway === null || cashFlow.runway > 90
  const isCritical = cashFlow.runway !== null && cashFlow.runway < 30
  const totalInflow = cashFlow.projections.reduce((sum, p) => sum + p.expectedInflow, 0)
  const totalOutflow = cashFlow.projections.reduce((sum, p) => sum + p.expectedOutflow, 0)
  const netPosition = totalInflow - totalOutflow

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <DollarSign size={20} className="text-primary" />
          <h3 className="font-semibold text-slate-900 dark:text-white">{t('cashFlowProjection')}</h3>
          <Tooltip text={t('cashFlowTooltip')}>
            <HelpCircle size={16} className="text-slate-400 hover:text-slate-600 cursor-help" />
          </Tooltip>
        </div>
        
        <div className="flex items-center gap-2">
          {[7, 14, 30, 60, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                days === d
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg p-4">
          <p className="text-sm mb-2">{t('cashFlowExpectedInflow')}</p>
          <p className="text-2xl font-bold">${totalInflow.toFixed(0)}</p>
          <p className="text-xs mt-1">${(totalInflow / days).toFixed(0)}/{t('cashFlowPerDay')}</p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg p-4">
          <p className="text-sm mb-2">{t('cashFlowExpectedOutflow')}</p>
          <p className="text-2xl font-bold">${totalOutflow.toFixed(0)}</p>
          <p className="text-xs mt-1">${(totalOutflow / days).toFixed(0)}/{t('cashFlowPerDay')}</p>
        </div>

        <div className={`rounded-lg p-4 ${
          netPosition >= 0 
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
            : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
        }`}>
          <p className="text-sm mb-2">{t('cashFlowNetPosition')}</p>
          <p className="text-2xl font-bold">
            {netPosition >= 0 ? '+' : ''}${netPosition.toFixed(0)}
          </p>
          <p className="text-xs mt-1">{netPosition >= 0 ? t('cashFlowPositiveFlow') : t('cashFlowNegativeFlow')}</p>
        </div>

        <div className={`rounded-lg p-4 ${
          isCritical 
            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
            : isHealthy
            ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
            : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {isCritical ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
            <p className="text-sm">{t('cashFlowRunway')}</p>
          </div>
          <p className="text-2xl font-bold">
            {cashFlow.runway !== null ? `${cashFlow.runway}` : '∞'}
          </p>
          <p className="text-xs mt-1">{cashFlow.runway !== null ? t('cashFlowDays') : t('cashFlowSustainable')}</p>
        </div>
      </div>

      {/* Recommendation Alert */}
      {cashFlow.recommendation && (
        <div className={`rounded-lg p-4 mb-6 ${
          cashFlow.recommendation.includes('⚠️')
            ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
            : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
        }`}>
          <div className="flex items-start gap-3">
            {cashFlow.recommendation.includes('⚠️') ? (
              <AlertTriangle size={20} className="text-amber-600 mt-0.5" />
            ) : (
              <CheckCircle size={20} className="text-green-600 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`font-medium ${
                cashFlow.recommendation.includes('⚠️')
                  ? 'text-amber-900 dark:text-amber-200'
                  : 'text-green-900 dark:text-green-200'
              }`}>
                {cashFlow.recommendation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Burn Rate Info */}
      {cashFlow.burnRate > 0 && (
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingDown size={20} className="text-red-600" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{t('cashFlowBurnRate')}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{t('cashFlowBurnRateDescription')}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-red-600">${cashFlow.burnRate.toFixed(0)}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">{t('cashFlowPerDay')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Cash Flow Chart */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-slate-900 dark:text-white">{t('cashFlowChartTitle')}</h4>
          <Tooltip text={t('cashFlowChartTooltip')}>
            <HelpCircle size={16} className="text-slate-400 hover:text-slate-600 cursor-help" />
          </Tooltip>
        </div>
        <div className="h-80">
          <Chart
            type="bar"
            data={{
              labels: cashFlow.projections.slice(0, Math.min(days, 30)).map(p => 
                new Date(p.date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })
              ),
              datasets: [
                {
                  type: 'line' as const,
                  label: t('cashFlowCumulativeCash'),
                  data: cashFlow.projections.slice(0, Math.min(days, 30)).map(p => p.cumulativeCash),
                  borderColor: 'rgb(147, 51, 234)',
                  backgroundColor: 'rgba(147, 51, 234, 0.1)',
                  borderWidth: 3,
                  fill: false,
                  tension: 0.4,
                  pointRadius: 4,
                  pointHoverRadius: 6,
                  yAxisID: 'y1',
                },
                {
                  type: 'bar' as const,
                  label: t('cashFlowInflow'),
                  data: cashFlow.projections.slice(0, Math.min(days, 30)).map(p => p.expectedInflow),
                  backgroundColor: 'rgba(34, 197, 94, 0.7)',
                  borderColor: 'rgb(34, 197, 94)',
                  borderWidth: 1,
                },
                {
                  type: 'bar' as const,
                  label: t('cashFlowOutflow'),
                  data: cashFlow.projections.slice(0, Math.min(days, 30)).map(p => -p.expectedOutflow),
                  backgroundColor: 'rgba(239, 68, 68, 0.7)',
                  borderColor: 'rgb(239, 68, 68)',
                  borderWidth: 1,
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              interaction: {
                mode: 'index',
                intersect: false,
              },
              plugins: {
                legend: {
                  display: true,
                  position: 'top',
                  labels: {
                    usePointStyle: true,
                    padding: 15
                  }
                },
                tooltip: {
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  padding: 12,
                  titleColor: '#fff',
                  bodyColor: '#fff',
                  callbacks: {
                    label: (context) => {
                      const index = context.dataIndex
                      const projection = cashFlow.projections[index]
                      if (context.dataset.label === t('cashFlowCumulativeCash')) {
                        return `${t('cashFlowCumulative')}: $${projection.cumulativeCash.toFixed(2)}`
                      } else if (context.dataset.label === t('cashFlowInflow')) {
                        return `${t('cashFlowInflow')}: $${projection.expectedInflow.toFixed(2)}`
                      } else {
                        return `${t('cashFlowOutflow')}: $${projection.expectedOutflow.toFixed(2)}`
                      }
                    },
                    afterBody: (context) => {
                      if (context[0]) {
                        const index = context[0].dataIndex
                        const projection = cashFlow.projections[index]
                        const net = projection.netCashFlow
                        return `${t('cashFlowNet')}: ${net >= 0 ? '+' : ''}$${net.toFixed(2)}`
                      }
                      return ''
                    }
                  }
                }
              },
              scales: {
                y: {
                  type: 'linear' as const,
                  display: true,
                  position: 'left' as const,
                  beginAtZero: true,
                  ticks: {
                    callback: (value) => '$' + Math.abs(Number(value))
                  },
                  grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                  }
                },
                y1: {
                  type: 'linear' as const,
                  display: true,
                  position: 'right' as const,
                  beginAtZero: true,
                  grid: {
                    drawOnChartArea: false,
                  },
                  ticks: {
                    callback: (value) => '$' + value
                  }
                },
                x: {
                  stacked: false,
                  grid: {
                    display: false
                  }
                }
              }
            }}
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
          <p className="text-xs text-green-600 dark:text-green-400 mb-1">{t('cashFlowTotalInflow')}</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            ${totalInflow.toFixed(0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">${(totalInflow / days).toFixed(0)}/{t('cashFlowPerDay')}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
          <p className="text-xs text-red-600 dark:text-red-400 mb-1">{t('cashFlowTotalOutflow')}</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            ${totalOutflow.toFixed(0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">${(totalOutflow / days).toFixed(0)}/{t('cashFlowPerDay')}</p>
        </div>
        <div className={`rounded-lg p-4 text-center ${
          netPosition >= 0 
            ? 'bg-blue-50 dark:bg-blue-900/20' 
            : 'bg-amber-50 dark:bg-amber-900/20'
        }`}>
          <p className={`text-xs mb-1 ${
            netPosition >= 0 
              ? 'text-blue-600 dark:text-blue-400' 
              : 'text-amber-600 dark:text-amber-400'
          }`}>{t('cashFlowNetPosition')}</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {netPosition >= 0 ? '+' : ''}${netPosition.toFixed(0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">{netPosition >= 0 ? t('cashFlowPositive') : t('cashFlowNegative')}</p>
        </div>
      </div>

      {/* Detailed Daily Breakdown - Collapsible */}
      <details className="group">
        <summary className="cursor-pointer list-none">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 via-blue-50 to-red-50 dark:from-green-900/20 dark:via-blue-900/20 dark:to-red-900/20 rounded-lg hover:from-green-100 hover:via-blue-100 hover:to-red-100 dark:hover:from-green-900/30 dark:hover:via-blue-900/30 dark:hover:to-red-900/30 transition-all border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-green-500 to-red-500 p-2 rounded-lg">
                <DollarSign size={16} className="text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white">{t('cashFlowDailyBreakdown')}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">{t('cashFlowDailyBreakdownSubtitle')}</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-slate-600 dark:text-slate-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </summary>
        
        <div className="mt-4">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-slate-100 dark:bg-slate-700/50 rounded-t-lg border-b border-slate-200 dark:border-slate-600">
            <div className="col-span-2 text-xs font-medium text-slate-600 dark:text-slate-400">{t('forecastDate')}</div>
            <div className="col-span-6 text-xs font-medium text-slate-600 dark:text-slate-400">{t('cashFlowCashFlow')}</div>
            <div className="col-span-2 text-xs font-medium text-slate-600 dark:text-slate-400 text-right">{t('cashFlowNet')}</div>
            <div className="col-span-2 text-xs font-medium text-slate-600 dark:text-slate-400 text-right">{t('cashFlowCumulative')}</div>
          </div>

          {/* Scrollable Data Rows */}
          <div className="max-h-96 overflow-y-auto border-x border-b border-slate-200 dark:border-slate-700 rounded-b-lg">
            {cashFlow.projections.slice(0, Math.min(days, 30)).map((projection, index) => {
              const maxValue = Math.max(
                ...cashFlow.projections.map(p => Math.max(p.expectedInflow, p.expectedOutflow))
              )
              const inflowPercentage = (projection.expectedInflow / maxValue) * 100
              const outflowPercentage = (projection.expectedOutflow / maxValue) * 100
              const isPositive = projection.netCashFlow >= 0

              const prevProjection = index > 0 ? cashFlow.projections[index - 1] : null
              const cumulativeChange = prevProjection 
                ? projection.cumulativeCash - prevProjection.cumulativeCash 
                : projection.cumulativeCash

              return (
                <div 
                  key={index} 
                  className="group/row hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                >
                  <div className="grid grid-cols-12 gap-3 px-4 py-3 items-center">
                    {/* Date Column */}
                    <div className="col-span-2">
                      <div className="text-xs font-medium text-slate-900 dark:text-white">
                        {new Date(projection.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(projection.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                    </div>
                    
                    {/* Visual Bars Column */}
                    <div className="col-span-6 space-y-1.5">
                      {/* Inflow Bar */}
                      <div className="relative h-6">
                        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                        <div 
                          className="absolute left-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full h-6 flex items-center justify-end pr-2 transition-all group-hover/row:shadow-md"
                          style={{ width: `${inflowPercentage}%`, minWidth: '60px' }}
                        >
                          <span className="text-xs font-medium text-white">
                            +${projection.expectedInflow.toFixed(0)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Outflow Bar */}
                      <div className="relative h-6">
                        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                        <div 
                          className="absolute left-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-full h-6 flex items-center justify-end pr-2 transition-all group-hover/row:shadow-md"
                          style={{ width: `${outflowPercentage}%`, minWidth: '60px' }}
                        >
                          <span className="text-xs font-medium text-white">
                            -${projection.expectedOutflow.toFixed(0)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Net Column */}
                    <div className="col-span-2 text-right">
                      <div className={`text-sm font-bold ${
                        isPositive 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {isPositive ? '+' : ''}${projection.netCashFlow.toFixed(0)}
                      </div>
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        {isPositive ? (
                          <TrendingUp size={12} className="text-green-500" />
                        ) : (
                          <TrendingDown size={12} className="text-red-500" />
                        )}
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {isPositive ? t('cashFlowSurplus') : t('cashFlowDeficit')}
                        </span>
                      </div>
                    </div>

                    {/* Cumulative Column */}
                    <div className="col-span-2 text-right">
                      <div className={`text-sm font-bold ${
                        projection.cumulativeCash >= 0 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : 'text-orange-600 dark:text-orange-400'
                      }`}>
                        ${projection.cumulativeCash.toFixed(0)}
                      </div>
                      <div className={`text-xs opacity-0 group-hover/row:opacity-100 transition-opacity ${
                        cumulativeChange >= 0 
                          ? 'text-green-500' 
                          : 'text-red-500'
                      }`}>
                        {cumulativeChange >= 0 ? '↑' : '↓'} {Math.abs(cumulativeChange).toFixed(0)}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details on Hover */}
                  <div className="px-4 pb-3 opacity-0 group-hover/row:opacity-100 transition-opacity max-h-0 group-hover/row:max-h-20 overflow-hidden">
                    <div className="grid grid-cols-3 gap-3 text-xs bg-slate-100 dark:bg-slate-800 rounded-lg p-2">
                      <div className="text-center">
                        <p className="text-slate-500 dark:text-slate-400">{t('cashFlowInflowRate')}</p>
                        <p className="font-medium text-slate-900 dark:text-white">
                          ${(projection.expectedInflow / 1).toFixed(0)}/{t('cashFlowPerDay')}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-500 dark:text-slate-400">{t('cashFlowOutflowRate')}</p>
                        <p className="font-medium text-slate-900 dark:text-white">
                          ${(projection.expectedOutflow / 1).toFixed(0)}/{t('cashFlowPerDay')}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-500 dark:text-slate-400">{t('cashFlowNetMargin')}</p>
                        <p className={`font-medium ${
                          projection.netCashFlow >= 0 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {projection.expectedInflow > 0 
                            ? ((projection.netCashFlow / projection.expectedInflow) * 100).toFixed(1) 
                            : 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary Footer */}
          <div className="mt-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('cashFlowBestDay')}</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  +${Math.max(...cashFlow.projections.map(p => p.netCashFlow)).toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('cashFlowWorstDay')}</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">
                  ${Math.min(...cashFlow.projections.map(p => p.netCashFlow)).toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('cashFlowFinalPosition')}</p>
                <p className={`text-lg font-bold ${
                  cashFlow.projections.at(-1)!.cumulativeCash >= 0
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-orange-600 dark:text-orange-400'
                }`}>
                  ${cashFlow.projections.at(-1)!.cumulativeCash.toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('cashFlowAvgNetFlow')}</p>
                <p className={`text-lg font-bold ${
                  (cashFlow.projections.reduce((sum, p) => sum + p.netCashFlow, 0) / cashFlow.projections.length) >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {((cashFlow.projections.reduce((sum, p) => sum + p.netCashFlow, 0) / cashFlow.projections.length) >= 0 ? '+' : '')}${(cashFlow.projections.reduce((sum, p) => sum + p.netCashFlow, 0) / cashFlow.projections.length).toFixed(0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </details>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-xs text-slate-600 dark:text-slate-400">{t('cashFlowExpectedInflow')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-xs text-slate-600 dark:text-slate-400">{t('cashFlowExpectedOutflow')}</span>
        </div>
      </div>
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
