/**
 * Navigation Constants
 *
 * Constants for primary navigation, project navigation tabs, and visual styling
 */

import type { NavigationSection, PrimaryNavigationItem, TabStatus } from '../../shared/types';

/**
 * Tab status colors for visual indicators
 */
export const TAB_STATUS_COLORS: Record<TabStatus, string> = {
  completed: '#10B981',  // Green - step completed
  required: '#DC2626',   // Red - step needs completion
  optional: 'transparent', // No indicator
  active: '#667eea',     // Purple - currently viewing
  locked: '#6B7280',     // Gray - locked/inaccessible
};

/**
 * Primary navigation items for the top navigation bar
 */
export const PRIMARY_NAV_ITEMS: PrimaryNavigationItem[] = [
  {
    id: 'new-novel',
    label: 'New Novel',
    href: '/new',
    icon: '✨',
  },
  {
    id: 'story-ideas',
    label: 'Story Ideas',
    href: '/story-ideas',
    icon: '💡',
  },
  {
    id: 'story-concepts',
    label: 'Story Concepts',
    href: '/saved-concepts',
    icon: '📝',
  },
  {
    id: 'quick-start',
    label: 'Quick Start',
    href: '/quick-start',
    icon: '⚡',
  },
  {
    id: 'fully-customized',
    label: 'Full Customization',
    href: '/full-customization',
    icon: '🎨',
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: '⚙️',
  },
];

/**
 * Project navigation tabs configuration
 * Order: Overview, Characters, World, Plot, Outline, Chapters, Analytics
 * Note: Style has been removed and moved to Settings
 */
export const PROJECT_NAV_TABS = [
  {
    id: 'overview',
    label: 'Overview',
    route: '',
    icon: '📋',
    workflowStep: 'concept' as const,
  },
  {
    id: 'characters',
    label: 'Characters',
    route: '/characters',
    icon: '👥',
    workflowStep: 'characters' as const,
  },
  {
    id: 'world',
    label: 'World',
    route: '/world',
    icon: '🌍',
    workflowStep: 'world' as const,
  },
  {
    id: 'plot',
    label: 'Plot',
    route: '/plot',
    icon: '📖',
    workflowStep: 'plots' as const,
  },
  {
    id: 'outline',
    label: 'Outline',
    route: '/outline',
    icon: '📝',
    workflowStep: 'outline' as const,
  },
  {
    id: 'chapters',
    label: 'Chapters',
    route: '/progress',
    icon: '📚',
    workflowStep: 'chapters' as const,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    route: '/analytics',
    icon: '📊',
    workflowStep: 'analytics' as const,
  },
];

/**
 * Determine active navigation section from pathname
 */
export function getActiveSectionFromPath(pathname: string): NavigationSection | undefined {
  if (pathname === '/quick-start' || pathname.startsWith('/quick-start/')) return 'quick-start';
  if (pathname === '/full-customization' || pathname.startsWith('/full-customization/')) return 'fully-customized';
  if (pathname === '/new' || pathname.startsWith('/new/')) return 'new-novel';
  if (pathname === '/story-ideas' || pathname.startsWith('/story-ideas/')) return 'story-ideas';
  if (pathname === '/saved-concepts' || pathname.startsWith('/saved-concepts/')) return 'story-concepts';
  if (pathname === '/settings' || pathname.startsWith('/settings/')) return 'settings';
  if (pathname === '/projects' || pathname === '/') return 'projects';
  return undefined;
}

/**
 * Get navigation item by section id
 */
export function getNavItemById(id: NavigationSection): PrimaryNavigationItem | undefined {
  return PRIMARY_NAV_ITEMS.find(item => item.id === id);
}

/**
 * Get project tab by route
 */
export function getProjectTabByRoute(route: string) {
  return PROJECT_NAV_TABS.find(tab => tab.route === route);
}

/**
 * Get the underline style for a tab based on its status
 */
export function getTabUnderlineStyle(status: TabStatus): React.CSSProperties {
  if (status === 'active') {
    return {
      borderBottom: `3px solid ${TAB_STATUS_COLORS.active}`,
    };
  }
  if (status === 'completed') {
    return {
      borderBottom: `2px solid ${TAB_STATUS_COLORS.completed}`,
    };
  }
  if (status === 'required') {
    return {
      borderBottom: `2px solid ${TAB_STATUS_COLORS.required}`,
    };
  }
  if (status === 'locked') {
    return {
      borderBottom: `2px dashed ${TAB_STATUS_COLORS.locked}`,
      opacity: 0.5,
    };
  }
  return {};
}
