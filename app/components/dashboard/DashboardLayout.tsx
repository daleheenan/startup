'use client';

import { useCallback, type CSSProperties, type ReactNode } from 'react';

import { DashboardProvider, useDashboardContext } from './DashboardContext';
import Sidebar from './Sidebar';
import SearchModal from './SearchModal/index';

import {
  colors,
  dashboardSpacing,
  spacing,
  typography,
  borderRadius,
  transitions,
} from '@/app/lib/design-tokens';

// ==================== TYPES ====================

/**
 * Configuration for the page-level header rendered above the main content area.
 */
export interface PageHeaderConfig {
  /** Primary heading text displayed in large, bold type. */
  title: string;
  /** Optional secondary text rendered below the title in muted style. */
  subtitle?: string;
  /** When true, a placeholder date-picker button appears on the right side of the header. */
  showDatePicker?: boolean;
}

/**
 * Props accepted by the DashboardLayout wrapper.
 */
export interface DashboardLayoutProps {
  /** Page content rendered inside the main content area. */
  children: ReactNode;
  /** Optional header configuration; omit to render no header. */
  header?: PageHeaderConfig;
  /** Whether to render the sidebar. Defaults to true. */
  showSidebar?: boolean;
}

// ==================== DASHBOARD HEADER ====================

/**
 * DashboardHeader renders the page title, optional subtitle, and an optional
 * date-picker placeholder button aligned to the right.
 *
 * This is an inline component kept in the same file as DashboardLayout
 * because it is tightly coupled to the layout's header slot and unlikely
 * to be reused independently.
 */
function DashboardHeader({ title, subtitle, showDatePicker }: PageHeaderConfig) {
  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[4],
    marginBottom: spacing[6],
  };

  const textBlockStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[1],
    minWidth: 0, // Allow flex children to shrink below content size
  };

  const titleStyle: CSSProperties = {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    fontFamily: typography.fontFamily.base,
    margin: 0,
    lineHeight: typography.lineHeight.tight,
  };

  const subtitleStyle: CSSProperties = {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.normal,
    color: colors.text.tertiary,
    fontFamily: typography.fontFamily.base,
    margin: 0,
    lineHeight: typography.lineHeight.normal,
  };

  const datePickerStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[2]} ${spacing[4]}`,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    background: colors.background.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    transition: transitions.colors,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  };

  return (
    <header style={headerStyle} aria-label="Page header">
      <div style={textBlockStyle}>
        <h1 style={titleStyle}>{title}</h1>
        {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
      </div>

      {showDatePicker && (
        <button type="button" style={datePickerStyle} aria-label="Select date range">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Date range
        </button>
      )}
    </header>
  );
}

// ==================== INNER LAYOUT ====================

/**
 * DashboardInner is the layout shell rendered inside the DashboardProvider.
 * It reads dashboard state (search open/close) from context and composes
 * the sidebar, main content, header, and search modal.
 *
 * Separated from DashboardLayout so that useDashboardContext can be called
 * after the provider has been mounted.
 */
function DashboardInner({
  children,
  header,
  showSidebar,
}: DashboardLayoutProps) {
  const { state, dispatch } = useDashboardContext();

  const closeSearch = useCallback(() => {
    dispatch({ type: 'CLOSE_SEARCH' });
  }, [dispatch]);

  // ---- Responsive sidebar visibility ----
  // On mobile (< 1024 px) the sidebar is hidden via CSS; the JS prop still
  // controls whether the sidebar element is rendered at all on desktop.
  const renderSidebar = showSidebar !== false;

  // ---- Styles ----

  const layoutStyle: CSSProperties = {
    display: 'flex',
    minHeight: '100vh',
    background: colors.background.primary,
  };

  // When sidebar is visible the main area shifts right by the sidebar width.
  // On mobile (enforced via a media-query wrapper below) this margin is removed.
  const mainStyle: CSSProperties = {
    flex: 1,
    minWidth: 0, // Prevent flex overflow
    marginLeft: renderSidebar ? dashboardSpacing.sidebarWidth : 0,
    transition: `margin-left ${transitions.base}`,
  };

  const contentAreaStyle: CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: `${spacing[6]} ${dashboardSpacing.contentPadding}`,
    boxSizing: 'border-box',
  };

  // ---- Render ----

  return (
    <div className="dashboard-layout" style={layoutStyle}>
      {/* Sidebar (desktop only — hidden on mobile via CSS) */}
      {renderSidebar && <Sidebar />}

      {/* Main content region */}
      <main className="dashboard-main" style={mainStyle}>
        <div className="dashboard-content" style={contentAreaStyle}>
          {header && <DashboardHeader {...header} />}
          {children}
        </div>
      </main>

      {/* Search modal — rendered at the layout level so it floats above everything */}
      <SearchModal isOpen={state.isSearchOpen} onClose={closeSearch} />

      {/*
        Responsive override: on viewports narrower than 1024 px the sidebar is
        visually hidden (display: none) and the main area uses full width.
        A <style> element is used because React inline styles cannot express
        @media queries. The rule is scoped to .dashboard-layout children.
      */}
      <style>{`
        @media (max-width: 1023px) {
          .dashboard-layout [data-desktop-sidebar] {
            display: none !important;
          }
          .dashboard-layout .dashboard-main {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

// ==================== PUBLIC COMPONENT ====================

/**
 * DashboardLayout is the top-level layout wrapper for NovelForge dashboard pages.
 *
 * It provides:
 * - The DashboardProvider context (navigation state, search state, sidebar persistence)
 * - A fixed sidebar with navigation, search trigger, and user profile
 * - A responsive main content area with optional page header
 * - A global SearchModal overlay driven by context state
 *
 * Usage:
 * ```tsx
 * <DashboardLayout
 *   header={{ title: 'My Projects', subtitle: 'Manage your writing projects' }}
 *   showSidebar={true}
 * >
 *   <ProjectGrid />
 * </DashboardLayout>
 * ```
 *
 * On mobile (< 1024 px) the sidebar is automatically hidden and the content
 * area expands to full width.
 */
export default function DashboardLayout({
  children,
  header,
  showSidebar = true,
}: DashboardLayoutProps) {
  return (
    <DashboardProvider>
      <DashboardInner header={header} showSidebar={showSidebar}>
        {children}
      </DashboardInner>
    </DashboardProvider>
  );
}
