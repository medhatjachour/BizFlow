import React from 'react';
import { Package } from 'lucide-react';
import { ItemSummary, formatCurrency } from '../types';

interface ItemsSoldSummaryProps {
  itemsSummary: ItemSummary[];
  totalPiecesSold: number;
  expandedProducts: Set<string>;
  setExpandedProducts: React.Dispatch<React.SetStateAction<Set<string>>>;
  itemSearchQuery: string;
  setItemSearchQuery: (q: string) => void;
}

const ItemsSoldSummary: React.FC<ItemsSoldSummaryProps> = ({
  itemsSummary,
  totalPiecesSold,
  expandedProducts,
  setExpandedProducts,
  itemSearchQuery,
  setItemSearchQuery
}) => {
  const filtered = itemsSummary.filter(item =>
    itemSearchQuery === '' ||
    item.productName.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(itemSearchQuery.toLowerCase())
  );

  const toggleProduct = (productId: string) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      next.has(productId) ? next.delete(productId) : next.add(productId);
      return next;
    });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package size={20} className="text-primary" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Items Sold Today</h3>
          <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
            {itemsSummary.length} Products
          </span>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">{totalPiecesSold}</p>
          <p className="text-xs text-slate-500">Total Pieces</p>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search products..."
          value={itemSearchQuery}
          onChange={(e) => setItemSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filtered.length > 0 ? (
          filtered.map((item, idx) => {
            const isExpanded = expandedProducts.has(item.productId);
            const hasVariants = item.variants && item.variants.length > 1;

            return (
              <div key={item.productId} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <div
                  onClick={() => hasVariants && toggleProduct(item.productId)}
                  className={`flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 ${
                    hasVariants ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700' : ''
                  } transition-colors`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 dark:text-white">{item.productName}</p>
                        {hasVariants && (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                            {item.variants?.length} variants
                          </span>
                        )}
                      </div>
                      {item.category && <p className="text-xs text-slate-500">{item.category}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">×{item.totalQuantity}</p>
                      <p className="text-xs text-slate-500">pieces</p>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="text-sm font-bold text-green-600 dark:text-green-400">{formatCurrency(item.revenue)}</p>
                      <p className="text-xs text-slate-500">revenue</p>
                    </div>
                  </div>
                </div>

                {/* Expanded variants */}
                {isExpanded && hasVariants && (
                  <div className="bg-white dark:bg-slate-800 px-3 pb-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="mt-2 space-y-2">
                      {item.variants?.sort((a, b) => b.quantity - a.quantity).map((variant, vIdx) => (
                        <div key={vIdx} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-700/30 p-2 rounded">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                              {vIdx + 1}
                            </div>
                            <span className="font-medium text-slate-900 dark:text-white">{variant.variantName}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-600 dark:text-slate-400">×{variant.quantity}</span>
                            <span className="font-bold text-green-600 dark:text-green-400 min-w-[60px] text-right">
                              {formatCurrency(variant.revenue)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-slate-500">
            No products found matching &quot;{itemSearchQuery}&quot;
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemsSoldSummary;
