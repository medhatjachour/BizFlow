import React from 'react';
import { Activity, Clock, Eye } from 'lucide-react';
import { ActivityItem, formatCurrency } from '../types';

interface ActivityFeedProps {
  activityFeed: ActivityItem[];
  expandedSales: Set<string>;
  setExpandedSales: React.Dispatch<React.SetStateAction<Set<string>>>;
  totalPiecesSold: number;
  setSelectedReceipt: (receipt: any) => void;
  t: (key: string) => string;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activityFeed,
  expandedSales,
  setExpandedSales,
  totalPiecesSold,
  setSelectedReceipt,
  t
}) => {
  const toggleSale = (id: string) => {
    setExpandedSales(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('todaysSalesActivity')}</h3>
          <span className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">
            {activityFeed.filter(a => a.type === 'sale').length} {t('salesLabel')}
          </span>
          <span className="text-xs font-bold text-primary">{totalPiecesSold} {t('pieces')}</span>
        </div>
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {activityFeed.length > 0 ? (
          activityFeed.map((activity) => {
            const Icon = activity.icon;
            const isExpanded = expandedSales.has(activity.id);
            const isSale = activity.type === 'sale';

            return (
              <div key={activity.id} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <div
                  onClick={() => isSale && toggleSale(activity.id)}
                  className={`flex items-center gap-3 p-3 ${isSale ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50' : ''} transition-colors`}
                >
                  <div className={`p-2 rounded-lg ${
                    activity.type === 'sale'
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-900 dark:text-white font-medium">{activity.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock size={12} className="text-slate-400" />
                      <span className="text-xs text-slate-500">{activity.time}</span>
                      {isSale && activity.saleData?.items && (
                        <span className="text-xs text-slate-500">
                          • {activity.saleData.items.reduce(
                              (sum: number, item: any) => sum + (item.quantity - (item.refundedQuantity || 0)),
                              0
                            )} {t('items')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activity.amount && (
                      <span className={`text-sm font-bold ${
                        activity.type === 'sale'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {activity.type === 'sale' ? '+' : '-'}{formatCurrency(activity.amount)}
                      </span>
                    )}
                    {isSale && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedReceipt(activity.saleData);
                        }}
                        className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        title={t('viewReceipt')}
                      >
                        <Eye size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded sale items */}
                {isExpanded && isSale && activity.saleData?.items && (
                  <div className="bg-slate-50 dark:bg-slate-700/30 px-3 pb-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="mt-2 space-y-2">
                      {activity.saleData.items.map((item: any, idx: number) => {
                        const netQty = item.quantity - (item.refundedQuantity || 0);
                        if (netQty <= 0) return null;
                        return (
                          <div key={idx} className="flex items-center justify-between text-xs bg-white dark:bg-slate-800 p-2 rounded">
                            <div className="flex-1">
                              <span className="font-medium text-slate-900 dark:text-white">
                                {item.product?.name || t('unknown')}
                              </span>
                              {item.product?.category && (
                                <span className="ml-2 text-slate-500">({item.product.category.name})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-600 dark:text-slate-400">×{netQty}</span>
                              <span className="font-bold text-slate-900 dark:text-white min-w-[60px] text-right">
                                {formatCurrency(item.totalPrice || item.price * netQty)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <Activity size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-400">{t('noActivityToday')}</p>
            <p className="text-sm text-slate-500 mt-1">{t('startSellingMessage')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
