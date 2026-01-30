'use client';

import { useProgressStream } from '../lib/progress-stream';
import { theme } from '../lib/theme';

export function ProgressDashboard() {
  const { connected, jobUpdates, currentProgress, sessionStatus, queueStats } = useProgressStream();

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.colors.background,
    }}>
      {/* Connection Status */}
      <div style={{
        padding: '1rem',
        background: connected ? theme.colors.success : theme.colors.error,
        color: '#FFFFFF',
        fontSize: '0.875rem',
        textAlign: 'center',
      }}>
        {connected ? '🟢 Connected to live updates' : '🔴 Disconnected - reconnecting...'}
      </div>

      <div style={{
        padding: '2rem',
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        {/* Header */}
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '600',
          color: theme.colors.text,
          marginBottom: '2rem',
        }}>
          Generation Progress
        </h1>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          <StatCard
            label="Pending"
            value={queueStats?.pending || 0}
            color={theme.colors.warning}
          />
          <StatCard
            label="Running"
            value={queueStats?.running || 0}
            color={theme.colors.running}
          />
          <StatCard
            label="Completed"
            value={queueStats?.completed || 0}
            color={theme.colors.completed}
          />
          <StatCard
            label="Failed"
            value={queueStats?.failed || 0}
            color={theme.colors.failed}
          />
        </div>

        {/* Current Progress */}
        {currentProgress && (
          <div style={{
            background: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.md,
            padding: '1.5rem',
            marginBottom: '2rem',
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: theme.colors.text,
              marginBottom: '1rem',
            }}>
              Current Activity
            </h2>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{
                fontSize: '0.875rem',
                color: theme.colors.textSecondary,
                marginBottom: '0.5rem',
              }}>
                Chapter {currentProgress.chapter_number} - {currentProgress.agent}
              </div>
              <div style={{
                background: theme.colors.primaryLight,
                borderRadius: theme.borderRadius.sm,
                height: '8px',
                overflow: 'hidden',
              }}>
                <div style={{
                  background: theme.colors.primary,
                  height: '100%',
                  width: `${currentProgress.progress}%`,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          </div>
        )}

        {/* Session Status */}
        {sessionStatus && (
          <div style={{
            background: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.borderRadius.md,
            padding: '1.5rem',
            marginBottom: '2rem',
          }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: theme.colors.text,
              marginBottom: '1rem',
            }}>
              Claude Max Status
            </h3>

            <div style={{
              fontSize: '0.875rem',
              color: theme.colors.textSecondary,
            }}>
              <p>Requests this session: <strong>{sessionStatus.requests_this_session}</strong></p>
              <p>Time remaining: <strong>{sessionStatus.time_remaining}</strong></p>
              <p>Status: <strong style={{ color: sessionStatus.is_active ? theme.colors.success : theme.colors.warning }}>
                {sessionStatus.is_active ? 'Active' : 'Paused'}
              </strong></p>
            </div>
          </div>
        )}

        {/* Recent Activity Log */}
        <div style={{
          background: theme.colors.surface,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.borderRadius.md,
          padding: '1.5rem',
        }}>
          <h3 style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: theme.colors.text,
            marginBottom: '1rem',
          }}>
            Recent Activity
          </h3>

          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
          }}>
            {jobUpdates.slice().reverse().map((job, i) => (
              <div
                key={i}
                style={{
                  padding: '0.75rem',
                  borderBottom: `1px solid ${theme.colors.border}`,
                  fontSize: '0.875rem',
                }}
              >
                <span style={{
                  padding: '0.25rem 0.5rem',
                  background: getStatusColor(job.status),
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#FFFFFF',
                  marginRight: '0.5rem',
                }}>
                  {job.status}
                </span>
                <span style={{ color: theme.colors.text }}>
                  {job.type}
                </span>
                <span style={{ color: theme.colors.textTertiary, marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                  {new Date(job.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}

            {jobUpdates.length === 0 && (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: theme.colors.textSecondary,
              }}>
                No recent activity
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.borderRadius.md,
      padding: '1.5rem',
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: '2rem',
        fontWeight: '700',
        color: color,
        marginBottom: '0.5rem',
      }}>
        {value}
      </div>
      <div style={{
        fontSize: '0.875rem',
        fontWeight: '500',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: theme.colors.pending,
    running: theme.colors.running,
    completed: theme.colors.completed,
    failed: theme.colors.failed,
    paused: theme.colors.paused,
  };
  return colors[status] || theme.colors.textSecondary;
}
