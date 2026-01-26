'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { colors, borderRadius } from '@/app/lib/constants';
import { PROJECT_NAV_TABS, TAB_STATUS_COLORS } from '@/app/lib/navigation-constants';
import { useWorkflowPrerequisites, type WorkflowStep, type WorkflowProjectData } from '@/app/hooks/useWorkflowPrerequisites';
import type { TabStatus } from '@/shared/types';

// Flexible outline type that works with various page-specific interfaces
interface OutlineData {
  id?: string;
  total_chapters?: number;
  structure?: any;
  [key: string]: any;
}

// Flexible chapter type
interface ChapterData {
  id?: string;
  content?: string | null;
  [key: string]: any;
}

interface ProjectNavigationProps {
  projectId: string;
  project?: WorkflowProjectData | null;
  outline?: OutlineData | null;
  chapters?: ChapterData[] | null;
}

/**
 * Project Navigation Component
 *
 * Displays the navigation tabs for a project with workflow status indicators.
 * Tab order: Overview, Characters, World, Plot, Outline, Chapters, Analytics
 * Note: Style has been moved to global Settings page.
 *
 * Status colors:
 * - Green: Step completed
 * - Red: Step required (not yet completed)
 * - Gray/Locked: Prerequisites not met
 */
export default function ProjectNavigation({
  projectId,
  project,
  outline,
  chapters,
}: ProjectNavigationProps) {
  const pathname = usePathname();

  // Get workflow prerequisites
  const prerequisiteCheck = useWorkflowPrerequisites(
    projectId,
    project || null,
    outline,
    chapters
  );

  const shouldEnforcePrerequisites = Boolean(project);
  const { canAccess, getBlockingReason, prerequisites } = prerequisiteCheck;

  // Determine active tab based on current path
  const getActiveTabId = () => {
    for (const tab of PROJECT_NAV_TABS) {
      const fullRoute = `/projects/${projectId}${tab.route}`;
      // Handle both exact match and nested routes
      if (pathname === fullRoute ||
          (tab.route === '' && pathname === `/projects/${projectId}`) ||
          (tab.route !== '' && pathname?.startsWith(fullRoute + '/'))) {
        return tab.id;
      }
    }
    // Default to overview if on the project page
    if (pathname === `/projects/${projectId}`) {
      return 'overview';
    }
    return null;
  };

  const activeTabId = getActiveTabId();

  // Get tab status for visual indicator
  const getTabStatus = (tabId: string, step: WorkflowStep): TabStatus => {
    if (activeTabId === tabId) return 'active';

    const prereqCheck = prerequisites[step];
    if (!prereqCheck) return 'optional';

    // Check if locked
    if (shouldEnforcePrerequisites && !canAccess(step)) {
      return 'locked';
    }

    // Check if completed
    if (prereqCheck.isComplete) {
      return 'completed';
    }

    // Check if required
    if (prereqCheck.isRequired) {
      return 'required';
    }

    return 'optional';
  };

  return (
    <nav
      style={{
        background: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        padding: '0 2rem',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
      role="navigation"
      aria-label="Project sections"
    >
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          minWidth: 'min-content',
        }}
      >
        {PROJECT_NAV_TABS.map((tab) => {
          const isActive = activeTabId === tab.id;
          const fullRoute = `/projects/${projectId}${tab.route}`;
          const status = getTabStatus(tab.id, tab.workflowStep);
          const isLocked = status === 'locked';

          // Get the underline color based on status
          let borderColor = 'transparent';
          if (isActive) {
            borderColor = TAB_STATUS_COLORS.active;
          } else if (status === 'completed') {
            borderColor = TAB_STATUS_COLORS.completed;
          } else if (status === 'required') {
            borderColor = TAB_STATUS_COLORS.required;
          } else if (status === 'locked') {
            borderColor = TAB_STATUS_COLORS.locked;
          }

          // Build tooltip text
          let tooltipText: string | undefined;
          if (isLocked) {
            tooltipText = getBlockingReason(tab.workflowStep) || 'Complete previous steps first';
          } else if (status === 'required') {
            tooltipText = 'Required - not yet completed';
          } else if (status === 'completed') {
            tooltipText = 'Completed';
          }

          const tabContent = (
            <>
              <span aria-hidden="true" style={{ fontSize: '1rem' }}>
                {tab.icon}
              </span>
              {isLocked && (
                <span aria-hidden="true" style={{ fontSize: '0.875rem' }}>
                  🔒
                </span>
              )}
              <span>{tab.label}</span>
            </>
          );

          const tabStyle = {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            borderBottom: isActive
              ? `3px solid ${borderColor}`
              : `2px solid ${borderColor}`,
            color: isActive ? colors.brandText : colors.textSecondary,
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: isActive ? 600 : 500,
            whiteSpace: 'nowrap',
            transition: 'all 0.2s',
            position: 'relative',
            opacity: isLocked ? 0.5 : 1,
            cursor: isLocked ? 'not-allowed' : 'pointer',
          } as const;

          if (isLocked) {
            return (
              <div
                key={tab.id}
                style={tabStyle}
                aria-disabled="true"
                title={tooltipText}
                role="tab"
                aria-selected={false}
              >
                {tabContent}
              </div>
            );
          }

          return (
            <Link
              key={tab.id}
              href={fullRoute}
              style={tabStyle}
              aria-current={isActive ? 'page' : undefined}
              title={tooltipText}
              role="tab"
              aria-selected={isActive}
            >
              {tabContent}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
