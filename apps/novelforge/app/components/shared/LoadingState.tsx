'use client';

import { loadingContainer, loadingSpinner, loadingText } from '@/app/lib/styles';

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      style={loadingContainer}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          aria-hidden="true"
          style={loadingSpinner}
        />
        <p style={loadingText}>{message}</p>
      </div>
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
