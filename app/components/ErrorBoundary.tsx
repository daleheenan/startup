'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * BUG-008 FIX: Error Boundary to catch React component crashes
 * Prevents white screen of death when runtime errors occur
 */
export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // You could also log to an error reporting service here
    // e.g., Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI or use provided fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconContainer}>
              <span style={styles.icon}>⚠️</span>
            </div>

            <h1 style={styles.title}>Oops! Something went wrong</h1>

            <p style={styles.description}>
              We're sorry, but something unexpected happened. The error has been logged and we'll look into it.
            </p>

            <div style={styles.buttonGroup}>
              <button onClick={this.handleReset} style={{...styles.button, ...styles.primaryButton}}>
                Try Again
              </button>
              <button onClick={() => window.location.href = '/'} style={{...styles.button, ...styles.secondaryButton}}>
                Go to Home
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={styles.details}>
                <summary style={styles.summary}>Error Details (Development Only)</summary>
                <div style={styles.errorDetails}>
                  <p style={styles.errorMessage}><strong>Error:</strong> {this.state.error.toString()}</p>
                  {this.state.errorInfo && (
                    <pre style={styles.stackTrace}>{this.state.errorInfo.componentStack}</pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F8FAFC',
    padding: '2rem',
  },
  card: {
    maxWidth: '600px',
    width: '100%',
    background: '#FFFFFF',
    borderRadius: '16px',
    padding: '3rem 2rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
  },
  iconContainer: {
    marginBottom: '1.5rem',
  },
  icon: {
    fontSize: '4rem',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: '1rem',
  },
  description: {
    fontSize: '1rem',
    color: '#64748B',
    marginBottom: '2rem',
    lineHeight: '1.6',
  },
  buttonGroup: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    marginBottom: '2rem',
  },
  button: {
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s',
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#FFFFFF',
    boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)',
  },
  secondaryButton: {
    background: '#FFFFFF',
    color: '#667eea',
    border: '1px solid #E2E8F0',
  },
  details: {
    textAlign: 'left',
    marginTop: '2rem',
    background: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: '8px',
    padding: '1rem',
  },
  summary: {
    cursor: 'pointer',
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: '0.5rem',
  },
  errorDetails: {
    marginTop: '1rem',
  },
  errorMessage: {
    color: '#DC2626',
    marginBottom: '1rem',
    wordBreak: 'break-word',
  },
  stackTrace: {
    background: '#FFFFFF',
    padding: '1rem',
    borderRadius: '4px',
    overflow: 'auto',
    fontSize: '0.875rem',
    color: '#374151',
    maxHeight: '300px',
  },
};
