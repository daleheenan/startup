'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  colors,
  typography,
  shadows,
  borderRadius,
  transitions,
  spacing,
} from '@/app/lib/design-tokens';

// ==================== TYPES ====================

export interface MetricCardItem {
  label: string;
  count: number;
}

export interface MetricCardProps {
  /** Descriptive title shown above the main value. */
  title: string;
  /** Primary metric value displayed in large text. */
  value: string | number;
  /** Colour variant that controls the top border and icon circle. */
  variant: 'blue' | 'red' | 'green' | 'orange';
  /** Icon rendered inside the coloured circle on the left. */
  icon: ReactNode;
  /** Optional list of label/count pairs shown beneath the main value. */
  items?: MetricCardItem[];
  /** If provided, the entire card becomes a clickable link. */
  href?: string;
}

// ==================== VARIANT TOKENS ====================

/**
 * Maps each variant name to the corresponding design-token colours
 * for the top border and icon-circle background.
 */
const variantStyles = {
  blue: {
    borderColor: colors.metrics.blue,
    shadeColor: colors.metrics.blueShade,
  },
  red: {
    borderColor: colors.metrics.red,
    shadeColor: colors.metrics.redShade,
  },
  green: {
    borderColor: colors.metrics.green,
    shadeColor: colors.metrics.greenShade,
  },
  orange: {
    borderColor: colors.metrics.orange,
    shadeColor: colors.metrics.orangeShade,
  },
} as const;

// ==================== COMPONENT ====================

/**
 * MetricCard renders a single dashboard metric with a coloured top border,
 * an icon in a tinted circle, a title, a prominent value, and an optional
 * list of subordinate label/count pairs.
 *
 * When `href` is supplied the card is wrapped in a Next.js Link and gains
 * a subtle hover effect to signal interactivity.
 */
export default function MetricCard({
  title,
  value,
  variant,
  icon,
  items,
  href,
}: MetricCardProps) {
  const { borderColor, shadeColor } = variantStyles[variant];

  const cardContent = (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[4] }}>
      {/* Icon circle */}
      <div
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: '40px',
          height: '40px',
          borderRadius: borderRadius.full,
          backgroundColor: shadeColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>

      {/* Text content */}
      <div style={{ minWidth: 0, flex: 1 }}>
        {/* Title */}
        <p
          style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            margin: 0,
            marginBottom: spacing[1],
            lineHeight: typography.lineHeight.normal,
          }}
        >
          {title}
        </p>

        {/* Main value */}
        <p
          style={{
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            margin: 0,
            lineHeight: typography.lineHeight.tight,
          }}
        >
          {value}
        </p>

        {/* Optional items list */}
        {items && items.length > 0 && (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              marginTop: spacing[3],
              display: 'flex',
              flexDirection: 'column',
              gap: spacing[1],
            }}
          >
            {items.map((item) => (
              <li
                key={item.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: typography.fontSize.xs,
                    color: colors.text.secondary,
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.text.tertiary,
                  }}
                >
                  {item.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  // ==================== SHARED CARD STYLES ====================

  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.background.surface,
    boxShadow: shadows.sm,
    borderRadius: borderRadius.lg,
    padding: spacing[6],
    borderTopWidth: '4px',
    borderTopStyle: 'solid',
    borderTopColor: borderColor,
    transition: href ? transitions.all : undefined,
  };

  // ==================== RENDER ====================

  if (href) {
    return (
      <Link
        href={href}
        style={{
          ...cardStyle,
          display: 'block',
          textDecoration: 'none',
          color: 'inherit',
        }}
        className="metric-card metric-card--clickable"
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = shadows.md;
          (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = shadows.sm;
          (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
        }}
      >
        {cardContent}
      </Link>
    );
  }

  return (
    <div style={cardStyle} className="metric-card">
      {cardContent}
    </div>
  );
}
