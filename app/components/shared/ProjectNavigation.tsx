'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { colors, borderRadius } from '@/app/lib/constants';
import {
  PROJECT_NAV_GROUPS,
  TAB_STATUS_COLORS,
  getActiveGroupFromPath,
  type NavGroup,
  type NavTab,
} from '@/app/lib/navigation-constants';
import { useWorkflowPrerequisites, type WorkflowProjectData, type WorkflowStep } from '@/app/hooks/useWorkflowPrerequisites';
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
 * Displays the navigation tabs for a project with collapsible groups and workflow status indicators.
 *
 * Navigation structure:
 * - Overview (standalone)
 * - Elements: Characters, World
 * - Story: Plot, Outline
 * - Novel: Chapters, Analytics, Follow-up
 * - Editorial: Editorial Board, Outline Review
 *
 * Status colours:
 * - Green: Step completed
 * - Red: Step required (not yet completed)
 * - Grey/Locked: Prerequisites not met
 */
export default function ProjectNavigation({
  projectId,
  project,
  outline,
  chapters,
}: ProjectNavigationProps) {
  const pathname = usePathname();

  // Track which groups are expanded
  const activeGroupId = getActiveGroupFromPath(pathname, projectId);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(activeGroupId ? [activeGroupId] : [])
  );

  // Update expanded groups when active group changes
  useEffect(() => {
    if (activeGroupId && !expandedGroups.has(activeGroupId)) {
      setExpandedGroups(prev => {
        const newSet = new Set(prev);
        newSet.add(activeGroupId);
        return newSet;
      });
    }
  }, [activeGroupId]);

  // Get workflow prerequisites
  const prerequisiteCheck = useWorkflowPrerequisites(
    projectId,
    project || null,
    outline,
    chapters
  );

  const shouldEnforcePrerequisites = Boolean(project);
  const { canAccess, getBlockingReason, prerequisites } = prerequisiteCheck;

  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // Determine active tab based on current path
  const getActiveTabId = () => {
    for (const group of PROJECT_NAV_GROUPS) {
      if (group.isStandalone) {
        const fullRoute = `/projects/${projectId}${group.route || ''}`;
        if (pathname === fullRoute || (group.route === '' && pathname === `/projects/${projectId}`)) {
          return group.id;
        }
      } else {
        for (const tab of group.tabs) {
          const fullRoute = `/projects/${projectId}${tab.route}`;
          if (pathname === fullRoute || pathname?.startsWith(fullRoute + '/')) {
            return tab.id;
          }
        }
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

  // Get group status (aggregate of all tabs in the group)
  const getGroupStatus = (group: NavGroup): TabStatus => {
    if (group.isStandalone) {
      return getTabStatus(group.id, group.workflowStep || 'concept');
    }

    const tabStatuses = group.tabs.map(tab => getTabStatus(tab.id, tab.workflowStep));

    // If any tab is active, group is active
    if (tabStatuses.includes('active')) return 'active';

    // If all tabs are completed, group is completed
    if (tabStatuses.every(s => s === 'completed')) return 'completed';

    // If all tabs are locked, group is locked
    if (tabStatuses.every(s => s === 'locked')) return 'locked';

    // If any tab is required, group is required
    if (tabStatuses.includes('required')) return 'required';

    return 'optional';
  };

  // Render a single tab
  const renderTab = (tab: NavTab, isNested: boolean = false) => {
    const fullRoute = `/projects/${projectId}${tab.route}`;
    const isActive = activeTabId === tab.id;
    const status = getTabStatus(tab.id, tab.workflowStep);
    const isLocked = status === 'locked';

    // Get the colour based on status
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

    // Get status icon for accessibility (Issue #5, #46)
    let statusIcon: string | null = null;
    if (isActive) {
      statusIcon = '►'; // Active indicator
    } else if (status === 'completed') {
      statusIcon = '✓'; // Checkmark for completed
    } else if (status === 'required') {
      statusIcon = '!'; // Exclamation for required
    } else if (status === 'locked') {
      statusIcon = '🔒'; // Lock for locked
    }

    const tabContent = (
      <>
        <span aria-hidden="true" style={{ fontSize: '0.875rem' }}>
          {tab.icon}
        </span>
        {statusIcon && (
          <span
            aria-hidden="true"
            style={{
              fontSize: '0.75rem',
              fontWeight: 'bold',
              minWidth: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {statusIcon}
          </span>
        )}
        <span>{tab.label}</span>
      </>
    );

    // Add subtle background tint for better visibility (Issue #6)
    let backgroundColor = 'transparent';
    if (isActive && isNested) {
      backgroundColor = 'rgba(102, 126, 234, 0.08)';
    } else if (status === 'completed' && !isActive) {
      backgroundColor = 'rgba(16, 185, 129, 0.03)';
    } else if (status === 'required' && !isActive) {
      backgroundColor = 'rgba(239, 68, 68, 0.03)';
    }

    const tabStyle = {
      display: 'flex',
      alignItems: 'center',
      gap: '0.375rem',
      padding: isNested ? '0.5rem 1rem 0.5rem 2.5rem' : '0.625rem 1rem',
      borderLeft: isNested ? `4px solid ${borderColor}` : 'none', // Increased from 3px to 4px (Issue #6)
      borderBottom: !isNested ? `4px solid ${borderColor}` : 'none', // Increased from 2px to 4px (Issue #6)
      color: isActive ? colors.brandText : colors.textSecondary,
      textDecoration: 'none',
      fontSize: '0.8125rem',
      fontWeight: isActive ? 600 : 500,
      whiteSpace: 'nowrap',
      transition: 'all 0.2s',
      position: 'relative',
      opacity: isLocked ? 0.5 : 1,
      cursor: isLocked ? 'not-allowed' : 'pointer',
      background: backgroundColor,
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
  };

  // Render a navigation group
  const renderGroup = (group: NavGroup) => {
    const isExpanded = expandedGroups.has(group.id);
    const groupStatus = getGroupStatus(group);
    const isActiveGroup = activeGroupId === group.id;

    // Get the colour based on status
    let borderColor = 'transparent';
    if (groupStatus === 'active') {
      borderColor = TAB_STATUS_COLORS.active;
    } else if (groupStatus === 'completed') {
      borderColor = TAB_STATUS_COLORS.completed;
    } else if (groupStatus === 'required') {
      borderColor = TAB_STATUS_COLORS.required;
    } else if (groupStatus === 'locked') {
      borderColor = TAB_STATUS_COLORS.locked;
    }

    // For standalone tabs (like Overview), render as simple tab
    if (group.isStandalone) {
      const fullRoute = `/projects/${projectId}${group.route || ''}`;
      const isActive = activeTabId === group.id;
      const status = getTabStatus(group.id, group.workflowStep || 'concept');

      let tabBorderColor = 'transparent';
      if (isActive) {
        tabBorderColor = TAB_STATUS_COLORS.active;
      } else if (status === 'completed') {
        tabBorderColor = TAB_STATUS_COLORS.completed;
      } else if (status === 'required') {
        tabBorderColor = TAB_STATUS_COLORS.required;
      }

      return (
        <div key={group.id} style={{ display: 'flex', flexDirection: 'column' }}>
          <Link
            href={fullRoute}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              borderBottom: `3px solid ${tabBorderColor}`,
              color: isActive ? colors.brandText : colors.textSecondary,
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: isActive ? 600 : 500,
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
            aria-current={isActive ? 'page' : undefined}
          >
            <span aria-hidden="true" style={{ fontSize: '1rem' }}>
              {group.icon}
            </span>
            <span>{group.label}</span>
          </Link>
        </div>
      );
    }

    // For groups with children, render as collapsible
    return (
      <div key={group.id} style={{ display: 'flex', flexDirection: 'column' }}>
        <button
          onClick={() => toggleGroup(group.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleGroup(group.id);
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            borderBottom: `2px solid ${borderColor}`,
            color: isActiveGroup ? colors.brandText : colors.textSecondary,
            background: 'transparent',
            border: 'none',
            borderBottomStyle: 'solid',
            borderBottomWidth: '2px',
            borderBottomColor: borderColor,
            fontSize: '0.875rem',
            fontWeight: isActiveGroup ? 600 : 500,
            whiteSpace: 'nowrap',
            transition: 'all 0.2s',
            cursor: 'pointer',
          }}
          aria-expanded={isExpanded}
          aria-controls={`nav-group-${group.id}`}
        >
          <span aria-hidden="true" style={{ fontSize: '1rem' }}>
            {group.icon}
          </span>
          <span>{group.label}</span>
          <span
            aria-hidden="true"
            style={{
              fontSize: '0.625rem',
              marginLeft: '0.25rem',
              transition: 'transform 0.2s',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            ▼
          </span>
        </button>

        {/* Dropdown panel */}
        <div
          id={`nav-group-${group.id}`}
          style={{
            display: isExpanded ? 'flex' : 'none',
            flexDirection: 'column',
            background: colors.surfaceAlt || '#F8FAFC',
            borderBottom: `1px solid ${colors.border}`,
          }}
          role="tablist"
          aria-label={`${group.label} navigation`}
        >
          {group.tabs.map(tab => renderTab(tab, true))}
        </div>
      </div>
    );
  };

  return (
    <nav
      style={{
        background: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
      role="navigation"
      aria-label="Project sections"
    >
      <div
        style={{
          display: 'flex',
          minWidth: 'min-content',
        }}
      >
        {PROJECT_NAV_GROUPS.map(group => renderGroup(group))}
      </div>
    </nav>
  );
}
