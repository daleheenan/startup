'use client';

import { useState, useEffect } from 'react';
import type { BookAnalytics, ChapterAnalytics, GenreBenchmark } from '../../shared/types';
import { getToken } from '../lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Genre-adaptive benchmarks for RAG indicators
interface GenreTargets {
  pacing: { green: [number, number]; amber: [number, number][] };
  pacingConsistency: { green: number; amber: number };
  dialogueRatio: { green: [number, number]; amber: [number, number][] };
  readability: { green: [number, number]; amber: [number, number][] };
}

const genreTargets: Record<string, GenreTargets> = {
  // Thriller/Mystery: Fast pacing expected, higher tension
  thriller: {
    pacing: { green: [65, 90], amber: [[50, 65], [90, 100]] },
    pacingConsistency: { green: 70, amber: 50 },
    dialogueRatio: { green: [30, 50], amber: [[20, 30], [50, 60]] },
    readability: { green: [60, 80], amber: [[50, 60], [80, 90]] },
  },
  mystery: {
    pacing: { green: [60, 85], amber: [[45, 60], [85, 100]] },
    pacingConsistency: { green: 65, amber: 45 },
    dialogueRatio: { green: [35, 55], amber: [[25, 35], [55, 65]] },
    readability: { green: [60, 80], amber: [[50, 60], [80, 90]] },
  },
  // Fantasy/Sci-Fi: Slower pacing OK, more exposition acceptable
  fantasy: {
    pacing: { green: [50, 75], amber: [[35, 50], [75, 90]] },
    pacingConsistency: { green: 60, amber: 40 },
    dialogueRatio: { green: [25, 45], amber: [[15, 25], [45, 60]] },
    readability: { green: [55, 75], amber: [[45, 55], [75, 85]] },
  },
  'sci-fi': {
    pacing: { green: [50, 75], amber: [[35, 50], [75, 90]] },
    pacingConsistency: { green: 60, amber: 40 },
    dialogueRatio: { green: [25, 45], amber: [[15, 25], [45, 60]] },
    readability: { green: [55, 75], amber: [[45, 55], [75, 85]] },
  },
  // Romance: Higher dialogue ratio, moderate pacing
  romance: {
    pacing: { green: [55, 75], amber: [[40, 55], [75, 90]] },
    pacingConsistency: { green: 65, amber: 45 },
    dialogueRatio: { green: [40, 60], amber: [[30, 40], [60, 70]] },
    readability: { green: [60, 80], amber: [[50, 60], [80, 90]] },
  },
  // Literary Fiction: More varied, focus on readability
  literary: {
    pacing: { green: [40, 70], amber: [[25, 40], [70, 85]] },
    pacingConsistency: { green: 55, amber: 35 },
    dialogueRatio: { green: [30, 55], amber: [[20, 30], [55, 65]] },
    readability: { green: [65, 85], amber: [[55, 65], [85, 95]] },
  },
  // Default targets
  default: {
    pacing: { green: [55, 80], amber: [[40, 55], [80, 90]] },
    pacingConsistency: { green: 65, amber: 45 },
    dialogueRatio: { green: [30, 50], amber: [[20, 30], [50, 60]] },
    readability: { green: [60, 80], amber: [[50, 60], [80, 90]] },
  },
};

// Get RAG status based on value and targets
type RAGStatus = 'green' | 'amber' | 'red';

function getRagStatus(value: number | undefined, targets: { green: [number, number]; amber: [number, number][] }): RAGStatus {
  if (value === undefined || isNaN(value)) return 'amber';

  // Check if in green range
  if (value >= targets.green[0] && value <= targets.green[1]) return 'green';

  // Check if in amber ranges
  for (const [min, max] of targets.amber) {
    if (value >= min && value <= max) return 'amber';
  }

  // Otherwise red
  return 'red';
}

function getConsistencyRagStatus(value: number | undefined, targets: { green: number; amber: number }): RAGStatus {
  if (value === undefined || isNaN(value)) return 'amber';

  if (value >= targets.green) return 'green';
  if (value >= targets.amber) return 'amber';
  return 'red';
}

// Get RAG colour
function getRagColor(status: RAGStatus): string {
  switch (status) {
    case 'green': return '#16a34a';
    case 'amber': return '#d97706';
    case 'red': return '#dc2626';
    default: return '#666';
  }
}

