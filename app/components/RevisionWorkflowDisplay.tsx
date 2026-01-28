'use client';

import { useState } from 'react';

interface ChapterStatus {
  chapterId: string;
  chapterNumber: number;
  status: 'pending' | 'generating' | 'ready' | 'approving' | 'applied' | 'rejected' | 'failed';
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

interface RevisionWorkflowDisplayProps {
  chapters: ChapterStatus[];
  isProcessing: boolean;
  currentChapter: number | null;
  onRestartChapter: (chapterId: string) => void;
  mode: 'generate' | 'approve';
}

export default function RevisionWorkflowDisplay({
  chapters,
  isProcessing,
  currentChapter,
  onRestartChapter,
  mode,
}: RevisionWorkflowDisplayProps) {
  const [hoveredChapter, setHoveredChapter] = useState<number | null>(null);

  const getStatusConfig = (status: string, isActive: boolean) => {
    if (isActive) {
      return {
        bg: '#EDE9FE',
        border: '#8B5CF6',
        text: '#5B21B6',
        icon: '...',
        label: mode === 'generate' ? 'Generating' : 'Approving',
      };
    }

    switch (status) {
      case 'pending':
        return { bg: '#F8FAFC', border: '#E2E8F0', text: '#64748B', icon: '○', label: 'Pending' };
      case 'generating':
        return { bg: '#EDE9FE', border: '#8B5CF6', text: '#5B21B6', icon: '◎', label: 'Generating' };
      case 'ready':
        return { bg: '#DBEAFE', border: '#3B82F6', text: '#1D4ED8', icon: '◉', label: 'Ready' };
      case 'approving':
        return { bg: '#FEF3C7', border: '#F59E0B', text: '#D97706', icon: '◎', label: 'Approving' };
      case 'applied':
        return { bg: '#D1FAE5', border: '#10B981', text: '#059669', icon: '✓', label: 'Applied' };
      case 'rejected':
        return { bg: '#FEE2E2', border: '#EF4444', text: '#DC2626', icon: '✗', label: 'Rejected' };
      case 'failed':
        return { bg: '#FEE2E2', border: '#EF4444', text: '#DC2626', icon: '!', label: 'Failed' };
      default:
        return { bg: '#F8FAFC', border: '#E2E8F0', text: '#64748B', icon: '?', label: 'Unknown' };
    }
  };

  const completedCount = chapters.filter(c =>
    c.status === 'applied' || c.status === 'ready' || c.status === 'rejected'
  ).length;
  const failedCount = chapters.filter(c => c.status === 'failed').length;
  const progressPercent = chapters.length > 0
    ? Math.round((completedCount / chapters.length) * 100)
    : 0;

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #E2E8F0',
      overflow: 'hidden',
      marginBottom: '1.5rem',
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem 1.5rem',
        borderBottom: '1px solid #E2E8F0',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem' }}>
              {mode === 'generate' ? 'Generation Pipeline' : 'Approval Pipeline'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.9 }}>
              {completedCount} of {chapters.length} chapters processed
              {failedCount > 0 && ` (${failedCount} failed)`}
            </p>
          </div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: '700',
          }}>
            {progressPercent}%
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          marginTop: '0.75rem',
          height: '6px',
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '3px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: 'white',
            borderRadius: '3px',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* Chapter Grid */}
      <div style={{
        padding: '1rem 1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        {chapters.map((chapter) => {
          const isActive = isProcessing && currentChapter === chapter.chapterNumber;
          const config = getStatusConfig(chapter.status, isActive);
          const canRestart = chapter.status === 'failed' ||
            (isProcessing && chapter.status === 'generating' && hoveredChapter === chapter.chapterNumber);

          return (
            <div
              key={chapter.chapterId}
              onMouseEnter={() => setHoveredChapter(chapter.chapterNumber)}
              onMouseLeave={() => setHoveredChapter(null)}
              style={{
                position: 'relative',
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                background: config.bg,
                border: `2px solid ${config.border}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: canRestart ? 'pointer' : 'default',
                transition: 'all 0.2s',
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
                boxShadow: isActive ? `0 0 0 4px ${config.border}40` : 'none',
              }}
              onClick={() => canRestart && onRestartChapter(chapter.chapterId)}
              title={`Chapter ${chapter.chapterNumber}: ${config.label}${chapter.error ? ` - ${chapter.error}` : ''}${canRestart ? ' (click to restart)' : ''}`}
            >
              {/* Chapter number */}
              <span style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: config.text,
              }}>
                {chapter.chapterNumber}
              </span>

              {/* Status icon */}
              <span style={{
                fontSize: '0.625rem',
                color: config.text,
              }}>
                {isActive ? (
                  <span style={{
                    display: 'inline-block',
                    width: '10px',
                    height: '10px',
                    border: `2px solid ${config.border}`,
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }} />
                ) : config.icon}
              </span>

              {/* Restart overlay for failed/stuck chapters */}
              {canRestart && hoveredChapter === chapter.chapterNumber && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.7)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                }}>
                  ↻
                </div>
              )}

              {/* Pulse animation for active */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  inset: '-4px',
                  border: `2px solid ${config.border}`,
                  borderRadius: '10px',
                  animation: 'pulse 1.5s ease-out infinite',
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{
        padding: '0.75rem 1.5rem',
        borderTop: '1px solid #E2E8F0',
        background: '#F8FAFC',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        fontSize: '0.75rem',
        color: '#64748B',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ color: '#64748B' }}>○</span> Pending
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ color: '#5B21B6' }}>◎</span> Processing
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ color: '#1D4ED8' }}>◉</span> Ready
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ color: '#059669' }}>✓</span> Applied
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ color: '#DC2626' }}>!</span> Failed (click to retry)
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.3); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
