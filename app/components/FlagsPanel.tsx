'use client';

import { useEffect, useState } from 'react';

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
      const response = await fetch(`http://localhost:3001/api/editing/chapters/${chapterId}/flags`);
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
        `http://localhost:3001/api/editing/chapters/${chapterId}/flags/${flagId}/resolve`,
        { method: 'POST' }
      );
      if (!response.ok) throw new Error('Failed to resolve flag');

      // Refresh flags
      await fetchFlags();
    } catch (err: any) {
      console.error('Error resolving flag:', err);
      alert(`Error resolving flag: ${err.message}`);
    }
  }

  if (loading) {
    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        padding: '1.5rem',
      }}>
        <p style={{ color: '#888', margin: 0 }}>Loading flags...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: 'rgba(255, 100, 100, 0.1)',
        border: '1px solid rgba(255, 100, 100, 0.3)',
        borderRadius: '8px',
        padding: '1.5rem',
      }}>
        <p style={{ color: '#ff6b6b', margin: 0 }}>{error}</p>
      </div>
    );
  }

  const unresolvedFlags = flags.filter(f => !f.resolved);
  const resolvedFlags = flags.filter(f => f.resolved);

  if (flags.length === 0) {
    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        padding: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#4ade80',
          }} />
          <h3 style={{ fontSize: '1rem', margin: 0, color: '#ededed' }}>
            Chapter {chapterNumber} - Editor Flags
          </h3>
        </div>
        <p style={{ color: '#888', fontSize: '0.875rem', margin: 0 }}>
          No issues flagged. Chapter looks good!
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      padding: '1.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: unresolvedFlags.length > 0 ? '#fbbf24' : '#4ade80',
          }} />
          <h3 style={{ fontSize: '1rem', margin: 0, color: '#ededed' }}>
            Chapter {chapterNumber} - Editor Flags
          </h3>
        </div>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
          <span style={{ color: '#fbbf24' }}>
            {unresolvedFlags.length} unresolved
          </span>
          <span style={{ color: '#4ade80' }}>
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
