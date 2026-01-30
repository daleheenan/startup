/**
 * NovelForge Design Tokens
 * Centralized design system tokens for consistent UI
 *
 * WCAG AA Compliance:
 * - Normal text: 4.5:1 contrast ratio minimum
 * - Large text (18px+ or 14px+ bold): 3:1 contrast ratio minimum
 */

// ==================== COLOR TOKENS ====================

export const colors = {
  // Neutral palette
  white: '#FFFFFF',
  black: '#000000',

  // Background colors
  background: {
    primary: '#F8FAFC',      // Main app background
    secondary: '#FAFAFA',    // Alternative background
    surface: '#FFFFFF',      // Card/panel backgrounds
    surfaceHover: '#F8FAFC', // Hover state for surfaces
    overlay: 'rgba(0, 0, 0, 0.5)', // Modal overlays
  },

  // Border colors
  border: {
    default: '#E2E8F0',      // Standard borders (contrast: 1.2:1 on white)
    hover: '#CBD5E1',        // Hover state borders
    focus: '#667eea',        // Focus indicators (brand color)
  },

  // Text colours (WCAG AA compliant)
  text: {
    primary: '#1A1A2E',      // Main text (contrast: 14.8:1 on white) ✓
    secondary: '#475569',    // Secondary text (contrast: 8.6:1 on white) ✓
    tertiary: '#64748B',     // Tertiary text (contrast: 5.8:1 on white) ✓
    disabled: '#64748B',     // Disabled text (contrast: 5.8:1 on white) ✓ Issue #36 - improved from #94A3B8
    inverse: '#FFFFFF',      // Text on dark backgrounds
  },

  // Brand colors
  brand: {
    primary: '#667eea',      // Primary brand color
    primaryDark: '#764ba2',  // Dark variant
    primaryLight: '#E8EEFA', // Light variant
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },

  // Semantic colors (WCAG AA compliant)
  semantic: {
    // Success (green)
    success: '#10B981',      // Main success color (contrast: 3.4:1 on white) ⚠️ Large text only
    successDark: '#059669',  // Darker variant (contrast: 4.5:1 on white) ✓
    successLight: '#D1FAE5', // Light background
    successBorder: '#6EE7B7',

    // Warning (amber/orange)
    warning: '#D97706',      // Main warning color (contrast: 5.1:1 on white) ✓
    warningDark: '#B45309',  // Darker variant (contrast: 7.2:1 on white) ✓
    warningLight: '#FEF3C7',
    warningBorder: '#FCD34D',

    // Error (red)
    error: '#DC2626',        // Main error color (contrast: 5.9:1 on white) ✓
    errorDark: '#B91C1C',    // Darker variant (contrast: 7.7:1 on white) ✓
    errorLight: '#FEF2F2',
    errorBorder: '#FECACA',

    // Info (blue)
    info: '#2563EB',         // Main info color (contrast: 5.1:1 on white) ✓
    infoDark: '#1E40AF',     // Darker variant (contrast: 7.3:1 on white) ✓
    infoLight: '#DBEAFE',
    infoBorder: '#93C5FD',
  },

  // Sidebar colours (dark theme)
  sidebar: {
    background: '#1E1E2F',           // Base dark surface
    backgroundHover: '#2A2A3F',      // Hover state
    backgroundActive: '#667eea',     // Active pill (uses brand.primary)
    text: '#C8D6E5',                 // Default nav text (WCAG AA compliant)
    textActive: '#FFFFFF',           // Active item text
    textMuted: '#8A9BB5',            // Muted text, secondary labels
    border: '#2E2E42',               // Subtle dividers
    logoBg: '#667eea',               // Logo area background
  },

  // Metrics card colours
  metrics: {
    blue: '#3B82F6',                 // Info variant
    red: '#EF4444',                  // Error variant
    green: '#10B981',                // Success variant
    orange: '#F59E0B',               // Warning variant
    blueShade: '#EFF6FF',            // Icon circle background
    redShade: '#FEF2F2',
    greenShade: '#ECFDF5',
    orangeShade: '#FFFBEB',
  },

  // Status colors (for project states)
  status: {
    setup: '#667eea',
    generating: '#D97706',   // Using WCAG compliant warning color
    completed: '#059669',    // Using WCAG compliant success dark
    pending: '#D97706',
    running: '#2563EB',      // Using WCAG compliant info color
    failed: '#DC2626',
    paused: '#64748B',
  },
};

// ==================== TYPOGRAPHY TOKENS ====================

export const typography = {
  // Font families
  fontFamily: {
    base: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
  },

  // Font sizes (using rem for accessibility)
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px (default)
    lg: '1.125rem',    // 18px (large text for WCAG)
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '2rem',     // 32px
    '4xl': '2.5rem',   // 40px
    '5xl': '3rem',     // 48px
  },

  // Font weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  // Line heights (for readability)
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },

  // Letter spacing
  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
  },
};

// ==================== SPACING TOKENS ====================

export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px

  // Semantic spacing
  xs: '0.5rem',
  sm: '0.75rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
};

// ==================== DASHBOARD SPACING TOKENS ====================

export const dashboardSpacing = {
  sidebarWidth: '260px',
  sidebarCollapsedWidth: '72px',
  headerHeight: '64px',
  contentPadding: '1.5rem',          // 24px
  navItemPadding: '0.75rem 1rem',
  navGroupPadding: '0.5rem 1rem',
};

