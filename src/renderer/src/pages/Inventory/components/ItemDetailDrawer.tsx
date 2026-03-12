/**
 * ItemDetailDrawer Component
 * Slide-out drawer showing detailed product information
 * Enhanced with optimistic updates for delete operations
 */

import { useState, useEffect } from 'react'
import { X, Edit, RefreshCw, Package, DollarSign, Calendar, History, Image as ImageIcon, AlertCircle } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { useLanguage } from '../../../contexts/LanguageContext'
import { InventoryItem, StockMovement } from '@/shared/types'
import logger from '../../../../../shared/utils/logger'

interface Props {
  item: InventoryItem
  onClose: () => void
  onRefresh: () => void
  onDelete?: (id: string) => Promise<void>
  isDeleting?: boolean
  onAdjustStock?: (variantId: string, productName: string, variantLabel: string, currentStock: number) => void
}

export default function ItemDetailDrawer({ item, onClose, onRefresh, onAdjustStock }: Props) {
  const { t } = useLanguage()
  const { canEdit } = useAuth()
  const [stockHistory, setStockHistory] = useState<StockMovement[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [imageLoading, setImageLoading] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadStockHistory()
    // Reset image state when item changes
    setImageErrors(new Set())
    setImageLoading(new Set(item.images?.map(img => img.id?.toString() || '') || []))
  }, [item.id])

  const loadStockHistory = async () => {
    try {
      setLoadingHistory(true)
      
      // Get stock movements for all variants of this product
      const allMovements: any[] = []
      
      if (item.variants && item.variants.length > 0) {
        for (const variant of item.variants) {
          try {
            // @ts-ignore
            const movements = await window.api?.analytics?.getStockMovementHistory(variant.id, {
              limit: 50
            })
            
            if (movements && movements.length > 0) {
              // Add variant info to each movement
              allMovements.push(...movements.map((m: any) => ({
                ...m,
                variantInfo: {
                  attributeValues: variant.attributeValues,
                  sku: variant.sku
                }
              })))
            }
          } catch (err) {
            logger.warn(`Failed to load movements for variant ${variant.id}:`, err)
          }
        }
      }
      
      // Sort by date (newest first)
      allMovements.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      
      setStockHistory(allMovements)
    } catch (error) {
      logger.error('Error loading stock history:', error)
      setStockHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleImageLoad = (imageId: string) => {
    setImageLoading(prev => {
      const next = new Set(prev)
      next.delete(imageId)
      return next
    })
  }

  const handleImageError = (imageId: string) => {
    logger.warn(`Failed to load image: ${imageId}`)
    setImageErrors(prev => new Set(prev).add(imageId))
    setImageLoading(prev => {
      const next = new Set(prev)
      next.delete(imageId)
      return next
    })
  }

  const handleEdit = () => {
    // Navigate to products page with edit mode
    window.location.hash = `/products?edit=${item.id}`
    onClose()
  }

  const handleRefresh = async () => {
    // Refresh inventory list
    onRefresh()
    // Reload stock movement history for this item
    await loadStockHistory()
  }

  return (
    <div 
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-end animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      onClick={(e) => {
        // Close drawer when clicking backdrop
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={(e) => {
        // Close drawer on Escape key
        if (e.key === 'Escape') onClose()
      }}
    >
      {/* Drawer */}
      <div 
        className="w-full max-w-2xl h-full bg-white dark:bg-slate-800 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary to-secondary p-6 text-white z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 id="drawer-title" className="text-2xl font-bold mb-1">{item.name}</h2>
              <p className="text-white/80 text-sm">SKU: {item.baseSKU}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close item details"
            >
              <X size={24} aria-hidden="true" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2" role="toolbar" aria-label="Item actions">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2 text-sm"
              aria-label={`Refresh ${item.name}`}
            >
              <RefreshCw size={16} aria-hidden="true" />
              {t('refresh')}
            </button>
            {canEdit && (
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2 text-sm"
                aria-label={`Edit ${item.name}`}
              >
                <Edit size={16} aria-hidden="true" />
                {t('edit')}
              </button>
            )}
            {!canEdit && (
              <output className="px-4 py-2 bg-white/10 rounded-lg text-sm text-white/60 italic">
                {t('viewOnly')} • {t('noEditPermissions')}
              </output>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Images */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <ImageIcon size={16} />
              Product Images {item.images?.length > 0 && `(${item.images.length})`}
            </h3>
            {item.images && item.images.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {item.images.map((image, index) => {
                  const imageId = image.id?.toString() || `img-${index}`
                  const hasError = imageErrors.has(imageId)
                  const isLoading = imageLoading.has(imageId)

                  return (
                    <div 
                      key={imageId} 
                      className="relative aspect-square bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden group"
                    >
                      {hasError ? (
                        // Error state - show fallback
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-200 dark:bg-slate-800">
                          <AlertCircle className="text-slate-400 mb-2" size={32} />
                          <p className="text-xs text-slate-500 dark:text-slate-400 text-center px-2">
                            Failed to load
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Loading skeleton */}
                          {isLoading && (
                            <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse" />
                          )}
                          
                          {/* Actual image */}
                          <img 
                            src={image.imageData} 
                            alt={`${item.name} ${index + 1}`} 
                            className={`w-full h-full object-cover transition-all duration-300 ${
                              isLoading ? 'opacity-0' : 'opacity-100 group-hover:scale-110'
                            }`}
                            loading="lazy"
                            onLoad={() => handleImageLoad(imageId)}
                            onError={() => handleImageError(imageId)}
                          />
                          
                          {/* Hover overlay */}
                          {!isLoading && (
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium bg-black/60 px-2 py-1 rounded">
                                Image {index + 1}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-8 text-center border-2 border-dashed border-slate-300 dark:border-slate-700">
                <ImageIcon className="mx-auto mb-2 text-slate-400" size={32} />
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No images available</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Add images in the product edit page</p>
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Category</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{item.category || 'Uncategorized'}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Base Price</p>
                <p className="text-sm font-bold text-primary">${item.basePrice.toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Base Cost</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">${item.baseCost.toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Stock</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{item.totalStock} units</p>
              </div>
            </div>

            {item.description && (
              <div className="mt-4 bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Description</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{item.description}</p>
              </div>
            )}
          </div>

          {/* Financial Summary */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Financial Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={16} className="text-blue-600" />
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Stock Value</p>
                </div>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">${item.stockValue.toFixed(2)}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={16} className="text-success" />
                  <p className="text-xs text-success font-medium">Retail Value</p>
                </div>
                <p className="text-lg font-bold text-green-700 dark:text-green-300">${item.retailValue.toFixed(2)}</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={16} className="text-purple-600" />
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Potential Profit</p>
                </div>
                <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                  ${(item.retailValue - item.stockValue).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Variants */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Variants ({item.variantCount})
            </h3>
            {item.hasVariants && item.variants.length > 0 ? (
              <div className="space-y-2">
                {item.variants.map((variant) => (
                  <div key={variant.id} className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {(variant as any).attributeValues?.map((av: any) => av.value).join(' • ') || variant.sku}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">SKU: {variant.sku}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        variant.stock === 0 
                          ? 'bg-error/20 text-error' 
                          : variant.stock < 10
                          ? 'bg-accent/20 text-accent'
                          : 'bg-success/20 text-success'
                      }`}>
                        {variant.stock} in stock
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-lg font-bold text-primary">${variant.price.toFixed(2)}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {t('value')}: ${(variant.price * variant.stock).toFixed(2)}
                      </span>
                    </div>
                    {canEdit && onAdjustStock && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const variantLabel = (variant as any).attributeValues?.map((av: any) => av.value).join(' • ') || variant.sku
                          onAdjustStock(variant.id, item.name, variantLabel, variant.stock)
                        }}
                        className="mt-2 w-full px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 
                                 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 
                                 rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <Package size={14} />
                        {t('adjustStock')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-6 text-center">
                <Package className="mx-auto mb-2 text-slate-400" size={24} />
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('noVariantsConfigured')}</p>
              </div>
            )}
          </div>

          {/* Stock Movement History - Enhanced */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <History size={18} className="text-slate-600 dark:text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t('stockMovementHistory')}
                </h3>
                {stockHistory.length > 0 && (
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                    {stockHistory.length}
                  </span>
                )}
              </div>
              {stockHistory.length > 0 && (
                <button
                  onClick={loadStockHistory}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  {t('refresh')}
                </button>
              )}
            </div>

            {loadingHistory ? (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mx-auto mb-3"></div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{t('loadingMovementHistory')}</p>
              </div>
            ) : stockHistory.length > 0 ? (
              <div className="space-y-3">
                {/* Summary Stats */}
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {[
                    { type: 'RESTOCK', label: 'Restocks', color: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' },
                    { type: 'SALE', label: 'Sales', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
                    { type: 'ADJUSTMENT', label: 'Adjustments', color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
                    { type: 'SHRINKAGE', label: 'Shrinkage', color: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' },
                    { type: 'RETURN', label: 'Returns', color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' }
                  ].map(stat => {
                    const count = stockHistory.filter((m: any) => m.type === stat.type).length
                    const total = stockHistory
                      .filter((m: any) => m.type === stat.type)
                      .reduce((sum: number, m: any) => sum + Math.abs(m.quantity), 0)
                    
                    return (
                      <div key={stat.type} className={`rounded-lg p-2 border ${stat.color}`}>
                        <p className="text-xs font-medium mb-0.5">{stat.label}</p>
                        <p className="text-lg font-bold">{count}</p>
                        <p className="text-xs opacity-75">{total} units</p>
                      </div>
                    )
                  })}
                </div>

                {/* Movement Timeline */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700 max-h-96 overflow-y-auto">
                  <div className="space-y-3">
                    {stockHistory.map((movement: any, index: number) => {
                      const isIncrease = movement.quantity > 0
                      const typeColors = {
                        RESTOCK: 'bg-green-500',
                        SALE: 'bg-blue-500',
                        ADJUSTMENT: 'bg-purple-500',
                        SHRINKAGE: 'bg-red-500',
                        RETURN: 'bg-amber-500'
                      }
                      const typeColor = typeColors[movement.type as keyof typeof typeColors] || 'bg-slate-500'

                      return (
                        <div key={movement.id} className="relative pl-8 pb-3 last:pb-0">
                          {/* Timeline line */}
                          {index !== stockHistory.length - 1 && (
                            <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                          )}
                          
                          {/* Timeline dot */}
                          <div className={`absolute left-0 top-1 w-6 h-6 rounded-full ${typeColor} flex items-center justify-center shadow-md`}>
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>

                          {/* Movement Card */}
                          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                                    movement.type === 'RESTOCK' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                    movement.type === 'SALE' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                    movement.type === 'ADJUSTMENT' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                                    movement.type === 'SHRINKAGE' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                    'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                  }`}>
                                    {movement.type}
                                  </span>
                                  
                                  {/* Variant Badge */}
                                  {movement.variantInfo && (
                                    <span className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                      {movement.variantInfo.attributeValues?.map((av: any) => av.value).join(' • ') || movement.variantInfo.sku}
                                    </span>
                                  )}
                                </div>

                                {/* Stock Change */}
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-slate-500 dark:text-slate-400 text-xs">Stock:</span>
                                  <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                                    {movement.previousStock}
                                  </span>
                                  <span className="text-slate-400">→</span>
                                  <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                                    {movement.newStock}
                                  </span>
                                  <span className={`text-xs font-bold ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                                    ({isIncrease ? '+' : ''}{movement.quantity})
                                  </span>
                                </div>

                                {/* Notes/Reason */}
                                {(movement.notes || movement.reason) && (
                                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 italic">
                                    "{movement.notes || movement.reason}"
                                  </p>
                                )}

                                {/* User & Date */}
                                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
                                  {movement.user && (
                                    <span className="flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                      {movement.user.fullName || movement.user.username}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Calendar size={12} />
                                    {new Date(movement.createdAt).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>

                                {/* Reference ID (if available) */}
                                {movement.referenceId && (
                                  <div className="mt-2 text-xs text-slate-400 dark:text-slate-600 font-mono">
                                    Ref: {movement.referenceId.substring(0, 8)}...
                                  </div>
                                )}
                              </div>

                              {/* Quantity Badge */}
                              <div className={`ml-3 px-3 py-2 rounded-lg font-bold text-sm ${
                                isIncrease 
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                              }`}>
                                {isIncrease ? '+' : ''}{movement.quantity}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl p-12 text-center border-2 border-dashed border-slate-300 dark:border-slate-700">
                <History className="mx-auto mb-4 text-slate-400" size={48} />
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  No Movement History Yet
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Stock movements will appear here when you:
                </p>
                <div className="inline-flex flex-col items-start gap-2 text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span>Make sales transactions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Restock inventory</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    <span>Make stock adjustments</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Metadata - Enhanced Date Display */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={16} className="text-slate-600 dark:text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Timeline</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Created Date
                </p>
                <p className="text-sm text-slate-900 dark:text-white font-semibold">
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  }) : 'N/A'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {item.createdAt ? new Date(item.createdAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : ''}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  Last Updated
                </p>
                <p className="text-sm text-slate-900 dark:text-white font-semibold">
                  {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  }) : 'N/A'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {item.updatedAt ? new Date(item.updatedAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : ''}
                </p>
              </div>
            </div>
            
            {/* Additional Metadata */}
            <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Product ID</p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-mono break-all">{item.id}</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(item.id)
                    alert('✅ Product ID copied to clipboard')
                  }}
                  className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                  title="Copy ID"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
