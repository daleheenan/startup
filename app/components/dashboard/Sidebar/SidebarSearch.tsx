'use client';

import { useState } from 'react';
import { colors, spacing, borderRadius, transitions } from '@/app/lib/design-tokens';
import { useKeyboardShortcut } from '@/app/hooks/useKeyboardShortcut';

// ==================== TYPES ====================

interface SidebarSearchProps {
  collapsed?: boolean;
  onClick?: () => void;
}

// ==================== PLATFORM DETECTION ====================

/**
 * Detects whether the current platform is macOS so the keyboard shortcut
 * badge can display the appropriate modifier symbol (⌘ vs Ctrl).
 * Returns false during server-side rendering when `window` is unavailable.
 */
function useMacDetection(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
}

// ==================== COMPONENT ====================

/**
 * SidebarSearch Component
 *
 * Renders a search-trigger button styled to resemble a search input within
 * the dark sidebar. Shows a magnifying glass icon, placeholder text, and a
 * platform-aware keyboard shortcut badge (⌘K on macOS, Ctrl K elsewhere).
 *
 * When the sidebar is collapsed, only the magnifying glass icon is visible
 * so the button remains usable without breaking the narrow layout.
 *
 * The component also binds Ctrl+K (or ⌘+K on macOS) via the
 * `useKeyboardShortcut` hook so the search modal can be opened without
 * reaching for the mouse.
 *
 * Accessibility:
 * - Visible keyboard focus ring using brand focus colour
 * - Keyboard shortcut labelled with aria-label on the badge
 * - aria-label describes the action and shortcut for screen readers
 */
export default function SidebarSearch({ collapsed = false, onClick }: SidebarSearchProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isMac = useMacDetection();

  // Register Ctrl+K / ⌘+K keyboard shortcut to trigger the same action
  useKeyboardShortcut(
    { key: 'k', ctrlKey: true, preventDefault: true },
    () => onClick?.(),
  );

  const shortcutLabel = isMac ? '⌘K' : 'Ctrl K';

  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: collapsed ? 0 : spacing[3],
    width: '100%',
    padding: collapsed
      ? `${spacing[3]} 0`
      : `${spacing[3]} ${spacing[4]}`,
    justifyContent: collapsed ? 'center' : 'flex-start',
    border: `1px solid ${colors.sidebar.border}`,
    borderRadius: borderRadius.md,
    backgroundColor: isHovered
      ? 'rgba(255, 255, 255, 0.15)'
      : 'rgba(255, 255, 255, 0.1)',
    color: colors.sidebar.textMuted,
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: transitions.colors,
    overflow: 'hidden',
    textAlign: 'left',
    outline: isFocused ? `2px solid ${colors.border.focus}` : 'none',
    outlineOffset: isFocused ? '2px' : undefined,
    boxSizing: 'border-box',
  };

  const iconStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '1.25rem',
    height: '1.25rem',
    color: 'inherit',
  };

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: 'auto',
    padding: `${spacing[0]} ${spacing[2]}`,
    fontSize: '0.6875rem',
    fontWeight: 600,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: colors.sidebar.textMuted,
    border: `1px solid ${colors.sidebar.border}`,
    letterSpacing: '0.025em',
    whiteSpace: 'nowrap',
  };

  return (
    <button
      type="button"
      style={buttonStyle}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      aria-label={collapsed ? 'Search' : `Search (${shortcutLabel})`}
    >
      {/* Magnifying glass icon */}
      <span style={iconStyle} aria-hidden="true">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="7" cy="7" r="4.5" />
          <line x1="10.5" y1="10.5" x2="14" y2="14" />
        </svg>
      </span>

      {/* Placeholder text and shortcut badge — hidden when collapsed */}
      {!collapsed && (
        <>
          <span style={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Search...
          </span>

          <span style={badgeStyle} aria-label={`Keyboard shortcut: ${shortcutLabel}`}>
            {shortcutLabel}
          </span>
        </>
      )}
    </button>
  );
}
