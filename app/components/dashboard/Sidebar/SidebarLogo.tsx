'use client';

import Link from 'next/link';
import { colors, spacing, typography, borderRadius, transitions } from '@/app/lib/design-tokens';

interface SidebarLogoProps {
  collapsed?: boolean;
}

/**
 * SidebarLogo Component
 *
 * Renders the NovelForge brand mark and application name within the
 * dashboard sidebar. Adapts its layout to the collapsed state:
 * - Expanded: gradient logo mark + "NOVEL FORGE" wordmark side by side
 * - Collapsed: gradient logo mark only
 *
 * Uses the same brand gradient as PrimaryNavigationBar for visual consistency.
 */
export default function SidebarLogo({ collapsed = false }: SidebarLogoProps) {
  return (
    <Link
      href="/"
      aria-label="NovelForge home page"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : spacing[3],
        textDecoration: 'none',
        transition: transitions.all,
      }}
    >
      {/* Logo mark — gradient square with "NF" initials */}
      <div
        aria-hidden="true"
        style={{
          width: '40px',
          height: '40px',
          minWidth: '40px',
          background: colors.brand.gradient,
          borderRadius: borderRadius.lg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.text.inverse,
          fontFamily: typography.fontFamily.base,
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.bold,
          letterSpacing: typography.letterSpacing.tight,
          transition: transitions.transform,
        }}
      >
        NF
      </div>

      {/* Wordmark — hidden when sidebar is collapsed */}
      {!collapsed && (
        <span
          style={{
            color: colors.text.primary,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.semibold,
            letterSpacing: typography.letterSpacing.wide,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            transition: transitions.opacity,
          }}
        >
          Novel Forge
        </span>
      )}
    </Link>
  );
}
