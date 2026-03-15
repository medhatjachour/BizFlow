import React from 'react';
import { Receipt, ShoppingCart, TrendingUp, TrendingDown, Minus, Star } from 'lucide-react';
import { TodayStats, ItemSummary, formatCurrency } from '../types';
import type { TrendsResult } from '../../../hooks/useDashboardWorker';

interface QuickInsightsPanelProps {
  todayStats: TodayStats | null;
  itemsSummary: ItemSummary[];
  trendResult: TrendsResult | null;
  t: (key: string) => string;
}

const QuickInsightsPanel: React.FC<QuickInsightsPanelProps> = ({ todayStats, itemsSummary, trendResult, t }) => {
  const topProduct = itemsSummary[0];
  const margin = todayStats && todayStats.revenue > 0
    ? ((todayStats.profit / todayStats.revenue) * 100).toFixed(1)
    : null;

  return (
    <div className="space-y-4">
      {/* Expenses */}
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
        {todayStats && todayStats.cogs > 0 && (
          <p className="text-xs text-red-500/70 mt-1">+{formatCurrency(todayStats.cogs)} COGS</p>
        )}
      </div>

      {/* Sales + week trend */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-5 rounded-xl shadow-sm border-2 border-green-200 dark:border-green-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-green-600 dark:text-green-400" />
            <h4 className="font-bold text-slate-900 dark:text-white">{t('todaysSales')}</h4>
          </div>
          {trendResult && (
            <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
              trendResult.trend === 'up'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : trendResult.trend === 'down'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}>
              {trendResult.trend === 'up' ? <TrendingUp size={11} /> : trendResult.trend === 'down' ? <TrendingDown size={11} /> : <Minus size={11} />}
              {trendResult.change >= 0 ? '+' : ''}{trendResult.change.toFixed(0)}% 7d
            </span>
          )}
        </div>
        <p className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">
          {todayStats?.salesCount || 0}
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
          📦 {t('transactionsCompleted')}
        </p>
        {todayStats && todayStats.salesCount > 0 && (
          <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">
            Avg {formatCurrency(todayStats.revenue / todayStats.salesCount)} / order
          </p>
        )}
      </div>

      {/* Profit */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-xl shadow-sm border-2 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={20} className="text-blue-600 dark:text-blue-400" />
          <h4 className="font-bold text-slate-900 dark:text-white">{t('todaysProfit')}</h4>
        </div>
        <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
          {todayStats ? formatCurrency(todayStats.profit) : '$0.00'}
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
          💰 {margin ? `${margin}% ${t('margin')}` : t('noSalesYet')}
        </p>
      </div>

      {/* Top Product */}
      {topProduct && (
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 p-5 rounded-xl shadow-sm border-2 border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-3">
            <Star size={20} className="text-amber-600 dark:text-amber-400" />
            <h4 className="font-bold text-slate-900 dark:text-white">Top Seller</h4>
          </div>
          <p className="text-lg font-bold text-amber-700 dark:text-amber-400 mb-1 truncate">{topProduct.productName}</p>
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-600 dark:text-slate-400">{topProduct.totalQuantity} units sold</p>
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(topProduct.revenue)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickInsightsPanel;
