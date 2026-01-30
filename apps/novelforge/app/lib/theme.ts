// Note: This file is deprecated. All design tokens have been consolidated in design-tokens.ts
// Please import from design-tokens.ts for all design system values.
// This file remains for backward compatibility during migration.

import { colors, shadows, borderRadius, spacing, typography } from './design-tokens';

export const theme = {
  colors: {
    // Light theme colors - mapped to design-tokens
    background: colors.background.secondary,
    surface: colors.background.surface,
    border: colors.border.default,
    text: colors.text.primary,
    textSecondary: colors.text.secondary,
    textTertiary: colors.text.tertiary,

    // Primary brand colors
    primary: colors.brand.primary,
    primaryDark: colors.brand.primaryDark,
    primaryLight: colors.brand.primaryLight,

    // Status colors
    success: colors.semantic.success,
    warning: colors.semantic.warning,
    error: colors.semantic.error,
    info: colors.semantic.info,

    // Specific states
    running: colors.status.running,
    completed: colors.status.completed,
    pending: colors.status.pending,
    failed: colors.status.failed,
    paused: colors.status.paused,
  },

  shadows: {
    sm: shadows.sm,
    md: shadows.md,
    lg: shadows.lg,
  },

  borderRadius: {
    sm: borderRadius.sm,
    md: borderRadius.md,
    lg: borderRadius.lg,
  },

  spacing,
  typography,
};
