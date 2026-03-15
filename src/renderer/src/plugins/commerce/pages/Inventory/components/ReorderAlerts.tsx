import { useState, useEffect } from 'react';
import { AlertTriangle, Package, TrendingDown, Clock, RefreshCw, ShoppingCart } from 'lucide-react';
import { useToast } from '@renderer/contexts/ToastContext';
import logger from '@/shared/utils/logger'

interface ReorderAlert {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  currentStock: number;
  reorderPoint: number;
  suggestedOrderQty: number;
  daysToDepletion: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  lastSoldDate?: Date;
  avgDailySales: number;
  supplierInfo?: {
    supplierName: string;
    cost: number;
    leadTime: number;
  };
}

interface ReorderAnalysis {
  alerts: ReorderAlert[];
  summary: {
    totalAlerts: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
}

interface PrefilledPurchaseOrder {
  productId: string
  variantId: string
  productName: string
  variantName: string
  suggestedQty: number
  supplierInfo?: {
    supplierId?: string
    supplierName: string
    cost: number
    leadTime: number
  }
}

interface ReorderAlertsProps {
  onCreatePurchaseOrder?: (data: PrefilledPurchaseOrder) => void
}

export default function ReorderAlerts({ onCreatePurchaseOrder }: ReorderAlertsProps) {
  const [analysis, setAnalysis] = useState<ReorderAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('all');
  const { showToast } = useToast();

  useEffect(() => {
    loadReorderAlerts();
  }, []);

  const loadReorderAlerts = async () => {
    try {
      setLoading(true);
      const result = await window.electron.ipcRenderer.invoke('reorder:getAlerts');
      if (result.success) {
        setAnalysis(result.data);
      } else {
        showToast('error', result.error || 'Failed to load reorder alerts');
      }
    } catch (error) {
      logger.error('Error loading reorder alerts:', error);
      showToast('error', 'Failed to load reorder alerts');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'LOW': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return '🚨';
      case 'HIGH': return '⚠️';
      case 'MEDIUM': return '🔔';
      case 'LOW': return 'ℹ️';
      default: return '📦';
    }
  };

  const filteredAlerts = analysis?.alerts.filter(alert =>
    filter === 'all' || alert.priority === filter
  ) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Analyzing inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Reorder Alerts
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Products that need restocking based on current inventory levels
          </p>
        </div>
        <button
          onClick={loadReorderAlerts}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-red-500" size={20} />
              <span className="font-medium text-slate-900 dark:text-white">Critical</span>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">{analysis.summary.criticalCount}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-orange-500" size={20} />
              <span className="font-medium text-slate-900 dark:text-white">High</span>
            </div>
            <p className="text-2xl font-bold text-orange-600 mt-2">{analysis.summary.highCount}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-yellow-500" size={20} />
              <span className="font-medium text-slate-900 dark:text-white">Medium</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600 mt-2">{analysis.summary.mediumCount}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-blue-500" size={20} />
              <span className="font-medium text-slate-900 dark:text-white">Low</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-2">{analysis.summary.lowCount}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <Package className="text-slate-500" size={20} />
              <span className="font-medium text-slate-900 dark:text-white">Total</span>
            </div>
            <p className="text-2xl font-bold text-slate-600 mt-2">{analysis.summary.totalAlerts}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            filter === 'all'
              ? 'bg-primary text-white'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
          }`}
        >
          All ({analysis?.summary.totalAlerts || 0})
        </button>
        <button
          onClick={() => setFilter('CRITICAL')}
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            filter === 'CRITICAL'
              ? 'bg-red-600 text-white'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}
        >
          Critical ({analysis?.summary.criticalCount || 0})
        </button>
        <button
          onClick={() => setFilter('HIGH')}
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            filter === 'HIGH'
              ? 'bg-orange-600 text-white'
              : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
          }`}
        >
          High ({analysis?.summary.highCount || 0})
        </button>
        <button
          onClick={() => setFilter('MEDIUM')}
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            filter === 'MEDIUM'
              ? 'bg-yellow-600 text-white'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
          }`}
        >
          Medium ({analysis?.summary.mediumCount || 0})
        </button>
        <button
          onClick={() => setFilter('LOW')}
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            filter === 'LOW'
              ? 'bg-blue-600 text-white'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
          }`}
        >
          Low ({analysis?.summary.lowCount || 0})
        </button>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              No reorder alerts
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              All products are above their reorder points.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={`${alert.productId}-${alert.variantId}`}
              className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{getPriorityIcon(alert.priority)}</span>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {alert.productName}
                    </h3>
                    {alert.variantName !== 'Default' && (
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        ({alert.variantName})
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(alert.priority)}`}>
                      {alert.priority}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-slate-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Current Stock: <span className="font-medium text-slate-900 dark:text-white">{alert.currentStock}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingDown size={16} className="text-slate-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Reorder Point: <span className="font-medium text-slate-900 dark:text-white">{alert.reorderPoint}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-slate-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Days to Depletion: <span className="font-medium text-slate-900 dark:text-white">{alert.daysToDepletion}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShoppingCart size={16} className="text-slate-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Suggested Order: <span className="font-medium text-slate-900 dark:text-white">{alert.suggestedOrderQty}</span>
                      </span>
                    </div>
                  </div>

                  {alert.supplierInfo && (
                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                      <span>Supplier: <span className="font-medium">{alert.supplierInfo.supplierName}</span></span>
                      <span>Cost: <span className="font-medium">${alert.supplierInfo.cost.toFixed(2)}</span></span>
                      <span>Lead Time: <span className="font-medium">{alert.supplierInfo.leadTime} days</span></span>
                    </div>
                  )}
                </div>

                <div className="ml-4">
                  <button 
                    onClick={() => {
                      if (onCreatePurchaseOrder) {
                        onCreatePurchaseOrder({
                          productId: alert.productId,
                          variantId: alert.variantId,
                          productName: alert.productName,
                          variantName: alert.variantName,
                          suggestedQty: alert.suggestedOrderQty,
                          supplierInfo: alert.supplierInfo ? {
                            supplierName: alert.supplierInfo.supplierName,
                            cost: alert.supplierInfo.cost,
                            leadTime: alert.supplierInfo.leadTime
                          } : undefined
                        })
                      }
                    }}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95 font-medium flex items-center gap-2"
                  >
                    <ShoppingCart size={16} />
                    Create Order
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}