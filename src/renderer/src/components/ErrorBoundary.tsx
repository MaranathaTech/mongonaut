import React from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props {
  children: React.ReactNode
  fallbackLabel?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(`[ErrorBoundary${this.props.fallbackLabel ? ` - ${this.props.fallbackLabel}` : ''}]`, error, errorInfo)
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-zinc-200">
              {this.props.fallbackLabel
                ? `Something went wrong in ${this.props.fallbackLabel}`
                : 'Something went wrong'}
            </p>
            <p className="mt-1 max-w-sm text-xs text-gray-500 dark:text-zinc-400">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
          >
            <RotateCcw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
