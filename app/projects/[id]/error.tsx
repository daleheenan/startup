'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error('Project Page Error:', error);
  }, [error]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconContainer}>
          <span style={styles.icon}>&#9888;&#65039;</span>
        </div>

        <h1 style={styles.title}>Error Loading Project</h1>

        <p style={styles.description}>
          Something went wrong while loading this project page.
        </p>

        <div style={styles.buttonGroup}>
          <button onClick={reset} style={{...styles.button, ...styles.primaryButton}}>
            Try Again
          </button>
          <Link href="/projects" style={{...styles.button, ...styles.secondaryButton, textDecoration: 'none'}}>
            Back to Projects
          </Link>
        </div>

        <details style={styles.details} open>
          <summary style={styles.summary}>Error Details</summary>
          <div style={styles.errorDetails}>
            <p style={styles.errorMessage}><strong>Type:</strong> {error.name}</p>
            <p style={styles.errorMessage}><strong>Message:</strong> {error.message}</p>
            {error.digest && (
              <p style={styles.errorMessage}><strong>Digest:</strong> {error.digest}</p>
            )}
            {error.stack && (
              <>
                <p style={styles.errorMessage}><strong>Stack Trace:</strong></p>
                <pre style={styles.stackTrace}>{error.stack}</pre>
              </>
            )}
          </div>
        </details>
      </div>
    </div>
  );
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
    maxWidth: '700px',
    width: '100%',
    background: '#FFFFFF',
    borderRadius: '16px',
    padding: '3rem 2rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    textAlign: 'center' as const,
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
    display: 'inline-block',
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
    textAlign: 'left' as const,
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
    marginBottom: '0.5rem',
    wordBreak: 'break-word' as const,
    fontSize: '0.875rem',
  },
  stackTrace: {
    background: '#FFFFFF',
    padding: '1rem',
    borderRadius: '4px',
    overflow: 'auto',
    fontSize: '0.75rem',
    color: '#374151',
    maxHeight: '300px',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    textAlign: 'left' as const,
  },
};