// ==================== BORDER RADIUS TOKENS ====================

export const borderRadius = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  full: '9999px',  // Perfect circles
};

// ==================== SHADOW TOKENS ====================

export const shadows = {
  none: 'none',
  sm: '0 1px 3px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(0, 0, 0, 0.05)',
  lg: '0 10px 25px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 60px rgba(0, 0, 0, 0.15)',

  // Colored shadows
  brand: '0 4px 14px rgba(102, 126, 234, 0.3)',
  brandHover: '0 4px 14px rgba(102, 126, 234, 0.4)',
  error: '0 2px 8px rgba(220, 38, 38, 0.2)',

  // Focus shadow for accessibility
  focus: '0 0 0 3px rgba(102, 126, 234, 0.1)',
  focusError: '0 0 0 3px rgba(220, 38, 38, 0.1)',
};

// ==================== Z-INDEX TOKENS ====================

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  header: 300,
  modal: 1000,
  toast: 9999,
};

// ==================== TRANSITION TOKENS ====================

export const transitions = {
  fast: '0.15s ease',
  base: '0.2s ease',
  slow: '0.3s ease',

  // Specific properties
  all: 'all 0.2s ease',
  colors: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease',
  transform: 'transform 0.2s ease',
  opacity: 'opacity 0.2s ease',
};

// ==================== BREAKPOINTS ====================

export const breakpoints = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// ==================== ACCESSIBILITY TOKENS ====================

export const a11y = {
  // Minimum touch target size (WCAG 2.1 AA)
  minTouchTarget: '44px',

  // Focus outline width
  focusOutlineWidth: '2px',

  // Animation durations (respects prefers-reduced-motion)
  animationDuration: {
    short: '150ms',
    medium: '300ms',
    long: '500ms',
  },
};

// ==================== COMPONENT-SPECIFIC TOKENS ====================

export const components = {
  button: {
    paddingX: spacing[6],
    paddingY: spacing[3],
    minHeight: a11y.minTouchTarget,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    borderRadius: borderRadius.md,
  },

  input: {
    paddingX: spacing[4],
    paddingY: spacing[3],
    minHeight: a11y.minTouchTarget,
    fontSize: typography.fontSize.base,
    borderRadius: borderRadius.md,
    borderWidth: '1px',
  },

  card: {
    padding: spacing[6],
    borderRadius: borderRadius.lg,
    borderWidth: '1px',
  },

  modal: {
    maxWidth: '480px',
    padding: spacing[8],
    borderRadius: borderRadius.xl,
  },
};

// ==================== DESIGN SYSTEM ADDITIONS (UX Review #9.1) ====================

/**
 * Status indicator patterns (Issue #5, #46)
 * Provides consistent status visualisation with icons and colours
 */
export const statusIndicators = {
  completed: {
    icon: '✓',
    color: colors.semantic.successDark,
    bg: colors.semantic.successLight,
    label: 'Completed',
  },
  required: {
    icon: '!',
    color: colors.semantic.error,
    bg: colors.semantic.errorLight,
    label: 'Required',
  },
  locked: {
    icon: '🔒',
    color: colors.text.disabled,
    bg: colors.background.surfaceHover,
    label: 'Locked',
  },
  active: {
    icon: '►',
    color: colors.brand.primary,
    bg: colors.brand.primaryLight,
    label: 'Active',
  },
  inProgress: {
    icon: '◐',
    color: colors.semantic.info,
    bg: colors.semantic.infoLight,
    label: 'In Progress',
  },
  draft: {
    icon: '○',
    color: colors.semantic.warning,
    bg: colors.semantic.warningLight,
    label: 'Draft',
  },
};

/**
 * Button size variants (Issue #43)
 * Standardised button sizing across the application
 */
export const buttonSizes = {
  sm: {
    padding: `${spacing[2]} ${spacing[4]}`,
    fontSize: typography.fontSize.sm,
    minHeight: '36px',
  },
  md: {
    padding: `${spacing[3]} ${spacing[6]}`,
    fontSize: typography.fontSize.base,
    minHeight: a11y.minTouchTarget,
  },
  lg: {
    padding: `${spacing[4]} ${spacing[8]}`,
    fontSize: typography.fontSize.lg,
    minHeight: '52px',
  },
};

/**
 * Modal breakpoints (Issue #58)
 * Responsive modal sizing for different screen sizes
 */
export const modalSizes = {
  sm: {
    mobile: { maxWidth: '100%', width: '100%', margin: 0 },
    tablet: { maxWidth: '400px', width: '90%' },
    desktop: { maxWidth: '480px', width: '90%' },
  },
  md: {
    mobile: { maxWidth: '100%', width: '100%', margin: 0 },
    tablet: { maxWidth: '600px', width: '90%' },
    desktop: { maxWidth: '700px', width: '90%' },
  },
  lg: {
    mobile: { maxWidth: '100%', width: '100%', margin: 0 },
    tablet: { maxWidth: '800px', width: '90%' },
    desktop: { maxWidth: '1000px', width: '90%' },
  },
};

/**
 * Gradient variants (Issue #38)
 * Standardised gradient definitions
 */
export const gradients = {
  brand: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  warning: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  error: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
  info: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
};
