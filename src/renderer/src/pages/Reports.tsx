import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calculateRefundedAmount } from '@/shared/utils/refundCalculations';
import { 
  FileText, 
  TrendingUp, 
  Package, 
  DollarSign, 
  Users,
  Printer,
  FileSpreadsheet,
  BarChart3,
  RefreshCw,
  Plus,
  ArrowUpRight,
  Clock,
  Activity,
  ShoppingCart,
  Receipt,
  TrendingDown,
  Eye
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { ReceiptPreviewModal } from './Sales/ReceiptPreviewModal';

interface TodayStats {
  revenue: number;
  expenses: number;
  profit: number;
  salesCount: number;
  expensesCount: number;
  topProduct: string;
  revenueChange: number; // percentage vs yesterday
}

interface ActivityItem {
  id: string;
  type: 'sale' | 'expense' | 'alert';
  time: string;
  description: string;
  amount?: number;
  icon: any;
  saleData?: any; // Full sale transaction data
}

interface ItemSummary {
  productId: string;
  productName: string;
  totalQuantity: number;
  revenue: number;
  category?: string;
  variants?: VariantSale[];
}

interface VariantSale {
  variantId: string | null;
  variantName: string;
  quantity: number;
  revenue: number;
}

interface ReportFormState {
  reportType: 'sales' | 'inventory' | 'financial' | 'customer' | null;
  startDate: string;
  endDate: string;
}

const EnhancedReports: React.FC = () => {
  const { error, success } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
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
  const [reportForm, setReportForm] = useState<ReportFormState>({
    reportType: null,
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    await Promise.all([
      loadTodayStats(),
      loadActivityFeed()
    ]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
    success('Data refreshed successfully');
  };

  const loadTodayStats = async () => {
    try {
      // Get data for today only
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0); // Start of today
      
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // End of today

      // Fetch transactions for today
      const [salesData, financeData] = await Promise.all([
        window.api.saleTransactions.getByDateRange({
          startDate: todayStart.toISOString(),
          endDate: todayEnd.toISOString()
        }),
        window.api.finance.getTransactions({
          startDate: todayStart,
          endDate: todayEnd
        })
      ]);

      // Calculate revenue and cost of goods sold accounting for refunds
      let totalRevenue = 0;
      let totalCOGS = 0;
      
      salesData.forEach((sale: any) => {
        // Calculate refunded amount for this sale
        const refundedAmount = calculateRefundedAmount(sale.items || []);
        const netSaleTotal = sale.total - refundedAmount;
        
        // Calculate COGS for non-refunded items
        let saleCOGS = 0;
        sale.items?.forEach((item: any) => {
          const refundedQty = item.refundedQuantity || 0;
          const netQty = item.quantity - refundedQty;
          if (netQty > 0 && item.product?.baseCost) {
            saleCOGS += netQty * item.product.baseCost;
          }
        });
        
        totalRevenue += netSaleTotal;
        totalCOGS += saleCOGS;
      });
      
      const grossProfit = totalRevenue - totalCOGS;
      
      const expenses = financeData
        .filter((t: any) => t.type === 'expense')
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      // Check if COGS should be included in calculations
      const includeCOGS = localStorage.getItem('includeCOGSInCalculations') !== 'false';
      const totalExpenses = includeCOGS ? (totalCOGS + expenses) : expenses;
      const netProfit = includeCOGS ? (grossProfit - expenses) : (totalRevenue - expenses);

      setTodayStats({
        revenue: totalRevenue,
        expenses: totalExpenses,
        profit: netProfit,
        salesCount: salesData.length,
        expensesCount: financeData.filter((t: any) => t.type === 'expense').length,
        topProduct: 'Product X', // TODO: Calculate from sales data
        revenueChange: 12.5 // TODO: Calculate vs yesterday
      });
    } catch (err) {
      console.error('Failed to load today stats:', err);
    }
  };

  const loadActivityFeed = async () => {
    try {
      // Get data for today only for activity feed
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0); // Start of today
      
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999); // End of today

      const [salesData, financeData] = await Promise.all([
        window.api.saleTransactions.getByDateRange({
          startDate: todayStart.toISOString(),
          endDate: todayEnd.toISOString()
        }),
        window.api.finance.getTransactions({
          startDate: todayStart,
          endDate: todayEnd
        })
      ]);

      // Load variant data for all variantIds found in sales
      const variantIds = new Set<string>();
      salesData.forEach((sale: any) => {
        sale.items?.forEach((item: any) => {
          if (item.variantId) {
            variantIds.add(item.variantId);
          }
        });
      });

      // Fetch variant details
      const variantsMap = new Map<string, any>();
      if (variantIds.size > 0) {
        const variantPromises = Array.from(variantIds).map(id => 
          window.api.products.getVariantById(id).catch(() => null)
        );
        const variants = await Promise.all(variantPromises);
        variants.forEach((variant, index) => {
          if (variant) {
            variantsMap.set(Array.from(variantIds)[index], variant);
          }
        });
      }

      const activities: ActivityItem[] = [];

      // Add sales with full data
      salesData.forEach((sale: any) => {
        activities.push({
          id: sale.id,
          type: 'sale',
          time: new Date(sale.createdAt).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          description: `Sale: ${sale.customerName || 'Walk-in Customer'}`,
          amount: sale.total,
          icon: ShoppingCart,
          saleData: sale // Store full sale data
        });
      });

      // Calculate items sold summary with variant tracking
      const itemsMap = new Map<string, ItemSummary>();
      let totalPieces = 0;

      salesData.forEach((sale: any) => {
        sale.items?.forEach((item: any) => {
          const netQuantity = item.quantity - (item.refundedQuantity || 0);
          if (netQuantity > 0) {
            totalPieces += netQuantity;
            const key = item.productId;
            const itemRevenue = item.totalPrice || (item.price * netQuantity);
            
            if (itemsMap.has(key)) {
              const existing = itemsMap.get(key)!;
              existing.totalQuantity += netQuantity;
              existing.revenue += itemRevenue;
              
              // Track variant
              const variant = item.variantId ? variantsMap.get(item.variantId) : null;
              const variantName = variant 
                ? [variant.color, variant.size].filter(Boolean).join(' / ') || 'Base Product'
                : 'Base Product';
              const variantId = item.variantId || null;
              const existingVariant = existing.variants?.find(v => 
                v.variantId === variantId && v.variantName === variantName
              );
              
              if (existingVariant) {
                existingVariant.quantity += netQuantity;
                existingVariant.revenue += itemRevenue;
              } else {
                existing.variants = existing.variants || [];
                existing.variants.push({
                  variantId,
                  variantName,
                  quantity: netQuantity,
                  revenue: itemRevenue
                });
              }
            } else {
              const variant = item.variantId ? variantsMap.get(item.variantId) : null;
              const variantName = variant 
                ? [variant.color, variant.size].filter(Boolean).join(' / ') || 'Base Product'
                : 'Base Product';
              const variantId = item.variantId || null;
              
              itemsMap.set(key, {
                productId: item.productId,
                productName: item.product?.name || 'Unknown Product',
                totalQuantity: netQuantity,
                revenue: itemRevenue,
                category: item.product?.category?.name,
                variants: [{
                  variantId,
                  variantName,
                  quantity: netQuantity,
                  revenue: itemRevenue
                }]
              });
            }
          }
        });
      });

      const itemsSummaryArray = Array.from(itemsMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
      setItemsSummary(itemsSummaryArray);
      setTotalPiecesSold(totalPieces);

      // Add expenses
      financeData
        .filter((t: any) => t.type === 'expense')
        .forEach((expense: any) => {
          activities.push({
            id: expense.id,
            type: 'expense',
            time: new Date(expense.createdAt).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            description: `Expense: ${expense.description}`,
            amount: expense.amount,
            icon: Receipt
          });
        });

      // Sort by time (most recent first)
      activities.sort((a, b) => {
        const timeA = a.time.split(':').map(Number);
        const timeB = b.time.split(':').map(Number);
        return (timeB[0] * 60 + timeB[1]) - (timeA[0] * 60 + timeA[1]);
      });

      setActivityFeed(activities.slice(0, 10)); // Show latest 10
    } catch (err) {
      console.error('Failed to load activity feed:', err);
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

      let response;
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
      console.error('Failed to generate report:', err);
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
      
      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(`${reportType?.title} Report`, 105, yPos, { align: 'center' });
      yPos += 10;
      
      // Date range
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Period: ${dateRange}`, 105, yPos, { align: 'center' });
      doc.text(`Generated: ${new Date().toLocaleString()}`, 105, yPos + 5, { align: 'center' });
      yPos += 15;
      doc.setTextColor(0);
      
      // Summary Section
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
      
      // Detailed Breakdown
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Detailed Breakdown', 14, yPos);
      yPos += 8;
      
      if (reportForm.reportType === 'sales' && reportData.topProducts) {
        const tableData = reportData.topProducts.map((p: any) => [
          p.name,
          p.quantity.toString(),
          formatCurrency(p.revenue)
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [['Product', 'Quantity', 'Revenue']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 }
        });
      } else if (reportForm.reportType === 'inventory' && reportData.byCategory) {
        const tableData = Object.entries(reportData.byCategory).map(([category, data]: [string, any]) => [
          category,
          data.count.toString(),
          data.stock.toString(),
          formatCurrency(data.value)
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [['Category', 'Products', 'Stock', 'Value']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94] },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 }
        });
      } else if (reportForm.reportType === 'financial' && reportData.dailyBreakdown) {
        const tableData = reportData.dailyBreakdown.map((d: any) => [
          d.date,
          formatCurrency(d.revenue),
          formatCurrency(d.expenses),
          formatCurrency(d.netProfit)
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [['Date', 'Revenue', 'Expenses', 'Net Profit']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [168, 85, 247] },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 }
        });
      } else if (reportForm.reportType === 'customer' && reportData.topCustomers) {
        const tableData = reportData.topCustomers.map((c: any) => [
          c.name,
          c.loyaltyTier,
          formatCurrency(c.totalSpent),
          c.orderCount.toString()
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [['Customer', 'Loyalty Tier', 'Total Spent', 'Orders']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [249, 115, 22] },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 }
        });
      }
      
      // Save the PDF
      const fileName = `${reportType?.title}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      success(`PDF report saved: ${fileName}`);
    } catch (err) {
      console.error('Export error:', err);
      error('Failed to export PDF');
    }
  };

  const handleExportCSV = () => {
    if (!reportData || !reportForm.reportType) return;
    
    try {
      let csvContent = '';
      const reportType = reportTypes.find(r => r.id === reportForm.reportType);
      const dateRange = `${new Date(reportForm.startDate).toLocaleDateString()} - ${new Date(reportForm.endDate).toLocaleDateString()}`;

      // Header
      csvContent += `${reportType?.title} Report\n`;
      csvContent += `Period: ${dateRange}\n`;
      csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;

      // Summary
      csvContent += 'SUMMARY\n';
      if (reportForm.reportType === 'sales' && reportData.summary) {
        csvContent += `Total Revenue,${reportData.summary.totalRevenue || 0}\n`;
        csvContent += `Total Sales,${reportData.summary.totalSales || 0}\n`;
        csvContent += `Average Order Value,${reportData.summary.averageOrderValue || 0}\n`;
      } else if (reportForm.reportType === 'inventory' && reportData.summary) {
        csvContent += `Total Value,${reportData.summary.totalValue || 0}\n`;
        csvContent += `Total Products,${reportData.summary.totalProducts || 0}\n`;
        csvContent += `Low Stock Count,${reportData.summary.lowStockCount || 0}\n`;
        csvContent += `Out of Stock Count,${reportData.summary.outOfStockCount || 0}\n`;
      } else if (reportForm.reportType === 'financial' && reportData.summary) {
        csvContent += `Total Revenue,${reportData.summary.totalRevenue || 0}\n`;
        csvContent += `Total Expenses,${reportData.summary.totalExpenses || 0}\n`;
        csvContent += `Net Profit,${reportData.summary.netProfit || 0}\n`;
        csvContent += `Profit Margin,${reportData.summary.profitMargin || 0}%\n`;
      } else if (reportForm.reportType === 'customer' && reportData.summary) {
        csvContent += `Total Customers,${reportData.summary.totalCustomers || 0}\n`;
        csvContent += `Total Spent,${reportData.summary.totalSpent || 0}\n`;
        csvContent += `Average Spent,${reportData.summary.averageSpent || 0}\n`;
      }

      csvContent += '\nDETAILED BREAKDOWN\n';

      // Detailed data
      if (reportForm.reportType === 'sales' && reportData.topProducts) {
        csvContent += 'Product,Quantity,Revenue\n';
        reportData.topProducts.forEach((p: any) => {
          csvContent += `"${p.name}",${p.quantity},${p.revenue}\n`;
        });
      } else if (reportForm.reportType === 'inventory' && reportData.byCategory) {
        csvContent += 'Category,Products,Stock,Value\n';
        Object.entries(reportData.byCategory).forEach(([category, data]: [string, any]) => {
          csvContent += `"${category}",${data.count},${data.stock},${data.value}\n`;
        });
      } else if (reportForm.reportType === 'financial' && reportData.dailyBreakdown) {
        csvContent += 'Date,Revenue,Expenses,Net Profit\n';
        reportData.dailyBreakdown.forEach((d: any) => {
          csvContent += `${d.date},${d.revenue},${d.expenses},${d.netProfit}\n`;
        });
      } else if (reportForm.reportType === 'customer' && reportData.topCustomers) {
        csvContent += 'Customer,Loyalty Tier,Total Spent,Order Count\n';
        reportData.topCustomers.forEach((c: any) => {
          csvContent += `"${c.name}",${c.loyaltyTier},${c.totalSpent},${c.orderCount}\n`;
        });
      }

      // Create download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${reportType?.title}_Report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      success('CSV file downloaded successfully');
    } catch (err) {
      console.error('Export error:', err);
      error('Failed to export CSV');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const reportTypes = [
    { id: 'sales', title: t('sales'), icon: TrendingUp, color: 'text-blue-600' },
    { id: 'inventory', title: t('inventory'), icon: Package, color: 'text-green-600' },
    { id: 'financial', title: t('financial'), icon: DollarSign, color: 'text-purple-600' },
    { id: 'customer', title: t('customer'), icon: Users, color: 'text-orange-600' }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('reportsAndAnalytics')}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {t('businessInsights')}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          {t('refresh')}
        </button>
      </div>

      {/* GENERATE REPORTS - Top Section with Beautiful Design */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-xl p-6 shadow-lg border border-blue-200 dark:border-slate-600">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary rounded-xl shadow-md">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('generateReport')}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">{t('reportSelectType')}</p>
          </div>
        </div>
        
        {/* Report Type Selection - Beautiful Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            const isActive = reportForm.reportType === report.id;
            return (
              <button
                key={report.id}
                onClick={() => setReportForm({ ...reportForm, reportType: report.id as any })}
                className={`p-4 rounded-xl font-medium transition-all transform hover:scale-105 ${
                  isActive
                    ? 'bg-primary text-white shadow-xl ring-4 ring-primary/30'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:shadow-lg border border-slate-200 dark:border-slate-600'
                }`}
              >
                <Icon size={24} className={`mx-auto mb-2 ${isActive ? 'text-white' : report.color}`} />
                <p className="font-semibold">{report.title}</p>
              </button>
            );
          })}
        </div>

        {/* Date Range & Generate Button */}
        {reportForm.reportType && (
          <div className="flex flex-wrap items-end gap-4 p-5 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-600">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                📅 {t('startDate')}
              </label>
              <input
                type="date"
                value={reportForm.startDate}
                onChange={(e) => setReportForm({ ...reportForm, startDate: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                📅 {t('endDate')}
              </label>
              <input
                type="date"
                value={reportForm.endDate}
                onChange={(e) => setReportForm({ ...reportForm, endDate: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              <BarChart3 size={20} />
              {loading ? t('generating') : t('generateReportButton')}
            </button>
          </div>
        )}
      </div>

      {/* TODAY'S ACTIVITY */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 p-6 rounded-xl border border-primary/20">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={24} className="text-primary" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Today's Activity</h2>
          <span className="px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-medium flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            {t('live')}
          </span>
        </div>

        {/* Today's Stats Grid */}
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
              <span className="text-sm text-slate-600 dark:text-slate-400">Items Sold</span>
              <Package size={18} className="text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary">
              {totalPiecesSold}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {itemsSummary.length} {itemsSummary.length === 1 ? 'product' : 'products'}
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
      </div>

      {/* Activity Feed & Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enhanced Sales Activity - Today Only */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Today's Sales Activity</h3>
              <span className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-medium">{activityFeed.filter(a => a.type === 'sale').length} Sales</span>
              <span className="text-xs font-bold text-primary">{totalPiecesSold} Pieces</span>
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
                      onClick={() => {
                        if (isSale) {
                          setExpandedSales(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(activity.id)) {
                              newSet.delete(activity.id);
                            } else {
                              newSet.add(activity.id);
                            }
                            return newSet;
                          });
                        }
                      }}
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
                        <p className="text-sm text-slate-900 dark:text-white font-medium">
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock size={12} className="text-slate-400" />
                          <span className="text-xs text-slate-500">{activity.time}</span>
                          {isSale && activity.saleData?.items && (
                            <span className="text-xs text-slate-500">• {activity.saleData.items.reduce((sum: number, item: any) => sum + (item.quantity - (item.refundedQuantity || 0)), 0)} items</span>
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
                            title="View Receipt"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Expanded Sale Items */}
                    {isExpanded && isSale && activity.saleData?.items && (
                      <div className="bg-slate-50 dark:bg-slate-700/30 px-3 pb-3 border-t border-slate-200 dark:border-slate-700">
                        <div className="mt-2 space-y-2">
                          {activity.saleData.items.map((item: any, idx: number) => {
                            const netQty = item.quantity - (item.refundedQuantity || 0);
                            if (netQty <= 0) return null;
                            return (
                              <div key={idx} className="flex items-center justify-between text-xs bg-white dark:bg-slate-800 p-2 rounded">
                                <div className="flex-1">
                                  <span className="font-medium text-slate-900 dark:text-white">{item.product?.name || 'Unknown'}</span>
                                  {item.product?.category && (
                                    <span className="ml-2 text-slate-500">({item.product.category.name})</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-slate-600 dark:text-slate-400">×{netQty}</span>
                                  <span className="font-bold text-slate-900 dark:text-white min-w-[60px] text-right">
                                    {formatCurrency(item.totalPrice || (item.price * netQty))}
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

        {/* Today's Quick Insights */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 p-5 rounded-xl shadow-sm border-2 border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-3">
              <Receipt size={20} className="text-red-600 dark:text-red-400" />
              <h4 className="font-bold text-slate-900 dark:text-white">{t('todaysExpenses')}</h4>
            </div>
            <p className="text-4xl font-bold text-red-600 dark:text-red-400 mb-2">
              {todayStats ? formatCurrency(todayStats.expenses) : '$0.00'}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">💸 {todayStats?.expensesCount || 0} {t('transactions')}</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-5 rounded-xl shadow-sm border-2 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingCart size={20} className="text-green-600 dark:text-green-400" />
              <h4 className="font-bold text-slate-900 dark:text-white">{t('todaysSales')}</h4>
            </div>
            <p className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">
              {todayStats?.salesCount || 0}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">📦 {t('transactionsCompleted')}</p>
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
      </div>

      {/* Items Sold Summary with Search */}
      {itemsSummary.length > 0 && (
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

          {/* Search Bar */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search products..."
              value={itemSearchQuery}
              onChange={(e) => setItemSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          {/* Items List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {itemsSummary
              .filter(item => 
                itemSearchQuery === '' || 
                item.productName.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
                item.category?.toLowerCase().includes(itemSearchQuery.toLowerCase())
              )
              .map((item, idx) => {
                const isExpanded = expandedProducts.has(item.productId);
                const hasVariants = item.variants && item.variants.length > 1;
                
                return (
                  <div key={item.productId} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <div 
                      onClick={() => {
                        if (hasVariants) {
                          setExpandedProducts(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(item.productId)) {
                              newSet.delete(item.productId);
                            } else {
                              newSet.add(item.productId);
                            }
                            return newSet;
                          });
                        }
                      }}
                      className={`flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 ${hasVariants ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700' : ''} transition-colors`}
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
                          {item.category && (
                            <p className="text-xs text-slate-500">{item.category}</p>
                          )}
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
                    
                    {/* Expanded Variants */}
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
              })}
            {itemsSummary.filter(item => 
              itemSearchQuery === '' || 
              item.productName.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
              item.category?.toLowerCase().includes(itemSearchQuery.toLowerCase())
            ).length === 0 && (
              <div className="text-center py-8 text-slate-500">
                No products found matching "{itemSearchQuery}"
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report Preview Modal - Comprehensive */}
      {showPreview && reportData && (
        <Modal
          isOpen={showPreview}
          onClose={() => {
            setShowPreview(false);
            setReportData(null);
            setReportForm({ ...reportForm, reportType: null });
          }}
          title={`${reportTypes.find(r => r.id === reportForm.reportType)?.title} Report`}
        >
          <div className="space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Date Range */}
            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                📅 {t('period')}: <span className="font-semibold text-slate-900 dark:text-white">
                  {new Date(reportForm.startDate).toLocaleDateString()} - {new Date(reportForm.endDate).toLocaleDateString()}
                </span>
              </p>
            </div>

            {/* Summary Section */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 p-6 rounded-lg border border-primary/20">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">📊 {t('summary')}</h3>
              <div className="grid grid-cols-2 gap-4">
                {reportForm.reportType === 'sales' && reportData.summary && (
                  <>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('totalRevenue')}</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(reportData.summary.totalRevenue || 0)}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('totalSales')}</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {reportData.summary.totalSales || 0}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg col-span-2">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('averageOrderValue')}</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(reportData.summary.averageOrderValue || 0)}
                      </p>
                    </div>
                  </>
                )}
                
                {reportForm.reportType === 'inventory' && reportData.summary && (
                  <>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('totalValue')}</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(reportData.summary.totalValue || 0)}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('totalProducts')}</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {reportData.summary.totalProducts || 0}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('lowStock')}</p>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {reportData.summary.lowStockCount || 0}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('outOfStock')}</p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {reportData.summary.outOfStockCount || 0}
                      </p>
                    </div>
                  </>
                )}
                
                {reportForm.reportType === 'financial' && reportData.summary && (
                  <>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('totalRevenue')}</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(reportData.summary.totalRevenue || 0)}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('totalExpensesLabel')}</p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(reportData.summary.totalExpenses || 0)}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('netProfit')}</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(reportData.summary.netProfit || 0)}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('profitMarginLabel')}</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {reportData.summary.profitMargin || 0}%
                      </p>
                    </div>
                  </>
                )}
                
                {reportForm.reportType === 'customer' && reportData.summary && (
                  <>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('totalCustomers')}</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {reportData.summary.totalCustomers || 0}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('totalSpent')}</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(reportData.summary.totalSpent || 0)}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg col-span-2">
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{t('avgPerCustomer')}</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(reportData.summary.averageSpent || 0)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Detailed Data */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">📋 {t('detailedBreakdown')}</h3>
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="max-h-80 overflow-y-auto">
                  {reportForm.reportType === 'sales' && reportData.topProducts && (
                    <table className="w-full">
                      <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">{t('product')}</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">{t('quantity')}</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">{t('revenue')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {reportData.topProducts.map((p: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{p.name}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium">{p.quantity}</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-green-600 dark:text-green-400">{formatCurrency(p.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {reportForm.reportType === 'inventory' && reportData.byCategory && (
                    <table className="w-full">
                      <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">{t('category')}</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">{t('products')}</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">{t('stock')}</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">{t('value')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {Object.entries(reportData.byCategory).map(([category, data]: [string, any], i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{category}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium">{data.count}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium">{data.stock}</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-green-600 dark:text-green-400">{formatCurrency(data.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {reportForm.reportType === 'financial' && reportData.dailyBreakdown && (
                    <table className="w-full">
                      <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">{t('date')}</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">{t('revenue')}</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">{t('expenses')}</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">{t('profit')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {reportData.dailyBreakdown.map((d: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{d.date}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-green-600 dark:text-green-400">{formatCurrency(d.revenue)}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-red-600 dark:text-red-400">{formatCurrency(d.expenses)}</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(d.netProfit)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {reportForm.reportType === 'customer' && reportData.topCustomers && (
                    <table className="w-full">
                      <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">{t('customer')}</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">{t('loyaltyTierLabel')}</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">{t('totalSpent')}</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400">{t('orders')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {reportData.topCustomers.map((c: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">{c.name}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                {c.loyaltyTier}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-green-600 dark:text-green-400">{formatCurrency(c.totalSpent)}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium">{c.orderCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={handleExportPDF}
                className="flex-1 bg-primary text-white px-4 py-3 rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2 font-semibold transition-all transform hover:scale-105"
              >
                <Printer className="w-5 h-5" />
                {t('downloadPDF')}
              </button>
              <button
                onClick={handleExportCSV}
                className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 font-semibold transition-all transform hover:scale-105"
              >
                <FileSpreadsheet className="w-5 h-5" />
                {t('downloadCSV')}
              </button>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setReportData(null);
                }}
                className="px-6 py-3 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold transition-colors"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Receipt Preview Modal */}
      {selectedReceipt && (
        <ReceiptPreviewModal
          transaction={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
};

export default EnhancedReports;
