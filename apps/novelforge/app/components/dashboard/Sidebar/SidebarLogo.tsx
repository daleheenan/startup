'use client';

import Link from 'next/link';
import { colors, spacing, typography, transitions } from '@/app/lib/design-tokens';

interface SidebarLogoProps {
  collapsed?: boolean;
}

/**
 * Open Book Icon Component
 *
 * A stylised open book icon for the NovelForge brand.
 * Uses currentColor so it inherits the parent's text colour.
 */
function OpenBookIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Left page */}
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      {/* Right page */}
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      {/* Left page lines */}
      <line x1="5" y1="8" x2="8" y2="8" />
      <line x1="5" y1="12" x2="8" y2="12" />
      {/* Right page lines */}
      <line x1="16" y1="8" x2="19" y2="8" />
      <line x1="16" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/**
 * SidebarLogo Component
 *
 * Renders the NovelForge brand mark and application name within the
 * dashboard sidebar. Features an open book icon with transparent background
 * so the page background shows through.
 *
 * Adapts its layout to the collapsed state:
 * - Expanded: open book icon + "Novel Forge" wordmark side by side
 * - Collapsed: open book icon only
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
        padding: `${spacing[2]} ${spacing[1]}`,
      }}
    >
      {/* Logo mark — open book icon with transparent background */}
      <div
        aria-hidden="true"
        style={{
          width: '40px',
          height: '40px',
          minWidth: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.white,
          transition: transitions.transform,
        }}
      >
        <OpenBookIcon size={36} />
      </div>

      {/* Wordmark — hidden when sidebar is collapsed */}
      {!collapsed && (
        <span
          style={{
            color: colors.white,
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.bold,
            letterSpacing: typography.letterSpacing.tight,
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
