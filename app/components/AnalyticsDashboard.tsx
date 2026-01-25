'use client';

import { useState, useEffect } from 'react';
import type { BookAnalytics, ChapterAnalytics, GenreBenchmark } from '../../shared/types';

interface AnalyticsDashboardProps {
  bookId: string;
}

export default function AnalyticsDashboard({ bookId }: AnalyticsDashboardProps) {
  const [bookAnalytics, setBookAnalytics] = useState<BookAnalytics | null>(null);
  const [chapterAnalytics, setChapterAnalytics] = useState<ChapterAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  // BUG-010 FIX: Add try/catch to async useEffect
  useEffect(() => {
    loadAnalytics().catch(err => {
      console.error('Failed to load analytics on mount:', err);
      setLoading(false);
    });
  }, [bookId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Load book analytics
      const bookResponse = await fetch(`/api/analytics/book/${bookId}`);
      if (bookResponse.ok) {
        const bookData = await bookResponse.json();
        setBookAnalytics(bookData.analytics);
      }

      // Load chapter analytics
      const chaptersResponse = await fetch(`/api/analytics/book/${bookId}/chapters`);
      if (chaptersResponse.ok) {
        const chaptersData = await chaptersResponse.json();
        setChapterAnalytics(chaptersData.analytics || []);
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
      const response = await fetch(`/api/analytics/book/${bookId}/analyze`, {
        method: 'POST',
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
          color="#4CAF50"
        />
        <MetricCard
          title="Pacing Consistency"
          value={bookAnalytics?.pacing_consistency?.toFixed(0) || 'N/A'}
          suffix="/100"
          color="#2196F3"
        />
        <MetricCard
          title="Dialogue Ratio"
          value={bookAnalytics?.avg_dialogue_percentage?.toFixed(0) || 'N/A'}
          suffix="%"
          color="#FF9800"
        />
        <MetricCard
          title="Readability"
          value={bookAnalytics?.avg_readability_score?.toFixed(0) || 'N/A'}
          suffix="/100"
          color="#9C27B0"
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
      {bookAnalytics?.overall_tension_arc && (
        <div style={{ marginBottom: '24px', padding: '16px', background: '#f9f9f9', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Tension Arc</h3>
          <TensionGraph chapters={bookAnalytics.overall_tension_arc.chapters} />
        </div>
      )}

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

function MetricCard({ title, value, suffix, color }: { title: string; value: string; suffix: string; color: string }) {
  return (
    <div style={{ padding: '16px', background: 'white', borderRadius: '8px', border: '1px solid #ddd' }}>
      <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>{title}</div>
      <div style={{ fontSize: '32px', fontWeight: 'bold', color }}>
        {value}<span style={{ fontSize: '18px', color: '#999' }}>{suffix}</span>
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
