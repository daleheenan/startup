'use client';

import { useState, useMemo } from 'react';
import {
  colors,
  typography,
  shadows,
  borderRadius,
  transitions,
  spacing,
} from '@/app/lib/design-tokens';

// ==================== TYPES ====================

export interface ActivityItem {
  id: string;
  type: 'chapter_added' | 'chapter_edited' | 'project_created' | 'outline_completed' | 'export';
  title: string;
  projectName?: string;
  timestamp: Date;
}

export interface RecentActivityFeedProps {
  activities?: ActivityItem[];
  isLoading?: boolean;
  maxItems?: number;
}

// ==================== ACTIVITY TYPE TOKENS ====================

/**
 * Maps each activity type to its icon colour and background shade,
 * following the same variant-lookup pattern used by MetricCard.
 */
const activityTypeStyles = {
  chapter_added: {
    color: colors.metrics.blue,
    bg: colors.metrics.blueShade,
  },
  chapter_edited: {
    color: colors.semantic.warning,
    bg: colors.semantic.warningLight,
  },
  project_created: {
    color: colors.brand.primary,
    bg: colors.brand.primaryLight,
  },
  outline_completed: {
    color: colors.semantic.successDark,
    bg: colors.semantic.successLight,
  },
  export: {
    color: colors.metrics.green,
    bg: colors.metrics.greenShade,
  },
} as const;

// ==================== ICONS ====================

/**
 * Inline SVG icons for each activity type.
 * All icons are 20x20 and use an explicit `colour` prop so the
 * parent activity-type token applies consistently.
 */

