'use client';

import { useState } from 'react';
import type { EchoesReport as EchoesReportType, Echo } from '@/lib/analysis-data';

interface EchoesReportProps {
  report: EchoesReportType;
}

export default function EchoesReport({ report }: EchoesReportProps) {
  const [expandedEcho, setExpandedEcho] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'severe' | 'moderate' | 'minor'>('all');

  const filteredEchoes = report.echoes.filter(echo => {
    if (filterSeverity === 'all') return true;
    return echo.severity === filterSeverity;
  });

  const sortedEchoes = [...filteredEchoes].sort((a, b) => {
    // Sort by severity first (severe -> moderate -> minor)
    const severityOrder = { severe: 0, moderate: 1, minor: 2 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    // Then by frequency (more repetitions first)
    return b.positions.length - a.positions.length;
  });

  return (
    <div style={{ background: 'white', borderRadius: '8px', padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
          Echoes Report
        </h3>
        <p style={{ fontSize: '14px', colour: '#666' }}>
          Repeated words that appear too close together
        </p>
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <SummaryCard label="Total Echoes" value={report.totalEchoes} colour="#3b82f6" />
        <SummaryCard label="Severe" value={report.severeCount} colour="#dc2626" />
        <SummaryCard label="Moderate" value={report.moderateCount} colour="#d97706" />
        <SummaryCard label="Minor" value={report.minorCount} colour="#16a34a" />
      </div>

      {/* Filter */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '8px', alignItems: 'centre' }}>
        <span style={{ fontSize: '14px', colour: '#64748b', marginRight: '8px' }}>Filter:</span>
        {['all', 'severe', 'moderate', 'minor'].map((severity) => (
          <button
            key={severity}
            onClick={() => setFilterSeverity(severity as any)}
            style={{
              padding: '6px 12px',
              background: filterSeverity === severity ? '#3b82f6' : '#f1f5f9',
              colour: filterSeverity === severity ? 'white' : '#64748b',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              textTransform: 'capitalize',
            }}
          >
            {severity}
          </button>
        ))}
      </div>

      {/* Echoes List */}
      {sortedEchoes.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'centre', colour: '#64748b' }}>
          <p>No echoes found{filterSeverity !== 'all' ? ` with ${filterSeverity} severity` : ''}!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sortedEchoes.map((echo, index) => (
            <EchoCard
              key={`${echo.word}-${index}`}
              echo={echo}
              isExpanded={expandedEcho === `${echo.word}-${index}`}
              onToggle={() => setExpandedEcho(
                expandedEcho === `${echo.word}-${index}` ? null : `${echo.word}-${index}`
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, colour }: { label: string; value: number; colour: string }) {
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

function EchoCard({ echo, isExpanded, onToggle }: {
  echo: Echo;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const severityColours = {
    severe: { bg: '#fef2f2', border: '#dc2626', text: '#dc2626' },
    moderate: { bg: '#fffbeb', border: '#d97706', text: '#d97706' },
    minor: { bg: '#f0fdf4', border: '#16a34a', text: '#16a34a' },
  };

  const colours = severityColours[echo.severity];

  return (
    <div style={{
      border: `2px solid ${colours.border}`,
      borderRadius: '6px',
      background: colours.bg,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'centre',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'centre', gap: '16px', flex: 1 }}>
          <div style={{
            padding: '6px 12px',
            background: colours.text,
            colour: 'white',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: '600',
            textTransform: 'uppercase',
          }}>
            {echo.severity}
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '600', colour: '#1e293b' }}>
              "{echo.word}"
            </div>
            <div style={{ fontSize: '14px', colour: '#64748b', marginTop: '4px' }}>
              Repeated {echo.positions.length} times • {echo.proximity} words apart
            </div>
          </div>
        </div>
        <div style={{ fontSize: '20px', colour: '#64748b' }}>
          {isExpanded ? '▼' : '▶'}
        </div>
      </button>

      {/* Expanded Context */}
      {isExpanded && (
        <div style={{
          padding: '16px',
          borderTop: `1px solid ${colours.border}`,
          background: 'white',
        }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', colour: '#64748b' }}>
            Context:
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {echo.context.map((ctx, i) => (
              <div
                key={i}
                style={{
                  padding: '12px',
                  background: '#f8fafc',
                  borderRadius: '4px',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  colour: '#334155',
                }}
              >
                <div style={{ fontSize: '12px', colour: '#94a3b8', marginBottom: '4px' }}>
                  Position {ctx.position}
                </div>
                {ctx.sentence}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
