/**
 * Navigation Constants
 *
 * Constants for primary navigation, project navigation tabs, and visual styling
 *
 * Navigation structure (hierarchical with collapsible sections):
 * - Stories (collapsed when viewing Draft Novels)
 *   - Quick Start, Full Customisation, Ideas, Concepts
 * - Draft Novels (expanded when viewing a project)
 *   - Overview
 *   - Edit Story
 *   - Elements: Characters, World
 *   - Story: Plot, Outline, Prose Style
 *   - Novel: Chapters, Versions, Analytics, Follow-up
 *   - Editorial: Editorial Board, Word Count, Outline Review
 *   - Publishing
 * - Completed Novels (collapsed when viewing Draft Novels)
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
 * Navigation group configuration (subsection within a section)
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
 * Navigation section configuration (top-level collapsible section)
 */
export interface NavSection {
  id: string;
  label: string;
  icon: string;
  /** Groups within this section (e.g., Elements, Story, Novel within Draft Novels) */
  groups: NavGroup[];
  /** If true, this section is a direct link with no nested content */
  isStandalone?: boolean;
  /** Route for standalone sections */
  route?: string;
  /** Base path prefix for matching active state */
  pathPrefix?: string;
}

/**
 * Project navigation groups configuration (legacy format for backward compatibility)
 *
 * Structure:
 * - Overview (standalone)
 * - Elements: Characters, World
 * - Story: Plot, Outline
 * - Novel: Chapters, Analytics, Follow-up
 * - Editorial: Editorial Board, Follow-up
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
        id: 'analytics',
        label: 'Analytics',
        route: '/analytics',
        icon: '📊',
        workflowStep: 'analytics',
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
 * Hierarchical navigation sections configuration
 *
 * This is the new structure with collapsible top-level sections:
 * - Stories (collapsed when viewing a project)
 * - Draft Novels (expanded when viewing a project, contains all project pages)
 * - Completed Novels (collapsed when viewing a draft project)
 */
export const PROJECT_NAV_SECTIONS: NavSection[] = [
  {
    id: 'stories',
    label: 'Stories',
    icon: '📖',
    pathPrefix: '/story-',
    groups: [
      {
        id: 'quick-start',
        label: 'Quick Start',
        icon: '⚡',
        isStandalone: true,
        route: '/quick-start',
        tabs: [],
      },
      {
        id: 'full-customization',
        label: 'Full Customisation',
        icon: '🎨',
        isStandalone: true,
        route: '/full-customization',
        tabs: [],
      },
      {
        id: 'ideas',
        label: 'Ideas',
        icon: '💡',
        isStandalone: true,
        route: '/story-ideas',
        tabs: [],
      },
      {
        id: 'concepts',
        label: 'Concepts',
        icon: '📝',
        isStandalone: true,
        route: '/saved-concepts',
        tabs: [],
      },
    ],
  },
  {
    id: 'draft-novels',
    label: 'Draft Novels',
    icon: '✏️',
    pathPrefix: '/projects/',
    groups: PROJECT_NAV_GROUPS,
  },
  {
    id: 'completed-novels',
    label: 'Completed Novels',
    icon: '✅',
    isStandalone: true,
    route: '/completed',
    groups: [],
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

/**
 * Get the active section ID from current pathname
 * Used for determining which top-level section should be expanded
 */
export function getActiveSectionIdFromPath(pathname: string): string | null {
  for (const section of PROJECT_NAV_SECTIONS) {
    // Check standalone sections first
    if (section.isStandalone && section.route) {
      if (pathname === section.route || pathname.startsWith(section.route + '/')) {
        return section.id;
      }
    }
    // Check sections with path prefixes
    if (section.pathPrefix && pathname.startsWith(section.pathPrefix)) {
      return section.id;
    }
    // Check groups within the section
    for (const group of section.groups) {
      if (group.isStandalone && group.route) {
        if (pathname === group.route || pathname.startsWith(group.route + '/')) {
          return section.id;
        }
      }
    }
  }
  return null;
}

/**
 * Get section by ID
 */
export function getSectionById(sectionId: string): NavSection | undefined {
  return PROJECT_NAV_SECTIONS.find(section => section.id === sectionId);
}

/**
 * Get all section IDs except the active one (for collapsing)
 */
export function getInactiveSectionIds(activeSectionId: string | null): string[] {
  return PROJECT_NAV_SECTIONS
    .filter(section => section.id !== activeSectionId)
    .map(section => section.id);
}
