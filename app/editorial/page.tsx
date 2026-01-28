'use client';

import { type CSSProperties } from 'react';

import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '@/app/lib/design-tokens';

// ==================== PLANNED FEATURES ====================

const PLANNED_FEATURES: string[] = [
  'Unified review queue',
  'Approval workflows',
  'Revision tracking',
  'Editorial notes and feedback',
  'Style guide enforcement',
];

// ==================== PAGE COMPONENT ====================

export default function EditorialBoardPage() {
  // ---- Card layout ----
  const cardWrapperStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
    padding: spacing[4],
  };

  const cardStyle: CSSProperties = {
    maxWidth: '560px',
    width: '100%',
    background: colors.background.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.xl,
    boxShadow: shadows.sm,
    padding: `${spacing[10]} ${spacing[8]}`,
    textAlign: 'center' as const,
    boxSizing: 'border-box' as const,
  };

  // ---- Icon ----
  const iconContainerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: spacing[6],
  };

  const iconCircleStyle: CSSProperties = {
    width: '64px',
    height: '64px',
    borderRadius: borderRadius.full,
    background: colors.brand.primaryLight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  // ---- Typography ----
  const headingStyle: CSSProperties = {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.tertiary,
    fontFamily: typography.fontFamily.base,
    margin: `0 0 ${spacing[3]} 0`,
    lineHeight: typography.lineHeight.tight,
  };

  const descriptionStyle: CSSProperties = {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.normal,
    color: colors.text.tertiary,
    fontFamily: typography.fontFamily.base,
    lineHeight: typography.lineHeight.normal,
    margin: `0 0 ${spacing[8]} 0`,
    maxWidth: '420px',
    marginLeft: 'auto',
    marginRight: 'auto',
  };

  // ---- Feature list ----
  const listStyle: CSSProperties = {
    listStyleType: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[2],
    alignItems: 'center',
  };

  const listItemStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    fontFamily: typography.fontFamily.base,
  };

  const bulletStyle: CSSProperties = {
    width: '6px',
    height: '6px',
    borderRadius: borderRadius.full,
    background: colors.brand.primary,
    flexShrink: 0,
  };

  return (
    <DashboardLayout
      header={{
        title: 'Editorial Board',
        subtitle: 'Review and approve content across all your projects',
      }}
    >
      <div style={cardWrapperStyle}>
        <div style={cardStyle}>
          {/* Clipboard-with-checkmark icon */}
          <div style={iconContainerStyle}>
            <div style={iconCircleStyle} aria-hidden="true">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.brand.primary}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
          </div>

          <h2 style={headingStyle}>Coming Soon</h2>

          <p style={descriptionStyle}>
            The Editorial Board will provide a unified view of all content
            requiring review across your projects. Manage approvals, track
            revisions, and maintain editorial consistency.
          </p>

          <ul style={listStyle} aria-label="Planned features">
            {PLANNED_FEATURES.map((feature) => (
              <li key={feature} style={listItemStyle}>
                <span style={bulletStyle} aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
