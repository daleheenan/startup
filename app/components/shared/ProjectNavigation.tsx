'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { colors, borderRadius } from '@/app/lib/constants';
import type { ProjectNavigationTab } from '@/shared/types';

interface ProjectNavigationProps {
  projectId: string;
  tabs: ProjectNavigationTab[];
}

export default function ProjectNavigation({ projectId, tabs }: ProjectNavigationProps) {
  const pathname = usePathname();

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

          return (
            <Link
              key={tab.id}
              href={fullRoute}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                borderBottom: isActive ? `2px solid ${colors.brandText}` : '2px solid transparent',
                color: isActive ? colors.brandText : colors.textSecondary,
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                position: 'relative',
              }}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.icon && (
                <span aria-hidden="true" style={{ fontSize: '1rem' }}>
                  {tab.icon}
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
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
