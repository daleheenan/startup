/**
 * Navigation Constants
 *
 * Constants for primary navigation, project navigation tabs, and visual styling
 *
 * Navigation structure:
 * - Overview (standalone)
 * - Edit Story (standalone)
 * - Elements: Characters, World, Images
 * - Story: Plot, Quality, Outline, Prose Style
 * - Novel: Chapters, Versions, Follow-up
 * - Editorial: Editorial Board, Analytics, Word Count, Outline Review, Prose Quality, Bestseller
 * - Publishing (standalone)
 */

import type { NavigationSection, PrimaryNavigationItem, TabStatus } from '../../shared/types';

/**
 * Tab status colours for visual indicators
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
    id: 'quick-start',
    label: 'Quick Start',
    href: '/quick-start',
    icon: '⚡',
  },
  {
    id: 'fully-customized',
    label: 'Full Customisation',
    href: '/full-customization',
    icon: '🎨',
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
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: '⚙️',
  },
];

/**
 * Workflow step type for navigation
 */
export type WorkflowStep =
  | 'concept'
  | 'edit-story'
  | 'characters'
  | 'world'
  | 'images'
  | 'plots'
  | 'coherence'
  | 'originality'
  | 'outline'
  | 'outline-review'
  | 'chapters'
  | 'versions'
  | 'analytics'
  | 'editorial-report'
  | 'word-count-revision'
  | 'follow-up'
  | 'series'
  | 'prose-style'
  | 'prose-reports'
  | 'bestseller'
  | 'publishing';

/**
 * Navigation tab configuration
 */
export interface NavTab {
  id: string;
  label: string;
  route: string;
  icon: string;
  workflowStep: WorkflowStep;
}

/**
 * Navigation group configuration
 */
export interface NavGroup {
  id: string;
  label: string;
  icon: string;
  tabs: NavTab[];
  /** If true, this is a standalone tab with no children */
  isStandalone?: boolean;
  /** Route for standalone tabs */
  route?: string;
  /** Workflow step for standalone tabs */
  workflowStep?: WorkflowStep;
}

/**
 * Project navigation groups configuration
 *
 * Structure:
 * - Overview (standalone)
 * - Edit Story (standalone)
 * - Elements: Characters, World, Images
 * - Story: Plot, Outline, Prose Style
 * - Novel: Chapters, Versions, Analytics, Follow-up
 * - Editorial: Editorial Board, Word Count, Outline Review
 * - Publishing (standalone)
 */
export const PROJECT_NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: '📋',
    isStandalone: true,
    route: '',
    workflowStep: 'concept',
    tabs: [],
  },
  {
    id: 'edit-story',
    label: 'Edit Story',
    icon: '✏️',
    isStandalone: true,
    route: '/edit-story',
    workflowStep: 'edit-story',
    tabs: [],
  },
  {
    id: 'elements',
    label: 'Elements',
    icon: '🎭',
    tabs: [
      {
        id: 'characters',
        label: 'Characters',
        route: '/characters',
        icon: '👥',
        workflowStep: 'characters',
      },
      {
        id: 'world',
        label: 'World',
        route: '/world',
        icon: '🌍',
        workflowStep: 'world',
      },
      {
        id: 'images',
        label: 'Images',
        route: '/images',
        icon: '🖼️',
        workflowStep: 'images',
      },
    ],
  },
  {
    id: 'story',
    label: 'Story',
    icon: '📖',
    tabs: [
      {
        id: 'plot',
        label: 'Plot',
        route: '/plot',
        icon: '📖',
        workflowStep: 'plots',
      },
      {
        id: 'quality',
        label: 'Quality',
        route: '/quality',
        icon: '✓',
        workflowStep: 'coherence',
      },
      {
        id: 'outline',
        label: 'Outline',
        route: '/outline',
        icon: '📝',
        workflowStep: 'outline',
      },
      {
        id: 'prose-style',
        label: 'Prose Style',
        route: '/prose-style',
        icon: '✍️',
        workflowStep: 'prose-style',
      },
    ],
  },
  {
    id: 'novel',
    label: 'Novel',
    icon: '📚',
    tabs: [
      {
        id: 'chapters',
        label: 'Chapters',
        route: '/progress',
        icon: '📚',
        workflowStep: 'chapters',
      },
      {
        id: 'versions',
        label: 'Versions',
        route: '/versions',
        icon: '📑',
        workflowStep: 'versions',
      },
      {
        id: 'novel-follow-up',
        label: 'Follow-up',
        route: '/follow-up',
        icon: '🚀',
        workflowStep: 'follow-up',
      },
    ],
  },
  {
    id: 'editorial',
    label: 'Editorial',
    icon: '✏️',
    tabs: [
      {
        id: 'editorial-board',
        label: 'Editorial Board',
        route: '/editorial-report',
        icon: '📋',
        workflowStep: 'editorial-report',
      },
      {
        id: 'analytics',
        label: 'Analytics',
        route: '/analytics',
        icon: '📊',
        workflowStep: 'analytics',
      },
      {
        id: 'word-count-revision',
        label: 'Word Count',
        route: '/word-count-revision',
        icon: '📏',
        workflowStep: 'word-count-revision',
      },
      {
        id: 'outline-review',
        label: 'Outline Review',
        route: '/outline-review',
        icon: '🔍',
        workflowStep: 'outline-review',
      },
      {
        id: 'prose-reports',
        label: 'Prose Quality',
        route: '/prose-reports',
        icon: '📖',
        workflowStep: 'prose-reports',
      },
      {
        id: 'bestseller',
        label: 'Bestseller',
        route: '/bestseller',
        icon: '⭐',
        workflowStep: 'bestseller',
      },
    ],
  },
  {
    id: 'publishing',
    label: 'Publishing',
    icon: '📄',
    isStandalone: true,
    route: '/publishing',
    workflowStep: 'publishing',
    tabs: [],
  },
];

/**
 * Flat list of all tabs for backward compatibility
 * Maps to PROJECT_NAV_TABS format used by existing code
 */
export const PROJECT_NAV_TABS = PROJECT_NAV_GROUPS.flatMap(group => {
  if (group.isStandalone) {
    return [{
      id: group.id,
      label: group.label,
      route: group.route || '',
      icon: group.icon,
      workflowStep: group.workflowStep || 'concept' as WorkflowStep,
      groupId: group.id,
    }];
  }
  return group.tabs.map(tab => ({
    ...tab,
    groupId: group.id,
  }));
});

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

/**
 * Get group that contains a specific tab
 */
export function getGroupForTab(tabId: string): NavGroup | undefined {
  return PROJECT_NAV_GROUPS.find(group => {
    if (group.isStandalone && group.id === tabId) return true;
    return group.tabs.some(tab => tab.id === tabId);
  });
}

/**
 * Get the active group ID from current pathname
 */
export function getActiveGroupFromPath(pathname: string, projectId: string): string | null {
  const projectPath = `/projects/${projectId}`;

  if (!pathname.startsWith(projectPath)) return null;

  const relativePath = pathname.slice(projectPath.length) || '';

  for (const group of PROJECT_NAV_GROUPS) {
    if (group.isStandalone) {
      if (relativePath === group.route || relativePath === '') {
        return group.id;
      }
    } else {
      for (const tab of group.tabs) {
        if (relativePath === tab.route || relativePath.startsWith(tab.route + '/')) {
          return group.id;
        }
      }
    }
  }

  return 'overview';
}

