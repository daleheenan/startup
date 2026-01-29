'use client';

import { useState, useRef, useEffect, type CSSProperties } from 'react';
import Link from 'next/link';

import SidebarNavItem from './SidebarNavItem';
import {
  colors,
  spacing,
  borderRadius,
  transitions,
} from '@/app/lib/design-tokens';

// ==================== TYPES ====================

export interface NavItemConfig {
  /** Unique identifier for this navigation item. */
  id: string;
  /** Display text shown next to the icon. */
  label: string;
  /** Link destination for the item. */
  href: string;
  /** Optional icon rendered to the left of the label. */
  icon?: React.ReactNode;
  /** Optional badge displayed on the right (e.g. notification count). */
  badge?: string | number;
  /** When true, the item is rendered in a disabled state and is not clickable. */
  disabled?: boolean;
}

export interface SidebarNavGroupProps {
  /** Unique identifier for this navigation group. */
  id: string;
  /** Displayed label for the group header. */
  label: string;
  /** Icon rendered to the left of the label. */
  icon: React.ReactNode;
  /** Child navigation items belonging to this group. */
  items: NavItemConfig[];
  /** Whether the group is currently expanded, showing its children. */
  isExpanded?: boolean;
  /** Callback invoked when the header is clicked to toggle expansion. */
  onToggle?: () => void;
  /** The ID of the currently active navigation item, used for highlighting. */
  activeItemId?: string;
  /** If true, renders as a single clickable link with no expandable children. */
  isStandalone?: boolean;
  /** Destination href when isStandalone is true. */
  href?: string;
}

// ==================== COMPONENT ====================

/**
 * SidebarNavGroup renders a collapsible group of navigation items inside
 * the dashboard sidebar. The header displays an icon, uppercase label,
 * and a chevron that rotates to indicate the expanded/collapsed state.
 *
 * When any child item matches activeItemId, the header receives a subtle
 * highlight so the user can tell which section they are currently in.
 *
 * Expansion and collapse are animated via a max-height transition on the
 * children container, providing a smooth reveal without layout thrashing.
 */
export default function SidebarNavGroup({
  id,
  label,
  icon,
  items,
  isExpanded = false,
  onToggle,
  activeItemId,
  isStandalone = false,
  href,
}: SidebarNavGroupProps) {
  // ---- Derived state ----
  const hasActiveChild = items.some((item) => item.id === activeItemId);
  const expanded = isExpanded;

  // ---- Ref for measuring natural height of the children list ----
  const childrenRef = useRef<HTMLDivElement>(null);
  const [childrenHeight, setChildrenHeight] = useState<number>(0);

  // Measure the natural scrollHeight whenever items change or when expanded
  useEffect(() => {
    if (!childrenRef.current) return;

    const element = childrenRef.current;

    // Use requestAnimationFrame to ensure DOM has fully updated
    requestAnimationFrame(() => {
      if (!element) return;

      // Temporarily remove constraints to measure true content height
      const originalMaxHeight = element.style.maxHeight;
      const originalOverflow = element.style.overflow;

      element.style.maxHeight = 'none';
      element.style.overflow = 'visible';

      const height = element.scrollHeight;

      // Restore original styles
      element.style.maxHeight = originalMaxHeight;
      element.style.overflow = originalOverflow;

      if (height > 0) {
        setChildrenHeight(height);
      }
    });
  }, [items, expanded]);

  // ---- Styles ----

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    padding: `${spacing[2]} ${spacing[4]}`,
    borderRadius: borderRadius.md,
    cursor: isStandalone && href ? 'pointer' : 'pointer',
    textDecoration: 'none',
    backgroundColor: hasActiveChild
      ? 'rgba(102, 126, 234, 0.12)' // Subtle brand tint when a child is active
      : 'transparent',
    transition: transitions.colors,
    border: 'none',
    width: '100%',
    textAlign: 'left' as const,
    userSelect: 'none' as const,
  };

  const iconWrapperStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '20px',
    color: hasActiveChild ? colors.brand.primary : colors.sidebar.textMuted,
    transition: transitions.colors,
  };

  const labelStyle: CSSProperties = {
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: hasActiveChild ? colors.sidebar.text : colors.sidebar.textMuted,
    transition: transitions.colors,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
  };

  const chevronStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '16px',
    height: '16px',
    color: colors.sidebar.textMuted,
    transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
    transition: `transform ${transitions.base}`,
  };

  // Use measured height when available, or a generous fallback for initial expansion
  const expandedMaxHeight = childrenHeight > 0 ? `${childrenHeight}px` : '500px';

  const childrenContainerStyle: CSSProperties = {
    overflow: 'hidden',
    maxHeight: expanded ? expandedMaxHeight : '0px',
    transition: `max-height ${transitions.slow}`,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[1],
    paddingTop: expanded ? spacing[1] : '0px',
  };

  // ---- Standalone mode: render as a simple link ----

  if (isStandalone && href) {
    const standaloneStyle: CSSProperties = {
      ...headerStyle,
      backgroundColor: activeItemId === id
        ? colors.sidebar.backgroundActive
        : hasActiveChild
          ? 'rgba(102, 126, 234, 0.12)'
          : 'transparent',
      color: activeItemId === id ? colors.sidebar.textActive : colors.sidebar.text,
    };

    return (
      <Link href={href} style={standaloneStyle}>
        <span style={iconWrapperStyle}>{icon}</span>
        <span style={{ ...labelStyle, textTransform: 'none', fontSize: '0.875rem', letterSpacing: 'normal' }}>
          {label}
        </span>
      </Link>
    );
  }

  // ---- Group mode: header + collapsible children ----

  return (
    <div style={{ width: '100%' }}>
      {/* Group header button */}
      <button
        type="button"
        style={headerStyle}
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`nav-group-${id}-children`}
        id={`nav-group-${id}-header`}
      >
        <span style={iconWrapperStyle}>{icon}</span>
        <span style={labelStyle}>{label}</span>
        <span style={chevronStyle} aria-hidden="true">
          {/* Inline chevron-right SVG */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
      </button>

      {/* Collapsible children list */}
      <div
        id={`nav-group-${id}-children`}
        ref={childrenRef}
        style={childrenContainerStyle}
        role="group"
        aria-labelledby={`nav-group-${id}-header`}
      >
        {items.map((item) => (
          <SidebarNavItem
            key={item.id}
            id={item.id}
            label={item.label}
            href={item.href}
            icon={item.icon}
            badge={item.badge}
            disabled={item.disabled}
            isActive={activeItemId ? item.id === activeItemId : undefined}
            level={1}
          />
        ))}
      </div>
    </div>
  );
}
