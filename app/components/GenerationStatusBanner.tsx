'use client';

import React from 'react';

interface GenerationStatusBannerProps {
  status: string;
  completedChapters: number;
  totalChapters: number;
  currentWordCount: number;
  targetWordCount: number;
  estimatedTimeRemaining?: number;
  currentActivity?: {
    chapterNumber: number;
    jobType: string;
  };
}

export default function GenerationStatusBanner({
  status,
  completedChapters,
  totalChapters,
  currentWordCount,
  targetWordCount,
  estimatedTimeRemaining,
  currentActivity,
}: GenerationStatusBannerProps) {
  const percentComplete = totalChapters > 0
    ? Math.round((completedChapters / totalChapters) * 100)
    : 0;

  const formatDuration = (ms: number): string => {
    if (!ms || ms === 0) return 'Calculating...';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getStatusColor = () => {
    if (status === 'completed') return '#10B981';
    if (status === 'paused') return '#F59E0B';
    return '#667eea';
  };

  const getStatusText = () => {
    if (status === 'completed') return 'Generation Complete';
    if (status === 'paused') return 'Generation Paused';
    if (currentActivity) return `Generating Chapter ${currentActivity.chapterNumber}...`;
    return 'Generating...';
  };

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '1.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      {/* Status Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {status === 'generating' && (
            <div style={{
              width: '20px',
              height: '20px',
              border: '3px solid #E2E8F0',
              borderTop: '3px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
          )}
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: '#1A1A2E',
            margin: 0,
          }}>
            {getStatusText()}
          </h2>
        </div>
        <div style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: getStatusColor(),
        }}>
          {percentComplete}%
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{
        width: '100%',
        height: '40px',
        background: '#E2E8F0',
        borderRadius: '20px',
        overflow: 'hidden',
        marginBottom: '1rem',
      }}>
        <div style={{
          width: `${percentComplete}%`,
          height: '100%',
          background: `linear-gradient(135deg, ${getStatusColor()} 0%, ${getStatusColor()}dd 100%)`,
          transition: 'width 0.5s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          fontWeight: 600,
          fontSize: '0.875rem',
        }}>
          {percentComplete > 10 && `${completedChapters} / ${totalChapters} chapters`}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
      }}>
        {/* Word Count */}
        <div style={{
          padding: '1rem',
          background: '#F8FAFC',
          borderRadius: '8px',
        }}>
          <div style={{
            fontSize: '0.75rem',
            color: '#64748B',
            marginBottom: '0.25rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Word Count
          </div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#1A1A2E',
          }}>
            {currentWordCount.toLocaleString()}
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#64748B',
            marginTop: '0.25rem',
          }}>
            of {targetWordCount.toLocaleString()} target
          </div>
        </div>

        {/* Time Remaining */}
        {estimatedTimeRemaining !== undefined && (
          <div style={{
            padding: '1rem',
            background: '#F8FAFC',
            borderRadius: '8px',
          }}>
            <div style={{
              fontSize: '0.75rem',
              color: '#64748B',
              marginBottom: '0.25rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Time Remaining
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#1A1A2E',
            }}>
              {formatDuration(estimatedTimeRemaining)}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#64748B',
              marginTop: '0.25rem',
            }}>
              estimated
            </div>
          </div>
        )}

        {/* Current Activity */}
        {currentActivity && (
          <div style={{
            padding: '1rem',
            background: '#EEF2FF',
            borderRadius: '8px',
            border: '1px solid #C7D2FE',
          }}>
            <div style={{
              fontSize: '0.75rem',
              color: '#64748B',
              marginBottom: '0.25rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Current Activity
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#667eea',
            }}>
              Chapter {currentActivity.chapterNumber}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#64748B',
              marginTop: '0.25rem',
            }}>
              {currentActivity.jobType}
            </div>
          </div>
        )}
      </div>

      {/* CSS for spinner animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
