import React from 'react';
import { DollarSign, TrendingDown, TrendingUp, ShoppingCart, Package, Plus, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TodayStats, ItemSummary, formatCurrency } from '../types';

interface TodayStatsGridProps {
  todayStats: TodayStats | null;
  totalPiecesSold: number;
  itemsSummary: ItemSummary[];
  t: (key: string) => string;
}

const TodayStatsGrid: React.FC<TodayStatsGridProps> = ({
  todayStats,
  totalPiecesSold,
  itemsSummary,
  t
}) => {
  const navigate = useNavigate();

  return (
    <>
      {/* 5-card stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">{t('revenue')}</span>
            <DollarSign size={18} className="text-green-600 dark:text-green-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {todayStats ? formatCurrency(todayStats.revenue) : '$0.00'}
          </p>
          <div className="flex items-center gap-1 mt-1 text-xs text-green-600 dark:text-green-400">
            <ArrowUpRight size={14} />
            <span>{todayStats?.revenueChange || 0}% {t('vsYesterday')}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">{t('expenses')}</span>
            <TrendingDown size={18} className="text-red-600 dark:text-red-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {todayStats ? formatCurrency(todayStats.expenses) : '$0.00'}
          </p>
          <p className="text-xs text-slate-500 mt-1">{todayStats?.expensesCount || 0} {t('transactions')}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">{t('profit')}</span>
            <TrendingUp size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {todayStats ? formatCurrency(todayStats.profit) : '$0.00'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {todayStats && todayStats.revenue > 0
              ? `${((todayStats.profit / todayStats.revenue) * 100).toFixed(1)}% ${t('margin')}`
              : t('noSalesYet')}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">{t('sales')}</span>
            <ShoppingCart size={18} className="text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {todayStats?.salesCount || 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {todayStats && todayStats.salesCount > 0
              ? `${t('avgLabel')}: ${formatCurrency(todayStats.revenue / todayStats.salesCount)}`
              : t('noTransactions')}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border-2 border-primary">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">{t('itemsSold')}</span>
            <Package size={18} className="text-primary" />
          </div>
          <p className="text-2xl font-bold text-primary">{totalPiecesSold}</p>
          <p className="text-xs text-slate-500 mt-1">
            {itemsSummary.length} {itemsSummary.length === 1 ? t('productLabel') : t('productsLabel')}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => navigate('/pos')}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          {t('newSale')}
        </button>
        <button
          onClick={() => navigate('/expenses')}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <Plus size={16} />
          {t('addExpenseButton')}
        </button>
        <button
          onClick={() => navigate('/inventory')}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <Package size={16} />
          {t('manageInventory')}
        </button>
      </div>
    </>
  );
};

export default TodayStatsGrid;
