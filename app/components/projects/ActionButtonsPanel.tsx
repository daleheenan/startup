'use client';

import Link from 'next/link';
import { colors, typography, spacing, borderRadius, shadows, transitions } from '@/app/lib/design-tokens';

interface ActionButton {
  href: string;
  icon: string;
  label: string;
  description: string;
  gradient: string;
}

const actionButtons: ActionButton[] = [
  {
    href: '/quick-start',
    icon: '⚡',
    label: 'Quick Start',
    description: 'Get writing fast with AI-guided setup',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    href: '/full-customization',
    icon: '🎨',
    label: 'Full Customisation',
    description: 'Complete control over every detail',
    gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  },
  {
    href: '/story-ideas',
    icon: '💡',
    label: 'Story Ideas',
    description: 'Generate fresh concepts to inspire you',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
];

export default function ActionButtonsPanel() {
  return (
    <section
      aria-labelledby="action-buttons-heading"
      style={{
        background: colors.background.surface,
        border: `1px solid ${colors.border.default}`,
        borderRadius: borderRadius.lg,
        padding: spacing[6],
        height: '100%',
      }}
    >
      <h2
        id="action-buttons-heading"
        style={{
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.primary,
          marginTop: 0,
          marginBottom: spacing[4],
        }}
      >
        Create New
      </h2>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing[3],
        }}
      >
        {actionButtons.map((button) => (
          <Link
            key={button.href}
            href={button.href}
            aria-label={`${button.label}: ${button.description}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[4],
              padding: spacing[4],
              background: button.gradient,
              borderRadius: borderRadius.md,
              textDecoration: 'none',
              color: colors.text.inverse,
              boxShadow: shadows.md,
              transition: transitions.all,
              minHeight: '72px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = shadows.lg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = shadows.md;
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = `2px solid ${colors.white}`;
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontSize: '1.75rem',
                flexShrink: 0,
              }}
            >
              {button.icon}
            </span>
            <div>
              <div
                style={{
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.semibold,
                  marginBottom: '2px',
                }}
              >
                {button.label}
              </div>
              <div
                style={{
                  fontSize: typography.fontSize.sm,
                  opacity: 0.9,
                }}
              >
                {button.description}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
