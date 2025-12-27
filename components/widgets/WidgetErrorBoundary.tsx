'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

interface Props {
  children: ReactNode
  widgetTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Widget Error Boundary
 * 
 * Catches errors in widget components and displays a friendly error message
 * instead of crashing the entire dashboard. Each widget is isolated, so one
 * widget's error won't affect others.
 */
export class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.error('Widget Error Boundary caught an error:', error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      // Render friendly error UI
      return (
        <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-900/20">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="mb-1 text-sm font-semibold text-red-400">
                {this.props.widgetTitle || 'Widget Error'}
              </h3>
              <p className="text-xs text-red-300/80 leading-relaxed">
                This widget encountered an error and couldn't load. Please try refreshing the page or removing and re-adding this widget.
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}




