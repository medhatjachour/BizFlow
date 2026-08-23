import { useState } from 'react'
import { FileText, Download } from 'lucide-react'
import { ReportType } from './types'
import { REPORT_OPTIONS } from './constants'
import { useWarehouseReportData } from './hooks/useWarehouseReportData'
import { useReportGenerator } from './hooks/useReportGenerator'
import { ReportsSkeleton } from './components/ReportsSkeleton'
import { ReportsHero } from './components/ReportsHero'
import { ReportTypeCard } from './components/ReportTypeCard'
import { TodayActivityRibbon } from './components/TodayActivityRibbon'
import { LocationValueChart } from './components/LocationValueChart'
import { CriticalStockWidget } from './components/CriticalStockWidget'

interface Props {
  refreshSignal?: number
}

export default function WarehouseReportSection({ refreshSignal }: Props) {
  const { data, loading, totalValue, chartData, refresh } = useWarehouseReportData(refreshSignal)
  const { generating, compileReport } = useReportGenerator()

  const [reportType, setReportType] = useState<ReportType>('stock')
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )

  const totalUnits = data.allStockItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0)

  if (loading && data.allStockItems.length === 0) {
    return <ReportsSkeleton />
  }

  return (
    <div className="space-y-5">
      {/* 1. Hero Header */}
      <ReportsHero loading={loading} onRefresh={refresh} />

      {/* 2. PDF Report Generator Panel */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Export Audit PDF Manifest
            </h3>
            <p className="text-[11px] text-slate-400">Select target report parameters</p>
          </div>
        </div>

        {/* Report Type Selector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {REPORT_OPTIONS.map(opt => (
            <ReportTypeCard
              key={opt.id}
              config={opt}
              isSelected={reportType === opt.id}
              onSelect={() => setReportType(opt.id)}
            />
          ))}
        </div>

        {/* Date Picker Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 pt-2">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-slate-800 dark:text-slate-100"
            />
          </div>

          <button
            onClick={() => compileReport(reportType, startDate, endDate)}
            disabled={generating}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md active:scale-95 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {generating ? 'Compiling PDF...' : 'Generate PDF Report'}
          </button>
        </div>
      </div>

      {/* 3. Today's Activity Ribbon */}
      <TodayActivityRibbon
        totalLocations={data.locations.length}
        transfersCount={data.todayTransfers.length}
        criticalCount={data.criticalItems.length}
        totalValue={totalValue}
        totalUnits={totalUnits}
      />

      {/* 4. Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <LocationValueChart data={chartData} />
        <CriticalStockWidget items={data.criticalItems} />
      </div>
    </div>
  )
}