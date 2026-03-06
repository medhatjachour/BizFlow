import React from 'react';
import { Receipt, ShoppingCart, TrendingUp } from 'lucide-react';
import { TodayStats, formatCurrency } from '../types';

interface QuickInsightsPanelProps {
  todayStats: TodayStats | null;
  t: (key: string) => string;
}

const QuickInsightsPanel: React.FC<QuickInsightsPanelProps> = ({ todayStats, t }) => {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 p-5 rounded-xl shadow-sm border-2 border-red-200 dark:border-red-800">
        <div className="flex items-center gap-2 mb-3">
          <Receipt size={20} className="text-red-600 dark:text-red-400" />
          <h4 className="font-bold text-slate-900 dark:text-white">{t('todaysExpenses')}</h4>
        </div>
        <p className="text-4xl font-bold text-red-600 dark:text-red-400 mb-2">
          {todayStats ? formatCurrency(todayStats.expenses) : '$0.00'}
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
          💸 {todayStats?.expensesCount || 0} {t('transactions')}
        </p>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-5 rounded-xl shadow-sm border-2 border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingCart size={20} className="text-green-600 dark:text-green-400" />
          <h4 className="font-bold text-slate-900 dark:text-white">{t('todaysSales')}</h4>
        </div>
        <p className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">
          {todayStats?.salesCount || 0}
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
          📦 {t('transactionsCompleted')}
        </p>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-xl shadow-sm border-2 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={20} className="text-blue-600 dark:text-blue-400" />
          <h4 className="font-bold text-slate-900 dark:text-white">{t('todaysProfit')}</h4>
        </div>
        <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
          {todayStats ? formatCurrency(todayStats.profit) : '$0.00'}
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
          💰 {todayStats && todayStats.revenue > 0
            ? `${((todayStats.profit / todayStats.revenue) * 100).toFixed(1)}% ${t('margin')}`
            : t('noSalesYet')}
        </p>
      </div>
    </div>
  );
};

export default QuickInsightsPanel;
