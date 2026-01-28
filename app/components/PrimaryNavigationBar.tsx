'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { colors, spacing, borderRadius, transitions, a11y } from '../lib/design-tokens';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  ariaLabel: string;
}

const navItems: NavItem[] = [
  {
    href: '/',
    label: 'Projects',
    ariaLabel: 'View all projects',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9,22 9,12 15,12 15,22" />
      </svg>
    ),
  },
  {
    href: '/new',
    label: 'New Project',
    ariaLabel: 'Create new project',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    ariaLabel: 'Application settings',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

/**
 * PrimaryNavigationBar Component
 *
 * Desktop sidebar navigation (visible on screens >= 769px)
 * Provides persistent navigation for main application sections
 * Complements MobileNavigation which handles mobile/tablet (<= 1024px)
 */
export default function PrimaryNavigationBar() {
  const pathname = usePathname();

  return (
    <>
      <nav
        className="primary-navigation"
        aria-label="Primary navigation"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: '72px',
          background: colors.background.surface,
          borderRight: `1px solid ${colors.border.default}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: `${spacing[6]} 0`,
          gap: spacing[6],
          zIndex: 100,
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          aria-label="NovelForge home page"
          style={{
            width: '40px',
            height: '40px',
            background: colors.brand.gradient,
            borderRadius: borderRadius.lg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.text.inverse,
            fontWeight: 700,
            fontSize: '1.25rem',
            textDecoration: 'none',
            transition: transitions.transform,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <span aria-hidden="true">N</span>
        </Link>

        {/* Separator */}
        <div
          style={{
            width: '32px',
            height: '1px',
            background: colors.border.default,
          }}
          aria-hidden="true"
        />

        {/* Navigation Items */}
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: spacing[4],
            alignItems: 'center',
          }}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
                           (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-label={item.ariaLabel}
                  aria-current={isActive ? 'page' : undefined}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: spacing[1],
                    padding: spacing[2],
                    borderRadius: borderRadius.md,
                    color: isActive ? colors.brand.primary : colors.text.secondary,
                    background: isActive ? colors.brand.primaryLight : 'transparent',
                    textDecoration: 'none',
                    transition: transitions.colors,
                    minWidth: a11y.minTouchTarget,
                    minHeight: a11y.minTouchTarget,
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = colors.background.surfaceHover;
                      e.currentTarget.style.color = colors.text.primary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = colors.text.secondary;
                    }
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.outline = `${a11y.focusOutlineWidth} solid ${colors.border.focus}`;
                    e.currentTarget.style.outlineOffset = '2px';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.outline = 'none';
                  }}
                >
                  {item.icon}
                  <span
                    style={{
                      fontSize: '0.625rem',
                      fontWeight: 500,
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <style jsx global>{`
        /* Show primary navigation only on desktop (>= 1025px) */
        @media (max-width: 1024px) {
          .primary-navigation {
            display: none !important;
          }
        }

        /* Ensure content doesn't overlap with fixed sidebar on desktop */
        @media (min-width: 1025px) {
          body {
            padding-left: 72px;
          }
        }
      `}</style>
    </>
  );
}
