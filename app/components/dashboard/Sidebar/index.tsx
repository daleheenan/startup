'use client';

import { useEffect, useCallback, type CSSProperties } from 'react';
import { usePathname } from 'next/navigation';

import { useDashboardContext } from '../DashboardContext';
import SidebarLogo from './SidebarLogo';
import SidebarSearch from './SidebarSearch';
import SidebarNavGroup from './SidebarNavGroup';
import SidebarUserProfile from './SidebarUserProfile';

import {
  colors,
  dashboardSpacing,
  spacing,
  transitions,
  zIndex,
} from '@/app/lib/design-tokens';

// ==================== PROPS ====================

interface SidebarProps {
  collapsed?: boolean;
  onCollapseToggle?: () => void;
}

// ==================== ICONS ====================

function DashboardIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function StoriesIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="14" y2="10" />
    </svg>
  );
}

function ProjectsIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9,22 9,12 15,12 15,22" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// ==================== NAVIGATION STRUCTURE ====================

/**
 * Defines the full navigation hierarchy for the NovelForge dashboard sidebar.
 * Standalone items render as direct links; grouped items are collapsible
 * sections with nested child links.
 */
const navigationGroups = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <DashboardIcon />,
    isStandalone: true,
    href: '/projects',
    items: [] as { id: string; label: string; href: string }[],
  },
  {
    id: 'stories',
    label: 'Stories',
    icon: <StoriesIcon />,
    isStandalone: false,
    href: undefined,
    items: [
      { id: 'quick-start', label: 'Quick Start', href: '/new?mode=quick' },
      { id: 'full-customization', label: 'Full Customisation', href: '/new?mode=full' },
      { id: 'ideas', label: 'Ideas', href: '/new?mode=ideas' },
      { id: 'concepts', label: 'Concepts', href: '/new?mode=concepts' },
    ],
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: <ProjectsIcon />,
    isStandalone: false,
    href: undefined,
    items: [
      { id: 'novels', label: 'Novels', href: '/projects' },
      { id: 'series', label: 'Series Management', href: '/series' },
      { id: 'editorial', label: 'Editorial Board', href: '/editorial' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <SettingsIcon />,
    isStandalone: true,
    href: '/settings',
    items: [] as { id: string; label: string; href: string }[],
  },
];

// ==================== ACTIVE-ITEM DERIVATION ====================

/**
 * Walks the navigation structure and returns the id of the first item whose
 * href matches the current pathname. Standalone groups are matched by their
 * top-level href; nested items are matched individually.
 */
function deriveActiveItemId(pathname: string): string | null {
  for (const group of navigationGroups) {
    if (group.isStandalone && group.href) {
      if (pathname === group.href || (group.href !== '/' && pathname.startsWith(group.href))) {
        return group.id;
      }
    }

    for (const item of group.items) {
      if (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))) {
        return item.id;
      }
    }
  }
  return null;
}

// ==================== COMPONENT ====================

/**
 * Sidebar is the primary navigation container for the NovelForge dashboard.
 *
 * Layout:
 *   [Logo]          — brand mark, links to home
 *   [Search]        — opens the command palette / search overlay
 *   [Nav Groups]    — scrollable list of collapsible navigation sections
 *   [User Profile]  — avatar + display name, pinned to the bottom
 *
 * State is driven by DashboardContext so that expanded groups and the active
 * item persist across route changes and survive page reloads (via localStorage).
 *
 * The `collapsed` prop (and its companion `onCollapseToggle`) allow a parent
 * layout to control the icon-only collapsed state. When neither prop is
 * supplied the component reads and writes collapsed state directly from context.
 */
export default function Sidebar({ collapsed: collapsedProp, onCollapseToggle }: SidebarProps) {
  const { state, dispatch } = useDashboardContext();
  const pathname = usePathname();

  // Prefer the explicit prop; fall back to context-driven state.
  const collapsed = collapsedProp ?? state.sidebarCollapsed;

  // ---- Sync active nav item whenever the route changes ----

  useEffect(() => {
    const activeId = deriveActiveItemId(pathname);
    dispatch({ type: 'SET_ACTIVE_NAV_ITEM', payload: activeId });
  }, [pathname, dispatch]);

  // ---- Toggle handlers ----

  const handleCollapseToggle = useCallback(() => {
    if (onCollapseToggle) {
      onCollapseToggle();
    } else {
      dispatch({ type: 'TOGGLE_SIDEBAR' });
    }
  }, [onCollapseToggle, dispatch]);

  const handleSearchOpen = useCallback(() => {
    dispatch({ type: 'OPEN_SEARCH' });
  }, [dispatch]);

  const handleGroupToggle = useCallback((groupId: string) => {
    dispatch({ type: 'TOGGLE_NAV_GROUP', payload: groupId });
  }, [dispatch]);

  // ---- Styles ----

  const sidebarWidth = collapsed ? dashboardSpacing.sidebarCollapsedWidth : dashboardSpacing.sidebarWidth;

  const containerStyle: CSSProperties = {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    width: sidebarWidth,
    background: colors.sidebar.background,
    display: 'flex',
    flexDirection: 'column',
    zIndex: zIndex.sticky,
    transition: `width ${transitions.base}`,
    overflow: 'hidden',
  };

  const logoSectionStyle: CSSProperties = {
    padding: `${spacing[4]} ${spacing[3]}`,
    flexShrink: 0,
  };

  const searchSectionStyle: CSSProperties = {
    padding: `0 ${spacing[3]}`,
    marginBottom: spacing[4],
    flexShrink: 0,
  };

  const navSectionStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: `0 ${spacing[3]}`,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[1],
  };

  const collapseToggleStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: `${spacing[2]} 0`,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: colors.sidebar.textMuted,
    flexShrink: 0,
    transition: transitions.colors,
  };

  // ---- Render ----

  return (
    <aside style={containerStyle} data-desktop-sidebar aria-label="Dashboard navigation">
      {/* Logo */}
      <div style={logoSectionStyle}>
        <SidebarLogo collapsed={collapsed} />
      </div>

      {/* Search trigger */}
      <div style={searchSectionStyle}>
        <SidebarSearch collapsed={collapsed} onClick={handleSearchOpen} />
      </div>

      {/* Navigation groups — scrollable region */}
      <nav style={navSectionStyle} aria-label="Main navigation">
        {navigationGroups.map((group) => (
          <SidebarNavGroup
            key={group.id}
            id={group.id}
            label={group.label}
            icon={group.icon}
            items={group.items}
            isExpanded={state.expandedGroups.has(group.id)}
            onToggle={() => handleGroupToggle(group.id)}
            activeItemId={state.activeNavItem ?? undefined}
            isStandalone={group.isStandalone}
            href={group.href}
          />
        ))}
      </nav>

      {/* Collapse toggle chevron */}
      <button
        type="button"
        onClick={handleCollapseToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={collapseToggleStyle}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
            transition: `transform ${transitions.base}`,
          }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* User profile — pinned to the bottom. user={null} renders the
          "Sign in" state; replace with real auth context when available. */}
      <SidebarUserProfile user={null} collapsed={collapsed} />
    </aside>
  );
}
