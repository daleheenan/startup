'use client';

import type { CSSProperties } from 'react';

import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '@/app/lib/design-tokens';

// ==================== CONSTANTS ====================

const PLANNED_FEATURES: string[] = [
  'Create and manage book series',
  'Track character appearances',
  'Maintain series timeline',
  'Cross-book consistency checking',
];

// ==================== ICONS ====================

/**
 * Stacked-books SVG icon, sized to sit comfortably inside the muted
 * icon circle at the top of the placeholder card.
 */
function StackedBooksIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.text.tertiary}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Bottom book */}
      <path d="M2 18c0-1 .5-1.5 1.5-1.5h15c.5 0 1.5.5 1.5 1.5v1c0 1-.5 1.5-1.5 1.5h-15C2.5 20 2 19.5 2 18.5V18z" />
      {/* Middle book */}
      <path d="M4 14c0-1 .5-1.5 1.5-1.5h13c.5 0 1 .5 1 1.5v1c0 1-.5 1.5-1 1.5h-13C4.5 16 4 15.5 4 14.5V14z" />
      {/* Top book */}
      <path d="M6 10c0-1 .5-1.5 1.5-1.5h10c.5 0 1 .5 1 1.5v1c0 1-.5 1.5-1 1.5h-10C6.5 12 6 11.5 6 10.5V10z" />
    </svg>
  );
}

// ==================== PAGE ====================

export default function SeriesManagementPage() {
  // ---- Styles ----

  const cardStyle: CSSProperties = {
    maxWidth: '560px',
    margin: '0 auto',
    padding: spacing[8],
    background: colors.background.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.xl,
    boxShadow: shadows.sm,
    textAlign: 'center',
  };

  const iconCircleStyle: CSSProperties = {
    width: '80px',
    height: '80px',
    margin: `0 auto ${spacing[6]}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: colors.background.surfaceHover,
    borderRadius: borderRadius.full,
  };

  const headingStyle: CSSProperties = {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.tertiary,
    fontFamily: typography.fontFamily.base,
    margin: `0 0 ${spacing[3]}`,
    lineHeight: typography.lineHeight.tight,
  };

  const descriptionStyle: CSSProperties = {
    fontSize: typography.fontSize.base,
    color: colors.text.tertiary,
    fontFamily: typography.fontFamily.base,
    lineHeight: typography.lineHeight.relaxed,
    margin: `0 0 ${spacing[6]}`,
  };

  const featureListStyle: CSSProperties = {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[3],
  };

  const featureItemStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    padding: `${spacing[3]} ${spacing[4]}`,
    background: colors.background.surfaceHover,
    borderRadius: borderRadius.md,
    textAlign: 'left',
  };

  const featureBulletStyle: CSSProperties = {
    width: '8px',
    height: '8px',
    flexShrink: 0,
    borderRadius: borderRadius.full,
    background: colors.text.disabled,
  };

  const featureTextStyle: CSSProperties = {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    fontFamily: typography.fontFamily.base,
    margin: 0,
  };

  // ---- Render ----

  return (
    <DashboardLayout
      header={{
        title: 'Series Management',
        subtitle: 'Organise and manage your book series',
      }}
    >
      <div style={cardStyle} role="status" aria-live="polite">
        <div style={iconCircleStyle} aria-hidden="true">
          <StackedBooksIcon />
        </div>

        <h2 style={headingStyle}>Coming Soon</h2>

        <p style={descriptionStyle}>
          Series management features are under development. Soon you&apos;ll be
          able to organise your novels into series, track series-wide continuity,
          and manage character appearances across books.
        </p>

        <ul style={featureListStyle} aria-label="Planned features">
          {PLANNED_FEATURES.map((feature) => (
            <li key={feature} style={featureItemStyle}>
              <span style={featureBulletStyle} aria-hidden="true" />
              <span style={featureTextStyle}>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </DashboardLayout>
  );
}
