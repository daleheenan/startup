'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { colors, spacing, borderRadius, transitions } from '@/app/lib/design-tokens';

// ==================== TYPES ====================

interface SidebarNavItemProps {
  id: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
  badge?: string | number;
  isActive?: boolean;
  level?: number; // 0 = top level, 1 = nested
  disabled?: boolean;
}

// ==================== COMPONENT ====================

/**
 * SidebarNavItem Component
 *
 * A single navigation link for the dark-themed sidebar. Supports nested
 * indentation via the `level` prop, optional icon and badge, and automatic
 * active-state detection from the current pathname when `isActive` is not
 * explicitly provided.
 *
 * Colour states (all sourced from the sidebar design tokens):
 * - Default  : sidebar.text on transparent background
 * - Hover    : white text on sidebar.backgroundHover
 * - Active   : white text on sidebar.backgroundActive, rendered as a pill
 * - Disabled : sidebar.textMuted, pointer events suppressed
 *
 * Accessibility:
 * - aria-current="page" applied when the item is active
 * - aria-disabled="true" and tabIndex={-1} when disabled
 * - Visible keyboard focus ring using brand focus colour
 */
export default function SidebarNavItem({
  id,
  label,
  href,
  icon,
  badge,
  isActive: isActiveProp,
  level = 0,
  disabled = false,
}: SidebarNavItemProps) {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Derive active state from the current pathname when not explicitly provided
  const isActive =
    isActiveProp !== undefined
      ? isActiveProp
      : pathname === href || (href !== '/' && pathname.startsWith(href));

  // Left padding grows with nesting level (base 1rem + 1.25rem per level)
  const indentPadding = `${1 + level * 1.25}rem`;

  // Active items render as pills with horizontal margin; others fill the width
  const horizontalMargin = isActive ? spacing[3] : '0';

  const linkStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    padding: `${spacing[3]} ${spacing[4]} ${spacing[3]} ${indentPadding}`,
    margin: `0 ${horizontalMargin}`,
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: isActive ? 600 : 500,
    whiteSpace: 'nowrap',
    transition: transitions.colors,

    // Pill shape when active, softer rounding otherwise
    borderRadius: isActive ? borderRadius.full : borderRadius.md,

    // Colour logic driven by state priority: disabled > active > hovered > default
    color: disabled
      ? colors.sidebar.textMuted
      : isActive
        ? colors.sidebar.textActive
        : isHovered
          ? colors.white
          : colors.sidebar.text,

    backgroundColor: disabled
      ? 'transparent'
      : isActive
        ? colors.sidebar.backgroundActive
        : isHovered
          ? colors.sidebar.backgroundHover
          : 'transparent',

    // Active indicator - adds box shadow glow for more prominence
    boxShadow: isActive
      ? '0 0 10px rgba(102, 126, 234, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.15)'
      : 'none',

    // Disabled state removes interactivity at the CSS level
    pointerEvents: disabled ? 'none' : 'auto',
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',

    // Keyboard focus ring
    outline: isFocused ? `2px solid ${colors.border.focus}` : 'none',
    outlineOffset: isFocused ? '2px' : undefined,
  };

  const iconStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '1.25rem',
    color: 'inherit',
  };

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
    flexShrink: 0,
    minWidth: '1.25rem',
    padding: `${spacing[0]} ${spacing[1]}`,
    fontSize: '0.6875rem',
    fontWeight: 600,
    borderRadius: borderRadius.full,
    backgroundColor: isActive
      ? 'rgba(255, 255, 255, 0.25)'
      : colors.sidebar.backgroundHover,
    color: isActive
      ? colors.sidebar.textActive
      : colors.sidebar.text,
  };

  return (
    <li style={{ listStyle: 'none' }}>
      <Link
        href={href}
        id={id}
        style={linkStyle}
        aria-current={isActive ? 'page' : undefined}
        aria-disabled={disabled ? 'true' : undefined}
        tabIndex={disabled ? -1 : undefined}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        {icon && (
          <span style={iconStyle} aria-hidden="true">
            {icon}
          </span>
        )}

        <span style={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </span>

        {badge !== undefined && (
          <span style={badgeStyle} aria-label={`${badge} items`}>
            {badge}
          </span>
        )}
      </Link>
    </li>
  );
}
