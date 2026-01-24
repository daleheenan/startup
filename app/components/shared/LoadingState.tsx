'use client';

import { loadingContainer, loadingSpinner, loadingText } from '@/app/lib/styles';

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div style={loadingContainer}>
      <div style={{ textAlign: 'center' }}>
        <div style={loadingSpinner} />
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
