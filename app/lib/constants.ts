// Shared constants for NovelForge

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Re-export design tokens for backwards compatibility
// New code should import directly from design-tokens.ts
export { borderRadius, shadows, spacing } from './design-tokens';
import { colors as designColors } from './design-tokens';

// Create a flattened colors object for backwards compatibility
// Maps old flat property names to new nested structure
export const colors = {
  // Include all the nested structure from design-tokens
  ...designColors,

  // Legacy flat property aliases
  // Background colors
  background: designColors.background.primary,
  surface: designColors.background.surface,
  surfaceAlt: designColors.background.secondary,
  surfaceHover: designColors.background.surfaceHover,
  overlay: designColors.background.overlay,

  // Text colors
  text: designColors.text.primary,
  textPrimary: designColors.text.primary,
  textSecondary: designColors.text.secondary,
  textTertiary: designColors.text.tertiary,
  textDisabled: designColors.text.disabled,
  textInverse: designColors.text.inverse,

  // Border colors
  border: designColors.border.default,
  borderHover: designColors.border.hover,
  borderFocus: designColors.border.focus,

  // Brand colors (flat aliases)
  brandStart: designColors.brand.primary,
  brandEnd: designColors.brand.primaryDark,
  brandPrimary: designColors.brand.primary,
  brandDark: designColors.brand.primaryDark,
  brandLight: designColors.brand.primaryLight,
  brandText: designColors.brand.primary, // alias for consistency
  brandBorder: designColors.border.focus, // typically uses focus color

  // Simple color names (legacy)
  purple: designColors.brand.primary,
  purpleLight: designColors.brand.primaryLight,
  green: designColors.semantic.success,
  blue: designColors.semantic.info,
  yellow: designColors.semantic.warning,
  red: designColors.semantic.error,
  orange: designColors.semantic.warning,
  gray: designColors.text.secondary,

  // Semantic colors (flat aliases)
  success: designColors.semantic.success,
  successDark: designColors.semantic.successDark,
  successLight: designColors.semantic.successLight,
  successBorder: designColors.semantic.successBorder,
  warning: designColors.semantic.warning,
  warningDark: designColors.semantic.warningDark,
  warningLight: designColors.semantic.warningLight,
  warningBorder: designColors.semantic.warningBorder,
  error: designColors.semantic.error,
  errorDark: designColors.semantic.errorDark,
  errorLight: designColors.semantic.errorLight,
  errorBorder: designColors.semantic.errorBorder,
  info: designColors.semantic.info,
  infoDark: designColors.semantic.infoDark,
  infoLight: designColors.semantic.infoLight,
  infoBorder: designColors.semantic.infoBorder,
};

// Legacy gradients object for backwards compatibility
// Use colors.brand.gradient for new code
export const gradients = {
  brand: designColors.brand.gradient,
  primary: designColors.brand.gradient,
  success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  surface: 'rgba(255, 255, 255, 0.05)',
  surfaceLight: 'rgba(255, 255, 255, 0.03)',
};
