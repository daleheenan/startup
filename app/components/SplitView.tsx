'use client';

import { ReactNode, CSSProperties } from 'react';
import { colors, borderRadius, shadows } from '@/app/lib/constants';

interface SplitViewProps {
  /** Left pane width as percentage (default: 30) */
  leftWidth?: number;
  /** Content for the left scrollable list pane */
  leftPane: ReactNode;
  /** Content for the right detail pane */
  rightPane: ReactNode;
  /** Optional minimum height for the container */
  minHeight?: string;
  /** Whether to show a divider between panes */
  showDivider?: boolean;
}

/**
 * SplitView Component
 *
 * A two-pane layout with a scrollable list on the left and detail view on the right.
 * Designed for displaying lists of items with a detail panel.
 *
 * Left pane (30%): Scrollable list
 * Right pane (70%): Detail view when item selected
 */
export default function SplitView({
  leftWidth = 30,
  leftPane,
  rightPane,
  minHeight = 'calc(100vh - 200px)',
  showDivider = true,
}: SplitViewProps) {
  const containerStyle: CSSProperties = {
    display: 'flex',
    minHeight,
    background: colors.surface,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.border}`,
    overflow: 'hidden',
  };

  const leftPaneStyle: CSSProperties = {
    width: `${leftWidth}%`,
    borderRight: showDivider ? `1px solid ${colors.border}` : 'none',
    overflowY: 'auto',
    background: colors.surfaceAlt,
  };

  const rightPaneStyle: CSSProperties = {
    width: `${100 - leftWidth}%`,
    overflowY: 'auto',
    background: colors.surface,
  };

  return (
    <div style={containerStyle}>
      <div style={leftPaneStyle}>
        {leftPane}
      </div>
      <div style={rightPaneStyle}>
        {rightPane}
      </div>
    </div>
  );
}

// ============================================================================
// List Item Component for Left Pane
// ============================================================================

interface SplitViewListItemProps {
  /** Unique identifier for the item */
  id: string;
  /** Title/headline of the item */
  title: string;
  /** Date to display */
  date: string;
  /** Genre or category badge */
  genre?: string;
  /** 3-line premise/summary text */
  premise: string;
  /** Whether this item is currently selected */
  isSelected: boolean;
  /** Status badge (optional) */
  status?: 'saved' | 'used' | 'archived';
  /** Callback when item is clicked */
  onClick: (id: string) => void;
}

export function SplitViewListItem({
  id,
  title,
  date,
  genre,
  premise,
  isSelected,
  status,
  onClick,
}: SplitViewListItemProps) {
  const itemStyle: CSSProperties = {
    padding: '1rem',
    cursor: 'pointer',
    borderBottom: `1px solid ${colors.border}`,
    background: isSelected ? colors.brandLight : 'transparent',
    borderLeft: isSelected ? `3px solid ${colors.brandStart}` : '3px solid transparent',
    transition: 'all 0.15s ease',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.5rem',
    gap: '0.5rem',
  };

  const titleStyle: CSSProperties = {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: colors.text,
    margin: 0,
    lineHeight: 1.3,
    flex: 1,
  };

  const metaStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    color: colors.textTertiary,
    marginBottom: '0.5rem',
  };

  const genreBadgeStyle: CSSProperties = {
    padding: '0.125rem 0.5rem',
    background: colors.brandLight,
    color: colors.brandText,
    fontSize: '0.6875rem',
    fontWeight: 500,
    borderRadius: borderRadius.full,
    whiteSpace: 'nowrap',
  };

  const statusBadgeStyle: CSSProperties = {
    padding: '0.125rem 0.5rem',
    background: status === 'used' ? colors.successLight : colors.surfaceHover,
    color: status === 'used' ? colors.success : colors.textTertiary,
    fontSize: '0.6875rem',
    fontWeight: 500,
    borderRadius: borderRadius.full,
    whiteSpace: 'nowrap',
  };

  const premiseStyle: CSSProperties = {
    fontSize: '0.8125rem',
    color: colors.textSecondary,
    lineHeight: 1.5,
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    margin: 0,
  };

  return (
    <div
      style={itemStyle}
      onClick={() => onClick(id)}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = colors.surfaceHover;
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      {/* Top row: Title */}
      <div style={headerStyle}>
        <h4 style={titleStyle}>{title}</h4>
      </div>

      {/* Middle row: Date, Genre, Status */}
      <div style={metaStyle}>
        <span>{date}</span>
        {genre && (
          <>
            <span>•</span>
            <span style={genreBadgeStyle}>{genre}</span>
          </>
        )}
        {status && status !== 'saved' && (
          <span style={statusBadgeStyle}>{status}</span>
        )}
      </div>

      {/* Bottom row: 3-line premise */}
      <p style={premiseStyle}>{premise}</p>
    </div>
  );
}

// ============================================================================
// Empty State Components
// ============================================================================

interface SplitViewEmptyStateProps {
  /** Icon emoji to display */
  icon: string;
  /** Main heading */
  title: string;
  /** Descriptive message */
  message: string;
  /** Optional action button */
  action?: ReactNode;
}

export function SplitViewEmptyState({
  icon,
  title,
  message,
  action,
}: SplitViewEmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{icon}</div>
      <h3 style={{
        fontSize: '1.125rem',
        fontWeight: 600,
        color: colors.text,
        marginBottom: '0.5rem',
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: '0.875rem',
        color: colors.textSecondary,
        maxWidth: '280px',
        marginBottom: action ? '1.5rem' : 0,
      }}>
        {message}
      </p>
      {action}
    </div>
  );
}

// ============================================================================
// Detail Panel Components
// ============================================================================

interface DetailPanelHeaderProps {
  title: string;
  status?: 'saved' | 'used' | 'archived';
  genre?: string;
  date?: string;
}

export function DetailPanelHeader({
  title,
  status,
  genre,
  date,
}: DetailPanelHeaderProps) {
  return (
    <div style={{
      padding: '1.5rem',
      borderBottom: `1px solid ${colors.border}`,
      background: colors.surface,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '0.5rem',
        flexWrap: 'wrap',
      }}>
        {genre && (
          <span style={{
            padding: '0.25rem 0.75rem',
            background: colors.brandLight,
            color: colors.brandText,
            fontSize: '0.75rem',
            fontWeight: 500,
            borderRadius: borderRadius.full,
          }}>
            {genre}
          </span>
        )}
        {status && status !== 'saved' && (
          <span style={{
            padding: '0.25rem 0.75rem',
            background: status === 'used' ? colors.successLight : colors.surfaceHover,
            color: status === 'used' ? colors.success : colors.textTertiary,
            fontSize: '0.75rem',
            fontWeight: 500,
            borderRadius: borderRadius.full,
          }}>
            {status}
          </span>
        )}
      </div>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: 700,
        color: colors.text,
        marginBottom: date ? '0.5rem' : 0,
      }}>
        {title}
      </h2>
      {date && (
        <div style={{
          fontSize: '0.75rem',
          color: colors.textTertiary,
        }}>
          Saved: {date}
        </div>
      )}
    </div>
  );
}

interface DetailPanelSectionProps {
  label: string;
  children: ReactNode;
  variant?: 'default' | 'highlight' | 'warning';
}

export function DetailPanelSection({
  label,
  children,
  variant = 'default',
}: DetailPanelSectionProps) {
  const variants = {
    default: {
      background: 'transparent',
      border: 'none',
      labelColor: colors.textTertiary,
    },
    highlight: {
      background: colors.brandLight,
      border: `1px solid ${colors.borderFocus}`,
      labelColor: colors.brandText,
    },
    warning: {
      background: colors.warningLight,
      border: `1px solid ${colors.warningBorder}`,
      labelColor: colors.warning,
    },
  };

  const style = variants[variant];

  return (
    <div style={{
      background: style.background,
      border: style.border,
      borderRadius: variant !== 'default' ? borderRadius.sm : 0,
      padding: variant !== 'default' ? '0.75rem' : 0,
      marginBottom: '1rem',
    }}>
      <div style={{
        fontSize: '0.75rem',
        fontWeight: 600,
        color: style.labelColor,
        marginBottom: '0.375rem',
        textTransform: 'uppercase',
        letterSpacing: '0.025em',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '0.9375rem',
        color: colors.text,
        lineHeight: 1.6,
      }}>
        {children}
      </div>
    </div>
  );
}

interface DetailPanelActionsProps {
  children: ReactNode;
}

export function DetailPanelActions({ children }: DetailPanelActionsProps) {
  return (
    <div style={{
      padding: '1.5rem',
      borderTop: `1px solid ${colors.border}`,
      background: colors.surfaceHover,
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.75rem',
    }}>
      {children}
    </div>
  );
}

// ============================================================================
// Action Button Presets
// ============================================================================

interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function ActionButton({
  onClick,
  disabled,
  children,
  variant = 'secondary',
}: ActionButtonProps) {
  const variants = {
    primary: {
      background: `linear-gradient(135deg, ${colors.brandStart} 0%, ${colors.brandEnd} 100%)`,
      border: 'none',
      color: 'white',
      fontWeight: 600,
    },
    secondary: {
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      color: colors.text,
      fontWeight: 500,
    },
    danger: {
      background: colors.surface,
      border: `1px solid ${colors.errorBorder}`,
      color: colors.error,
      fontWeight: 500,
    },
  };

  const style = variants[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '0.625rem 1rem',
        background: style.background,
        border: style.border,
        borderRadius: borderRadius.sm,
        color: style.color,
        fontSize: '0.875rem',
        fontWeight: style.fontWeight,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        whiteSpace: 'nowrap',
        transition: 'opacity 0.15s ease',
      }}
    >
      {children}
    </button>
  );
}
