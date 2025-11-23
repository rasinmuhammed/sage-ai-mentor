'use client'

import React, { Component, ReactNode, createContext, useContext, useState, useEffect } from 'react'
import { AlertTriangle, RefreshCw, CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

// =================================================================
// 1. ErrorBoundary Component
// =================================================================

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
          <div className="bg-[#242424] border border-red-500/40 rounded-2xl p-8 max-w-md w-full text-center">
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#FBFAEE] mb-2">
              Oops! Something went wrong
            </h2>
            <p className="text-[#FBFAEE]/70 mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-[#933DC9] to-[#53118F] text-[#FBFAEE] px-6 py-3 rounded-xl font-semibold hover:brightness-110 transition flex items-center justify-center mx-auto"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// =================================================================
// 2. ToastProvider and Toast Logic (moved from Toast.tsx)
// =================================================================

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  description?: string
}

let addToastFn: ((toast: Omit<Toast, 'id'>) => void) | null = null

export const toast = {
  success: (message: string, description?: string) => {
    addToastFn?.({ type: 'success', message, description })
  },
  error: (message: string, description?: string) => {
    addToastFn?.({ type: 'error', message, description })
  },
  warning: (message: string, description?: string) => {
    addToastFn?.({ type: 'warning', message, description })
  },
  info: (message: string, description?: string) => {
    addToastFn?.({ type: 'info', message, description })
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    addToastFn = (toast: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substr(2, 9)
      setToasts(prev => [...prev, { ...toast, id }])
      setTimeout(() => removeToast(id), 5000)
    }
    return () => { addToastFn = null }
  }, [])

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const getIcon = (type: ToastType) => {
    const icons = {
      success: <CheckCircle className="w-5 h-5" />,
      error: <XCircle className="w-5 h-5" />,
      warning: <AlertCircle className="w-5 h-5" />,
      info: <Info className="w-5 h-5" />
    }
    return icons[type]
  }

  const getStyles = (type: ToastType) => {
    const styles = {
      success: 'bg-green-900/40 border-green-500/40 text-green-300',
      error: 'bg-red-900/40 border-red-500/40 text-red-300',
      warning: 'bg-yellow-900/40 border-yellow-500/40 text-yellow-300',
      info: 'bg-blue-900/40 border-blue-500/40 text-blue-300'
    }
    return styles[type]
  }

  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] space-y-2 max-w-md w-full pointer-events-none px-4">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`${getStyles(t.type)} border rounded-xl p-4 shadow-lg animate-in slide-in-from-right pointer-events-auto`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(t.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{t.message}</p>
                {t.description && (
                  <p className="text-xs mt-1 opacity-90">{t.description}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="flex-shrink-0 opacity-70 hover:opacity-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}