import React from 'react';
import { Printer, FileSpreadsheet } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import { ReportFormState, ReportType, formatCurrency } from '../types';

interface ReportPreviewModalProps {
  showPreview: boolean;
  reportData: any;
  reportForm: ReportFormState;
  setShowPreview: (open: boolean) => void;
  setReportData: (data: any) => void;
  setReportForm: React.Dispatch<React.SetStateAction<ReportFormState>>;
  handleExportPDF: () => void;
  handleExportCSV: () => void;
  reportTypes: ReportType[];
  t: (key: string) => string;
}

const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  showPreview,
  reportData,
  reportForm,
  setShowPreview,
  setReportData,
  setReportForm,
  handleExportPDF,
  handleExportCSV,
  reportTypes,
  t
}) => {
  const reportType = reportTypes.find(r => r.id === reportForm.reportType);

  return (
    <Modal
      isOpen={showPreview}
      onClose={() => {
        setShowPreview(false);
        setReportData(null);
        setReportForm(prev => ({ ...prev, reportType: null }));
      }}
      title={`${reportType?.title} Report`}
    >
      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Date Range */}
        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            📅 {t('period')}:{' '}
            <span className="font-semibold text-slate-900 dark:text-white">
              {new Date(reportForm.startDate).toLocaleDateString()} -{' '}
              {new Date(reportForm.endDate).toLocaleDateString()}
            </span>
          </p>
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 p-6 rounded-lg border border-primary/20">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">📊 {t('summary')}</h3>
          <div className="grid grid-cols-2 gap-4">
            {reportForm.reportType === 'sales' && reportData.summary && (
              <>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('totalRevenue')}</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(reportData.summary.totalRevenue || 0)}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('totalSales')}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {reportData.summary.totalSales || 0}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg col-span-2">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('averageOrderValue')}</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(reportData.summary.averageOrderValue || 0)}
                  </p>
                </div>
              </>
            )}

            {reportForm.reportType === 'inventory' && reportData.summary && (
              <>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('totalValue')}</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(reportData.summary.totalValue || 0)}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('totalProducts')}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {reportData.summary.totalProducts || 0}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('lowStock')}</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {reportData.summary.lowStockCount || 0}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('outOfStock')}</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {reportData.summary.outOfStockCount || 0}
                  </p>
                </div>
              </>
            )}

            {reportForm.reportType === 'financial' && reportData.summary && (
              <>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('totalRevenue')}</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(reportData.summary.totalRevenue || 0)}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('totalExpensesLabel')}</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(reportData.summary.totalExpenses || 0)}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('netProfit')}</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(reportData.summary.netProfit || 0)}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('profitMarginLabel')}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {reportData.summary.profitMargin || 0}%
                  </p>
                </div>
              </>
            )}

            {reportForm.reportType === 'customer' && reportData.summary && (
              <>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('totalCustomers')}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {reportData.summary.totalCustomers || 0}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('totalSpent')}</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(reportData.summary.totalSpent || 0)}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg col-span-2">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('avgPerCustomer')}</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(reportData.summary.averageSpent || 0)}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Detailed Breakdown Table */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">📋 {t('detailedBreakdown')}</h3>
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="max-h-80 overflow-y-auto">
              {reportForm.reportType === 'sales' && reportData.topProducts && (
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">{t('product')}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">{t('quantity')}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">{t('revenue')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {reportData.topProducts.map((p: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{p.name}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{p.quantity}</td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-green-600 dark:text-green-400">{formatCurrency(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportForm.reportType === 'inventory' && reportData.byCategory && (
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">{t('category')}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">{t('products')}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">{t('stock')}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">{t('value')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {Object.entries(reportData.byCategory).map(([category, data]: [string, any], i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{category}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{data.count}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{data.stock}</td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-green-600 dark:text-green-400">{formatCurrency(data.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportForm.reportType === 'financial' && reportData.dailyBreakdown && (
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">{t('date')}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">{t('revenue')}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">{t('expenses')}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">{t('profit')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {reportData.dailyBreakdown.map((d: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{d.date}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-green-600 dark:text-green-400">{formatCurrency(d.revenue)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-red-600 dark:text-red-400">{formatCurrency(d.expenses)}</td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(d.netProfit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {reportForm.reportType === 'customer' && reportData.topCustomers && (
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">{t('customer')}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">{t('loyaltyTierLabel')}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">{t('totalSpent')}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">{t('orders')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {reportData.topCustomers.map((c: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{c.name}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {c.loyaltyTier}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-green-600 dark:text-green-400">{formatCurrency(c.totalSpent)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{c.orderCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleExportPDF}
            className="flex-1 bg-primary text-white px-4 py-3 rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2 font-semibold transition-all transform hover:scale-105"
          >
            <Printer className="w-5 h-5" />
            {t('downloadPDF')}
          </button>
          <button
            onClick={handleExportCSV}
            className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 font-semibold transition-all transform hover:scale-105"
          >
            <FileSpreadsheet className="w-5 h-5" />
            {t('downloadCSV')}
          </button>
          <button
            onClick={() => {
              setShowPreview(false);
              setReportData(null);
            }}
            className="px-6 py-3 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold transition-colors"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ReportPreviewModal;
