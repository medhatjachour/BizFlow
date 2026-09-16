import React from 'react'
import { X, Printer, AlertTriangle } from 'lucide-react'
import { ZReportData } from '../types'
import { formatCurrency } from '../utils'
import { useLanguage } from '@renderer/contexts/LanguageContext'

interface Props {
  isOpen: boolean
  onClose: () => void
  report: ZReportData | null
}

const Row: React.FC<{ label: string; value: string; className?: string }> = ({
  label,
  value,
  className = ''
}) => (
  <div className={`flex justify-between gap-4 ${className}`}>
    <span className="truncate">{label}</span>
    <span className="tabular-nums shrink-0">{value}</span>
  </div>
)

export const ZReportModal: React.FC<Props> = ({ isOpen, onClose, report }) => {
  const { t } = useLanguage()

  if (!isOpen || !report) return null

  const variance = report.variance || 0
  const varianceTone =
    Math.abs(variance) < 0.01
      ? 'text-emerald-600 dark:text-emerald-400'
      : variance > 0
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-rose-600 dark:text-rose-400'

  const varianceLabel =
    Math.abs(variance) < 0.01
      ? t('restZBalanced')
      : variance > 0
        ? t('restZOver', { amount: formatCurrency(variance) })
        : t('restZShort', { amount: formatCurrency(Math.abs(variance)) })

  const hasRevenue = report.ordersCount > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-[95vw] sm:max-w-md p-4 sm:p-6 space-y-4 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        <div className="flex items-start justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="min-w-0">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">{t('restZTitle')}</h3>
            <p className="text-[11px] text-slate-400 font-semibold truncate">
              {t('restZSubtitle', { name: report.shift.serverName })}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t('restZClose')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Paper simulation */}
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 space-y-3">
          <div className="text-center space-y-0.5">
            <h2 className="font-black text-sm uppercase tracking-wide">Z-REPORT</h2>
            <p className="text-[10px] text-slate-400">
              {t('restZShiftId', { id: report.shift.id.slice(0, 8) })}
            </p>
          </div>

          <div className="border-t border-dashed border-slate-300 dark:border-slate-800 pt-2 space-y-0.5 text-[11px]">
            <Row
              label={t('restZOpened')}
              value={new Date(report.shift.openedAt).toLocaleString()}
            />
            {report.shift.closedAt && (
              <Row
                label={t('restZClosed')}
                value={new Date(report.shift.closedAt).toLocaleString()}
              />
            )}
            <Row
              label={t('restZSettledChecks')}
              value={String(report.ordersCount)}
              className="font-bold"
            />
          </div>

          <div className="border-t border-dashed border-slate-300 dark:border-slate-800 pt-2 space-y-1">
            <Row
              label={t('restZGrossSales')}
              value={formatCurrency(report.grossSales)}
              className="font-bold"
            />
            <Row label={t('restZNetSales')} value={formatCurrency(report.netSales)} />
            {report.totalDiscounts > 0 && (
              <Row
                label={t('restZDiscounts')}
                value={`-${formatCurrency(report.totalDiscounts)}`}
                className="text-rose-500"
              />
            )}
            <Row label={t('restZTips')} value={formatCurrency(report.totalTips)} />
            {report.cashTips > 0 && (
              <Row label={`· ${t('restZCashTips')}`} value={formatCurrency(report.cashTips)} />
            )}
            {report.cardTips > 0 && (
              <Row label={`· ${t('restZCardTips')}`} value={formatCurrency(report.cardTips)} />
            )}
          </div>

          <div className="border-t border-dashed border-slate-300 dark:border-slate-800 pt-2 space-y-1">
            <span className="font-bold block text-[10px] uppercase text-slate-400">
              {t('restZTenders')}
            </span>
            {Object.keys(report.paymentBreakdown).length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">{t('restZNoData')}</p>
            ) : (
              Object.entries(report.paymentBreakdown).map(([method, amount]) => (
                <Row key={method} label={method} value={formatCurrency(amount)} />
              ))
            )}
          </div>

          <div className="border-t border-dashed border-slate-300 dark:border-slate-800 pt-2 space-y-1">
            <span className="font-bold block text-[10px] uppercase text-slate-400">
              {t('restZCashDrawer')}
            </span>
            <Row label={t('restZOpeningFloat')} value={formatCurrency(report.startCash)} />
            <Row label={t('restZCashSales')} value={formatCurrency(report.cashSales)} />
            <Row
              label={t('restZExpectedCash')}
              value={formatCurrency(report.expectedCash)}
              className="font-bold"
            />
            {report.endCash !== null && (
              <>
                <Row label={t('restZCountedCash')} value={formatCurrency(report.endCash)} />
                <Row
                  label={t('restZVariance')}
                  value={varianceLabel}
                  className={`font-bold ${varianceTone}`}
                />
              </>
            )}
          </div>

          {(report.openChecksCount > 0 || report.totalVoids > 0) && (
            <div className="border-t border-dashed border-slate-300 dark:border-slate-800 pt-2 space-y-1">
              {report.openChecksCount > 0 && (
                <>
                  <Row
                    label={`${t('restZOpenChecks')} (${report.openChecksCount})`}
                    value={formatCurrency(report.openChecksTotal)}
                    className="text-amber-600 dark:text-amber-400 font-bold"
                  />
                  <p className="text-[10px] text-slate-400 italic flex items-start gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0 mt-px" />
                    {t('restZOpenChecksHint')}
                  </p>
                </>
              )}
              {report.totalVoids > 0 && (
                <>
                  <Row
                    label={t('restZVoidCount', { count: report.totalVoids })}
                    value={formatCurrency(report.voidedOrdersTotal)}
                    className="text-rose-500 font-bold"
                  />
                  {report.voidedOrdersCount > 0 && (
                    <Row
                      label={`· ${t('restZVoidedOrders')}`}
                      value={String(report.voidedOrdersCount)}
                    />
                  )}
                  {report.voidedLineCount > 0 && (
                    <Row
                      label={`· ${t('restZVoidedLines')}`}
                      value={String(report.voidedLineCount)}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {hasRevenue && Object.keys(report.categoryRevenue || {}).length > 0 && (
            <div className="border-t border-dashed border-slate-300 dark:border-slate-800 pt-2 space-y-1">
              <span className="font-bold block text-[10px] uppercase text-slate-400">
                {t('restZCategoryRevenue')}
              </span>
              {Object.entries(report.categoryRevenue).map(([cat, amount]) => (
                <Row key={cat} label={cat} value={formatCurrency(amount)} />
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => window.print()}
          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-colors"
        >
          <Printer className="w-4 h-4" /> {t('restZPrint')}
        </button>
      </div>
    </div>
  )
}
