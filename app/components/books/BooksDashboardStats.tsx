'use client';

import type { CSSProperties } from 'react';
import { colors, typography, spacing, borderRadius } from '@/app/lib/design-tokens';

// ==================== TYPES ====================

export interface BookStats {
  totalBooks: number;
  totalWords: number;
  publishedCount: number;
  inProgressCount: number;
}

export interface BooksDashboardStatsProps {
  stats: BookStats;
}

// ==================== COMPONENT ====================

/**
 * BooksDashboardStats displays a row of stat cards showing aggregate book metrics.
 *
 * Shows:
 * - Total books count
 * - Total words (formatted: "680K words")
 * - Published count (green)
 * - In Progress count
 */
export default function BooksDashboardStats({ stats }: BooksDashboardStatsProps) {
  const formatWords = (words: number): string => {
    if (words >= 1000000) {
      return `${(words / 1000000).toFixed(1)}M`;
    }
    if (words >= 1000) {
      return `${Math.floor(words / 1000)}K`;
    }
    return words.toLocaleString();
  };

  const containerStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: spacing[4],
    marginBottom: spacing[6],
  };

  const cardStyle: CSSProperties = {
    background: colors.background.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[2],
  };

  const labelStyle: CSSProperties = {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    margin: 0,
  };

  const valueStyle: CSSProperties = {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    margin: 0,
  };

  const createHighlightStyle = (color: string): CSSProperties => ({
    ...valueStyle,
    color,
  });

  return (
    <div style={containerStyle}>
      {/* Total Books */}
      <div style={cardStyle}>
        <p style={labelStyle}>Total Books</p>
        <p style={valueStyle}>{stats.totalBooks}</p>
      </div>

      {/* Total Words */}
      <div style={cardStyle}>
        <p style={labelStyle}>Total Words</p>
        <p style={valueStyle}>
          {formatWords(stats.totalWords)}
          <span
            style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.normal,
              color: colors.text.tertiary,
              marginLeft: spacing[2],
            }}
          >
            words
          </span>
        </p>
      </div>

      {/* Published Count */}
      <div style={cardStyle}>
        <p style={labelStyle}>Published</p>
        <p style={createHighlightStyle(colors.semantic.successDark)}>
          {stats.publishedCount}
        </p>
      </div>

      {/* In Progress Count */}
      <div style={cardStyle}>
        <p style={labelStyle}>In Progress</p>
        <p style={valueStyle}>{stats.inProgressCount}</p>
      </div>
    </div>
  );
}
