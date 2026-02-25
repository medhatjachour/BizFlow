/**
 * Revenue Forecasting Component
 * 
 * Displays AI-powered revenue predictions with:
 * - 30-day forecast chart
 * - Trend analysis
 * - Confidence intervals
 * - Growth projections
 */

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus, AlertCircle, Calendar, HelpCircle } from 'lucide-react'
import { useLanguage } from '../../../contexts/LanguageContext'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js'
import logger from '../../../../../shared/utils/logger'


// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
)

type ForecastData = {
  predictions: Array<{
    date: string
    predictedRevenue: number
    confidence: number
    lowerBound: number
    upperBound: number
  }>
  trend: 'up' | 'down' | 'stable'
  trendStrength: number
  seasonalityDetected: boolean
  growthRate: number
}

export default function RevenueForecasting() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [forecast, setForecast] = useState<ForecastData | null>(null)
  const [days, setDays] = useState(30)

  useEffect(() => {
    loadForecast()
  }, [days])

  const loadForecast = async () => {
    try {
      setLoading(true)
      // @ts-ignore
      const data = await window.api['forecast:revenue']({ days, historicalDays: 90 })
      setForecast(data)
    } catch (error) {
      logger.error('Error loading forecast:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
          <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (!forecast || forecast.predictions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp size={20} className="text-primary" />
          <h3 className="font-semibold text-slate-900 dark:text-white">{t('forecastRevenueForecast')}</h3>
        </div>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            {t('forecastNotEnoughData')}
          </p>
          <p className="text-sm text-slate-500 mt-2">
            {t('forecastNeedDays')}
          </p>
        </div>
      </div>
    )
  }

  const getTrendIcon = () => {
    switch (forecast.trend) {
      case 'up':
        return <TrendingUp size={20} className="text-green-600" />
      case 'down':
        return <TrendingDown size={20} className="text-red-600" />
      default:
        return <Minus size={20} className="text-slate-600" />
    }
  }

  const getTrendColor = () => {
    switch (forecast.trend) {
      case 'up':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
      case 'down':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
      default:
        return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/20'
    }
  }

  const totalPredictedRevenue = forecast.predictions.reduce((sum, p) => sum + p.predictedRevenue, 0)
  const avgDailyRevenue = totalPredictedRevenue / forecast.predictions.length

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp size={20} className="text-primary" />
          <h3 className="font-semibold text-slate-900 dark:text-white">{t('forecastRevenueForecast')}</h3>
          <Tooltip text={t('forecastTooltip')}>
            <HelpCircle size={16} className="text-slate-400 hover:text-slate-600 cursor-help" />
          </Tooltip>
        </div>
        
        {/* Time Range Selector */}
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
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} className="text-slate-600 dark:text-slate-400" />
            <p className="text-sm text-slate-600 dark:text-slate-400">{t('forecastPeriod')}</p>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{days} {t('cashFlowDays')}</p>
        </div>

        <div className={`rounded-lg p-4 ${getTrendColor()}`}>
          <div className="flex items-center gap-2 mb-2">
            {getTrendIcon()}
            <p className="text-sm">{t('forecastTrend')}</p>
          </div>
          <p className="text-2xl font-bold capitalize">{forecast.trend}</p>
          <p className="text-xs mt-1">{t('forecastStrength')}: {forecast.trendStrength.toFixed(0)}%</p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg p-4">
          <p className="text-sm mb-2">{t('forecastGrowthRate')}</p>
          <p className="text-2xl font-bold">{forecast.growthRate >= 0 ? '+' : ''}{forecast.growthRate.toFixed(1)}%</p>
          <p className="text-xs mt-1">{t('last30Days')}</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg p-4">
          <p className="text-sm mb-2">{t('forecastPredictedRevenue')}</p>
          <p className="text-2xl font-bold">${totalPredictedRevenue.toFixed(0)}</p>
          <p className="text-xs mt-1">${avgDailyRevenue.toFixed(0)}/{t('forecastPerDayAvg')}</p>
        </div>
      </div>

      {/* Seasonality Alert */}
      {forecast.seasonalityDetected && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-200">{t('forecastSeasonalPattern')}</p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {t('forecastSeasonalDescription')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Forecast Chart */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-slate-900 dark:text-white">{t('forecastChartTitle')}</h4>
          <div className="flex items-center gap-2">
            <Tooltip text={t('forecastChartTooltip')}>
              <HelpCircle size={16} className="text-slate-400 hover:text-slate-600 cursor-help" />
            </Tooltip>
          </div>
        </div>
        <div className="h-80">
          {(() => {
            // Calculate optimal Y-axis range based on prediction data
            const predictions = forecast.predictions.slice(0, Math.min(days, 30))
            const allValues = predictions.flatMap(p => [p.lowerBound, p.predictedRevenue, p.upperBound])
            
            const dataMin = Math.min(...allValues)
            const dataMax = Math.max(...allValues)
            const dataRange = dataMax - dataMin
            
            // Calculate Y-axis bounds with smart padding
            let yMin: number, yMax: number
            
            if (dataRange < dataMax * 0.05) {
              // Very flat data - create 20% range around average for better visualization
              const avg = (dataMin + dataMax) / 2
              const artificialRange = avg * 0.2
              yMin = Math.max(0, avg - artificialRange)
              yMax = avg + artificialRange
            } else {
              // Normal data - add 15% padding on each side
              const padding = dataRange * 0.15
              yMin = Math.max(0, dataMin - padding)
              yMax = dataMax + padding
            }
           
            return (
              <Line
                data={{
                  labels: forecast.predictions.slice(0, Math.min(days, 30)).map(p => 
                    new Date(p.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })
                  ),
                  datasets: [
                {
                  label: t('forecastLowerBound'),
                  data: forecast.predictions.slice(0, Math.min(days, 30)).map(p => p.lowerBound),
                  borderColor: 'rgba(59, 130, 246, 0.2)',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  fill: false,
                  tension: 0.4,
                  pointRadius: 0,
                  borderDash: [5, 5],
                  borderWidth: 1,
                },
                {
                  label: t('forecastPredictedRevenue'),
                  data: forecast.predictions.slice(0, Math.min(days, 30)).map(p => p.predictedRevenue),
                  borderColor: 'rgb(59, 130, 246)',
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  fill: '-1',
                  tension: 0.4,
                  pointRadius: 4,
                  pointHoverRadius: 6,
                  pointBackgroundColor: 'rgb(59, 130, 246)',
                  pointBorderColor: '#fff',
                  pointBorderWidth: 2,
                  borderWidth: 3,
                },
                {
                  label: t('forecastUpperBound'),
                  data: forecast.predictions.slice(0, Math.min(days, 30)).map(p => p.upperBound),
                  borderColor: 'rgba(59, 130, 246, 0.2)',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  fill: '-1',
                  tension: 0.4,
                  pointRadius: 0,
                  borderDash: [5, 5],
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
                    padding: 15,
                    filter: (item) => item.text === t('forecastPredictedRevenue')
                  }
                },
                tooltip: {
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  padding: 12,
                  titleColor: '#fff',
                  bodyColor: '#fff',
                  callbacks: {
                    afterLabel: (context) => {
                      const index = context.dataIndex
                      const prediction = forecast.predictions[index]
                      if (context.datasetIndex === 1) { // Predicted Revenue dataset
                        return [
                          `${t('forecastConfidence')}: ${prediction.confidence}%`,
                          `${t('forecastRange')}: $${prediction.lowerBound.toFixed(0)} - $${prediction.upperBound.toFixed(0)}`
                        ]
                      }
                      return ''
                    }
                  }
                }
              },
              scales: {
                y: {
                  min: yMin,
                  max: yMax,
                  ticks: {
                    callback: (value) => {
                      const numValue = Number(value)
                      if (numValue >= 1000000) {
                        return '$' + (numValue / 1000000).toFixed(1) + 'M'
                      } else if (numValue >= 1000) {
                        return '$' + (numValue / 1000).toFixed(1) + 'K'
                      }
                      return '$' + numValue.toFixed(0)
                    }
                  },
                  grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                  }
                },
                x: {
                  grid: {
                    display: false
                  }
                }
              }
            }}
          />
            )
          })()}
        </div>
      </div>

      {/* Quick Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
          <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">{t('forecastPeakDay')}</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            ${Math.max(...forecast.predictions.map(p => p.predictedRevenue)).toFixed(0)}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
          <p className="text-xs text-green-600 dark:text-green-400 mb-1">{t('forecastAverageDaily')}</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            ${avgDailyRevenue.toFixed(0)}
          </p>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
          <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">{t('forecastTotalForecast')}</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            ${totalPredictedRevenue.toFixed(0)}
          </p>
        </div>
      </div>

      {/* Detailed Breakdown - Collapsible */}
      <details className="group">
        <summary className="cursor-pointer list-none">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/30 dark:hover:to-purple-900/30 transition-all border border-blue-100 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 dark:bg-blue-600 p-2 rounded-lg">
                <Calendar size={16} className="text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white">{t('forecastDailyBreakdown')}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {t('forecastDailyBreakdownSubtitle')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Tooltip text={t('forecastDailyBreakdownTooltip')}>
                <HelpCircle size={16} className="text-blue-600 hover:text-blue-700 cursor-help" />
              </Tooltip>
              <svg className="w-5 h-5 text-slate-600 dark:text-slate-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </summary>
        
        <div className="mt-4">
          {/* Info Cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <p className="text-xs font-semibold text-green-700 dark:text-green-400">{t('forecastHighConfidence')}</p>
              </div>
              <p className="text-xs text-green-600 dark:text-green-500">80-100% • {t('forecastMostReliable')}</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">{t('forecastMediumConfidence')}</p>
              </div>
              <p className="text-xs text-yellow-600 dark:text-yellow-500">60-80% • {t('forecastReasonablyAccurate')}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <p className="text-xs font-semibold text-red-700 dark:text-red-400">{t('forecastLowConfidence')}</p>
              </div>
              <p className="text-xs text-red-600 dark:text-red-500">0-60% • {t('forecastHigherUncertainty')}</p>
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-slate-100 dark:bg-slate-700/50 rounded-t-lg border-b border-slate-200 dark:border-slate-600">
            <div className="col-span-2 text-xs font-medium text-slate-600 dark:text-slate-400">{t('forecastDate')}</div>
            <div className="col-span-6 text-xs font-medium text-slate-600 dark:text-slate-400">{t('forecastRevenueForecast')}</div>
            <div className="col-span-2 text-xs font-medium text-slate-600 dark:text-slate-400 text-right">{t('forecastAmount')}</div>
            <div className="col-span-2 text-xs font-medium text-slate-600 dark:text-slate-400 text-right">{t('forecastConfidence')}</div>
          </div>

          {/* Scrollable Data Rows */}
          <div className="max-h-96 overflow-y-auto border-x border-b border-slate-200 dark:border-slate-700 rounded-b-lg">
            {forecast.predictions.slice(0, Math.min(days, 30)).map((prediction, index) => {
              const maxRevenue = Math.max(...forecast.predictions.map(p => p.upperBound))
              const percentage = (prediction.predictedRevenue / maxRevenue) * 100
              const confidenceColor = 
                prediction.confidence > 80 ? 'from-green-500 to-emerald-500' : 
                prediction.confidence > 60 ? 'from-yellow-500 to-amber-500' : 
                'from-red-500 to-orange-500'
              
              const prevPrediction = index > 0 ? forecast.predictions[index - 1] : null
              const dayOverDayChange = prevPrediction 
                ? ((prediction.predictedRevenue - prevPrediction.predictedRevenue) / prevPrediction.predictedRevenue) * 100 
                : 0
              const isGrowth = dayOverDayChange > 0

              return (
                <div 
                  key={index} 
                  className="group/row hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                >
                  <div className="grid grid-cols-12 gap-3 px-4 py-3 items-center">
                    {/* Date Column */}
                    <div className="col-span-2">
                      <div className="text-xs font-medium text-slate-900 dark:text-white">
                        {new Date(prediction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(prediction.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                    </div>
                    
                    {/* Visual Bar Column */}
                    <div className="col-span-6 relative">
                      {/* Uncertainty Range Background */}
                      <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 rounded-full h-10"></div>
                      <div 
                        className="absolute left-0 bg-blue-100 dark:bg-blue-900/30 rounded-full h-10 opacity-40 transition-all"
                        style={{ width: `${(prediction.upperBound / maxRevenue) * 100}%` }}
                      ></div>
                      
                      {/* Predicted Value Bar */}
                      <div 
                        className={`absolute left-0 bg-gradient-to-r ${confidenceColor} rounded-full h-10 transition-all flex items-center justify-between px-3 group-hover/row:shadow-lg`}
                        style={{ width: `${percentage}%`, minWidth: '80px' }}
                      >
                        <div className="flex items-center gap-2">
                          {index > 0 && (
                            <span className={`text-xs font-medium ${isGrowth ? 'text-green-100' : 'text-red-100'}`}>
                              {isGrowth ? '↑' : '↓'} {Math.abs(dayOverDayChange).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Amount Column */}
                    <div className="col-span-2 text-right">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        ${prediction.predictedRevenue.toFixed(0)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        ${prediction.lowerBound.toFixed(0)} - ${prediction.upperBound.toFixed(0)}
                      </div>
                    </div>

                    {/* Confidence Column */}
                    <div className="col-span-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          prediction.confidence > 80 ? 'bg-green-500' : 
                          prediction.confidence > 60 ? 'bg-yellow-500' : 
                          'bg-red-500'
                        } animate-pulse`}></div>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {prediction.confidence}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary Footer */}
          <div className="mt-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('forecastHighestDay')}</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  ${Math.max(...forecast.predictions.map(p => p.predictedRevenue)).toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('forecastLowestDay')}</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  ${Math.min(...forecast.predictions.map(p => p.predictedRevenue)).toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('forecastAvgConfidence')}</p>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {(forecast.predictions.reduce((sum, p) => sum + p.confidence, 0) / forecast.predictions.length).toFixed(0)}%
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
          <span className="text-xs text-slate-600 dark:text-slate-400">{t('forecastHighConfidence')} (&gt;80%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span className="text-xs text-slate-600 dark:text-slate-400">{t('forecastMediumConfidence')} (60-80%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-xs text-slate-600 dark:text-slate-400">{t('forecastLowConfidence')} (&lt;60%)</span>
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
