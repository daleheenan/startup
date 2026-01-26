'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { colors, borderRadius, shadows } from '@/app/lib/constants';
import { PRIMARY_NAV_ITEMS, getActiveSectionFromPath } from '@/app/lib/navigation-constants';
import { useNavigationCounts } from '@/app/hooks/useNavigationCounts';
import type { NavigationSection } from '@/shared/types';

interface PrimaryNavigationBarProps {
  activeSection?: NavigationSection;
}

/**
 * Primary Navigation Bar
 *
 * Horizontal navigation bar at the top of the application with links to:
 * - New Novel
 * - Story Ideas (with badge count)
 * - Story Concepts (with badge count)
 * - Quick Start
 * - Fully Customized
 * - Settings
 */
export default function PrimaryNavigationBar({ activeSection: propActiveSection }: PrimaryNavigationBarProps) {
  const pathname = usePathname();
  const { data: counts } = useNavigationCounts();

  // Determine active section from pathname if not provided
  const activeSection = propActiveSection ?? getActiveSectionFromPath(pathname);

  // Get badge count for a section
  const getBadge = (sectionId: NavigationSection): number | undefined => {
    if (!counts) return undefined;

    switch (sectionId) {
      case 'story-ideas':
        return counts.storyIdeas > 0 ? counts.storyIdeas : undefined;
      case 'story-concepts':
        return counts.savedConcepts > 0 ? counts.savedConcepts : undefined;
      default:
        return undefined;
    }
  };

  return (
    <nav
      style={{
        background: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        padding: '0 1rem',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: shadows.sm,
      }}
      role="navigation"
      aria-label="Primary navigation"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          maxWidth: '1400px',
          margin: '0 auto',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none', // Firefox
        }}
      >
        {/* Home/Logo link */}
        <Link
          href="/projects"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            background: activeSection === 'projects' ? colors.brandLight : 'transparent',
            color: activeSection === 'projects' ? colors.brandText : colors.text,
            borderRadius: borderRadius.md,
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '1.25rem',
            marginRight: '1rem',
            transition: 'all 0.2s',
          }}
          aria-label="Go to Projects"
          aria-current={activeSection === 'projects' ? 'page' : undefined}
        >
          N
        </Link>

        {/* Navigation items */}
        {PRIMARY_NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          const badge = getBadge(item.id);

          return (
            <Link
              key={item.id}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 0.875rem',
                background: isActive ? colors.brandLight : 'transparent',
                color: isActive ? colors.brandText : colors.textSecondary,
                borderRadius: borderRadius.md,
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
              aria-current={isActive ? 'page' : undefined}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = colors.surfaceHover;
                  e.currentTarget.style.color = colors.text;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = colors.textSecondary;
                }
              }}
            >
              <span aria-hidden="true" style={{ fontSize: '1rem' }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
              {badge !== undefined && (
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
                  aria-label={`${badge} items`}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Hide scrollbar style */}
      <style jsx>{`
        nav > div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </nav>
  );
}
