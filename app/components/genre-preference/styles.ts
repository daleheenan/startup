/**
 * Shared styles for genre preference form components
 */

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.875rem 1rem',
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: '8px',
  color: '#1A1A2E',
  fontSize: '1rem',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  appearance: 'none',
  WebkitAppearance: 'none',
};

export const selectStyle: React.CSSProperties = {
  ...inputStyle,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2364748B' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 1rem center',
  paddingRight: '2.5rem',
  cursor: 'pointer',
};

export const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.5rem',
  color: '#374151',
  fontWeight: 600,
  fontSize: '0.875rem',
};

export const errorStyle: React.CSSProperties = {
  color: '#DC2626',
  fontSize: '0.813rem',
  marginTop: '0.375rem',
};

export const sectionStyle: React.CSSProperties = {
  marginBottom: '1.75rem',
};

export function chipStyle(selected: boolean, disabled: boolean): React.CSSProperties {
  return {
    padding: '0.5rem 1rem',
    background: selected
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      : '#F8FAFC',
    border: selected
      ? '1px solid #667eea'
      : '1px solid #E2E8F0',
    borderRadius: '20px',
    color: selected ? '#FFFFFF' : '#374151',
    fontSize: '0.813rem',
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  };
}

/**
 * Get styles for trend badge based on trend type
 */
export function getTrendBadgeStyles(trend: 'trending' | 'rising' | 'stable'): React.CSSProperties {
  const baseStyles: Record<string, React.CSSProperties> = {
    trending: {
      background: '#EF4444',
      color: '#FFFFFF',
      animation: 'pulse 2s infinite',
    },
    rising: {
      background: '#F59E0B',
      color: '#FFFFFF',
    },
    stable: {
      background: '#10B981',
      color: '#FFFFFF',
    },
  };

  return {
    ...baseStyles[trend],
    fontSize: '0.625rem',
    fontWeight: 600,
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
    marginLeft: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.025em',
  };
}

/**
 * Get label text for trend badge
 */
export function getTrendBadgeLabel(trend: 'trending' | 'rising' | 'stable'): string {
  const labels: Record<string, string> = {
    trending: '🔥 Hot',
    rising: '📈 Rising',
    stable: '✓ Popular',
  };
  return labels[trend];
}
