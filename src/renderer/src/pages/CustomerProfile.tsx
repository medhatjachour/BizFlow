import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  ShoppingCart,
  CheckCircle,
  Package,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Clock,
  Award,
  Eye
} from 'lucide-react'
import { ipc } from '../utils/ipc'
import { useToast } from '../contexts/ToastContext'
import { formatCurrency } from '@renderer/utils/formatNumber'
import { ReceiptPreviewModal } from './Sales/ReceiptPreviewModal'

type CustomerProfile = {
  id: string
  name: string
  email: string | null
  phone: string
  loyaltyTier: string
  totalSpent: number
  createdAt: string
  saleTransactions: any[]
  deposits: any[]
  installments: any[]
  statistics: {
    totalSpent: number
    totalPurchases: number
    averagePurchase: number
    totalItems: number
    totalDeposits: number
    firstPurchase: string | null
    lastPurchase: string | null
    purchaseFrequency: number
    installments: {
      total: number
      paid: number
      pending: number
      overdue: number
      totalAmount: number
      paidAmount: number
      remainingAmount: number
    }
  }
  topProducts: Array<{ name: string; count: number; spent: number }>
  categorySpending: Record<string, number>
}

export default function CustomerProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [customer, setCustomer] = useState<CustomerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'installments'>('overview')
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      loadCustomerProfile()
    }
  }, [id])

  const loadCustomerProfile = async () => {
    try {
      setLoading(true)
      const profile = await ipc.customers.getProfile(id!)
      if (profile) {
        setCustomer(profile)
      } else {
        toast?.showToast( 'error','Customer not found')
        navigate('/customers')
      }
    } catch (error) {
      console.error('Error loading customer profile:', error)
      toast?.showToast( 'error','Customer not found')
    } finally {
      setLoading(false)
    }
  }

  const getLoyaltyTierColor = (tier: string) => {
    switch (tier) {
      case 'Platinum': return 'text-purple-700 bg-purple-100 border-purple-300 dark:text-purple-400 dark:bg-purple-900/30 dark:border-purple-700/50'
      case 'Gold': return 'text-yellow-700 bg-yellow-100 border-yellow-300 dark:text-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-700/50'
      case 'Silver': return 'text-slate-700 bg-slate-100 border-slate-300 dark:text-slate-400 dark:bg-slate-700/30 dark:border-slate-600/50'
      default: return 'text-orange-700 bg-orange-100 border-orange-300 dark:text-orange-400 dark:bg-orange-900/30 dark:border-orange-700/50'
    }
  }

  const viewReceipt = async (transaction: any) => {
    try {
      const receiptData = await ipc.saleTransactions.getById(transaction.id)
      setSelectedReceipt(receiptData)
    } catch (error) {
      console.error('Error loading receipt:', error)
      toast?.showToast( 'error','Failed to load receipt')
    }
  }

  const markInstallmentAsPaid = async (installmentId: string) => {
    try {
      setMarkingPaid(installmentId)

      const result = await ipc.installments.markAsPaid({
        installmentId: installmentId,
        paidDate: new Date().toISOString()
      })

      if (result.success) {
        toast?.showToast('success','Installment marked as paid')
        loadCustomerProfile() // Refresh the customer data
      } else {
        throw new Error(result.error || 'Failed to mark installment as paid')
      }
    } catch (error) {
      console.error('Error marking installment as paid:', error)
      toast?.showToast('error','Failed to mark installment as paid')
    } finally {
      setMarkingPaid(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!customer) {
    return null
  }

  const stats = customer.statistics

  return (
    <div className="p-6 space-y-6">  {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/customers')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Customers
        </button>

        <div className="glass-card p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{customer.name}</h1>
                <div className="flex items-center gap-4 mt-2 text-slate-600 dark:text-slate-400">
                  {customer.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    <span>{customer.phone}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Member since {new Date(customer.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-lg border ${getLoyaltyTierColor(customer.loyaltyTier)}`}>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                <span className="font-semibold">{customer.loyaltyTier} Tier</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="kpi-card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-success/10 rounded-lg">
              <DollarSign className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Spent</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(stats.totalSpent)}</p>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Purchases</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalPurchases}</p>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-accent/10 rounded-lg">
              <Package className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Items Bought</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalItems}</p>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-500/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Avg Purchase</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(stats.averagePurchase)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-card mb-6">
        <div className="border-b border-slate-200 dark:border-slate-700">
          <nav className="flex gap-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'transactions'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Transactions ({stats.totalPurchases})
            </button>
            <button
              onClick={() => setActiveTab('installments')}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === 'installments'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Installments ({stats.installments.total})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Installment Summary */}
              {stats.installments.total > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Installment Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Total Amount</span>
                        <CreditCard className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                      </div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(stats.installments.totalAmount)}</p>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle className="w-3 h-3" />
                          <span>{stats.installments.paid} paid</span>
                        </div>
                        <div className="flex items-center gap-1 text-blue-600 dark:text-primary">
                          <Clock className="w-3 h-3" />
                          <span>{stats.installments.pending} pending</span>
                        </div>
                        <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                          <AlertCircle className="w-3 h-3" />
                          <span>{stats.installments.overdue} overdue</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Paid Amount</span>
                        <CheckCircle className="w-5 h-5 text-success" />
                      </div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {formatCurrency(stats.installments.paidAmount)}
                      </p>
                      <p className="text-xs text-success mt-2">
                        {((stats.installments.paidAmount / stats.installments.totalAmount) * 100).toFixed(1)}% completed
                      </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Remaining</span>
                        <Clock className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                      </div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {formatCurrency(stats.installments.remainingAmount)}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                        {stats.installments.pending + stats.installments.overdue} payments due
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Top Products */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Top Products</h3>
                <div className="space-y-2">
                  {customer.topProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 dark:from-primary/30 dark:to-accent/30 border border-blue-300 dark:border-primary/50 flex items-center justify-center text-blue-700 dark:text-primary font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{product.name}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{product.count} items purchased</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(product.spent)}</p>
                      </div>
                    </div>
                  ))}
                  {customer.topProducts.length === 0 && (
                    <p className="text-slate-500 text-center py-4">No purchase data available</p>
                  )}
                </div>
              </div>

              {/* Category Spending */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Spending by Category</h3>
                <div className="space-y-3">
                  {Object.entries(customer.categorySpending)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, amount]) => {
                      const percentage = (amount / stats.totalSpent) * 100
                      return (
                        <div key={category}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-slate-900 dark:text-white">{category}</span>
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {formatCurrency(amount)} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className="bg-blue-600 dark:bg-gradient-to-r dark:from-primary dark:to-accent h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  {Object.keys(customer.categorySpending).length === 0 && (
                    <p className="text-slate-500 text-center py-4">No category data available</p>
                  )}
                </div>
              </div>

              {/* Purchase Activity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <h4 className="font-medium mb-2 text-slate-900 dark:text-white">First Purchase</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {stats.firstPurchase
                      ? new Date(stats.firstPurchase).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'No purchases yet'}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <h4 className="font-medium mb-2 text-slate-900 dark:text-white">Last Purchase</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {stats.lastPurchase
                      ? new Date(stats.lastPurchase).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'No purchases yet'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Transaction History</h3>
              <div className="space-y-3">
                {customer.saleTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary/30 dark:hover:border-primary/50 transition-all"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-medium text-slate-900 dark:text-white">#{transaction.id.slice(0, 8)}</p>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            transaction.status === 'completed'
                              ? 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30'
                              : transaction.status === 'refunded'
                              ? 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30'
                              : 'bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30'
                          }`}
                        >
                          {transaction.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {new Date(transaction.createdAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {transaction.items.length} items • Sold by {transaction.user?.fullName || transaction.user?.username || 'Unknown'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(transaction.total)}</p>
                        <p className="text-xs text-slate-500">{transaction.paymentMethod}</p>
                      </div>
                      <button
                        onClick={() => viewReceipt(transaction)}
                        className="p-2 text-primary hover:bg-primary/10 dark:hover:bg-primary/20 rounded-lg transition-colors border border-primary/30"
                        title="View Receipt"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
                {customer.saleTransactions.length === 0 && (
                  <p className="text-slate-500 text-center py-8">No transactions found</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'installments' && (
            <div>
              <h3 className="text-lg font-semibold mb-6 text-slate-900 dark:text-white">Installment Payments</h3>
              <div className="space-y-4">
                {customer.installments.map((installment) => (
                  <div 
                    key={installment.id} 
                    className={`group relative overflow-hidden rounded-xl border transition-all duration-200 ${
                      installment.status === 'paid'
                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border-green-200 dark:border-green-800/50'
                        : installment.status === 'overdue'
                        ? 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/10 dark:to-rose-900/10 border-red-200 dark:border-red-800/50'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-lg'
                    }`}
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        {/* Left: Icon & Info */}
                        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                          installment.status === 'paid'
                            ? 'bg-success/10 text-success'
                            : installment.status === 'overdue'
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {installment.status === 'paid' ? (
                            <CheckCircle size={24} />
                          ) : installment.status === 'overdue' ? (
                            <AlertCircle size={24} />
                          ) : (
                            <Clock size={24} />
                          )}
                        </div>

                        {/* Middle: Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
                                {installment.sale ? `Sale #${installment.sale.id.slice(0, 8)}` : 'Standalone Payment'}
                              </h4>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
                                <div className="flex items-center gap-1.5">
                                  <Calendar size={14} />
                                  <span>Due: {new Date(installment.dueDate).toLocaleDateString()}</span>
                                </div>
                                {installment.paidDate && (
                                  <div className="flex items-center gap-1.5 text-success">
                                    <CheckCircle size={14} />
                                    <span>Paid: {new Date(installment.paidDate).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Amount & Status Badge */}
                            <div className="text-right flex-shrink-0">
                              <p className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                                {formatCurrency(installment.amount)}
                              </p>
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${
                                  installment.status === 'paid'
                                    ? 'bg-success/20 text-success'
                                    : installment.status === 'overdue'
                                    ? 'bg-red-500/20 text-red-700 dark:text-red-400'
                                    : 'bg-primary/20 text-primary'
                                }`}
                              >
                                {installment.status}
                              </span>
                            </div>
                          </div>

                          {installment.note && (
                            <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg">
                              <p className="text-sm text-slate-600 dark:text-slate-400 italic">{installment.note}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      {installment.status === 'pending' && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <button
                            onClick={() => markInstallmentAsPaid(installment.id)}
                            disabled={markingPaid === installment.id}
                            className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                          >
                            {markingPaid === installment.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                <span>Processing...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle size={16} />
                                <span>Mark as Paid</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {customer.installments.length === 0 && (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CreditCard size={32} className="text-slate-400" />
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">No installments found</p>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">This customer has no payment installments</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Receipt Preview Modal */}
      {selectedReceipt && (
        <ReceiptPreviewModal
          transaction={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  )
}
