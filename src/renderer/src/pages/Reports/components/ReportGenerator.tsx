import React from 'react';
import { FileText, BarChart3 } from 'lucide-react';
import { ReportFormState, ReportType } from '../types';

interface ReportGeneratorProps {
  reportForm: ReportFormState;
  setReportForm: React.Dispatch<React.SetStateAction<ReportFormState>>;
  loading: boolean;
  handleGenerateReport: () => void;
  reportTypes: ReportType[];
  t: (key: string) => string;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  reportForm,
  setReportForm,
  loading,
  handleGenerateReport,
  reportTypes,
  t
}) => {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-xl p-6 shadow-lg border border-blue-200 dark:border-slate-600">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary rounded-xl shadow-md">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('generateReport')}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('reportSelectType')}</p>
        </div>
      </div>

      {/* Report Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          const isActive = reportForm.reportType === report.id;
          return (
            <button
              key={report.id}
              onClick={() => setReportForm({ ...reportForm, reportType: report.id as ReportFormState['reportType'] })}
              className={`p-4 rounded-xl font-medium transition-all transform hover:scale-105 ${
                isActive
                  ? 'bg-primary text-white shadow-xl ring-4 ring-primary/30'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:shadow-lg border border-slate-200 dark:border-slate-600'
              }`}
            >
              <Icon size={24} className={`mx-auto mb-2 ${isActive ? 'text-white' : report.color}`} />
              <p className="font-semibold">{report.title}</p>
            </button>
          );
        })}
      </div>

      {/* Date Range & Generate */}
      {reportForm.reportType && (
        <div className="flex flex-wrap items-end gap-4 p-5 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-600">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              📅 {t('startDate')}
            </label>
            <input
              type="date"
              value={reportForm.startDate}
              onChange={(e) => setReportForm({ ...reportForm, startDate: e.target.value })}
              className="w-full px-4 py-2.5 border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              📅 {t('endDate')}
            </label>
            <input
              type="date"
              value={reportForm.endDate}
              onChange={(e) => setReportForm({ ...reportForm, endDate: e.target.value })}
              className="w-full px-4 py-2.5 border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            />
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={loading}
            className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
          >
            <BarChart3 size={20} />
            {loading ? t('generating') : t('generateReportButton')}
          </button>
        </div>
      )}
    </div>
  );
};

export default ReportGenerator;
