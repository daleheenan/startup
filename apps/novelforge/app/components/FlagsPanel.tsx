'use client';

import { useEffect, useState } from 'react';
import { colors, borderRadius, API_BASE_URL } from '../lib/constants';
import { card } from '../lib/styles';

interface Flag {
  id: string;
  type: string;
  severity: 'minor' | 'major' | 'critical';
  description: string;
  location?: string;
  resolved: boolean;
}

interface FlagsPanelProps {
  chapterId: string;
  chapterNumber: number;
}

export default function FlagsPanel({ chapterId, chapterNumber }: FlagsPanelProps) {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFlags();
  }, [chapterId]);

  async function fetchFlags() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/editing/chapters/${chapterId}/flags`);
      if (!response.ok) throw new Error('Failed to fetch flags');

      const data = await response.json();
      setFlags(data.flags);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function resolveFlag(flagId: string) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/editing/chapters/${chapterId}/flags/${flagId}/resolve`,
        { method: 'POST' }
      );
      if (!response.ok) throw new Error('Failed to resolve flag');

      await fetchFlags();
    } catch (err: any) {
      console.error('Error resolving flag:', err);
      alert(`Error resolving flag: ${err.message}`);
    }
  }

  const panelStyle = {
    ...card,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  };

  if (loading) {
    return (
      <div style={panelStyle}>
        <p style={{ color: colors.textSecondary, margin: 0 }}>Loading flags...</p>
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
        <p style={{ color: colors.red, margin: 0 }}>{error}</p>
      </div>
    );
  }

  const unresolvedFlags = flags.filter(f => !f.resolved);
  const resolvedFlags = flags.filter(f => f.resolved);

  if (flags.length === 0) {
    return (
      <div style={panelStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: borderRadius.full,
            background: colors.green,
          }} />
          <h3 style={{ fontSize: '1rem', margin: 0, color: '#ededed' }}>
            Chapter {chapterNumber} - Editor Flags
          </h3>
        </div>
        <p style={{ color: colors.textSecondary, fontSize: '0.875rem', margin: 0 }}>
          No issues flagged. Chapter looks good!
        </p>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: borderRadius.full,
            background: unresolvedFlags.length > 0 ? colors.yellow : colors.green,
          }} />
          <h3 style={{ fontSize: '1rem', margin: 0, color: '#ededed' }}>
            Chapter {chapterNumber} - Editor Flags
          </h3>
        </div>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
          <span style={{ color: colors.yellow }}>
            {unresolvedFlags.length} unresolved
          </span>
          <span style={{ color: colors.green }}>
            {resolvedFlags.length} resolved
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {unresolvedFlags.map((flag) => (
          <FlagItem
            key={flag.id}
            flag={flag}
            onResolve={() => resolveFlag(flag.id)}
          />
        ))}

        {resolvedFlags.length > 0 && (
          <>
            <div style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              marginTop: '0.5rem',
              paddingTop: '0.75rem',
            }}>
              <h4 style={{ fontSize: '0.875rem', color: '#888', marginBottom: '0.5rem' }}>
                Resolved Issues
              </h4>
            </div>
            {resolvedFlags.map((flag) => (
              <FlagItem key={flag.id} flag={flag} resolved />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

interface FlagItemProps {
  flag: Flag;
  resolved?: boolean;
  onResolve?: () => void;
}

function FlagItem({ flag, resolved, onResolve }: FlagItemProps) {
  const severityColors = {
    minor: '#60a5fa',
    major: '#fbbf24',
    critical: '#ff6b6b',
  };

  const typeIcons = {
    unresolved: '⚠️',
    needs_review: '👁️',
    continuity_error: '🔗',
    plot_hole: '🕳️',
  };

  return (
    <div style={{
      background: resolved ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)',
      border: `1px solid ${resolved ? 'rgba(255, 255, 255, 0.05)' : severityColors[flag.severity]}40`,
      borderRadius: '6px',
      padding: '0.75rem',
      opacity: resolved ? 0.6 : 1,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1rem' }}>
              {typeIcons[flag.type as keyof typeof typeIcons] || '📌'}
            </span>
            <span style={{
              fontSize: '0.75rem',
              color: severityColors[flag.severity],
              textTransform: 'uppercase',
              fontWeight: 'bold',
            }}>
              {flag.severity}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#888' }}>
              {flag.type.replace(/_/g, ' ')}
            </span>
          </div>

          <p style={{
            fontSize: '0.875rem',
            color: '#ededed',
            margin: '0.5rem 0',
            lineHeight: '1.4',
          }}>
            {flag.description}
          </p>

          {flag.location && (
            <p style={{ fontSize: '0.75rem', color: '#888', margin: 0 }}>
              Location: {flag.location}
            </p>
          )}
        </div>

        {!resolved && onResolve && (
          <button
            onClick={onResolve}
            style={{
              background: 'rgba(74, 222, 128, 0.1)',
              border: '1px solid rgba(74, 222, 128, 0.3)',
              borderRadius: '4px',
              padding: '0.25rem 0.75rem',
              fontSize: '0.75rem',
              color: '#4ade80',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(74, 222, 128, 0.2)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(74, 222, 128, 0.1)';
            }}
          >
            Resolve
          </button>
        )}
      </div>
    </div>
  );
}
