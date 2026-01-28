'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { colors, spacing, shadows, transitions, zIndex, borderRadius, a11y } from '../lib/design-tokens';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: '/',
    label: 'Projects',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9,22 9,12 15,12 15,22" />
      </svg>
    ),
  },
  {
    href: '/new',
    label: 'New Project',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

interface MobileNavigationProps {
  children: React.ReactNode;
}

export default function MobileNavigation({ children }: MobileNavigationProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null); // null until mounted
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();

  // Handle mounting and online/offline status
  useEffect(() => {
    setIsMounted(true);
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Close drawer when route changes
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  // Close drawer on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isDrawerOpen]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen]);

  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen((prev) => !prev);
  }, []);

  return (
    <>
      {/* Mobile Header - only visible on mobile */}
      <header
        style={{
          display: 'none',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '56px',
          background: colors.background.surface,
          borderBottom: `1px solid ${colors.border.default}`,
          zIndex: zIndex.header,
          padding: `0 ${spacing[4]}`,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        className="mobile-header"
      >
        {/* Hamburger Button */}
        <button
          onClick={toggleDrawer}
          aria-label={isDrawerOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isDrawerOpen}
          style={{
            width: a11y.minTouchTarget,
            height: a11y.minTouchTarget,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            borderRadius: borderRadius.md,
            transition: transitions.colors,
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.text.primary}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isDrawerOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>

        {/* Logo */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
            textDecoration: 'none',
            color: colors.text.primary,
            fontWeight: 700,
            fontSize: '1.125rem',
          }}
        >
          <span
            style={{
              width: '32px',
              height: '32px',
              background: colors.brand.gradient,
              borderRadius: borderRadius.md,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.text.inverse,
              fontSize: '1rem',
            }}
          >
            N
          </span>
          NovelForge
        </Link>

        {/* Online Status Indicator - only render after mount to avoid hydration mismatch */}
        {isMounted && isOnline !== null && (
          <div
            style={{
              width: a11y.minTouchTarget,
              height: a11y.minTouchTarget,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={isOnline ? 'Online' : 'Offline'}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: borderRadius.full,
                background: isOnline ? colors.semantic.success : colors.semantic.error,
              }}
            />
          </div>
        )}
      </header>

      {/* Offline Banner - only render after mount to avoid hydration mismatch */}
      {isMounted && isOnline === false && (
        <div
          style={{
            position: 'fixed',
            top: '56px',
            left: 0,
            right: 0,
            background: colors.semantic.warningLight,
            borderBottom: `1px solid ${colors.semantic.warningBorder}`,
            padding: `${spacing[2]} ${spacing[4]}`,
            textAlign: 'center',
            fontSize: '0.875rem',
            color: colors.semantic.warningDark,
            zIndex: zIndex.header - 1,
          }}
          className="offline-banner"
          role="alert"
        >
          You're offline. Some features may be unavailable.
        </div>
      )}

      {/* Drawer Overlay */}
      {isDrawerOpen && (
        <div
          onClick={() => setIsDrawerOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: colors.background.overlay,
            zIndex: zIndex.modal - 1,
            opacity: isDrawerOpen ? 1 : 0,
            transition: transitions.opacity,
          }}
          aria-hidden="true"
        />
      )}

      {/* Slide-out Drawer */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '280px',
          maxWidth: '80vw',
          background: colors.background.surface,
          boxShadow: isDrawerOpen ? shadows.xl : 'none',
          zIndex: zIndex.modal,
          transform: isDrawerOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
        }}
        className="mobile-drawer"
        aria-label="Mobile navigation"
        aria-hidden={!isDrawerOpen}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: spacing[4],
            borderBottom: `1px solid ${colors.border.default}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontWeight: 700,
              fontSize: '1.125rem',
              color: colors.text.primary,
            }}
          >
            Menu
          </span>
          <button
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Close menu"
            style={{
              width: a11y.minTouchTarget,
              height: a11y.minTouchTarget,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: borderRadius.md,
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.text.secondary}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Navigation Links */}
        <div
          style={{
            flex: 1,
            padding: spacing[4],
            overflowY: 'auto',
          }}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[3],
                  padding: spacing[3],
                  borderRadius: borderRadius.md,
                  textDecoration: 'none',
                  color: isActive ? colors.brand.primary : colors.text.primary,
                  background: isActive ? colors.brand.primaryLight : 'transparent',
                  marginBottom: spacing[2],
                  minHeight: a11y.minTouchTarget,
                  transition: transitions.colors,
                }}
              >
                <span style={{ display: 'flex', color: isActive ? colors.brand.primary : colors.text.secondary }}>
                  {item.icon}
                </span>
                <span style={{ fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Drawer Footer */}
        <div
          style={{
            padding: spacing[4],
            borderTop: `1px solid ${colors.border.default}`,
            fontSize: '0.75rem',
            color: colors.text.tertiary,
            textAlign: 'center',
          }}
        >
          NovelForge v1.0
        </div>
      </nav>

      {/* Main Content */}
      <main
        style={{
          paddingTop: '0', // Will be adjusted by CSS for mobile
        }}
        className="mobile-main-content"
      >
        {children}
      </main>

      {/* Global styles for responsive behavior */}
      <style jsx global>{`
        /* Mobile styles - show mobile header, hide sidebar */
        @media (max-width: 768px) {
          .mobile-header {
            display: flex !important;
          }

          .mobile-main-content {
            padding-top: 56px !important;
          }

          .offline-banner + .mobile-main-content {
            padding-top: 96px !important;
          }

          /* Hide desktop sidebar if it exists */
          aside[data-desktop-sidebar] {
            display: none !important;
          }
        }

        /* Desktop only - hide mobile nav (show mobile nav on tablet) */
        @media (min-width: 1025px) {
          .mobile-header {
            display: none !important;
          }

          .mobile-drawer {
            display: none !important;
          }

          .offline-banner {
            display: none !important;
          }
        }

        /* Touch-friendly tap targets */
        @media (max-width: 768px) {
          button,
          a,
          [role="button"] {
            min-height: ${a11y.minTouchTarget};
            min-width: ${a11y.minTouchTarget};
          }
        }

        /* Reduced motion preference */
        @media (prefers-reduced-motion: reduce) {
          .mobile-drawer {
            transition: none !important;
          }
        }
      `}</style>
    </>
  );
}
