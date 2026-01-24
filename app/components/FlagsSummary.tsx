'use client';

import { useEffect, useState } from 'react';

interface FlagsSummaryData {
  totalFlags: number;
  unresolvedFlags: number;
  resolvedFlags: number;
  flagsByType: Record<string, number>;
  flagsBySeverity: Record<string, number>;
  chapters: Array<{
    chapterId: string;
    chapterNumber: number;
    flagCount: number;
    unresolvedCount: number;
  }>;
}

interface FlagsSummaryProps {
  bookId: string;
}

export default function FlagsSummary({ bookId }: FlagsSummaryProps) {
  const [data, setData] = useState<FlagsSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, [bookId]);

  async function fetchSummary() {
    try {
      const response = await fetch(`http://localhost:3001/api/editing/books/${bookId}/flags-summary`);
      if (!response.ok) throw new Error('Failed to fetch flags summary');

      const summaryData = await response.json();
      setData(summaryData);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
        <p style={{ color: '#888', margin: 0 }}>Loading flags summary...</p>
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

  if (!data) return null;

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      padding: '1.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: data.unresolvedFlags > 0 ? '#fbbf24' : '#4ade80',
        }} />
        <h3 style={{ fontSize: '1rem', margin: 0, color: '#ededed' }}>
          Editor Flags Summary
        </h3>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {/* Overall Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          <StatItem label="Total Flags" value={data.totalFlags} color="#60a5fa" />
          <StatItem label="Unresolved" value={data.unresolvedFlags} color="#fbbf24" />
          <StatItem label="Resolved" value={data.resolvedFlags} color="#4ade80" />
        </div>

        {/* By Severity */}
        {Object.keys(data.flagsBySeverity).length > 0 && (
          <div>
            <h4 style={{ fontSize: '0.875rem', color: '#888', marginBottom: '0.5rem' }}>
              By Severity
            </h4>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {Object.entries(data.flagsBySeverity).map(([severity, count]) => (
                <Badge
                  key={severity}
                  label={severity}
                  value={count}
                  color={severity === 'critical' ? '#ff6b6b' : severity === 'major' ? '#fbbf24' : '#60a5fa'}
                />
              ))}
            </div>
          </div>
        )}

        {/* By Type */}
        {Object.keys(data.flagsByType).length > 0 && (
          <div>
            <h4 style={{ fontSize: '0.875rem', color: '#888', marginBottom: '0.5rem' }}>
              By Type
            </h4>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {Object.entries(data.flagsByType).map(([type, count]) => (
                <Badge
                  key={type}
                  label={type.replace(/_/g, ' ')}
                  value={count}
                  color="#60a5fa"
                />
              ))}
            </div>
          </div>
        )}

        {/* Chapter Breakdown */}
        {data.chapters.filter(c => c.flagCount > 0).length > 0 && (
          <div>
            <h4 style={{ fontSize: '0.875rem', color: '#888', marginBottom: '0.5rem' }}>
              Chapters with Flags
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {data.chapters
                .filter(c => c.flagCount > 0)
                .map((chapter) => (
                  <div
                    key={chapter.chapterId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.5rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                    }}
                  >
                    <span style={{ color: '#ededed' }}>
                      Chapter {chapter.chapterNumber}
                    </span>
                    <span style={{ color: '#888' }}>
                      {chapter.unresolvedCount > 0 ? (
                        <span style={{ color: '#fbbf24' }}>
                          {chapter.unresolvedCount} unresolved
                        </span>
                      ) : (
                        <span style={{ color: '#4ade80' }}>
                          All resolved
                        </span>
                      )}
                      {' '}({chapter.flagCount} total)
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {data.totalFlags === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✨</div>
            <p style={{ color: '#4ade80', fontSize: '0.875rem', margin: 0 }}>
              No flags! All chapters looking great.
            </p>
          </div>
        )}
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

function Badge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.375rem',
      background: `${color}20`,
      border: `1px solid ${color}40`,
      borderRadius: '4px',
      padding: '0.25rem 0.5rem',
      fontSize: '0.75rem',
    }}>
      <span style={{ color }}>{value}</span>
      <span style={{ color: '#888', textTransform: 'capitalize' }}>{label}</span>
    </div>
  );
}
