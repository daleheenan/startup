/**
 * Severity Levels and Colour Mappings
 * UK British spelling: colour, not color
 */

export type SeverityLevel = 'excellent' | 'good' | 'acceptable' | 'needs-attention' | 'poor' | 'critical';

export interface SeverityConfig {
  label: string;
  colour: string;
  bgColour: string;
  icon: string;
}

export const SEVERITY_CONFIG: Record<SeverityLevel, SeverityConfig> = {
  excellent: {
    label: 'Excellent',
    colour: '#16a34a',
    bgColour: '#f0fdf4',
    icon: '✓',
  },
  good: {
    label: 'Good',
    colour: '#16a34a',
    bgColour: '#f0fdf4',
    icon: '✓',
  },
  acceptable: {
    label: 'Acceptable',
    colour: '#d97706',
    bgColour: '#fffbeb',
    icon: '!',
  },
  'needs-attention': {
    label: 'Needs Attention',
    colour: '#d97706',
    bgColour: '#fffbeb',
    icon: '⚠',
  },
  poor: {
    label: 'Poor',
    colour: '#dc2626',
    bgColour: '#fef2f2',
    icon: '✗',
  },
  critical: {
    label: 'Critical',
    colour: '#dc2626',
    bgColour: '#fef2f2',
    icon: '✗',
  },
};

export function getSeverityConfig(level: SeverityLevel): SeverityConfig {
  return SEVERITY_CONFIG[level] || SEVERITY_CONFIG['acceptable'];
}

export function mapScoreToSeverity(score: number): SeverityLevel {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'acceptable';
  if (score >= 40) return 'needs-attention';
  if (score >= 20) return 'poor';
  return 'critical';
}
