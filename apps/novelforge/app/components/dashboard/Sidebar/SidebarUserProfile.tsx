'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { colors, spacing, typography, borderRadius, transitions, a11y } from '@/app/lib/design-tokens';

// ==================== TYPES ====================

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface SidebarUserProfileProps {
  user: UserProfile | null;
  isLoading?: boolean;
  collapsed?: boolean;
  onLogout?: () => void;
}

// ==================== HELPERS ====================

/**
 * Extracts up to two initials from a display name.
 *
 * Examples:
 *   "Priya Sharma"  → "PS"
 *   "Ada"           → "A"
 *   "Jane M. Smith" → "JM"
 */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

/**
 * Returns a deterministic background colour for the initials avatar by
 * hashing the name across a palette of brand-adjacent hues.
 */
function getAvatarColour(name: string): string {
  const palette = [
    '#667eea', // brand primary
    '#764ba2', // brand dark
    '#10B981', // semantic success
    '#2563EB', // semantic info
    '#D97706', // semantic warning
    '#DC2626', // semantic error
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

// ==================== SUB-COMPONENTS ====================

/**
 * Shimmer renders an animated placeholder block for the loading skeleton.
 */
function Shimmer({ width, height, borderRadius: radius = borderRadius.md }: {
  width: string;
  height: string;
  borderRadius?: string;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius: radius,
        background: `linear-gradient(90deg, ${colors.sidebar.backgroundHover} 25%, ${colors.sidebar.background} 50%, ${colors.sidebar.backgroundHover} 75%)`,
        backgroundSize: '200% 100%',
        animation: 'sidebar-shimmer 1.5s infinite linear',
        flexShrink: 0,
      }}
    />
  );
}

// ==================== COMPONENT ====================

/**
 * SidebarUserProfile
 *
 * Displays the authenticated user's identity at the bottom of the dark
 * sidebar, adapting to three distinct render states:
 *
 * 1. **Loading** – skeleton shimmer placeholders for avatar, name, and email.
 * 2. **No user** – a "Sign in" link that navigates to /login.
 * 3. **Authenticated** – avatar (image or initials), name/email stack, and
 *    an icon-only logout button with a 44 px touch target.
 *
 * When `collapsed` is true the layout contracts to avatar-only, hiding
 * the textual information and logout button while preserving the avatar
 * as a visual anchor.
 *
 * Accessibility:
 * - Logout button meets WCAG 2.1 AA minimum touch target (44 px).
 * - aria-label on the logout button describes the action for screen readers.
 * - Sign-in link uses visible text; no reliance on colour alone.
 * - Focus ring styled to match the sidebar's brand focus colour.
 */
export default function SidebarUserProfile({
  user,
  isLoading = false,
  collapsed = false,
  onLogout,
}: SidebarUserProfileProps) {
  const [isLogoutHovered, setIsLogoutHovered] = useState(false);
  const [isLogoutFocused, setIsLogoutFocused] = useState(false);

  // ---- shared container style (border-top divider + padding) ----
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: collapsed ? 0 : spacing[3],
    padding: `${spacing[4]} ${spacing[4]}`,
    borderTop: `1px solid ${colors.sidebar.border}`,
    transition: transitions.all,
  };

  // ---- LOADING STATE ----
  if (isLoading) {
    return (
      <div style={containerStyle} aria-busy="true" aria-label="Loading user profile">
        <Shimmer width="40px" height="40px" borderRadius={borderRadius.full} />
        {!collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1], minWidth: 0, flexGrow: 1 }}>
            <Shimmer width="70%" height="14px" />
            <Shimmer width="50%" height="12px" />
          </div>
        )}
      </div>
    );
  }

  // ---- NO USER (SIGN IN) STATE ----
  if (!user) {
    return (
      <div style={containerStyle}>
        <Link
          href="/login"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
            color: colors.sidebar.text,
            textDecoration: 'none',
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            transition: transitions.colors,
            whiteSpace: 'nowrap',
          }}
        >
          {/* Sign-in icon: simplified door-with-arrow */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ flexShrink: 0 }}
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {!collapsed && <span>Sign in</span>}
        </Link>
      </div>
    );
  }

  // ---- AUTHENTICATED USER STATE ----

  // Memoised derivations so they do not recompute on every render
  const initials = useMemo(() => getInitials(user.name), [user.name]);
  const avatarColour = useMemo(() => getAvatarColour(user.name), [user.name]);

  const avatarBaseStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    minWidth: '40px',
    borderRadius: borderRadius.full,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  };

  const logoutButtonStyle: React.CSSProperties = {
    // 44 px touch target for WCAG 2.1 AA
    width: a11y.minTouchTarget,
    height: a11y.minTouchTarget,
    minWidth: a11y.minTouchTarget,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    background: isLogoutHovered || isLogoutFocused
      ? colors.sidebar.backgroundHover
      : 'transparent',
    color: isLogoutHovered || isLogoutFocused
      ? colors.white
      : colors.sidebar.textMuted,
    transition: transitions.colors,
    outline: isLogoutFocused ? `2px solid ${colors.border.focus}` : 'none',
    outlineOffset: isLogoutFocused ? '2px' : undefined,
    flexShrink: 0,
  };

  return (
    <div style={containerStyle}>
      {/* Avatar: image when available, otherwise initials in a coloured circle */}
      <div style={avatarBaseStyle}>
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={`${user.name}'s avatar`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              ...avatarBaseStyle,
              backgroundColor: avatarColour,
              color: colors.text.inverse,
              fontFamily: typography.fontFamily.base,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.semibold,
            }}
            aria-hidden="true"
          >
            {initials}
          </div>
        )}
      </div>

      {/* Name / Email stack — hidden when collapsed */}
      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[0], minWidth: 0, flexGrow: 1 }}>
          <span
            style={{
              color: colors.sidebar.text,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: typography.lineHeight.tight,
            }}
            title={user.name}
          >
            {user.name}
          </span>
          <span
            style={{
              color: colors.sidebar.textMuted,
              fontSize: typography.fontSize.xs,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: typography.lineHeight.tight,
            }}
            title={user.email}
          >
            {user.email}
          </span>
        </div>
      )}

      {/* Logout button — icon only, hidden when collapsed */}
      {!collapsed && onLogout && (
        <button
          type="button"
          style={logoutButtonStyle}
          onClick={onLogout}
          onMouseEnter={() => setIsLogoutHovered(true)}
          onMouseLeave={() => setIsLogoutHovered(false)}
          onFocus={() => setIsLogoutFocused(true)}
          onBlur={() => setIsLogoutFocused(false)}
          aria-label="Log out"
          title="Log out"
        >
          {/* Door-with-arrow icon */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ==================== SHIMMER ANIMATION (INJECTED ONCE) ====================

/*
 * The shimmer keyframe is injected into <head> once at module evaluation.
 * The 'use client' directive guarantees this code only runs in the browser.
 */
const SHIMMER_CSS = `
@keyframes sidebar-shimmer {
  0%   { background-position:  200% 0; }
  100% { background-position: -200% 0; }
}
`;

if (typeof document !== 'undefined') {
  const existing = document.getElementById('sidebar-shimmer-styles');
  if (!existing) {
    const styleEl = document.createElement('style');
    styleEl.id = 'sidebar-shimmer-styles';
    styleEl.textContent = SHIMMER_CSS;
    document.head.appendChild(styleEl);
  }
}
