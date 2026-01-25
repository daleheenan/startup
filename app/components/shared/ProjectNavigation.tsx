'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { colors, borderRadius } from '@/app/lib/constants';
import type { ProjectNavigationTab } from '@/shared/types';
import { useWorkflowPrerequisites, type WorkflowStep } from '@/app/hooks/useWorkflowPrerequisites';

interface ExtendedTab extends ProjectNavigationTab {
  required?: boolean;
  status?: 'required' | 'completed' | 'optional' | 'neutral';
}

interface ProjectNavigationProps {
  projectId: string;
  tabs: ExtendedTab[];
  project?: any;
  plotStructure?: any;
  outline?: any;
  proseStyle?: any;
  isSubmitted?: boolean;
}

// Status indicator colors
const STATUS_COLORS = {
  required: '#DC2626', // Red - needs to be completed
  completed: '#10B981', // Green - done
  optional: '#94A3B8', // Gray - optional, not done
  neutral: 'transparent', // No indicator
};

export default function ProjectNavigation({
  projectId,
  tabs,
  project,
  plotStructure,
  outline,
  proseStyle,
  isSubmitted,
}: ProjectNavigationProps) {
  const pathname = usePathname();

  // Get workflow prerequisites (only if project data is provided)
  const prerequisiteCheck = useWorkflowPrerequisites(
    projectId,
    project || null,
    outline,
    proseStyle
  );

  // Only apply prerequisites if project data is available
  const shouldEnforcePrerequisites = Boolean(project);
  const { canAccess, getBlockingReason } = prerequisiteCheck;

  // Map tab IDs to prerequisite steps
  const getPrerequisiteStep = (tabId: string): WorkflowStep | null => {
    const mapping: Record<string, WorkflowStep> = {
      overview: 'concept', // Overview is always accessible (concept has no prerequisite)
      characters: 'characters',
      world: 'world',
      plot: 'plots',
      outline: 'outline',
      style: 'style',
      chapters: 'chapters',
      analytics: 'concept', // Analytics is always accessible (concept has no prerequisite)
    };
    return mapping[tabId] || null;
  };

  // Determine active tab based on current path
  const getActiveTabId = () => {
    for (const tab of tabs) {
      const fullRoute = `/projects/${projectId}${tab.route}`;
      if (pathname === fullRoute || pathname?.startsWith(fullRoute + '/')) {
        return tab.id;
      }
    }
    return null;
  };

  const activeTabId = getActiveTabId();

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
        {tabs.map((tab) => {
          const isActive = activeTabId === tab.id;
          const fullRoute = `/projects/${projectId}${tab.route}`;
          const statusColor = tab.status ? STATUS_COLORS[tab.status] : 'transparent';
          const showStatusIndicator = tab.status && tab.status !== 'neutral';

          // Check if tab is locked (only enforce if project data is available)
          const prerequisiteStep = getPrerequisiteStep(tab.id);
          const isLocked = shouldEnforcePrerequisites && prerequisiteStep && !canAccess(prerequisiteStep);
          const blockingReason = isLocked && prerequisiteStep ? getBlockingReason(prerequisiteStep) : null;

          // Build tooltip text
          let tooltipText: string | undefined;
          if (isLocked && blockingReason) {
            tooltipText = blockingReason;
          } else if (tab.status === 'required') {
            tooltipText = 'Required - not yet completed';
          } else if (tab.status === 'completed') {
            tooltipText = 'Completed';
          } else if (tab.status === 'optional') {
            tooltipText = 'Optional';
          }

          const tabContent = (
            <>
              {tab.icon && (
                <span aria-hidden="true" style={{ fontSize: '1rem' }}>
                  {tab.icon}
                </span>
              )}
              {isLocked && (
                <span aria-hidden="true" style={{ fontSize: '0.875rem' }}>
                  🔒
                </span>
              )}
              {tab.label}
              {tab.badge !== undefined && tab.badge !== null && tab.badge !== '' && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '20px',
                    height: '20px',
                    padding: '0 0.375rem',
                    background: isActive ? colors.brandText : colors.textTertiary,
                    color: colors.surface,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: borderRadius.full,
                  }}
                  aria-label={`${tab.badge} items`}
                >
                  {tab.badge}
                </span>
              )}
            </>
          );

          const tabStyle = {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            borderBottom: isActive
              ? `2px solid ${colors.brandText}`
              : showStatusIndicator
                ? `2px solid ${statusColor}`
                : '2px solid transparent',
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
            >
              {tabContent}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
