'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import * as Sentry from '@sentry/nextjs'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
    children: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

class GlobalErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo)

        // Log to Sentry if initialized
        if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
            Sentry.captureException(error)
        }
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-[#FBFAEE] p-4">
                    <div className="max-w-md w-full glass-card p-8 rounded-2xl border border-red-500/20 shadow-2xl shadow-red-900/20 text-center">
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>

                        <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                            Something went wrong
                        </h1>

                        <p className="text-[#FBFAEE]/60 mb-8">
                            We apologize for the inconvenience. The application encountered an unexpected error.
                        </p>

                        <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4 mb-8 text-left overflow-auto max-h-40">
                            <p className="font-mono text-xs text-red-300 break-all">
                                {this.state.error?.message || 'Unknown error'}
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-3 bg-[#933DC9] hover:bg-[#7E34AB] text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Reload Page
                            </button>

                            <button
                                onClick={() => window.location.href = '/'}
                                className="px-6 py-3 bg-[#242424] hover:bg-[#333] text-[#FBFAEE] rounded-xl font-medium transition-all flex items-center justify-center gap-2 border border-white/10"
                            >
                                <Home className="w-4 h-4" />
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export default GlobalErrorBoundary
