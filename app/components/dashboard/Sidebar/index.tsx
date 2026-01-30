'use client';

import { useEffect, useCallback, useMemo, type CSSProperties } from 'react';
import { usePathname } from 'next/navigation';

import { useDashboardContext } from '../DashboardContext';
import SidebarLogo from './SidebarLogo';
import SidebarSearch from './SidebarSearch';
import SidebarNavGroup from './SidebarNavGroup';
import SidebarUserProfile from './SidebarUserProfile';
import { useUserPreferences } from '@/app/hooks/useUserPreferences';

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

function AnalyticsIcon() {
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
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
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

// Menu item icons (for individual items within groups)
function YourIdeaIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function QuickStartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function FullCustomisationIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="2.5" />
      <circle cx="6.5" cy="12" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
      <line x1="13.5" y1="9" x2="13.5" y2="21" />
      <line x1="6.5" y1="14.5" x2="6.5" y2="21" />
      <line x1="17.5" y1="3" x2="17.5" y2="15" />
    </svg>
  );
}

function IdeasIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
    </svg>
  );
}

function ConceptsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function DraftNovelsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function CompletedNovelsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function SeriesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="5" height="14" rx="1" />
      <rect x="9" y="4" width="5" height="17" rx="1" />
      <rect x="16" y="7" width="5" height="14" rx="1" />
    </svg>
  );
}

function EditorialIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function AICostsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function BooksIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function PenNamesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
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
    items: [] as { id: string; label: string; href: string; icon?: React.ReactNode }[],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <AnalyticsIcon />,
    isStandalone: true,
    href: '/analytics',
    items: [] as { id: string; label: string; href: string; icon?: React.ReactNode }[],
  },
  {
    id: 'stories',
    label: 'Stories',
    icon: <StoriesIcon />,
    isStandalone: false,
    href: undefined,
    items: [
      { id: 'your-idea', label: 'Your idea', href: '/story-ideas?add=true', icon: <YourIdeaIcon /> },
      { id: 'quick-start', label: 'Quick Start', href: '/quick-start', icon: <QuickStartIcon /> },
      { id: 'full-customization', label: 'Full Customisation', href: '/full-customization', icon: <FullCustomisationIcon /> },
      { id: 'ideas', label: 'Ideas', href: '/story-ideas', icon: <IdeasIcon /> },
      { id: 'concepts', label: 'Concepts', href: '/saved-concepts', icon: <ConceptsIcon /> },
    ],
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: <ProjectsIcon />,
    isStandalone: false,
    href: undefined,
    items: [
      { id: 'draft-novels', label: 'Draft Novels', href: '/projects', icon: <DraftNovelsIcon /> },
      { id: 'completed-novels', label: 'Completed Novels', href: '/completed', icon: <CompletedNovelsIcon /> },
      { id: 'series', label: 'Series Management', href: '/series', icon: <SeriesIcon /> },
      { id: 'books', label: 'Books', href: '/books', icon: <BooksIcon /> },
      { id: 'pen-names', label: 'Pen Names', href: '/pen-names', icon: <PenNamesIcon /> },
      { id: 'editorial', label: 'Editorial Board', href: '/editorial', icon: <EditorialIcon /> },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <SettingsIcon />,
    isStandalone: true,
    href: '/settings',
    items: [] as { id: string; label: string; href: string; icon?: React.ReactNode }[],
  },
];

// ==================== ACTIVE-ITEM DERIVATION ====================

/**
 * Walks the navigation structure and returns the id of the first item whose
 * href matches the current pathname. We prioritise nested items over standalone
 * groups to ensure specific matches (e.g. /projects -> Draft Novels) take
 * precedence over general matches (e.g. Dashboard -> /projects).
 *
 * External URLs (https://) are never matched since they navigate away from the app.
 */
function deriveActiveItemId(pathname: string): string | null {
  // First pass: check all nested items (higher priority)
  for (const group of navigationGroups) {
    for (const item of group.items) {
      // Skip external links — they can never be "active"
      if (item.href.startsWith('http://') || item.href.startsWith('https://')) {
        continue;
      }
      if (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))) {
        return item.id;
      }
    }
  }

  // Second pass: check standalone groups (lower priority)
  for (const group of navigationGroups) {
    if (group.isStandalone && group.href) {
      if (pathname === group.href || (group.href !== '/' && pathname.startsWith(group.href))) {
        return group.id;
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

  // Fetch user preferences using the cached hook
  const { data: preferences } = useUserPreferences();
  const showAICosts = preferences?.showAICostsMenu || false;

  // Build dynamic navigation groups based on preferences
  // Use useMemo to prevent recreation on every render
  const dynamicNavigationGroups = useMemo(() => {
    return navigationGroups.map((group) => {
      if (group.id === 'projects' && showAICosts) {
        return {
          ...group,
          items: [
            ...group.items,
            { id: 'ai-costs', label: 'AI Costs', href: '/ai-costs', icon: <AICostsIcon /> },
          ],
        };
      }
      return group;
    });
  }, [showAICosts]);

  // ---- Sync active nav item whenever the route changes ----

  useEffect(() => {
    // Custom active item derivation that uses dynamic navigation groups
    const deriveActiveItemIdFromGroups = (currentPath: string): string | null => {
      // First pass: check all nested items (higher priority)
      for (const group of dynamicNavigationGroups) {
        for (const item of group.items) {
          if (item.href.startsWith('http://') || item.href.startsWith('https://')) {
            continue;
          }
          if (currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href))) {
            return item.id;
          }
        }
      }
      // Second pass: check standalone groups (lower priority)
      for (const group of dynamicNavigationGroups) {
        if (group.isStandalone && group.href) {
          if (currentPath === group.href || (group.href !== '/' && currentPath.startsWith(group.href))) {
            return group.id;
          }
        }
      }
      return null;
    };

    const activeId = deriveActiveItemIdFromGroups(pathname);
    dispatch({ type: 'SET_ACTIVE_NAV_ITEM', payload: activeId });

    // Find which group contains the active item
    let activeGroupId: string | null = null;
    if (activeId) {
      for (const group of dynamicNavigationGroups) {
        if (group.items.some((item) => item.id === activeId)) {
          activeGroupId = group.id;
          break;
        }
      }
    }

    // Auto-expand the active group to ensure the active item is visible
    // This provides better UX by showing where the user currently is
    if (activeGroupId) {
      dispatch({ type: 'EXPAND_NAV_GROUP', payload: activeGroupId });
    }
  }, [pathname, dispatch, dynamicNavigationGroups]);

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
        {dynamicNavigationGroups.map((group) => (
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
