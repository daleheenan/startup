'use client';

import { useState } from 'react';
import type { PacingReport, ChapterPacing } from '@/lib/analysis-data';
import { getSeverityConfig, mapScoreToSeverity } from '@/lib/analysis-data';

interface PacingChartProps {
  report: PacingReport;
}

export default function PacingChart({ report }: PacingChartProps) {
  const [selectedChapter, setSelectedChapter] = useState<ChapterPacing | null>(null);

  const severityLevel = report.score === 'good' ? 'good' :
                        report.score === 'needs-attention' ? 'needs-attention' : 'poor';
  const config = getSeverityConfig(severityLevel);

  return (
    <div style={{ background: 'white', borderRadius: '8px', padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
            Pacing Analysis
          </h3>
          <p style={{ fontSize: '14px', colour: '#666' }}>
            Balance of fast-paced action vs. slower contemplative scenes
          </p>
        </div>
        <div style={{
          padding: '8px 16px',
          background: config.bgColour,
          colour: config.colour,
          borderRadius: '6px',
          fontWeight: '600',
          fontSize: '14px',
        }}>
          {config.icon} {config.label}
        </div>
      </div>

      {/* Overall Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <StatCard
          label="Fast-Paced"
          value={`${report.overallFastPercentage.toFixed(1)}%`}
          colour="#3b82f6"
        />
        <StatCard
          label="Slow-Paced"
          value={`${report.overallSlowPercentage.toFixed(1)}%`}
          colour="#8b5cf6"
        />
        <StatCard
          label="Genre Target"
          value={`${report.genreExpectation.min}-${report.genreExpectation.max}%`}
          colour="#64748b"
        />
      </div>

      {/* Genre Expectation */}
      <div style={{
        padding: '12px 16px',
        background: '#f8fafc',
        borderRadius: '6px',
        marginBottom: '24px',
        fontSize: '14px',
        colour: '#64748b',
      }}>
        <strong>Genre Expectation:</strong> {report.genreExpectation.description}
      </div>

      {/* Chapter Heat Map */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
          Chapter Pacing Heat Map
        </h4>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {report.chapters.map((chapter) => {
            const isBalanced = chapter.pacingScore === 'balanced';
            const isSlow = chapter.pacingScore === 'too-slow';
            const bgColour = isBalanced ? '#10b981' : isSlow ? '#8b5cf6' : '#3b82f6';

            return (
              <button
                key={chapter.chapterId}
                onClick={() => setSelectedChapter(chapter)}
                style={{
                  width: '60px',
                  height: '60px',
                  background: bgColour,
                  border: selectedChapter?.chapterId === chapter.chapterId ? '3px solid #1e293b' : 'none',
                  borderRadius: '6px',
                  colour: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'centre',
                  justifyContent: 'centre',
                  fontSize: '12px',
                  fontWeight: '600',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                title={`${chapter.chapterTitle}: ${chapter.fastPercentage.toFixed(0)}% fast`}
              >
                <div>Ch {chapter.chapterNumber}</div>
                <div style={{ fontSize: '10px', opacity: 0.9 }}>
                  {chapter.fastPercentage.toFixed(0)}%
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', fontSize: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'centre', gap: '8px' }}>
          <div style={{ width: '20px', height: '20px', background: '#10b981', borderRadius: '4px' }} />
          <span>Balanced</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'centre', gap: '8px' }}>
          <div style={{ width: '20px', height: '20px', background: '#3b82f6', borderRadius: '4px' }} />
          <span>Too Fast</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'centre', gap: '8px' }}>
          <div style={{ width: '20px', height: '20px', background: '#8b5cf6', borderRadius: '4px' }} />
          <span>Too Slow</span>
        </div>
      </div>

      {/* Selected Chapter Details */}
      {selectedChapter && (
        <div style={{
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '16px',
          background: '#fafafa',
        }}>
          <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            {selectedChapter.chapterTitle} (Chapter {selectedChapter.chapterNumber})
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '12px', colour: '#666' }}>Fast-Paced</div>
              <div style={{ fontSize: '18px', fontWeight: '600', colour: '#3b82f6' }}>
                {selectedChapter.fastPercentage.toFixed(1)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', colour: '#666' }}>Slow-Paced</div>
              <div style={{ fontSize: '18px', fontWeight: '600', colour: '#8b5cf6' }}>
                {selectedChapter.slowPercentage.toFixed(1)}%
              </div>
            </div>
          </div>
          <div style={{ fontSize: '14px', colour: '#64748b' }}>
            Word count: {selectedChapter.wordCount.toLocaleString('en-GB')}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, colour }: { label: string; value: string; colour: string }) {
  return (
    <div style={{
      padding: '16px',
      background: '#f8fafc',
      borderRadius: '6px',
      borderLeft: `4px solid ${colour}`,
    }}>
      <div style={{ fontSize: '12px', colour: '#64748b', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: '600', colour: '#1e293b' }}>{value}</div>
    </div>
  );
}
