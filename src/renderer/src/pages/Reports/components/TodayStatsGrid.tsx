import React from 'react';
import { DollarSign, TrendingDown, TrendingUp, ShoppingCart, Package, Plus, ArrowUpRight, HelpCircle, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TodayStats, ItemSummary, formatCurrency } from '../types';

/** Small (i) icon that shows a tooltip on hover */
const InfoTip: React.FC<{ text: string }> = ({ text }) => (
  <div className="relative group ml-1 inline-flex items-center">
    <HelpCircle size={13} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help flex-shrink-0" />
    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none leading-relaxed">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-700" />
    </div>
  </div>
);

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

      {/* 6-card stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {/* Revenue */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <span className="text-sm text-slate-600 dark:text-slate-400">{t('revenue')}</span>
              <InfoTip text="Net sales revenue excluding tax. Tax is collected on behalf of the government and is not business income. Formula: Σ(transaction subtotals) − refunded amounts." />
            </div>
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

        {/* Expenses */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <span className="text-sm text-slate-600 dark:text-slate-400">{t('expenses')}</span>
              <InfoTip text="Total outflows today. Includes COGS (cost of goods sold based on product purchase cost) plus any manually recorded operational expenses like rent or salaries." />
            </div>
            <TrendingDown size={18} className="text-red-600 dark:text-red-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {todayStats ? formatCurrency((todayStats.cogs || 0) + (todayStats.expenses || 0)) : '$0.00'}
          </p>
          <div className="flex flex-col gap-0.5 mt-1">
            <p className="text-xs text-slate-500">{formatCurrency(todayStats?.expenses || 0)} — {todayStats?.expensesCount || 0} {t('transactions')}</p>
            <p className="text-xs text-slate-500">{formatCurrency(todayStats?.cogs || 0)} COGS</p>
          </div>
        </div>

        {/* Profit */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <span className="text-sm text-slate-600 dark:text-slate-400">{t('profit')}</span>
              <InfoTip text="Net profit = Revenue (excl. tax) − COGS − Operational Expenses. Tax is excluded because it is not business income." />
            </div>
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

        {/* Cash in Safe */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-emerald-200 dark:border-emerald-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <span className="text-sm text-slate-600 dark:text-slate-400">Cash in Safe</span>
              <InfoTip text="Estimated cash on hand = total cash collected today (including tax) minus operational expenses paid out. Tax collected is included because it physically sits in the register until remitted." />
            </div>
            <Wallet size={18} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {todayStats ? formatCurrency(todayStats.cashInSafe) : '$0.00'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Revenue − cash expenses</p>
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
