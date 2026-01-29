'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { colors, borderRadius, spacing, transitions } from '@/app/lib/design-tokens';

interface ProjectNavButtonsProps {
  projectId: string;
  /** Optional version ID - when provided, appends ?versionId= to all navigation links */
  versionId?: string;
}

const navItems = [
  { id: 'overview', label: 'Overview', href: '' },
  { id: 'edit-story', label: 'Edit Story', href: '/edit-story' },
  { id: 'characters', label: 'Characters', href: '/characters' },
  { id: 'world', label: 'World', href: '/world' },
  { id: 'plot', label: 'Plot', href: '/plot' },
  { id: 'outline', label: 'Outline', href: '/outline' },
  { id: 'chapters', label: 'Chapters', href: '/chapters' },
  { id: 'versions', label: 'Versions', href: '/versions' },
  { id: 'analytics', label: 'Analytics', href: '/analytics' },
  { id: 'follow-up', label: 'Follow-up', href: '/follow-up' },
];

/**
 * ProjectNavButtons renders horizontal navigation buttons at the top of project pages.
 * These allow quick navigation between different sections of a project (Characters, Plot, etc.)
 *
 * When versionId is provided (either via prop or URL search params), it will be preserved
 * across navigation to maintain version context.
 */
export default function ProjectNavButtons({ projectId, versionId: propVersionId }: ProjectNavButtonsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = `/projects/${projectId}`;

  // Use versionId from props, or fall back to URL search params
  const versionId = propVersionId || searchParams.get('versionId') || undefined;

  // Determine which item is active
  const getIsActive = (href: string) => {
    const fullPath = `${basePath}${href}`;
    if (href === '') {
      // Overview is active only when exactly on /projects/[id]
      return pathname === basePath;
    }
    return pathname.startsWith(fullPath);
  };

  // Build href with optional versionId query param
  const buildHref = (href: string) => {
    const fullPath = `${basePath}${href}`;
    if (versionId) {
      return `${fullPath}?versionId=${versionId}`;
    }
    return fullPath;
  };

  return (
    <nav
      aria-label="Project navigation"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: spacing[2],
        marginBottom: spacing[4],
        paddingBottom: spacing[4],
        borderBottom: `1px solid ${colors.border.default}`,
      }}
    >
      {navItems.map((item) => {
        const isActive = getIsActive(item.href);
        const fullHref = buildHref(item.href);

        return (
          <Link
            key={item.id}
            href={fullHref}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: `${spacing[2]} ${spacing[3]}`,
              fontSize: '0.875rem',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? colors.white : colors.text.secondary,
              backgroundColor: isActive ? colors.brand.primary : colors.background.surface,
              border: isActive ? 'none' : `1px solid ${colors.border.default}`,
              borderRadius: borderRadius.md,
              textDecoration: 'none',
              transition: transitions.colors,
              whiteSpace: 'nowrap',
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
