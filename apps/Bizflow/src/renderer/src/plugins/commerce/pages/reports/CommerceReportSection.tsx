/**
 * CommerceReportSection
 *
 * Self-contained report section for the Commerce plugin.
 * Includes: Generate Report (Sales / Inventory / Financial / Customer)
 *           + Today's Activity (stats grid, activity feed, trend + heatmap)
 */

import { Activity } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { ReceiptPreviewModal } from '../Sales/components/ReceiptPreviewModal'
import ReportPreviewModal from '@renderer/pages/Reports/components/ReportPreviewModal'
import ItemsSoldSummary from '@renderer/pages/Reports/components/ItemsSoldSummary'
import QuickInsightsPanel from '@renderer/pages/Reports/components/QuickInsightsPanel'
import ActivityFeed from '@renderer/pages/Reports/components/ActivityFeed'
import SalesHeatmapPanel from '@renderer/pages/Reports/components/SalesHeatmapPanel'
import RevenueTrendPanel from '@renderer/pages/Reports/components/RevenueTrendPanel'
import TodayStatsGrid from '@renderer/pages/Reports/components/TodayStatsGrid'

import { useTodayActivity } from './hooks/useTodayActivity'
import { useWeeklyTrend } from './hooks/useWeeklyTrend'
import { useReportGeneration } from './hooks/useReportGeneration'
import { GenerateReportPanel } from './components/GenerateReportPanel'

interface Props {
  refreshSignal?: number
}

const CommerceReportSection: React.FC<Props> = ({ refreshSignal }) => {
  const { t } = useLanguage()

  const {
    todayStats,
    activityFeed,
    itemsSummary,
    totalPiecesSold,
    heatmapResult,
    loading: loadingActivity,
    expandedSales,
    setExpandedSales,
    expandedProducts,
    setExpandedProducts,
    itemSearchQuery,
    setItemSearchQuery,
    selectedReceipt,
    setSelectedReceipt,
    patchRevenueChange,
  } = useTodayActivity({ refreshSignal })

  const { weeklyData, trendResult, loading: loadingTrend } = useWeeklyTrend({
    refreshSignal,
    onTrendReady: patchRevenueChange,
  })

  const {
    reportForm,
    setReportForm,
    generating,
    reportData,
    setReportData,
    showPreview,
    setShowPreview,
    reportTypes,
    handleGenerateReport,
    handleExportPDF,
    handleExportCSV,
  } = useReportGeneration()

  const loading = loadingActivity || loadingTrend

  return (
    <div className="space-y-6">
      {/* Generate Report */}
      <GenerateReportPanel
        reportTypes={reportTypes}
        reportForm={reportForm}
        generating={generating}
        onReportTypeChange={(id) =>
          setReportForm((f) => ({ ...f, reportType: id }))
        }
        onStartDateChange={(value) =>
          setReportForm((f) => ({ ...f, startDate: value }))
        }
        onEndDateChange={(value) =>
          setReportForm((f) => ({ ...f, endDate: value }))
        }
        onGenerate={handleGenerateReport}
      />

      {/* Today's Activity */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 p-6 rounded-xl border border-primary/20">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={22} className="text-primary" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {t('todaysActivity')}
          </h3>
          <span className="px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            {t('live')}
          </span>
        </div>
        <TodayStatsGrid
          todayStats={todayStats}
          totalPiecesSold={totalPiecesSold}
          itemsSummary={itemsSummary}
          t={t}
        />
      </div>

      {/* Trend + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueTrendPanel
          weeklyData={weeklyData}
          trendResult={trendResult}
          loading={loading}
        />
        <SalesHeatmapPanel heatmapResult={heatmapResult} />
      </div>

      {/* Activity Feed + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ActivityFeed
          activityFeed={activityFeed}
          expandedSales={expandedSales}
          setExpandedSales={setExpandedSales}
          totalPiecesSold={totalPiecesSold}
          setSelectedReceipt={setSelectedReceipt}
          t={t}
        />
        <QuickInsightsPanel
          todayStats={todayStats}
          itemsSummary={itemsSummary}
          trendResult={trendResult}
          t={t}
        />
      </div>

      {/* Items Sold */}
      {itemsSummary.length > 0 && (
        <ItemsSoldSummary
          itemsSummary={itemsSummary}
          totalPiecesSold={totalPiecesSold}
          expandedProducts={expandedProducts}
          setExpandedProducts={setExpandedProducts}
          itemSearchQuery={itemSearchQuery}
          setItemSearchQuery={setItemSearchQuery}
        />
      )}

      {/* Modals */}
      {showPreview && reportData && (
        <ReportPreviewModal
          showPreview={showPreview}
          reportData={reportData}
          reportForm={reportForm}
          setShowPreview={setShowPreview}
          setReportData={setReportData}
          setReportForm={setReportForm}
          handleExportPDF={handleExportPDF}
          handleExportCSV={handleExportCSV}
          reportTypes={reportTypes}
          t={t}
        />
      )}

      {selectedReceipt && (
        <ReceiptPreviewModal
          transaction={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  )
}

export default CommerceReportSection