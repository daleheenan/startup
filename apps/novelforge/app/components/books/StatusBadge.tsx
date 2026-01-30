'use client';

import type { CSSProperties } from 'react';
import { colors, typography, borderRadius } from '@/app/lib/design-tokens';

// ==================== TYPES ====================

export interface StatusBadgeProps {
  /** Publication status value (draft, beta_readers, editing, submitted, published) */
  status: string;
  /** Display label override (defaults to capitalised status) */
  label?: string;
  /** Size variant */
  size?: 'sm' | 'md';
}

// ==================== COLOUR MAPPING ====================

const statusColours: Record<string, { bg: string; text: string; border: string }> = {
  draft: {
    bg: colors.semantic.infoLight,
    text: colors.semantic.info,
    border: colors.semantic.infoBorder,
  },
  beta_readers: {
    bg: '#F3E8FF',
    text: '#7C3AED',
    border: '#C4B5FD',
  },
  editing: {
    bg: colors.semantic.warningLight,
    text: colors.semantic.warningDark,
    border: colors.semantic.warningBorder,
  },
  submitted: {
    bg: '#FFEDD5',
    text: '#EA580C',
    border: '#FDBA74',
  },
  published: {
    bg: colors.semantic.successLight,
    text: colors.semantic.successDark,
    border: colors.semantic.successBorder,
  },
};

// ==================== COMPONENT ====================

/**
 * StatusBadge displays a coloured pill badge for publication status.
 *
 * Colour coding:
 * - Draft: Blue
 * - Beta Readers: Purple
 * - Editing: Yellow
 * - Submitted: Orange
 * - Published: Green
 */
export default function StatusBadge({ status, label, size = 'md' }: StatusBadgeProps) {
  const colours = statusColours[status] || statusColours.draft;

  const badgeStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: size === 'sm' ? '2px 8px' : '4px 12px',
    background: colours.bg,
    color: colours.text,
    border: `1px solid ${colours.border}`,
    borderRadius: borderRadius.sm,
    fontSize: size === 'sm' ? typography.fontSize.xs : typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    textTransform: 'capitalize',
    whiteSpace: 'nowrap',
  };

  const displayLabel = label || status.replace(/_/g, ' ');

  return (
    <span style={badgeStyle} aria-label={`Status: ${displayLabel}`}>
      {displayLabel}
    </span>
  );
}
