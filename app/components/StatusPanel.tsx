'use client';

import { useEffect, useState } from 'react';
import { checkHealth, getQueueStats, type QueueStats, type HealthStatus } from '../lib/api';
import { colors, borderRadius } from '../lib/constants';
import { card } from '../lib/styles';

export default function StatusPanel() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // BUG-010 FIX: Already has try/catch, but ensure proper error handling
  useEffect(() => {
    async function fetchStatus() {
      try {
        const [healthData, statsData] = await Promise.all([
          checkHealth(),
          getQueueStats(),
        ]);

        setHealth(healthData);
        setStats(statsData);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    // BUG-010 FIX: Wrap initial call in try/catch
    fetchStatus().catch(err => {
      console.error('Failed to fetch status on mount:', err);
      setLoading(false);
    });

    // Poll every 5 seconds
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const panelStyle = {
    ...card,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  };

  if (loading) {
    return (
      <div style={panelStyle}>
        <p style={{ color: colors.textSecondary, margin: 0 }}>Loading status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        ...panelStyle,
        background: 'rgba(255, 100, 100, 0.1)',
        border: '1px solid rgba(255, 100, 100, 0.3)',
      }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: colors.red }}>
          Backend Offline
        </h3>
        <p style={{ color: colors.textSecondary, fontSize: '0.875rem', margin: 0 }}>
          {error}
        </p>
        <p style={{ color: colors.textTertiary, fontSize: '0.75rem', marginTop: '0.5rem', margin: 0 }}>
          Make sure the backend server is running on port 3001
        </p>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: borderRadius.full,
          background: health?.status === 'ok' ? colors.green : colors.red,
        }} />
        <h3 style={{ fontSize: '1rem', margin: 0, color: '#ededed' }}>
          System Status
        </h3>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {/* Queue Stats */}
        <div>
          <h4 style={{ fontSize: '0.875rem', color: colors.textSecondary, marginBottom: '0.5rem' }}>
            Queue
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            <StatItem label="Pending" value={stats?.queue.pending || 0} color={colors.yellow} />
            <StatItem label="Running" value={stats?.queue.running || 0} color={colors.blue} />
            <StatItem label="Completed" value={stats?.queue.completed || 0} color={colors.green} />
          </div>
        </div>

        {/* Session Stats */}
        <div>
          <h4 style={{ fontSize: '0.875rem', color: colors.textSecondary, marginBottom: '0.5rem' }}>
            Claude Session
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <p style={{ fontSize: '0.75rem', color: colors.textTertiary, margin: 0 }}>
              Status: <span style={{ color: stats?.session.isActive ? colors.green : colors.textSecondary }}>
                {stats?.session.isActive ? 'Active' : 'Inactive'}
              </span>
            </p>
            <p style={{ fontSize: '0.75rem', color: colors.textTertiary, margin: 0 }}>
              Requests: <span style={{ color: '#ededed' }}>
                {stats?.session.requestsThisSession || 0}
              </span>
            </p>
            <p style={{ fontSize: '0.75rem', color: colors.textTertiary, margin: 0 }}>
              Time Remaining: <span style={{ color: '#ededed' }}>
                {stats?.session.timeRemaining || 'N/A'}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      borderRadius: '6px',
      padding: '0.5rem',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color, marginBottom: '0.25rem' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.625rem', color: '#888', textTransform: 'uppercase' }}>
        {label}
      </div>
    </div>
  );
}
