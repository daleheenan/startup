// Shared constants for NovelForge

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Common colours (Tailwind-inspired palette)
export const colors = {
  // Backgrounds
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFC',  // Alternate surface for nested elements
  surfaceHover: '#F8FAFC',

  // Borders
  border: '#E2E8F0',
  borderHover: '#CBD5E1',

  // Text
  text: '#1A1A2E',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textDisabled: '#CBD5E1',

  // Brand gradient
  brandStart: '#667eea',
  brandEnd: '#764ba2',
  brandLight: '#EEF2FF',
  brandBorder: '#C7D2FE',
  brandText: '#4F46E5',

  // Status colors
  success: '#10B981',
  successLight: '#D1FAE5',
  successBorder: '#6EE7B7',

  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningBorder: '#FCD34D',

  error: '#DC2626',
  errorLight: '#FEF2F2',
  errorBorder: '#FECACA',

  info: '#3B82F6',
  infoLight: '#DBEAFE',
  infoBorder: '#93C5FD',

  // Specific UI colors
  purple: '#667eea',
  purpleLight: '#EEF2FF',
  green: '#4ade80',
  blue: '#60a5fa',
  yellow: '#fbbf24',
  red: '#ff6b6b',
  orange: '#F59E0B',
  gray: '#64748B',
};

// Common style patterns
export const gradients = {
  brand: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  surface: 'rgba(255, 255, 255, 0.05)',
  surfaceLight: 'rgba(255, 255, 255, 0.03)',
};

export const shadows = {
  sm: '0 1px 3px rgba(0,0,0,0.05)',
  md: '0 4px 14px rgba(102, 126, 234, 0.3)',
  lg: '0 4px 14px rgba(102, 126, 234, 0.4)',
  error: '0 2px 8px rgba(220, 38, 38, 0.2)',
};

export const borderRadius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  full: '50%',
};
