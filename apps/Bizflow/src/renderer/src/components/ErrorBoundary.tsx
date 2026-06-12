/**
 * ErrorBoundary Component
 * Catches React errors and displays fallback UI
 */

import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import logger from '../../../shared/utils/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('ErrorBoundary caught an error:', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      stack: error.stack
    })

    this.setState({
      error,
      errorInfo
    })

    // TODO: Send to error tracking service in production
    // Example: Sentry.captureException(error, { extra: errorInfo })
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })

    this.props.onReset?.()
  }

  handleGoHome = (): void => {
    window.location.hash = '/'
    this.handleReset()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-slate-900 dark:to-slate-800 p-4">
          <div className="max-w-2xl w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-8 text-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-white/20 rounded-full">
                  <AlertTriangle size={32} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Oops! Something went wrong</h1>
                  <p className="text-white/90 mt-1">The application encountered an unexpected error</p>
                </div>
              </div>
            </div>

            {/* Error Details */}
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  Error Details
                </h2>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-sm font-mono text-red-800 dark:text-red-300">
                    {this.state.error?.message || 'Unknown error'}
                  </p>
                </div>
              </div>

              {/* Stack Trace - Only in development */}
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mb-6">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white mb-2">
                    View Stack Trace (Development Only)
                  </summary>
                  <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-4 overflow-auto max-h-64">
                    <pre className="text-xs font-mono text-slate-800 dark:text-slate-300 whitespace-pre-wrap">
                      {this.state.error?.stack}
                    </pre>
                    <pre className="text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap mt-4">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                </details>
              )}

              {/* What to do */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                  What can you do?
                </h3>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Try refreshing the page or going back to the home screen</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Check if your data is saved and try the action again</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>If the problem persists, contact support with the error details above</span>
                  </li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} />
                  Try Again
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 px-6 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Home size={18} />
                  Go Home
                </button>
              </div>

              {/* Development Helper */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-xs text-yellow-800 dark:text-yellow-300 font-medium">
                    💡 Development Mode: Check the console for more details
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
