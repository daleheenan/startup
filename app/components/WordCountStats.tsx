'use client';

import { useState, useEffect } from 'react';
import { getToken, logout } from '../lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface WordCountStatsProps {
  bookId: string;
}

interface ChapterWordCount {
  chapterId: string;
  chapterNumber: number;
  originalWordCount: number;
  editedWordCount: number | null;
  currentWordCount: number;
}

interface WordCountData {
  totalOriginalWordCount: number;
  totalCurrentWordCount: number;
  totalEdited: number;
  chapters: ChapterWordCount[];
}

export default function WordCountStats({ bookId }: WordCountStatsProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WordCountData | null>(null);

  useEffect(() => {
    fetchWordCounts();
  }, [bookId]);

  async function fetchWordCounts() {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/editing/books/${bookId}/word-count`, {
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
        throw new Error('Failed to fetch word counts');
      }

      const wordCountData = await res.json();
      setData(wordCountData);
    } catch (error) {
      console.error('Error fetching word counts:', error);
      alert('Failed to load word count statistics');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <p>Loading word count statistics...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={styles.error}>
        <p>Failed to load word count statistics</p>
      </div>
    );
  }

  const editedChaptersCount = data.chapters.filter(c => c.editedWordCount !== null).length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Word Count Statistics</h3>
      </div>

      <div style={styles.summary}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Total Word Count</div>
          <div style={styles.summaryValue}>{data.totalCurrentWordCount.toLocaleString()}</div>
        </div>

        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Original</div>
          <div style={styles.summaryValue}>{data.totalOriginalWordCount.toLocaleString()}</div>
        </div>

        {data.totalEdited !== 0 && (
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Net Change</div>
            <div
              style={{
                ...styles.summaryValue,
                color: data.totalEdited > 0 ? '#10B981' : '#EF4444',
              }}
            >
              {data.totalEdited > 0 ? '+' : ''}{data.totalEdited.toLocaleString()}
            </div>
          </div>
        )}

        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Edited Chapters</div>
          <div style={styles.summaryValue}>{editedChaptersCount} / {data.chapters.length}</div>
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={styles.th}>Chapter</th>
              <th style={styles.th}>Original</th>
              <th style={styles.th}>Current</th>
              <th style={styles.th}>Change</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.chapters.map((chapter) => {
              const change = chapter.currentWordCount - chapter.originalWordCount;
              const isEdited = chapter.editedWordCount !== null;

              return (
                <tr key={chapter.chapterId} style={styles.row}>
                  <td style={styles.td}>Chapter {chapter.chapterNumber}</td>
                  <td style={styles.td}>{chapter.originalWordCount.toLocaleString()}</td>
                  <td style={styles.td}>{chapter.currentWordCount.toLocaleString()}</td>
                  <td
                    style={{
                      ...styles.td,
                      color: change > 0 ? '#10B981' : change < 0 ? '#EF4444' : '#6B7280',
                    }}
                  >
                    {change > 0 ? '+' : ''}{change}
                  </td>
                  <td style={styles.td}>
                    {isEdited ? (
                      <span style={styles.badgeEdited}>Edited</span>
                    ) : (
                      <span style={styles.badgeOriginal}>Original</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
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
  header: {
    marginBottom: '24px',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
    color: '#1A1A2E',
  },
  summary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  summaryCard: {
    padding: '16px',
    backgroundColor: '#F8FAFC',
    borderRadius: '8px',
    border: '1px solid #E5E7EB',
  },
  summaryLabel: {
    fontSize: '12px',
    color: '#6B7280',
    textTransform: 'uppercase',
    fontWeight: 600,
    marginBottom: '8px',
  },
  summaryValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1A1A2E',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  headerRow: {
    backgroundColor: '#F8FAFC',
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase',
    borderBottom: '2px solid #E5E7EB',
  },
  row: {
    borderBottom: '1px solid #E5E7EB',
  },
  td: {
    padding: '12px',
    fontSize: '14px',
    color: '#1A1A2E',
  },
  badgeEdited: {
    padding: '4px 8px',
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
  },
  badgeOriginal: {
    padding: '4px 8px',
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
  },
};