function IconChapterAdded({ colour }: { colour: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 2h8l4 4v12a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z"
        stroke={colour}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M10 7v5M7.5 9.5h5"
        stroke={colour}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconChapterEdited({ colour }: { colour: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M13.5 3.5l3 3L6 17H3v-3L13.5 3.5z"
        stroke={colour}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M11 5.5l3 3"
        stroke={colour}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconProjectCreated({ colour }: { colour: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2l2.5 5h5.5l-4.5 3.5 1.5 5.5L10 12.5 5 16l1.5-5.5L2 7h5.5L10 2z"
        stroke={colour}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconOutlineCompleted({ colour }: { colour: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" stroke={colour} strokeWidth="1.5" />
      <path
        d="M6.5 10l2.5 2.5L14 7.5"
        stroke={colour}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconExport({ colour }: { colour: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 4v9"
        stroke={colour}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7 7l3 3 3-3"
        stroke={colour}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2"
        stroke={colour}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const iconComponents = {
  chapter_added: IconChapterAdded,
  chapter_edited: IconChapterEdited,
  project_created: IconProjectCreated,
  outline_completed: IconOutlineCompleted,
  export: IconExport,
} as const;

// ==================== HELPERS ====================

/**
 * Formats a Date into a human-readable relative timestamp string.
 *
 * Rules (in order of precedence):
 * - Less than 1 minute  -> "Just now"
 * - Less than 1 hour    -> "X minutes ago"
 * - Less than 24 hours  -> "X hours ago"
 * - Previous calendar day -> "Yesterday"
 * - Anything older      -> locale date string (e.g. "14 Jan 2026")
 */
function formatRelativeTimestamp(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

  // Check whether the date falls on yesterday
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return 'Yesterday';
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Returns a sortable date key (YYYY-MM-DD) used to group activities
 * that occurred on the same calendar day.
 */
function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats a YYYY-MM-DD key into a human-readable group header.
 * Returns "Today", "Yesterday", or a long-form locale date.
 */
function formatDateGroupHeader(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);

  const today = new Date();
  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  ) {
    return 'Today';
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return 'Yesterday';
  }

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * Groups an array of activities by calendar date, returning entries
 * in reverse-chronological order (most recent date group first).
 */
function groupActivitiesByDate(
  activities: ActivityItem[]
): [string, ActivityItem[]][] {
  const groups = new Map<string, ActivityItem[]>();

  for (const activity of activities) {
    const key = toDateKey(activity.timestamp);
    const existing = groups.get(key);
    if (existing) {
      existing.push(activity);
    } else {
      groups.set(key, [activity]);
    }
  }

  return Array.from(groups.entries()).sort(([a], [b]) => (b > a ? 1 : -1));
}

// ==================== SUB-COMPONENTS ====================

/**
 * Skeleton placeholder for a single activity row during loading.
 * Uses the border colour as a neutral shimmer base.
 */
function ActivitySkeleton() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: spacing[3],
        padding: `${spacing[3]} ${spacing[4]}`,
      }}
    >
      {/* Icon circle placeholder */}
      <div
        style={{
          flexShrink: 0,
          width: '36px',
          height: '36px',
          borderRadius: borderRadius.full,
          backgroundColor: colors.border.default,
        }}
      />
      {/* Text line placeholders */}
      <div style={{ flex: 1, minWidth: 0, paddingTop: spacing[1] }}>
        <div
          style={{
            height: '12px',
            width: '60%',
            borderRadius: borderRadius.sm,
            backgroundColor: colors.border.default,
            marginBottom: spacing[2],
          }}
        />
        <div
          style={{
            height: '10px',
            width: '35%',
            borderRadius: borderRadius.sm,
            backgroundColor: colors.border.default,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Renders a single activity row with its type-specific icon,
 * title, optional project name, and relative timestamp.
 * Hover state is managed via local boolean to match the
 * onMouseEnter/onMouseLeave pattern used across dashboard components.
 */
function ActivityRow({ activity }: { activity: ActivityItem }) {
  const { color, bg } = activityTypeStyles[activity.type];
  const Icon = iconComponents[activity.type];
  const [hovered, setHovered] = useState(false);

  return (
    <div
      role="listitem"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: spacing[3],
        padding: `${spacing[3]} ${spacing[4]}`,
        borderRadius: borderRadius.md,
        backgroundColor: hovered ? colors.background.surfaceHover : 'transparent',
        transition: transitions.colors,
        cursor: 'default',
      }}
    >
      {/* Coloured icon circle */}
      <div
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: '36px',
          height: '36px',
          borderRadius: borderRadius.full,
          backgroundColor: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon colour={color} />
      </div>

      {/* Text content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            color: colors.text.primary,
            margin: 0,
            lineHeight: typography.lineHeight.normal,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {activity.title}
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
            marginTop: spacing[1],
          }}
        >
          {activity.projectName && (
            <>
              <span
                style={{
                  fontSize: typography.fontSize.xs,
                  color: colors.text.secondary,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '40%',
                }}
              >
                {activity.projectName}
              </span>
              <span
                aria-hidden="true"
                style={{
                  fontSize: typography.fontSize.xs,
                  color: colors.border.default,
                }}
              >
                &middot;
              </span>
            </>
          )}
          <span
            style={{
              fontSize: typography.fontSize.xs,
              color: colors.text.tertiary,
              whiteSpace: 'nowrap',
            }}
          >
            {formatRelativeTimestamp(activity.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ==================== COMPONENT ====================

/**
 * RecentActivityFeed displays a chronological list of user activities
 * grouped by calendar date. Each item shows a type-specific coloured
 * icon, a title, an optional project name, and a relative timestamp.
 *
 * Render states:
 * - **Loading** (`isLoading=true`)  : skeleton placeholders
 * - **Empty**   (`activities=[]`)   : "No recent activity" message
 * - **Populated**                   : date-grouped activity rows
 *
 * Activities are sorted newest-first and capped at `maxItems` before
 * grouping to keep the feed concise.
 */
export default function RecentActivityFeed({
  activities = [],
  isLoading = false,
  maxItems = 10,
}: RecentActivityFeedProps) {
  // ==================== DERIVED DATA ====================

  /** Sorted newest-first and capped to the requested maximum. */
  const visibleActivities = useMemo(() => {
    return [...activities]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, maxItems);
  }, [activities, maxItems]);

  /** Grouped by date with most-recent group first. */
  const groupedActivities = useMemo(() => {
    return groupActivitiesByDate(visibleActivities);
  }, [visibleActivities]);

  // ==================== SHARED CARD STYLE ====================

  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.background.surface,
    boxShadow: shadows.sm,
    borderRadius: borderRadius.lg,
    padding: spacing[6],
  };

  const headingStyle: React.CSSProperties = {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    margin: 0,
    marginBottom: spacing[4],
    lineHeight: typography.lineHeight.tight,
  };

  // ==================== LOADING STATE ====================

  if (isLoading) {
    return (
      <div style={cardStyle}>
        <h3 style={headingStyle}>Recent Activity</h3>
        <div>
          {Array.from({ length: 4 }, (_, i) => (
            <ActivitySkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // ==================== EMPTY STATE ====================

  if (activities.length === 0) {
    return (
      <div style={cardStyle}>
        <h3 style={headingStyle}>Recent Activity</h3>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: `${spacing[8]} ${spacing[4]}`,
          }}
        >
          {/* Minimal document illustration for visual breathing room */}
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden="true"
            style={{ marginBottom: spacing[3] }}
          >
            <rect
              x="8"
              y="4"
              width="24"
              height="32"
              rx="3"
              stroke={colors.border.default}
              strokeWidth="2"
            />
            <line
              x1="14"
              y1="14"
              x2="26"
              y2="14"
              stroke={colors.border.default}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="14"
              y1="20"
              x2="26"
              y2="20"
              stroke={colors.border.default}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="14"
              y1="26"
              x2="22"
              y2="26"
              stroke={colors.border.default}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <p
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.text.tertiary,
              margin: 0,
              textAlign: 'center',
            }}
          >
            No recent activity
          </p>
        </div>
      </div>
    );
  }

  // ==================== POPULATED STATE ====================

  return (
    <div style={cardStyle}>
      <h3 style={headingStyle}>Recent Activity</h3>

      <div role="list">
        {groupedActivities.map(([dateKey, items], groupIndex) => (
          <div key={dateKey}>
            {/* Date group header */}
            <div
              style={{
                paddingLeft: spacing[4],
                paddingBottom: spacing[2],
                marginTop: groupIndex > 0 ? spacing[4] : 0,
              }}
            >
              <span
                style={{
                  fontSize: typography.fontSize.xs,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.tertiary,
                  textTransform: 'uppercase',
                  letterSpacing: typography.letterSpacing.wide,
                }}
              >
                {formatDateGroupHeader(dateKey)}
              </span>
            </div>

            {/* Activity rows for this date group */}
            {items.map((activity) => (
              <ActivityRow key={activity.id} activity={activity} />
            ))}

            {/* Subtle divider between groups — omitted after the last */}
            {groupIndex < groupedActivities.length - 1 && (
              <div
                style={{
                  borderBottom: `1px solid ${colors.border.default}`,
                  marginTop: spacing[3],
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
