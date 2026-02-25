/**
 * NotificationCenter Component
 * Real-time notifications and alerts for important events
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { useToast } from '../../../contexts/ToastContext'
import logger from '../../../../../shared/utils/logger'

type Notification = {
  id: string
  type: 'success' | 'warning' | 'info' | 'error'
  title: string
  message: string
  timestamp: Date
  read: boolean
  action?: {
    label: string
    link: string
  }
}

export default function NotificationCenter() {
  const { user } = useAuth()
  const { warning } = useToast()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    loadNotifications()
    // Refresh notifications every 5 minutes
    const interval = setInterval(loadNotifications, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const loadNotifications = async () => {
    try {
      // Check for low stock
      // @ts-ignore
      const lowStock = await window.api?.inventory?.getLowStock(10)
      
      const newNotifications: Notification[] = []

      // Low stock notifications
      if (lowStock && lowStock.length > 0) {
        newNotifications.push({
          id: 'low-stock',
          type: 'warning',
          title: 'Low Stock Alert',
          message: `${lowStock.length} products are running low on stock`,
          timestamp: new Date(),
          read: false,
          action: {
            label: 'View Inventory',
            link: '/inventory'
          }
        })
      }

      // Out of stock notifications
      // @ts-ignore
      const outOfStock = await window.api?.inventory?.getOutOfStock()
      if (outOfStock && outOfStock.length > 0) {
        newNotifications.push({
          id: 'out-of-stock',
          type: 'error',
          title: 'Out of Stock',
          message: `${outOfStock.length} products are out of stock`,
          timestamp: new Date(),
          read: false,
          action: {
            label: 'Restock Now',
            link: '/inventory'
          }
        })
      }

      // Today's sales notification
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // @ts-ignore
      const todaySales = await window.api['search:finance']({
        startDate: today.toISOString(),
        endDate: tomorrow.toISOString()
      })

      if (todaySales && todaySales.currentMetrics.transactions > 0) {
        newNotifications.push({
          id: 'daily-sales',
          type: 'success',
          title: 'Daily Sales Update',
          message: `${todaySales.currentMetrics.transactions} sales today totaling $${todaySales.currentMetrics.revenue.toFixed(2)}`,
          timestamp: new Date(),
          read: false,
          action: {
            label: 'View Details',
            link: '/finance'
          }
        })
      }

      // Payment reminders and overdue notifications
      // @ts-ignore
      const [upcomingReminders, overdueItems] = await Promise.all([
        window.api?.installments?.getUpcomingReminders(7),
        window.api?.installments?.getOverdue()
      ])

      // Upcoming payment reminders
      if (upcomingReminders && upcomingReminders.length > 0) {
        upcomingReminders.slice(0, 3).forEach((reminder: any) => {
          newNotifications.push({
            id: `reminder-${reminder.id}`,
            type: 'warning',
            title: 'Payment Due Soon',
            message: `$${reminder.amount.toFixed(2)} due on ${new Date(reminder.dueDate).toLocaleDateString()} for ${reminder.customer?.name || 'Customer'}`,
            timestamp: new Date(),
            read: false,
            action: {
              label: 'View Installments',
              link: '/sales?tab=installments'
            }
          })
        })
      }

      // Overdue payment notifications
      if (overdueItems && overdueItems.length > 0) {
        overdueItems.slice(0, 3).forEach((item: any) => {
          newNotifications.push({
            id: `overdue-${item.id}`,
            type: 'error',
            title: 'Overdue Payment',
            message: `$${item.amount.toFixed(2)} was due on ${new Date(item.dueDate).toLocaleDateString()} for ${item.customer?.name || 'Customer'}`,
            timestamp: new Date(),
            read: false,
            action: {
              label: 'View Installments',
              link: '/sales?tab=installments'
            }
          })
        })
      }

      setNotifications(newNotifications)
    } catch (error) {
      logger.error('Error loading notifications:', error)
    }
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ))
  }

  const dismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} className="text-green-600" />
      case 'warning':
        return <AlertCircle size={18} className="text-amber-600" />
      case 'error':
        return <AlertCircle size={18} className="text-red-600" />
      default:
        return <Info size={18} className="text-blue-600" />
    }
  }

  const getBgColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length
  const displayNotifications = showAll ? notifications : notifications.slice(0, 3)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Bell size={18} className="text-primary" />
          Notifications
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white">
              {unreadCount}
            </span>
          )}
        </h3>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-8">
          <Bell className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-50" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No notifications
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
            You're all caught up!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border transition-all ${getBgColor(notification.type)} ${
                notification.read ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {notification.title}
                    </h4>
                    <button
                      onClick={() => dismiss(notification.id)}
                      className="p-1 hover:bg-white/50 dark:hover:bg-black/20 rounded transition-colors"
                    >
                      <X size={14} className="text-slate-600 dark:text-slate-400" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mb-2">
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {notification.timestamp.toLocaleTimeString()}
                    </span>
                    {notification.action && (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          if (!user) {
                            warning('Please log in to view details', 4000)
                          } else if (notification.action) {
                            markAsRead(notification.id)
                            navigate(notification.action.link)
                          }
                        }}
                        className="text-xs font-medium text-primary hover:underline cursor-pointer bg-transparent border-0"
                      >
                        {notification.action.label} →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {notifications.length > 3 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full py-2 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors"
            >
              {showAll ? 'Show Less' : `Show ${notifications.length - 3} More`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
