import React from 'react'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  override render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="container py-5 text-center">
            <div className="alert alert-danger d-inline-block">
              <h4 className="alert-heading">⚠️ Fehler aufgetreten</h4>
              <p className="mb-2">{this.state.error?.message ?? 'Unbekannter Fehler'}</p>
              <button className="btn btn-outline-danger btn-sm" onClick={() => window.location.reload()}>
                Seite neu laden
              </button>
            </div>
          </div>
        )
      )
    }
    return this.props.children
  }
}
