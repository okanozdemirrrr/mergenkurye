/**
 * @file src/components/ErrorBoundary.tsx
 * @description React Error Boundary - Bileşen hatalarını yakalar
 * 🛡️ AŞAMA 5: Kritik bileşenlerin çökmesini önler
 */

'use client'

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Map, ClipboardList } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  componentName?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
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

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🛡️ ErrorBoundary yakaladı:', {
      component: this.props.componentName || 'Unknown',
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    })

    this.setState({
      error,
      errorInfo
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex items-center justify-center p-8 bg-red-50 dark:bg-red-900/20 rounded-md border border-white/5 shadow-sm">
          <div className="text-center max-w-md">
            <div className="mb-4 flex justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">
              {this.props.componentName || 'Bu Bileşen'} Yüklenemedi
            </h3>
            <p className="text-sm text-red-600 dark:text-red-500 mb-4">
              Bir hata oluştu ama endişelenmeyin, diğer her şey çalışmaya devam ediyor.
            </p>
            {this.state.error && (
              <details className="text-left mb-4">
                <summary className="cursor-pointer text-sm text-red-600 dark:text-red-500 hover:text-red-700 dark:hover:text-red-400">
                  Teknik Detaylar
                </summary>
                <pre className="mt-2 p-3 bg-red-100 dark:bg-red-900/30 rounded text-xs overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors inline-flex items-center gap-2"
            >
              <RefreshCw size={16} strokeWidth={1.5} />
              Tekrar Dene
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export const MapErrorFallback = () => (
  <div className="flex items-center justify-center h-full bg-slate-100 dark:bg-slate-800 rounded-md border border-white/5 shadow-sm">
    <div className="text-center p-6">
      <div className="mb-3 flex justify-center">
        <Map className="w-8 h-8 text-slate-600 dark:text-slate-400" strokeWidth={1.5} />
      </div>
      <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">
        Harita Yüklenemedi
      </h4>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Harita servisi şu anda kullanılamıyor
      </p>
    </div>
  </div>
)

export const TableErrorFallback = () => (
  <div className="flex items-center justify-center p-8 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-white/5 shadow-sm">
    <div className="text-center">
      <div className="mb-3 flex justify-center">
        <ClipboardList className="w-8 h-8 text-yellow-600 dark:text-yellow-400" strokeWidth={1.5} />
      </div>
      <h4 className="text-lg font-bold text-yellow-700 dark:text-yellow-400 mb-2">
        Tablo Yüklenemedi
      </h4>
      <p className="text-sm text-yellow-600 dark:text-yellow-500">
        Veriler yüklenirken bir sorun oluştu
      </p>
    </div>
  </div>
)
