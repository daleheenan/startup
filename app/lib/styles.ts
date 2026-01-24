// Reusable style objects for common UI patterns
import { CSSProperties } from 'react';
import { colors, gradients, shadows, borderRadius } from './constants';

// Card/Panel styles
export const card: CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: borderRadius.lg,
  padding: '1.5rem',
  boxShadow: shadows.sm,
};

export const cardCompact: CSSProperties = {
  ...card,
  padding: '1rem',
};

// Loading state
export const loadingContainer: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: colors.background,
};

export const loadingSpinner: CSSProperties = {
  display: 'inline-block',
  width: '48px',
  height: '48px',
  border: `3px solid ${colors.border}`,
  borderTopColor: colors.brandStart,
  borderRadius: borderRadius.full,
  animation: 'spin 1s linear infinite',
};

export const loadingText: CSSProperties = {
  marginTop: '1rem',
  color: colors.textSecondary,
};

// Error state
export const errorContainer: CSSProperties = {
  background: colors.errorLight,
  border: `1px solid ${colors.errorBorder}`,
  borderRadius: borderRadius.lg,
  padding: '1rem 1.5rem',
  marginBottom: '1.5rem',
  color: colors.error,
};

// Status badge
export function statusBadge(status: string): CSSProperties {
  const statusColors: Record<string, string> = {
    setup: colors.purple,
    generating: colors.orange,
    completed: colors.success,
  };

  const color = statusColors[status] || colors.gray;

  return {
    padding: '0.25rem 0.75rem',
    background: `${color}15`,
    color,
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '500',
    textTransform: 'capitalize',
  };
}

// Button styles
export const button: CSSProperties = {
  padding: '0.75rem 1.5rem',
  borderRadius: borderRadius.md,
  border: 'none',
  fontSize: '1rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
};

export const buttonPrimary: CSSProperties = {
  ...button,
  background: gradients.brand,
  color: colors.surface,
  boxShadow: shadows.md,
};

export const buttonSecondary: CSSProperties = {
  ...button,
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  color: colors.textSecondary,
};

export const buttonDisabled: CSSProperties = {
  opacity: 0.5,
  cursor: 'not-allowed',
};

// Input styles
export const input: CSSProperties = {
  width: '100%',
  padding: '0.75rem',
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: borderRadius.sm,
  color: colors.text,
  fontSize: '1rem',
};

export const label: CSSProperties = {
  display: 'block',
  marginBottom: '0.5rem',
  color: '#374151',
  fontWeight: 600,
  fontSize: '0.875rem',
};

// Layout styles
export const sidebar: CSSProperties = {
  width: '72px',
  background: colors.surface,
  borderRight: `1px solid ${colors.border}`,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '1.5rem 0',
};

export const header: CSSProperties = {
  padding: '1rem 2rem',
  background: colors.surface,
  borderBottom: `1px solid ${colors.border}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

export const pageTitle: CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: '700',
  color: colors.text,
  margin: 0,
};

export const pageSubtitle: CSSProperties = {
  fontSize: '0.875rem',
  color: colors.textSecondary,
  margin: 0,
};

// Status indicator dot
export function statusDot(isActive: boolean): CSSProperties {
  return {
    width: '8px',
    height: '8px',
    borderRadius: borderRadius.full,
    background: isActive ? colors.green : colors.red,
  };
}

// Section heading
export const sectionHeading: CSSProperties = {
  fontSize: '0.875rem',
  color: colors.textSecondary,
  marginBottom: '0.5rem',
};
