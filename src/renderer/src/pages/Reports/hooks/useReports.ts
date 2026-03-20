import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ShoppingCart, Receipt, TrendingUp, Package, DollarSign, Users } from 'lucide-react';
import { calculateRefundedAmount } from '@/shared/utils/refundCalculations';
import { useToast } from '../../../contexts/ToastContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import logger from '../../../../../shared/utils/logger';
import {
  TodayStats,
  ActivityItem,
  ItemSummary,
  ReportFormState,
  ReportType,
  formatCurrency
} from '../types';
import { useDashboardWorker } from '../../../hooks/useDashboardWorker';
import type { TrendsResult, HeatmapResult } from '../../../hooks/useDashboardWorker';

export const useReports = () => {
  const { error, success } = useToast();
  const { t } = useLanguage();
  const { compute } = useDashboardWorker();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set());
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [itemsSummary, setItemsSummary] = useState<ItemSummary[]>([]);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [totalPiecesSold, setTotalPiecesSold] = useState(0);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [weeklyData, setWeeklyData] = useState<{ day: string; revenue: number; label: string }[]>([]);
  const [trendResult, setTrendResult] = useState<TrendsResult | null>(null);
  const [heatmapResult, setHeatmapResult] = useState<HeatmapResult | null>(null);
  const [reportForm, setReportForm] = useState<ReportFormState>({
    reportType: null,
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const reportTypes: ReportType[] = [
    { id: 'sales', title: t('sales'), icon: TrendingUp, color: 'text-blue-600' },
    { id: 'inventory', title: t('inventory'), icon: Package, color: 'text-green-600' },
    { id: 'financial', title: t('financial'), icon: DollarSign, color: 'text-purple-600' },
    { id: 'customer', title: t('customer'), icon: Users, color: 'text-orange-600' }
  ];

  useEffect(() => {
    loadAllData();
  }, []);

  const loadWeeklyTrend = async () => {
    try {
      const days: { start: Date; end: Date; day: string; label: string }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const start = new Date(d); start.setHours(0, 0, 0, 0);
        const end = new Date(d); end.setHours(23, 59, 59, 999);
        days.push({
          start, end,
          day: d.toLocaleDateString('en-US', { weekday: 'short' }),
          label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
      }

      const results = await Promise.allSettled(
        days.map(({ start, end }) =>
          window.api.saleTransactions.getByDateRange({
            startDate: start.toISOString(),
            endDate: end.toISOString()
          })
        )
      );

      const revenues = results.map(r => {
        if (r.status !== 'fulfilled') return 0;
        return (r.value as any[]).reduce((sum: number, s: any) => {
          const refunded = calculateRefundedAmount(s.items || []);
          return sum + (s.subtotal ?? s.total) - refunded;
        }, 0);
      });

      setWeeklyData(days.map((d, i) => ({ day: d.day, label: d.label, revenue: revenues[i] })));

      const trend = await compute<TrendsResult>('COMPUTE_TRENDS', { values: revenues, labels: days.map(d => d.day) });
      if (trend) setTrendResult(trend);

      const todayRev = revenues[6];
      const yestRev = revenues[5];
      const pctChange = yestRev > 0
        ? parseFloat(((todayRev - yestRev) / yestRev * 100).toFixed(1))
        : todayRev > 0 ? 100 : 0;
      setTodayStats(prev => prev ? { ...prev, revenueChange: pctChange } : prev);
    } catch (err) {
      logger.error('Failed to load weekly trend:', err);
    }
  };

  const loadAllData = async () => {
    await Promise.all([loadTodayStats(), loadActivityFeed(), loadWeeklyTrend()]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
    success('Data refreshed successfully');
  };

  const loadTodayStats = async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const [salesData, financeData] = await Promise.all([
        window.api.saleTransactions.getByDateRange({
          startDate: todayStart.toISOString(),
          endDate: todayEnd.toISOString()
        }),
        window.api.finance.getTransactions({ startDate: todayStart, endDate: todayEnd })
      ]);

      let totalRevenue = 0;   // pre-tax (subtotal) — used for profit & margin
      let totalCashIn = 0;    // post-tax (total) — used for cashInSafe
      let totalCOGS = 0;

      salesData.forEach((sale: any) => {
        const refundedAmount = calculateRefundedAmount(sale.items || []);
        // Use subtotal (pre-tax) for revenue — tax is collected for the govt, not business income
        const netRevenue = (sale.subtotal ?? sale.total) - refundedAmount;
        // Cash in safe uses total (actual money received including tax collected)
        const netCash = sale.total - refundedAmount;

        let saleCOGS = 0;
        sale.items?.forEach((item: any) => {
          const refundedQty = item.refundedQuantity || 0;
          const netQty = item.quantity - refundedQty;
          if (netQty > 0 && item.product?.baseCost) {
            saleCOGS += netQty * item.product.baseCost;
          }
        });

        totalRevenue += netRevenue;
        totalCashIn += netCash;
        totalCOGS += saleCOGS;
      });

      const grossProfit = totalRevenue - totalCOGS;
      const expenses = financeData
        .filter((t: any) => t.type === 'expense')
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      // Always include COGS — profit = revenue(excl. tax) - COGS - operational expenses
      const netProfit = grossProfit - expenses;
      // Cash in safe = actual cash collected (incl. tax) minus cash paid out as expenses
      const cashInSafe = totalCashIn - expenses;

      setTodayStats({
        revenue: totalRevenue,
        revenueWithTax: totalCashIn,
        expenses,
        cogs: totalCOGS,
        profit: netProfit,
        cashInSafe,
        salesCount: salesData.length,
        expensesCount: financeData.filter((t: any) => t.type === 'expense').length,
        topProduct: '',
        revenueChange: 0
      });
    } catch (err) {
      logger.error('Failed to load today stats:', err);
    }
  };

  const loadActivityFeed = async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const [salesData, financeData] = await Promise.all([
        window.api.saleTransactions.getByDateRange({
          startDate: todayStart.toISOString(),
          endDate: todayEnd.toISOString()
        }),
        window.api.finance.getTransactions({ startDate: todayStart, endDate: todayEnd })
      ]);

      // Collect variant IDs and fetch their details
      const variantIds = new Set<string>();
      salesData.forEach((sale: any) => {
        sale.items?.forEach((item: any) => {
          if (item.variantId) variantIds.add(item.variantId);
        });
      });

      const variantsMap = new Map<string, any>();
      if (variantIds.size > 0) {
        const variantPromises = Array.from(variantIds).map(id =>
          window.api.products.getVariantById(id).catch(() => null)
        );
        const variants = await Promise.all(variantPromises);
        variants.forEach((variant, index) => {
          if (variant) variantsMap.set(Array.from(variantIds)[index], variant);
        });
      }

      const activities: ActivityItem[] = [];

      salesData.forEach((sale: any) => {
        activities.push({
          id: sale.id,
          type: 'sale',
          time: new Date(sale.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          description: `Sale: ${sale.customerName || 'Walk-in Customer'}`,
          amount: sale.total,
          icon: ShoppingCart,
          saleData: sale
        });
      });

      // Build items-sold summary
      const itemsMap = new Map<string, ItemSummary>();
      let totalPieces = 0;

      salesData.forEach((sale: any) => {
        sale.items?.forEach((item: any) => {
          const netQuantity = item.quantity - (item.refundedQuantity || 0);
          if (netQuantity > 0) {
            totalPieces += netQuantity;
            const key = item.productId;
            const itemRevenue = item.totalPrice || item.price * netQuantity;
            const variant = item.variantId ? variantsMap.get(item.variantId) : null;
            const variantName = variant
              ? [variant.color, variant.size].filter(Boolean).join(' / ') || 'Base Product'
              : 'Base Product';
            const variantId = item.variantId || null;

            if (itemsMap.has(key)) {
              const existing = itemsMap.get(key)!;
              existing.totalQuantity += netQuantity;
              existing.revenue += itemRevenue;

              const existingVariant = existing.variants?.find(
                v => v.variantId === variantId && v.variantName === variantName
              );
              if (existingVariant) {
                existingVariant.quantity += netQuantity;
                existingVariant.revenue += itemRevenue;
              } else {
                existing.variants = existing.variants || [];
                existing.variants.push({ variantId, variantName, quantity: netQuantity, revenue: itemRevenue });
              }
            } else {
              itemsMap.set(key, {
                productId: item.productId,
                productName: item.product?.name || 'Unknown Product',
                totalQuantity: netQuantity,
                revenue: itemRevenue,
                category: item.product?.category?.name,
                variants: [{ variantId, variantName, quantity: netQuantity, revenue: itemRevenue }]
              });
            }
          }
        });
      });

      setItemsSummary(
        Array.from(itemsMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity)
      );
      setTotalPiecesSold(totalPieces);

      financeData
        .filter((t: any) => t.type === 'expense')
        .forEach((expense: any) => {
          activities.push({
            id: expense.id,
            type: 'expense',
            time: new Date(expense.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            description: `Expense: ${expense.description}`,
            amount: expense.amount,
            icon: Receipt
          });
        });

      activities.sort((a, b) => {
        const [ah, am] = a.time.split(':').map(Number);
        const [bh, bm] = b.time.split(':').map(Number);
        return bh * 60 + bm - (ah * 60 + am);
      });

      setActivityFeed(activities.slice(0, 10));

      // Compute hourly sales heatmap
      if (salesData.length > 0) {
        const timestamps = salesData.map((s: any) => s.createdAt as string);
        const hmap = await compute<HeatmapResult>('COMPUTE_HEATMAP', { timestamps });
        if (hmap) setHeatmapResult(hmap);
      }
    } catch (err) {
      logger.error('Failed to load activity feed:', err);
    }
  };

  const handleGenerateReport = async () => {
    if (!reportForm.reportType) return;
    setLoading(true);
    try {
      const options = {
        startDate: new Date(reportForm.startDate),
        endDate: new Date(reportForm.endDate)
      };

      let response: any;
      switch (reportForm.reportType) {
        case 'sales':
          response = await window.api.reports.getSalesData(options);
          break;
        case 'inventory':
          response = await window.api.reports.getInventoryData(options);
          break;
        case 'financial':
          response = await window.api.reports.getFinancialData(options);
          break;
        case 'customer':
          response = await window.api.reports.getCustomerData(options);
          break;
      }

      if (response.success && response.data) {
        setReportData(response.data);
        setShowPreview(true);
        success('Report generated successfully');
      } else {
        error(response.error || 'Failed to generate report');
      }
    } catch (err) {
      logger.error('Failed to generate report:', err);
      error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!reportData || !reportForm.reportType) return;
    try {
      const doc = new jsPDF();
      const reportType = reportTypes.find(r => r.id === reportForm.reportType);
      const dateRange = `${new Date(reportForm.startDate).toLocaleDateString()} - ${new Date(reportForm.endDate).toLocaleDateString()}`;
      let yPos = 20;

      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(`${reportType?.title} Report`, 105, yPos, { align: 'center' });
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Period: ${dateRange}`, 105, yPos, { align: 'center' });
      doc.text(`Generated: ${new Date().toLocaleString()}`, 105, yPos + 5, { align: 'center' });
      yPos += 15;
      doc.setTextColor(0);

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', 14, yPos);
      yPos += 8;

      const summaryData: any[] = [];
      if (reportForm.reportType === 'sales' && reportData.summary) {
        summaryData.push(
          ['Total Revenue (Net)', formatCurrency(reportData.summary.totalRevenue || 0)],
          ['Total Sales', `${reportData.summary.totalSales || 0}`],
          ['Average Order Value', formatCurrency(reportData.summary.averageOrderValue || 0)],
          ['Total Refunded', formatCurrency(reportData.summary.totalRefunded || 0)],
          ['Refunded Transactions', `${reportData.summary.refundedTransactions || 0} (${(reportData.summary.refundRate || 0).toFixed(1)}%)`]
        );
      } else if (reportForm.reportType === 'inventory' && reportData.summary) {
        summaryData.push(
          ['Total Value', formatCurrency(reportData.summary.totalValue || 0)],
          ['Total Products', `${reportData.summary.totalProducts || 0}`],
          ['Low Stock Count', `${reportData.summary.lowStockCount || 0}`],
          ['Out of Stock Count', `${reportData.summary.outOfStockCount || 0}`]
        );
      } else if (reportForm.reportType === 'financial' && reportData.summary) {
        summaryData.push(
          ['Total Revenue (Net)', formatCurrency(reportData.summary.totalRevenue || 0)],
          ['Total Refunded', formatCurrency(reportData.summary.totalRefunded || 0)],
          ['Total Expenses', formatCurrency(reportData.summary.totalExpenses || 0)],
          ['  - Salaries', formatCurrency(reportData.summary.salaryExpense || 0)],
          ['  - Other Expenses', formatCurrency(reportData.summary.otherExpenses || 0)],
          ['Net Profit', formatCurrency(reportData.summary.netProfit || 0)],
          ['Profit Margin', `${(reportData.summary.profitMargin || 0).toFixed(2)}%`]
        );
      } else if (reportForm.reportType === 'customer' && reportData.summary) {
        summaryData.push(
          ['Total Customers', `${reportData.summary.totalCustomers || 0}`],
          ['Total Spent', formatCurrency(reportData.summary.totalSpent || 0)],
          ['Average per Customer', formatCurrency(reportData.summary.averageSpent || 0)]
        );
      }

      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], fontSize: 10, fontStyle: 'bold' },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Detailed Breakdown', 14, yPos);
      yPos += 8;

      if (reportForm.reportType === 'sales' && reportData.topProducts) {
        autoTable(doc, {
          startY: yPos,
          head: [['Product', 'Quantity', 'Revenue']],
          body: reportData.topProducts.map((p: any) => [p.name, p.quantity.toString(), formatCurrency(p.revenue)]),
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 }
        });
      } else if (reportForm.reportType === 'inventory' && reportData.byCategory) {
        autoTable(doc, {
          startY: yPos,
          head: [['Category', 'Products', 'Stock', 'Value']],
          body: Object.entries(reportData.byCategory).map(([cat, d]: [string, any]) => [cat, d.count.toString(), d.stock.toString(), formatCurrency(d.value)]),
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94] },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 }
        });
      } else if (reportForm.reportType === 'financial' && reportData.dailyBreakdown) {
        autoTable(doc, {
          startY: yPos,
          head: [['Date', 'Revenue', 'Expenses', 'Net Profit']],
          body: reportData.dailyBreakdown.map((d: any) => [d.date, formatCurrency(d.revenue), formatCurrency(d.expenses), formatCurrency(d.netProfit)]),
          theme: 'striped',
          headStyles: { fillColor: [168, 85, 247] },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 }
        });
      } else if (reportForm.reportType === 'customer' && reportData.topCustomers) {
        autoTable(doc, {
          startY: yPos,
          head: [['Customer', 'Loyalty Tier', 'Total Spent', 'Orders']],
          body: reportData.topCustomers.map((c: any) => [c.name, c.loyaltyTier, formatCurrency(c.totalSpent), c.orderCount.toString()]),
          theme: 'striped',
          headStyles: { fillColor: [249, 115, 22] },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 }
        });
      }

      const fileName = `${reportType?.title}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      success(`PDF report saved: ${fileName}`);
    } catch (err) {
      logger.error('Export error:', err);
      error('Failed to export PDF');
    }
  };

  const handleExportCSV = () => {
    if (!reportData || !reportForm.reportType) return;
    try {
      const reportType = reportTypes.find(r => r.id === reportForm.reportType);
      const dateRange = `${new Date(reportForm.startDate).toLocaleDateString()} - ${new Date(reportForm.endDate).toLocaleDateString()}`;

      let csv = `${reportType?.title} Report\nPeriod: ${dateRange}\nGenerated: ${new Date().toLocaleString()}\n\nSUMMARY\n`;

      if (reportForm.reportType === 'sales' && reportData.summary) {
        csv += `Total Revenue,${reportData.summary.totalRevenue || 0}\nTotal Sales,${reportData.summary.totalSales || 0}\nAverage Order Value,${reportData.summary.averageOrderValue || 0}\n`;
      } else if (reportForm.reportType === 'inventory' && reportData.summary) {
        csv += `Total Value,${reportData.summary.totalValue || 0}\nTotal Products,${reportData.summary.totalProducts || 0}\nLow Stock Count,${reportData.summary.lowStockCount || 0}\nOut of Stock Count,${reportData.summary.outOfStockCount || 0}\n`;
      } else if (reportForm.reportType === 'financial' && reportData.summary) {
        csv += `Total Revenue,${reportData.summary.totalRevenue || 0}\nTotal Expenses,${reportData.summary.totalExpenses || 0}\nNet Profit,${reportData.summary.netProfit || 0}\nProfit Margin,${reportData.summary.profitMargin || 0}%\n`;
      } else if (reportForm.reportType === 'customer' && reportData.summary) {
        csv += `Total Customers,${reportData.summary.totalCustomers || 0}\nTotal Spent,${reportData.summary.totalSpent || 0}\nAverage Spent,${reportData.summary.averageSpent || 0}\n`;
      }

      csv += '\nDETAILED BREAKDOWN\n';

      if (reportForm.reportType === 'sales' && reportData.topProducts) {
        csv += 'Product,Quantity,Revenue\n';
        reportData.topProducts.forEach((p: any) => { csv += `"${p.name}",${p.quantity},${p.revenue}\n`; });
      } else if (reportForm.reportType === 'inventory' && reportData.byCategory) {
        csv += 'Category,Products,Stock,Value\n';
        Object.entries(reportData.byCategory).forEach(([cat, d]: [string, any]) => { csv += `"${cat}",${d.count},${d.stock},${d.value}\n`; });
      } else if (reportForm.reportType === 'financial' && reportData.dailyBreakdown) {
        csv += 'Date,Revenue,Expenses,Net Profit\n';
        reportData.dailyBreakdown.forEach((d: any) => { csv += `${d.date},${d.revenue},${d.expenses},${d.netProfit}\n`; });
      } else if (reportForm.reportType === 'customer' && reportData.topCustomers) {
        csv += 'Customer,Loyalty Tier,Total Spent,Order Count\n';
        reportData.topCustomers.forEach((c: any) => { csv += `"${c.name}",${c.loyaltyTier},${c.totalSpent},${c.orderCount}\n`; });
      }

      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
      link.setAttribute('download', `${reportType?.title}_Report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      success('CSV file downloaded successfully');
    } catch (err) {
      logger.error('Export error:', err);
      error('Failed to export CSV');
    }
  };

  return {
    // State
    loading,
    refreshing,
    todayStats,
    activityFeed,
    weeklyData,
    trendResult,
    heatmapResult,
    reportData,
    showPreview,
    expandedSales,
    expandedProducts,
    itemsSummary,
    itemSearchQuery,
    totalPiecesSold,
    selectedReceipt,
    reportForm,
    reportTypes,
    // Setters
    setShowPreview,
    setReportData,
    setReportForm,
    setExpandedSales,
    setExpandedProducts,
    setItemSearchQuery,
    setSelectedReceipt,
    // Handlers
    handleRefresh,
    handleGenerateReport,
    handleExportPDF,
    handleExportCSV
  };
};