// Metric explanations
const metricExplanations: Record<string, string> = {
  'Average Pacing': 'Measures the speed and energy of the narrative. Higher values indicate faster-paced, action-driven scenes; lower values suggest slower, more contemplative passages.',
  'Pacing Consistency': 'How evenly paced the story is across chapters. Higher values mean consistent energy; lower values indicate more variation (which may be intentional).',
  'Dialogue Ratio': 'The percentage of text that is dialogue vs. prose. Different genres have different ideal ratios.',
  'Readability': 'How easy the text is to read (Flesch-Kincaid scale). 60-70 is ideal for most fiction; lower for literary, higher for young adult.',
};

interface AnalyticsDashboardProps {
  bookId: string;
  versionId?: string | null;
  genre?: string;
}

export default function AnalyticsDashboard({ bookId, versionId, genre = 'default' }: AnalyticsDashboardProps) {
  const [bookAnalytics, setBookAnalytics] = useState<BookAnalytics | null>(null);
  const [chapterAnalytics, setChapterAnalytics] = useState<ChapterAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  // Get genre-specific targets (normalise genre name)
  const normalizedGenre = genre?.toLowerCase().replace(/[^a-z]/g, '') || 'default';
  const targets = genreTargets[normalizedGenre] || genreTargets.default;

  // BUG-010 FIX: Add try/catch to async useEffect
  useEffect(() => {
    loadAnalytics().catch(err => {
      console.error('Failed to load analytics on mount:', err);
      setLoading(false);
    });
  }, [bookId, versionId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const token = getToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // First, check if the selected version has any chapters
      const versionsUrl = `${API_BASE_URL}/api/books/${bookId}/versions`;
      const versionsResponse = await fetch(versionsUrl, { headers });
      let selectedVersionHasChapters = true;

      if (versionsResponse.ok) {
        const versionsData = await versionsResponse.json();
        const versions = versionsData.versions || [];

        if (versionId) {
          // Find the specific version
          const selectedVersion = versions.find((v: any) => v.id === versionId);
          if (selectedVersion) {
            const chapterCount = selectedVersion.actual_chapter_count ?? selectedVersion.chapter_count ?? 0;
            selectedVersionHasChapters = chapterCount > 0;
          }
        } else {
          // Find active version
          const activeVersion = versions.find((v: any) => v.is_active === 1);
          if (activeVersion) {
            const chapterCount = activeVersion.actual_chapter_count ?? activeVersion.chapter_count ?? 0;
            selectedVersionHasChapters = chapterCount > 0;
          }
        }
      }

      // If the selected version has no chapters, don't load analytics
      // as it would show data from a different version
      if (!selectedVersionHasChapters) {
        setBookAnalytics(null);
        setChapterAnalytics([]);
        return;
      }

      // Load chapter analytics (filter by version if specified)
      const chaptersUrl = versionId
        ? `${API_BASE_URL}/api/analytics/book/${bookId}/chapters?versionId=${versionId}`
        : `${API_BASE_URL}/api/analytics/book/${bookId}/chapters`;
      const chaptersResponse = await fetch(chaptersUrl, { headers });
      let chapterAnalyticsData: any[] = [];
      if (chaptersResponse.ok) {
        const chaptersData = await chaptersResponse.json();
        chapterAnalyticsData = chaptersData.analytics || [];
        setChapterAnalytics(chapterAnalyticsData);
      }

      // Only load book-level analytics if chapter analytics exist for this version
      // This prevents showing stale analytics from a different version
      if (chapterAnalyticsData.length > 0) {
        const bookResponse = await fetch(`${API_BASE_URL}/api/analytics/book/${bookId}`, { headers });
        if (bookResponse.ok) {
          const bookData = await bookResponse.json();
          setBookAnalytics(bookData.analytics);
        }
      } else {
        // No analytics for this version
        setBookAnalytics(null);
      }

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeBook = async () => {
    setAnalyzing(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/analytics/book/${bookId}/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        await loadAnalytics();
        alert('Book analyzed successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error?.message || 'Failed to analyze'}`);
      }
    } catch (error) {
      console.error('Error analyzing book:', error);
      alert('Failed to analyze book');
    } finally {
      setAnalyzing(false);
    }
  };


  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div>Loading analytics...</div>
      </div>
    );
  }

  if (!bookAnalytics && !analyzing) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ marginBottom: '16px' }}>No analytics available for this book yet.</div>
        <button
          onClick={handleAnalyzeBook}
          style={{
            padding: '12px 24px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Analyze Book
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Analytics Dashboard</h2>
          <p style={{ color: '#666' }}>Writing analytics and quality metrics</p>
        </div>
        <button
          onClick={handleAnalyzeBook}
          disabled={analyzing}
          style={{
            padding: '8px 16px',
            background: analyzing ? '#ccc' : '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: analyzing ? 'not-allowed' : 'pointer',
          }}
        >
          {analyzing ? 'Analyzing...' : 'Refresh Analytics'}
        </button>
      </div>

      {/* Overall Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <MetricCard
          title="Average Pacing"
          value={bookAnalytics?.avg_pacing_score?.toFixed(0) || 'N/A'}
          suffix="/100"
          ragStatus={getRagStatus(bookAnalytics?.avg_pacing_score, targets.pacing)}
          explanation={metricExplanations['Average Pacing']}
        />
        <MetricCard
          title="Pacing Consistency"
          value={bookAnalytics?.pacing_consistency?.toFixed(0) || 'N/A'}
          suffix="/100"
          ragStatus={getConsistencyRagStatus(bookAnalytics?.pacing_consistency, targets.pacingConsistency)}
          explanation={metricExplanations['Pacing Consistency']}
        />
        <MetricCard
          title="Dialogue Ratio"
          value={bookAnalytics?.avg_dialogue_percentage?.toFixed(0) || 'N/A'}
          suffix="%"
          ragStatus={getRagStatus(bookAnalytics?.avg_dialogue_percentage, targets.dialogueRatio)}
          explanation={metricExplanations['Dialogue Ratio']}
        />
        <MetricCard
          title="Readability"
          value={bookAnalytics?.avg_readability_score?.toFixed(0) || 'N/A'}
          suffix="/100"
          ragStatus={getRagStatus(bookAnalytics?.avg_readability_score, targets.readability)}
          explanation={metricExplanations['Readability']}
        />
      </div>

      {/* Genre Comparison */}
      {bookAnalytics?.genre_comparison && (
        <div style={{ marginBottom: '24px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Genre Benchmarking</h3>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            Compared to typical {bookAnalytics.genre_comparison.genre} novels:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <ComparisonItem
              label="Pacing"
              value={bookAnalytics.genre_comparison.pacing_vs_norm}
            />
            <ComparisonItem
              label="Dialogue"
              value={bookAnalytics.genre_comparison.dialogue_vs_norm}
            />
            <ComparisonItem
              label="Readability"
              value={bookAnalytics.genre_comparison.readability_vs_norm}
            />
          </div>
        </div>
      )}

      {/* Tension Arc Graph */}
      <div style={{ marginBottom: '24px', padding: '16px', background: '#f9f9f9', borderRadius: '8px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Tension Arc</h3>
        {bookAnalytics?.overall_tension_arc?.chapters && bookAnalytics.overall_tension_arc.chapters.length > 0 ? (
          <TensionGraph chapters={bookAnalytics.overall_tension_arc.chapters} />
        ) : (
          <div style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
            <p style={{ marginBottom: '8px' }}>No tension data available yet.</p>
            <p style={{ fontSize: '14px', color: '#999' }}>
              Click "Refresh Analytics" to analyse your chapters and generate tension data.
            </p>
          </div>
        )}
      </div>

      {/* Character Screen Time */}
      {bookAnalytics?.character_balance && (
        <div style={{ marginBottom: '24px', padding: '16px', background: '#f9f9f9', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Character Screen Time</h3>
          <CharacterTable characters={bookAnalytics.character_balance.characters} />
        </div>
      )}

      {/* Pacing Heat Map */}
      {chapterAnalytics.length > 0 && (
        <div style={{ marginBottom: '24px', padding: '16px', background: '#f9f9f9', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Pacing Heat Map</h3>
          <PacingHeatMap chapters={chapterAnalytics} />
        </div>
      )}

    </div>
  );
}

function MetricCard({
  title,
  value,
  suffix,
  ragStatus,
  explanation,
}: {
  title: string;
  value: string;
  suffix: string;
  ragStatus: RAGStatus;
  explanation?: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const ragColor = getRagColor(ragStatus);

  // RAG status label
  const ragLabel = ragStatus === 'green' ? 'Good' : ragStatus === 'amber' ? 'Acceptable' : 'Needs Attention';

  return (
    <div style={{
      padding: '16px',
      background: 'white',
      borderRadius: '8px',
      border: `2px solid ${ragColor}`,
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <div style={{ fontSize: '14px', color: '#666' }}>{title}</div>
        {explanation && (
          <div
            style={{ position: 'relative', cursor: 'help' }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: '#e5e7eb',
              fontSize: '10px',
              fontWeight: 'bold',
              color: '#6b7280',
            }}>
              ?
            </span>
            {showTooltip && (
              <div style={{
                position: 'absolute',
                left: '0',
                bottom: '100%',
                marginBottom: '8px',
                padding: '10px 12px',
                background: '#1f2937',
                color: 'white',
                borderRadius: '6px',
                fontSize: '12px',
                lineHeight: '1.4',
                width: '250px',
                zIndex: 1000,
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
              }}>
                {explanation}
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{ fontSize: '32px', fontWeight: 'bold', color: ragColor }}>
        {value}<span style={{ fontSize: '18px', color: '#999' }}>{suffix}</span>
      </div>
      <div style={{
        marginTop: '8px',
        fontSize: '11px',
        fontWeight: 600,
        color: ragColor,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {ragLabel}
      </div>
    </div>
  );
}

function ComparisonItem({ label, value }: { label: string; value: number }) {
  const isPositive = value > 0;
  const color = Math.abs(value) < 5 ? '#666' : isPositive ? '#4CAF50' : '#f44336';

  return (
    <div style={{ padding: '12px', background: 'white', borderRadius: '4px' }}>
      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: '600', color }}>
        {isPositive ? '+' : ''}{value.toFixed(1)}
      </div>
      <div style={{ fontSize: '11px', color: '#999' }}>
        {Math.abs(value) < 5 ? 'On target' : isPositive ? 'Above average' : 'Below average'}
      </div>
    </div>
  );
}

function TensionGraph({ chapters }: { chapters: Array<{ chapter_number: number; avg_tension: number }> }) {
  const maxTension = 100;

  return (
    <div style={{ position: 'relative', height: '200px', background: 'white', borderRadius: '4px', padding: '16px' }}>
      {/* Y-axis labels */}
      <div style={{ position: 'absolute', left: '0', top: '16px', bottom: '32px', width: '30px' }}>
        <div style={{ position: 'absolute', top: '0', fontSize: '10px', color: '#999' }}>100</div>
        <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: '#999' }}>50</div>
        <div style={{ position: 'absolute', bottom: '0', fontSize: '10px', color: '#999' }}>0</div>
      </div>

      {/* Graph area */}
      <div style={{ marginLeft: '40px', height: '100%', position: 'relative' }}>
        {/* Grid lines */}
        <div style={{ position: 'absolute', top: '0', left: '0', right: '0', height: '1px', background: '#eee' }} />
        <div style={{ position: 'absolute', top: '50%', left: '0', right: '0', height: '1px', background: '#eee' }} />
        <div style={{ position: 'absolute', bottom: '32px', left: '0', right: '0', height: '1px', background: '#eee' }} />

        {/* Tension line */}
        <svg style={{ width: '100%', height: 'calc(100% - 32px)', position: 'absolute', top: '0' }}>
          <polyline
            points={chapters.map((ch, i) => {
              const x = (i / (chapters.length - 1 || 1)) * 100;
              const y = 100 - (ch.avg_tension / maxTension) * 100;
              return `${x}%,${y}%`;
            }).join(' ')}
            fill="none"
            stroke="#2196F3"
            strokeWidth="2"
          />
        </svg>

        {/* X-axis labels */}
        <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', display: 'flex', justifyContent: 'space-between' }}>
          {chapters.map((ch) => (
            <div key={ch.chapter_number} style={{ fontSize: '10px', color: '#999' }}>
              Ch {ch.chapter_number}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CharacterTable({ characters }: { characters: Array<{ name: string; total_appearances: number; total_word_count: number; chapters_appeared_in: number[] }> }) {
  // Sort by word count descending
  const sortedCharacters = [...characters].sort((a, b) => b.total_word_count - a.total_word_count).slice(0, 10);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Character</th>
            <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Appearances</th>
            <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Word Count</th>
            <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Chapters</th>
          </tr>
        </thead>
        <tbody>
          {sortedCharacters.map((char) => (
            <tr key={char.name} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '12px', fontWeight: '500' }}>{char.name}</td>
              <td style={{ padding: '12px', textAlign: 'right' }}>{char.total_appearances}</td>
              <td style={{ padding: '12px', textAlign: 'right' }}>{char.total_word_count.toFixed(0)}</td>
              <td style={{ padding: '12px', textAlign: 'right' }}>{char.chapters_appeared_in.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PacingHeatMap({ chapters }: { chapters: ChapterAnalytics[] }) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {chapters.map((chapter, index) => {
        const score = chapter.pacing_score || 50;
        const color = score < 40 ? '#f44336' : score < 60 ? '#FF9800' : '#4CAF50';

        return (
          <div
            key={chapter.id}
            title={`Chapter ${index + 1}: Pacing ${score.toFixed(0)}/100`}
            style={{
              width: '60px',
              height: '60px',
              background: color,
              borderRadius: '4px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '500',
            }}
          >
            <div style={{ fontSize: '12px' }}>Ch {index + 1}</div>
            <div style={{ fontSize: '16px' }}>{score.toFixed(0)}</div>
          </div>
        );
      })}
    </div>
  );
}

