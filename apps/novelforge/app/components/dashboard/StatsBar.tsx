'use client';

import { useState, useEffect } from 'react';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
} from '@/app/lib/design-tokens';

// ==================== TYPES ====================

export interface StatItem {
  /** Label describing the metric */
  label: string;
  /** Primary value to display */
  value: string | number;
  /** Colour variant for the indicator */
  variant: 'blue' | 'red' | 'green' | 'orange';
  /** Optional icon */
  icon?: React.ReactNode;
}

export interface StatsBarProps {
  /** Array of stats to display */
  stats: StatItem[];
  /** Whether the stats bar is collapsible */
  collapsible?: boolean;
  /** Storage key for persisting collapsed state */
  storageKey?: string;
}

// ==================== VARIANT TOKENS ====================

const variantColors = {
  blue: colors.metrics.blue,
  red: colors.metrics.red,
  green: colors.metrics.green,
  orange: colors.metrics.orange,
} as const;

// ==================== COMPONENT ====================

/**
 * StatsBar renders a compact horizontal bar of metrics with optional
 * collapse functionality. Designed to be ~50% the height of the
 * original MetricCard grid while maintaining key information.
 */
export default function StatsBar({
  stats,
  collapsible = true,
  storageKey = 'statsBarCollapsed',
}: StatsBarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    if (collapsible && typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        setIsCollapsed(stored === 'true');
      }
    }
  }, [collapsible, storageKey]);

  // Persist collapsed state
  const handleToggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, String(newState));
    }
  };

  return (
    <div
      style={{
        background: colors.background.surface,
        border: `1px solid ${colors.border.default}`,
        borderRadius: borderRadius.lg,
        boxShadow: shadows.sm,
        marginBottom: spacing[6],
        overflow: 'hidden',
        transition: transitions.all,
      }}
    >
      {/* Header with toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${spacing[2]} ${spacing[4]}`,
          borderBottom: isCollapsed ? 'none' : `1px solid ${colors.border.default}`,
          background: colors.background.secondary,
        }}
      >
        <span
          style={{
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.tertiary,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Overview
        </span>
        {collapsible && (
          <button
            onClick={handleToggle}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? 'Expand overview' : 'Collapse overview'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[1],
              padding: `${spacing[1]} ${spacing[2]}`,
              background: 'transparent',
              border: 'none',
              borderRadius: borderRadius.sm,
              fontSize: typography.fontSize.xs,
              color: colors.text.tertiary,
              cursor: 'pointer',
              transition: transitions.all,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = colors.background.surfaceHover;
              e.currentTarget.style.color = colors.text.secondary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = colors.text.tertiary;
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                transition: transitions.transform,
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            {isCollapsed ? 'Show' : 'Hide'}
          </button>
        )}
      </div>

      {/* Stats content */}
      {!isCollapsed && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
            gap: 0,
          }}
        >
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[3],
                padding: `${spacing[3]} ${spacing[4]}`,
                borderRight: index < stats.length - 1 ? `1px solid ${colors.border.default}` : 'none',
              }}
            >
              {/* Colour indicator */}
              <div
                style={{
                  width: '4px',
                  height: '32px',
                  borderRadius: borderRadius.full,
                  background: variantColors[stat.variant],
                  flexShrink: 0,
                }}
              />

              {/* Content */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <p
                  style={{
                    fontSize: typography.fontSize.xs,
                    color: colors.text.tertiary,
                    margin: 0,
                    marginBottom: '2px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {stat.label}
                </p>
                <p
                  style={{
                    fontSize: typography.fontSize.lg,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.text.primary,
                    margin: 0,
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
