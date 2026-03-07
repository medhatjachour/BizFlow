import React from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { ReceiptPreviewModal } from '../Sales/ReceiptPreviewModal';
import { useLanguage } from '../../contexts/LanguageContext';
import { useReports } from './hooks/useReports';
import ReportGenerator from './components/ReportGenerator';
import TodayStatsGrid from './components/TodayStatsGrid';
import ActivityFeed from './components/ActivityFeed';
import QuickInsightsPanel from './components/QuickInsightsPanel';
import ItemsSoldSummary from './components/ItemsSoldSummary';
import ReportPreviewModal from './components/ReportPreviewModal';

const EnhancedReports: React.FC = () => {
  const { t } = useLanguage();
  const {
    loading,
    refreshing,
    todayStats,
    activityFeed,
    reportData,
    showPreview,
    expandedSales,
    expandedProducts,
    itemsSummary,
    itemSearchQuery,
    totalPiecesSold,
    selectedReceipt,
    reportForm,
    reportTypes,
    setShowPreview,
    setReportData,
    setReportForm,
    setExpandedSales,
    setExpandedProducts,
    setItemSearchQuery,
    setSelectedReceipt,
    handleRefresh,
    handleGenerateReport,
    handleExportPDF,
    handleExportCSV
  } = useReports();

  return (
    <div className="p-6 space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('reportsAndAnalytics')}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {t('businessInsights')}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          {t('refresh')}
        </button>
      </div>

      {/* Generate Reports */}
      <ReportGenerator
        reportForm={reportForm}
        setReportForm={setReportForm}
        loading={loading}
        handleGenerateReport={handleGenerateReport}
        reportTypes={reportTypes}
        t={t}
      />

      {/* Today's Activity */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 p-6 rounded-xl border border-primary/20">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={24} className="text-primary" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('todaysActivity')}</h2>
          <span className="px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-medium flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
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

      {/* Activity Feed & Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ActivityFeed
          activityFeed={activityFeed}
          expandedSales={expandedSales}
          setExpandedSales={setExpandedSales}
          totalPiecesSold={totalPiecesSold}
          setSelectedReceipt={setSelectedReceipt}
          t={t}
        />
        <QuickInsightsPanel todayStats={todayStats} t={t} />
      </div>

      {/* Items Sold Summary */}
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

      {/* Report Preview Modal */}
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

      {/* Receipt Preview Modal */}
      {selectedReceipt && (
        <ReceiptPreviewModal
          transaction={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
};

export default EnhancedReports;
