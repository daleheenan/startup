// StoryScore Constants

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Colour Scheme - Blues and Purples for Creative Feel
export const colours = {
  // Primary colours
  primary: '#6366f1', // Indigo
  primaryDark: '#4f46e5',
  primaryLight: '#818cf8',

  // Secondary colours
  secondary: '#8b5cf6', // Violet
  secondaryDark: '#7c3aed',
  secondaryLight: '#a78bfa',

  // Background
  background: '#0f172a', // Slate 900
  surface: '#1e293b', // Slate 800
  surfaceHover: '#334155', // Slate 700

  // Text
  text: '#f1f5f9', // Slate 100
  textSecondary: '#cbd5e1', // Slate 300
  textMuted: '#94a3b8', // Slate 400

  // Semantic
  success: '#10b981', // Green
  successLight: '#6ee7b7',
  warning: '#f59e0b', // Amber
  warningLight: '#fcd34d',
  error: '#ef4444', // Red
  errorLight: '#fca5a5',

  // Borders
  border: '#334155',
  borderFocus: '#6366f1',
};

// Score colour thresholds
export const scoreColours = {
  low: '#ef4444', // Red (< 50)
  medium: '#f59e0b', // Amber (50-75)
  high: '#10b981', // Green (75+)
};

export function getScoreColour(score: number): string {
  if (score < 50) return scoreColours.low;
  if (score < 75) return scoreColours.medium;
  return scoreColours.high;
}
