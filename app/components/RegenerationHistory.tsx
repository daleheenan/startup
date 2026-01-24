'use client';

import { useState, useEffect } from 'react';
import { getToken, logout } from '../lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RegenerationHistoryProps {
  chapterId: string;
}

interface HistoryEntry {
  id: string;
  actionType: string;
  originalText: string | null;
  finalText: string | null;
  mode: string | null;
  selectionStart: number | null;
  selectionEnd: number | null;
  createdAt: string;
}

export default function RegenerationHistory({ chapterId }: RegenerationHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [chapterId]);

  const fetchHistory = async () => {
    try {
      const token = getToken();
      const res = await fetch(
        `${API_BASE_URL}/api/regeneration/chapters/${chapterId}/history?limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!res.ok) {
        if (res.status === 401) {
          logout();
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to fetch history');
      }

      const data = await res.json();
      setHistory(data.history);
    } catch (error) {
      console.error('Error fetching regeneration history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case 'generate_variations':
        return '✨ Generated Variations';
      case 'apply_variation':
        return '✅ Applied Variation';
      case 'scene_regen':
        return '🎬 Regenerated Scene';
      default:
        return actionType;
    }
  };

  const getModeLabel = (mode: string | null) => {
    if (!mode) return '';
    switch (mode) {
      case 'general':
        return '(General)';
      case 'dialogue':
        return '(Dialogue)';
      case 'description':
        return '(Description)';
      case 'scene':
        return '(Scene)';
      default:
        return `(${mode})`;
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <p>Loading history...</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div style={styles.empty}>
        <p>No regeneration history yet.</p>
        <p style={styles.hint}>Select text and use regeneration to see history here.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Regeneration History</h3>
      <div style={styles.timeline}>
        {history.map((entry) => (
          <div key={entry.id} style={styles.entry}>
            <div style={styles.entryHeader}>
              <div style={styles.entryTitle}>
                {getActionLabel(entry.actionType)}{' '}
                <span style={styles.mode}>{getModeLabel(entry.mode)}</span>
              </div>
              <div style={styles.entryDate}>{formatDate(entry.createdAt)}</div>
            </div>
            {entry.finalText && (
              <button
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                style={styles.expandButton}
              >
                {expandedId === entry.id ? '▼ Hide Details' : '▶ Show Details'}
              </button>
            )}
            {expandedId === entry.id && (
              <div style={styles.details}>
                {entry.originalText && (
                  <div style={styles.textBlock}>
                    <div style={styles.textLabel}>Original:</div>
                    <div style={styles.textContent}>{entry.originalText}</div>
                  </div>
                )}
                {entry.finalText && (
                  <div style={styles.textBlock}>
                    <div style={styles.textLabel}>Final:</div>
                    <div style={styles.textContent}>{entry.finalText}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '16px',
  },
  loading: {
    textAlign: 'center',
    padding: '24px',
    color: '#6B7280',
  },
  empty: {
    textAlign: 'center',
    padding: '24px',
    color: '#6B7280',
  },
  hint: {
    fontSize: '14px',
    fontStyle: 'italic',
  },
  title: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#1A1A2E',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  entry: {
    backgroundColor: '#fff',
    borderRadius: '6px',
    padding: '12px',
    border: '1px solid #E5E7EB',
  },
  entryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  entryTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  mode: {
    fontSize: '12px',
    color: '#6B7280',
    fontWeight: 400,
  },
  entryDate: {
    fontSize: '12px',
    color: '#9CA3AF',
  },
  expandButton: {
    fontSize: '12px',
    color: '#3B82F6',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 0',
    textAlign: 'left',
  },
  details: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #E5E7EB',
  },
  textBlock: {
    marginBottom: '12px',
  },
  textLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#6B7280',
    marginBottom: '4px',
    textTransform: 'uppercase',
  },
  textContent: {
    fontSize: '14px',
    color: '#1A1A2E',
    fontFamily: 'Georgia, serif',
    lineHeight: '1.6',
    padding: '8px',
    backgroundColor: '#F9FAFB',
    borderRadius: '4px',
  },
};
