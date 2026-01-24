'use client';

import { useState, useEffect } from 'react';
import { getToken, logout } from '../lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface VersionComparisonProps {
  chapterId: string;
}

interface VersionComparisonData {
  original: {
    content: string;
    wordCount: number;
    generatedAt: string;
  };
  edited: {
    content: string;
    wordCount: number;
    lastEditedAt: string;
  } | null;
  diff: {
    addedWords: number;
    removedWords: number;
    percentChanged: number;
  } | null;
}

export default function VersionComparison({ chapterId }: VersionComparisonProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VersionComparisonData | null>(null);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'overlay'>('side-by-side');

  useEffect(() => {
    fetchComparison();
  }, [chapterId]);

  async function fetchComparison() {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/editing/chapters/${chapterId}/comparison`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          logout();
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to fetch comparison');
      }

      const comparisonData = await res.json();
      setData(comparisonData);
    } catch (error) {
      console.error('Error fetching comparison:', error);
      alert('Failed to load comparison');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <p>Loading comparison...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={styles.error}>
        <p>Failed to load comparison data</p>
      </div>
    );
  }

  if (!data.edited) {
    return (
      <div style={styles.noEdit}>
        <p>No edits have been made to this chapter yet.</p>
        <p style={styles.hint}>Edit the chapter to see a comparison with the original.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Version Comparison</h3>
        <div style={styles.controls}>
          <button
            onClick={() => setViewMode('side-by-side')}
            style={{
              ...styles.button,
              ...(viewMode === 'side-by-side' && styles.buttonActive),
            }}
          >
            Side by Side
          </button>
          <button
            onClick={() => setViewMode('overlay')}
            style={{
              ...styles.button,
              ...(viewMode === 'overlay' && styles.buttonActive),
            }}
          >
            Overlay
          </button>
        </div>
      </div>

      {data.diff && (
        <div style={styles.stats}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Original:</span>
            <span style={styles.statValue}>{data.original.wordCount} words</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Edited:</span>
            <span style={styles.statValue}>{data.edited.wordCount} words</span>
          </div>
          {data.diff.addedWords > 0 && (
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Added:</span>
              <span style={{...styles.statValue, color: '#10B981'}}>
                +{data.diff.addedWords} words
              </span>
            </div>
          )}
          {data.diff.removedWords > 0 && (
            <div style={styles.statItem}>
              <span style={styles.statLabel}>Removed:</span>
              <span style={{...styles.statValue, color: '#EF4444'}}>
                -{data.diff.removedWords} words
              </span>
            </div>
          )}
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Change:</span>
            <span style={styles.statValue}>{data.diff.percentChanged}%</span>
          </div>
        </div>
      )}

      {viewMode === 'side-by-side' ? (
        <div style={styles.sideBySide}>
          <div style={styles.column}>
            <div style={styles.columnHeader}>
              <h4 style={styles.columnTitle}>Original</h4>
              <span style={styles.timestamp}>
                Generated {new Date(data.original.generatedAt).toLocaleDateString()}
              </span>
            </div>
            <div style={styles.content}>
              {data.original.content.split('\n').map((paragraph, index) => (
                <p key={index} style={styles.paragraph}>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          <div style={styles.divider} />

          <div style={styles.column}>
            <div style={styles.columnHeader}>
              <h4 style={styles.columnTitle}>Edited</h4>
              <span style={styles.timestamp}>
                Last edited {new Date(data.edited.lastEditedAt).toLocaleDateString()}
              </span>
            </div>
            <div style={styles.content}>
              {data.edited.content.split('\n').map((paragraph, index) => (
                <p key={index} style={styles.paragraph}>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={styles.overlay}>
          <div style={styles.overlayContent}>
            <div style={styles.overlaySection}>
              <h4 style={styles.overlayTitle}>Original (showing differences)</h4>
              <div style={styles.content}>
                {renderDiff(data.original.content, data.edited.content, 'original')}
              </div>
            </div>

            <div style={{...styles.overlaySection, marginTop: '32px'}}>
              <h4 style={styles.overlayTitle}>Edited (showing additions)</h4>
              <div style={styles.content}>
                {renderDiff(data.original.content, data.edited.content, 'edited')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function renderDiff(original: string, edited: string, mode: 'original' | 'edited') {
  const originalWords = original.split(/\s+/);
  const editedWords = edited.split(/\s+/);

  // Simple word-by-word diff (in production, use a proper diff library)
  const originalSet = new Set(originalWords);
  const editedSet = new Set(editedWords);

  if (mode === 'original') {
    return (
      <p style={styles.paragraph}>
        {originalWords.map((word, index) => {
          const isRemoved = !editedSet.has(word);
          return (
            <span
              key={index}
              style={isRemoved ? styles.removed : undefined}
            >
              {word}{' '}
            </span>
          );
        })}
      </p>
    );
  } else {
    return (
      <p style={styles.paragraph}>
        {editedWords.map((word, index) => {
          const isAdded = !originalSet.has(word);
          return (
            <span
              key={index}
              style={isAdded ? styles.added : undefined}
            >
              {word}{' '}
            </span>
          );
        })}
      </p>
    );
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  loading: {
    textAlign: 'center',
    padding: '48px',
    color: '#666',
  },
  error: {
    textAlign: 'center',
    padding: '48px',
    color: '#EF4444',
  },
  noEdit: {
    textAlign: 'center',
    padding: '48px',
    color: '#666',
  },
  hint: {
    fontSize: '14px',
    color: '#999',
    marginTop: '8px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
    color: '#1A1A2E',
  },
  controls: {
    display: 'flex',
    gap: '8px',
  },
  button: {
    padding: '8px 16px',
    borderRadius: '4px',
    border: '1px solid #D1D5DB',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  buttonActive: {
    backgroundColor: '#3B82F6',
    color: '#fff',
    border: 'none',
  },
  stats: {
    display: 'flex',
    gap: '24px',
    padding: '16px',
    backgroundColor: '#F8FAFC',
    borderRadius: '4px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#6B7280',
    textTransform: 'uppercase',
    fontWeight: 600,
  },
  statValue: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1A1A2E',
  },
  sideBySide: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    gap: '24px',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
  },
  columnHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '2px solid #E5E7EB',
  },
  columnTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#1A1A2E',
  },
  timestamp: {
    fontSize: '12px',
    color: '#6B7280',
  },
  divider: {
    width: '1px',
    backgroundColor: '#E5E7EB',
  },
  content: {
    flex: 1,
    padding: '16px',
    backgroundColor: '#FAFAFA',
    borderRadius: '4px',
    overflowY: 'auto',
    maxHeight: '600px',
  },
  paragraph: {
    fontSize: '16px',
    lineHeight: '1.8',
    fontFamily: 'Georgia, serif',
    color: '#1A1A2E',
    marginBottom: '16px',
  },
  overlay: {
    display: 'flex',
    flexDirection: 'column',
  },
  overlayContent: {
    display: 'flex',
    flexDirection: 'column',
  },
  overlaySection: {
    display: 'flex',
    flexDirection: 'column',
  },
  overlayTitle: {
    margin: 0,
    marginBottom: '12px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#1A1A2E',
  },
  removed: {
    backgroundColor: '#FEE2E2',
    textDecoration: 'line-through',
    color: '#991B1B',
  },
  added: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
  },
};
