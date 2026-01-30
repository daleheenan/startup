'use client';

import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import { getToken, logout } from '@/app/lib/auth';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
} from '@/app/lib/design-tokens';

// ==================== CONSTANTS ====================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const POLL_INTERVAL_MS = 10000; // 10 seconds

// ==================== TYPE DEFINITIONS ====================

interface EditorialQueueItem {
  id: string;
  projectId: string;
  projectTitle: string;
  reportType: 'veb' | 'outline_editorial';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  overallScore: number | null;
  modulesCompleted: number;
  modulesTotal: number;
  createdAt: string;
  completedAt: string | null;
  summary: string | null;
  viewUrl: string;
}

interface EditorialStats {
  totalReports: number;
  byStatus: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  byType: {
    veb: number;
    outline_editorial: number;
  };
  activeProjects: number;
}

interface ActivityEvent {
  timestamp: string;
  eventType: 'submitted' | 'completed' | 'failed' | 'feedback';
  reportType: 'veb' | 'outline_editorial';
  reportId: string;
  projectId: string;
  projectTitle: string;
  details: {
    overallScore?: number;
    summary?: string;
    error?: string;
    module?: string;
    feedbackType?: string;
    notes?: string;
  };
}

interface ProjectEditorialStatus {
  projectId: string;
  projectTitle: string;
  outlineReview: {
    status: 'not_started' | 'skipped' | 'pending' | 'processing' | 'completed' | 'failed';
    score: number | null;
    reportId: string | null;
  };
  veb: {
    status: 'not_started' | 'pending' | 'processing' | 'completed' | 'failed';
    score: number | null;
    reportId: string | null;
  };
}

type TabType = 'queue' | 'projects' | 'activity';
type StatusFilter = 'all' | 'pending' | 'processing' | 'completed' | 'failed';
type TypeFilter = 'all' | 'veb' | 'outline_editorial';

interface QueueFilters {
  status: StatusFilter;
  type: TypeFilter;
  projectId: string;
}

// ==================== COLOUR HELPER FUNCTIONS ====================

function getScoreColour(score: number): string {
  if (score >= 80) return '#10B981'; // Green
  if (score >= 60) return '#F59E0B'; // Amber
  return '#EF4444'; // Red
}

function getStatusColour(status: string): string {
  switch (status) {
    case 'completed':
      return '#10B981';
    case 'processing':
      return '#F59E0B';
    case 'pending':
      return '#6B7280';
    case 'failed':
      return '#EF4444';
    default:
      return '#6B7280';
  }
}

function getStatusBackgroundColour(status: string): string {
  switch (status) {
    case 'completed':
      return '#D1FAE5';
    case 'processing':
      return '#FEF3C7';
    case 'pending':
      return '#F3F4F6';
    case 'failed':
      return '#FEE2E2';
    default:
      return '#F3F4F6';
  }
}

function formatReportType(type: 'veb' | 'outline_editorial'): string {
  return type === 'veb' ? 'Manuscript Review (VEB)' : 'Outline Review';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateTime(dateString: string): string {
  return `${formatDate(dateString)}, ${formatTime(dateString)}`;
}

// ==================== CUSTOM HOOK: useEditorialBoard ====================

interface UseEditorialBoardResult {
  stats: EditorialStats | null;
  queue: EditorialQueueItem[];
  projects: ProjectEditorialStatus[];
  activity: ActivityEvent[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  filters: QueueFilters;
  setFilters: (filters: QueueFilters) => void;
  refresh: () => Promise<void>;
}

function useEditorialBoard(): UseEditorialBoardResult {
  const [stats, setStats] = useState<EditorialStats | null>(null);
  const [queue, setQueue] = useState<EditorialQueueItem[]>([]);
  const [projects, setProjects] = useState<ProjectEditorialStatus[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<QueueFilters>({
    status: 'all',
    type: 'all',
    projectId: '',
  });

  const fetchWithAuth = useCallback(async (endpoint: string) => {
    const token = getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      logout();
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed: ${response.status}`);
    }

    return response.json();
  }, []);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Build queue query params
      const queueParams = new URLSearchParams();
      if (filters.status !== 'all') queueParams.set('status', filters.status);
      if (filters.type !== 'all') queueParams.set('type', filters.type);
      if (filters.projectId) queueParams.set('projectId', filters.projectId);
      queueParams.set('limit', '50');

      // Fetch all data in parallel
      const [statsData, queueData, activityData] = await Promise.all([
        fetchWithAuth('/api/editorial/stats'),
        fetchWithAuth(`/api/editorial/queue?${queueParams.toString()}`),
        fetchWithAuth('/api/editorial/activity?limit=30'),
      ]);

      setStats(statsData);
      setQueue(queueData.items || []);
      setActivity(activityData.events || []);

      // Extract unique projects from queue for project view
      const projectMap = new Map<string, ProjectEditorialStatus>();
      for (const item of queueData.items || []) {
        if (!projectMap.has(item.projectId)) {
          projectMap.set(item.projectId, {
            projectId: item.projectId,
            projectTitle: item.projectTitle,
            outlineReview: {
              status: 'not_started',
              score: null,
              reportId: null,
            },
            veb: {
              status: 'not_started',
              score: null,
              reportId: null,
            },
          });
        }

        const project = projectMap.get(item.projectId)!;
        if (item.reportType === 'outline_editorial') {
          project.outlineReview = {
            status: item.status,
            score: item.overallScore,
            reportId: item.id,
          };
        } else {
          project.veb = {
            status: item.status,
            score: item.overallScore,
            reportId: item.id,
          };
        }
      }
      setProjects(Array.from(projectMap.values()));

    } catch (err) {
      console.error('Error fetching editorial data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load editorial data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchWithAuth, filters]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll for updates when there are processing items
  useEffect(() => {
    const hasProcessing = queue.some(item => item.status === 'processing');
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      fetchData(true);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [queue, fetchData]);

  return {
    stats,
    queue,
    projects,
    activity,
    loading,
    refreshing,
    error,
    filters,
    setFilters,
    refresh: () => fetchData(true),
  };
}

// ==================== SKELETON COMPONENTS ====================

function SkeletonCard({ width = '100%', height = '80px' }: { width?: string; height?: string }) {
  const style: CSSProperties = {
    width,
    height,
    background: `linear-gradient(90deg, ${colors.background.surfaceHover} 25%, ${colors.background.surface} 50%, ${colors.background.surfaceHover} 75%)`,
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: borderRadius.md,
  };

  return (
    <>
      <div style={style} />
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  );
}

function StatsBarSkeleton() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: spacing[4],
      marginBottom: spacing[6],
    }}>
      {[1, 2, 3, 4].map((i) => (
        <SkeletonCard key={i} height="100px" />
      ))}
    </div>
  );
}

function QueueListSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <SkeletonCard key={i} height="120px" />
      ))}
    </div>
  );
}

// ==================== STATS BAR COMPONENT ====================

interface StatsBarProps {
  stats: EditorialStats;
  refreshing: boolean;
}

function StatsBar({ stats, refreshing }: StatsBarProps) {
  const containerStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: spacing[4],
    marginBottom: spacing[6],
  };

  const cardStyle: CSSProperties = {
    background: colors.background.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.lg,
    padding: spacing[5],
    position: 'relative',
    overflow: 'hidden',
  };

  const labelStyle: CSSProperties = {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.tertiary,
    marginBottom: spacing[2],
  };

  const valueStyle: CSSProperties = {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    lineHeight: 1,
  };

  const refreshIndicatorStyle: CSSProperties = {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    opacity: refreshing ? 1 : 0,
    transition: transitions.opacity,
  };

  const statCards = [
    { label: 'Total Reports', value: stats.totalReports, colour: colors.brand.primary },
    { label: 'In Progress', value: stats.byStatus.processing, colour: '#F59E0B' },
    { label: 'Completed', value: stats.byStatus.completed, colour: '#10B981' },
    { label: 'Awaiting Review', value: stats.byStatus.pending, colour: '#6B7280' },
  ];

  return (
    <>
      <div style={containerStyle} className="stats-bar">
        {statCards.map((card, index) => (
          <div key={index} style={cardStyle}>
            <div style={refreshIndicatorStyle}>Refreshing...</div>
            <div style={labelStyle}>{card.label}</div>
            <div style={{ ...valueStyle, color: card.colour }}>{card.value}</div>
          </div>
        ))}
      </div>
      <style>{`
        @media (max-width: 1023px) {
          .stats-bar {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 639px) {
          .stats-bar {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}

// ==================== TAB BAR COMPONENT ====================

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const containerStyle: CSSProperties = {
    display: 'flex',
    gap: spacing[1],
    marginBottom: spacing[6],
    borderBottom: `1px solid ${colors.border.default}`,
    paddingBottom: spacing[0],
  };

  const tabStyle = (isActive: boolean): CSSProperties => ({
    padding: `${spacing[3]} ${spacing[5]}`,
    fontSize: typography.fontSize.sm,
    fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.medium,
    color: isActive ? colors.brand.primary : colors.text.secondary,
    background: 'transparent',
    border: 'none',
    borderBottom: isActive ? `2px solid ${colors.brand.primary}` : '2px solid transparent',
    cursor: 'pointer',
    transition: transitions.colors,
    marginBottom: '-1px',
  });

  const tabs: { id: TabType; label: string }[] = [
    { id: 'queue', label: 'Review Queue' },
    { id: 'projects', label: 'By Project' },
    { id: 'activity', label: 'Activity Feed' },
  ];

  return (
    <nav style={containerStyle} aria-label="Editorial board tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          style={tabStyle(activeTab === tab.id)}
          onClick={() => onTabChange(tab.id)}
          aria-selected={activeTab === tab.id}
          role="tab"
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

// ==================== EMPTY STATE COMPONENT ====================

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing[12]} ${spacing[6]}`,
    textAlign: 'center',
  };

  const iconContainerStyle: CSSProperties = {
    width: '80px',
    height: '80px',
    borderRadius: borderRadius.full,
    background: colors.brand.primaryLight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[6],
  };

  const titleStyle: CSSProperties = {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  };

  const descriptionStyle: CSSProperties = {
    fontSize: typography.fontSize.base,
    color: colors.text.tertiary,
    maxWidth: '400px',
    marginBottom: action ? spacing[6] : 0,
  };

  const linkStyle: CSSProperties = {
    padding: `${spacing[3]} ${spacing[6]}`,
    background: colors.brand.gradient,
    color: colors.text.inverse,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    borderRadius: borderRadius.md,
    textDecoration: 'none',
    boxShadow: shadows.brand,
    transition: transitions.all,
  };

  return (
    <div style={containerStyle}>
      <div style={iconContainerStyle}>{icon}</div>
      <h3 style={titleStyle}>{title}</h3>
      <p style={descriptionStyle}>{description}</p>
      {action && (
        <Link href={action.href} style={linkStyle}>
          {action.label}
        </Link>
      )}
    </div>
  );
}

// ==================== REVIEW QUEUE TAB ====================

interface ReviewQueueTabProps {
  queue: EditorialQueueItem[];
  filters: QueueFilters;
  onFiltersChange: (filters: QueueFilters) => void;
  projects: ProjectEditorialStatus[];
}

function ReviewQueueTab({ queue, filters, onFiltersChange, projects }: ReviewQueueTabProps) {
  // Filter controls styles
  const filterContainerStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[5],
    padding: spacing[4],
    background: colors.background.surfaceHover,
    borderRadius: borderRadius.md,
  };

  const filterGroupStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
  };

  const labelStyle: CSSProperties = {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  };

  const selectStyle: CSSProperties = {
    padding: `${spacing[2]} ${spacing[3]}`,
    fontSize: typography.fontSize.sm,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.sm,
    background: colors.background.surface,
    color: colors.text.primary,
    cursor: 'pointer',
    minWidth: '140px',
  };

  // List item styles
  const listContainerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[3],
  };

  const listItemStyle: CSSProperties = {
    background: colors.background.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.lg,
    padding: spacing[5],
    transition: transitions.all,
  };

  const itemHeaderStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  };

  const itemTitleStyle: CSSProperties = {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[1],
  };

  const itemTypeStyle: CSSProperties = {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  };

  const statusBadgeStyle = (status: string): CSSProperties => ({
    padding: `${spacing[1]} ${spacing[3]}`,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: getStatusColour(status),
    background: getStatusBackgroundColour(status),
    borderRadius: borderRadius.full,
    textTransform: 'capitalize',
  });

  const itemMetaStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[4],
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginBottom: spacing[3],
  };

  const progressContainerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
  };

  const progressBarStyle: CSSProperties = {
    flex: 1,
    height: '6px',
    background: colors.background.surfaceHover,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  };

  const progressFillStyle = (progress: number): CSSProperties => ({
    width: `${progress}%`,
    height: '100%',
    background: progress === 100 ? '#10B981' : colors.brand.primary,
    transition: 'width 0.3s ease',
  });

  const viewLinkStyle: CSSProperties = {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.brand.primary,
    textDecoration: 'none',
  };

  // Unique project list for filter dropdown
  const uniqueProjects = Array.from(
    new Map(projects.map((p) => [p.projectId, p])).values()
  );

  // Handle no results after filtering
  if (queue.length === 0) {
    const hasFilters = filters.status !== 'all' || filters.type !== 'all' || filters.projectId !== '';

    if (hasFilters) {
      return (
        <>
          <div style={filterContainerStyle}>
            <div style={filterGroupStyle}>
              <label style={labelStyle}>Status:</label>
              <select
                style={selectStyle}
                value={filters.status}
                onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as StatusFilter })}
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div style={filterGroupStyle}>
              <label style={labelStyle}>Type:</label>
              <select
                style={selectStyle}
                value={filters.type}
                onChange={(e) => onFiltersChange({ ...filters, type: e.target.value as TypeFilter })}
              >
                <option value="all">All</option>
                <option value="veb">Manuscript (VEB)</option>
                <option value="outline_editorial">Outline Review</option>
              </select>
            </div>
            <div style={filterGroupStyle}>
              <label style={labelStyle}>Project:</label>
              <select
                style={selectStyle}
                value={filters.projectId}
                onChange={(e) => onFiltersChange({ ...filters, projectId: e.target.value })}
              >
                <option value="">All Projects</option>
                {uniqueProjects.map((p) => (
                  <option key={p.projectId} value={p.projectId}>
                    {p.projectTitle}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <EmptyState
            icon={
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colors.brand.primary} strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            }
            title="No reports match your filters"
            description="Try adjusting your filter criteria to see more results."
          />
        </>
      );
    }

    return (
      <EmptyState
        icon={
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colors.brand.primary} strokeWidth="2">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        }
        title="No editorial reports yet"
        description="Submit an outline or completed manuscript for editorial review. Start from any project page."
        action={{
          label: 'View Projects',
          href: '/projects',
        }}
      />
    );
  }

  return (
    <>
      {/* Filters */}
      <div style={filterContainerStyle}>
        <div style={filterGroupStyle}>
          <label style={labelStyle}>Status:</label>
          <select
            style={selectStyle}
            value={filters.status}
            onChange={(e) => onFiltersChange({ ...filters, status: e.target.value as StatusFilter })}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div style={filterGroupStyle}>
          <label style={labelStyle}>Type:</label>
          <select
            style={selectStyle}
            value={filters.type}
            onChange={(e) => onFiltersChange({ ...filters, type: e.target.value as TypeFilter })}
          >
            <option value="all">All</option>
            <option value="veb">Manuscript (VEB)</option>
            <option value="outline_editorial">Outline Review</option>
          </select>
        </div>
        <div style={filterGroupStyle}>
          <label style={labelStyle}>Project:</label>
          <select
            style={selectStyle}
            value={filters.projectId}
            onChange={(e) => onFiltersChange({ ...filters, projectId: e.target.value })}
          >
            <option value="">All Projects</option>
            {uniqueProjects.map((p) => (
              <option key={p.projectId} value={p.projectId}>
                {p.projectTitle}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Queue List */}
      <div style={listContainerStyle}>
        {queue.map((item) => {
          // Calculate progress, ensuring completed status shows 100%
          // and handling edge cases where modulesTotal might be 0
          let progress = 0;
          if (item.status === 'completed') {
            // If overall status is completed, show 100% regardless of module count
            progress = 100;
          } else if (item.modulesTotal > 0) {
            progress = Math.round((item.modulesCompleted / item.modulesTotal) * 100);
          }

          const viewUrl = item.reportType === 'veb'
            ? `/projects/${item.projectId}/editorial-report`
            : `/projects/${item.projectId}/outline-review`;

          return (
            <div key={item.id} style={listItemStyle}>
              <div style={itemHeaderStyle}>
                <div>
                  <div style={itemTitleStyle}>{item.projectTitle}</div>
                  <div style={itemTypeStyle}>{formatReportType(item.reportType)}</div>
                </div>
                <span style={statusBadgeStyle(item.status)}>{item.status}</span>
              </div>

              <div style={itemMetaStyle}>
                <span>Created: {formatDate(item.createdAt)}</span>
                {item.overallScore !== null && (
                  <span style={{ color: getScoreColour(item.overallScore) }}>
                    Score: {item.overallScore}/100
                  </span>
                )}
              </div>

              <div style={progressContainerStyle}>
                <div style={progressBarStyle}>
                  <div style={progressFillStyle(progress)} />
                </div>
                <span style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary, minWidth: '80px' }}>
                  {progress}% complete
                </span>
                <Link href={viewUrl} style={viewLinkStyle}>
                  View Report
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ==================== BY PROJECT TAB ====================

interface ByProjectTabProps {
  projects: ProjectEditorialStatus[];
}

function ByProjectTab({ projects }: ByProjectTabProps) {
  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: spacing[4],
  };

  const cardStyle: CSSProperties = {
    background: colors.background.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.lg,
    padding: spacing[5],
  };

  const cardTitleStyle: CSSProperties = {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[4],
  };

  const dividerStyle: CSSProperties = {
    height: '1px',
    background: colors.border.default,
    marginBottom: spacing[4],
  };

  const reviewRowStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  };

  const reviewLabelStyle: CSSProperties = {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  };

  const reviewStatusStyle = (status: string, score: number | null): CSSProperties => {
    let colour = colors.text.tertiary;
    if (status === 'completed' && score !== null) {
      colour = getScoreColour(score);
    } else if (status === 'processing') {
      colour = '#F59E0B';
    } else if (status === 'failed') {
      colour = '#EF4444';
    }

    return {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: colour,
    };
  };

  const actionsStyle: CSSProperties = {
    display: 'flex',
    gap: spacing[3],
    marginTop: spacing[4],
  };

  const linkButtonStyle: CSSProperties = {
    flex: 1,
    padding: `${spacing[2]} ${spacing[3]}`,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
    textDecoration: 'none',
    borderRadius: borderRadius.md,
    transition: transitions.colors,
  };

  const primaryLinkStyle: CSSProperties = {
    ...linkButtonStyle,
    background: colors.brand.primaryLight,
    color: colors.brand.primary,
  };

  const secondaryLinkStyle: CSSProperties = {
    ...linkButtonStyle,
    background: colors.background.surfaceHover,
    color: colors.text.secondary,
  };

  const formatReviewStatus = (status: string, score: number | null): string => {
    switch (status) {
      case 'not_started':
        return 'Not started';
      case 'skipped':
        return 'Skipped';
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing...';
      case 'completed':
        return score !== null ? `Score: ${score}/100` : 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  };

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colors.brand.primary} strokeWidth="2">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        }
        title="No projects with editorial work"
        description="Create your first novel to begin editorial review."
        action={{
          label: 'Create Project',
          href: '/projects',
        }}
      />
    );
  }

  return (
    <>
      <div style={gridStyle} className="project-grid">
        {projects.map((project) => (
          <div key={project.projectId} style={cardStyle}>
            <div style={cardTitleStyle}>{project.projectTitle}</div>
            <div style={dividerStyle} />

            <div style={reviewRowStyle}>
              <span style={reviewLabelStyle}>Outline Review:</span>
              <span style={reviewStatusStyle(project.outlineReview.status, project.outlineReview.score)}>
                {formatReviewStatus(project.outlineReview.status, project.outlineReview.score)}
              </span>
            </div>

            <div style={reviewRowStyle}>
              <span style={reviewLabelStyle}>VEB Report:</span>
              <span style={reviewStatusStyle(project.veb.status, project.veb.score)}>
                {formatReviewStatus(project.veb.status, project.veb.score)}
              </span>
            </div>

            <div style={actionsStyle}>
              <Link href={`/projects/${project.projectId}/editorial-report`} style={primaryLinkStyle}>
                VEB Report
              </Link>
              <Link href={`/projects/${project.projectId}`} style={secondaryLinkStyle}>
                View Project
              </Link>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @media (max-width: 767px) {
          .project-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}

// ==================== ACTIVITY FEED TAB ====================

interface ActivityFeedTabProps {
  activity: ActivityEvent[];
}

function ActivityFeedTab({ activity }: ActivityFeedTabProps) {
  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[0],
  };

  const eventStyle: CSSProperties = {
    display: 'flex',
    gap: spacing[4],
    padding: `${spacing[4]} 0`,
    borderBottom: `1px solid ${colors.border.default}`,
  };

  const timelineStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '24px',
    flexShrink: 0,
  };

  const dotStyle = (eventType: string): CSSProperties => {
    let colour = colors.brand.primary;
    if (eventType === 'completed') colour = '#10B981';
    if (eventType === 'failed') colour = '#EF4444';
    if (eventType === 'feedback') colour = '#3B82F6';

    return {
      width: '12px',
      height: '12px',
      borderRadius: borderRadius.full,
      background: colour,
      flexShrink: 0,
    };
  };

  const lineStyle: CSSProperties = {
    width: '2px',
    flex: 1,
    background: colors.border.default,
    marginTop: spacing[2],
  };

  const contentStyle: CSSProperties = {
    flex: 1,
    paddingBottom: spacing[2],
  };

  const timestampStyle: CSSProperties = {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginBottom: spacing[1],
  };

  const messageStyle: CSSProperties = {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    marginBottom: spacing[1],
  };

  const detailsStyle: CSSProperties = {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  };

  const getEventIcon = (eventType: string): string => {
    switch (eventType) {
      case 'submitted':
        return 'Submitted';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'feedback':
        return 'Feedback';
      default:
        return 'Event';
    }
  };

  const getEventMessage = (event: ActivityEvent): string => {
    const reportTypeLabel = event.reportType === 'veb' ? 'VEB Report' : 'Outline Review';

    switch (event.eventType) {
      case 'submitted':
        return `${reportTypeLabel} submitted for "${event.projectTitle}"`;
      case 'completed':
        return `${reportTypeLabel} completed for "${event.projectTitle}"`;
      case 'failed':
        return `${reportTypeLabel} failed for "${event.projectTitle}"`;
      case 'feedback':
        return `Feedback added to ${reportTypeLabel} for "${event.projectTitle}"`;
      default:
        return `${reportTypeLabel} activity for "${event.projectTitle}"`;
    }
  };

  const getEventDetails = (event: ActivityEvent): string | null => {
    if (event.eventType === 'completed' && event.details.overallScore !== undefined) {
      return `Overall Score: ${event.details.overallScore}/100`;
    }
    if (event.eventType === 'failed' && event.details.error) {
      return `Error: ${event.details.error}`;
    }
    if (event.eventType === 'feedback' && event.details.feedbackType) {
      return `${event.details.feedbackType}: ${event.details.notes || 'No notes'}`;
    }
    return null;
  };

  if (activity.length === 0) {
    return (
      <EmptyState
        icon={
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colors.brand.primary} strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        }
        title="No activity yet"
        description="Submit an outline or completed manuscript for editorial review to see activity here."
        action={{
          label: 'View Projects',
          href: '/projects',
        }}
      />
    );
  }

  return (
    <div style={containerStyle}>
      {activity.map((event, index) => {
        const details = getEventDetails(event);
        const isLast = index === activity.length - 1;

        return (
          <div key={`${event.reportId}-${event.timestamp}`} style={eventStyle}>
            <div style={timelineStyle}>
              <div style={dotStyle(event.eventType)} />
              {!isLast && <div style={lineStyle} />}
            </div>
            <div style={contentStyle}>
              <div style={timestampStyle}>{formatDateTime(event.timestamp)}</div>
              <div style={messageStyle}>
                <strong>{getEventIcon(event.eventType)}:</strong> {getEventMessage(event)}
              </div>
              {details && <div style={detailsStyle}>{details}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==================== ERROR STATE COMPONENT ====================

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing[12]} ${spacing[6]}`,
    textAlign: 'center',
  };

  const iconContainerStyle: CSSProperties = {
    width: '80px',
    height: '80px',
    borderRadius: borderRadius.full,
    background: colors.semantic.errorLight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[6],
  };

  const titleStyle: CSSProperties = {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing[2],
  };

  const messageStyle: CSSProperties = {
    fontSize: typography.fontSize.base,
    color: colors.text.tertiary,
    maxWidth: '400px',
    marginBottom: spacing[6],
  };

  const buttonStyle: CSSProperties = {
    padding: `${spacing[3]} ${spacing[6]}`,
    background: colors.brand.gradient,
    color: colors.text.inverse,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    borderRadius: borderRadius.md,
    border: 'none',
    cursor: 'pointer',
    boxShadow: shadows.brand,
  };

  return (
    <div style={containerStyle}>
      <div style={iconContainerStyle}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={colors.semantic.error} strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 style={titleStyle}>Unable to Load Editorial Data</h3>
      <p style={messageStyle}>{message}</p>
      <button type="button" style={buttonStyle} onClick={onRetry}>
        Try Again
      </button>
    </div>
  );
}

// ==================== MAIN PAGE COMPONENT ====================

export default function EditorialBoardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('queue');

  const {
    stats,
    queue,
    projects,
    activity,
    loading,
    refreshing,
    error,
    filters,
    setFilters,
    refresh,
  } = useEditorialBoard();

  // Render loading state
  if (loading) {
    return (
      <DashboardLayout
        header={{
          title: 'Editorial Board',
          subtitle: 'Review and manage editorial activity across all projects',
        }}
      >
        <StatsBarSkeleton />
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
        <QueueListSkeleton />
      </DashboardLayout>
    );
  }

  // Render error state
  if (error) {
    return (
      <DashboardLayout
        header={{
          title: 'Editorial Board',
          subtitle: 'Review and manage editorial activity across all projects',
        }}
      >
        <ErrorState message={error} onRetry={refresh} />
      </DashboardLayout>
    );
  }

  // Render main content
  return (
    <DashboardLayout
      header={{
        title: 'Editorial Board',
        subtitle: 'Review and manage editorial activity across all projects',
      }}
    >
      {/* Stats Bar */}
      {stats && <StatsBar stats={stats} refreshing={refreshing} />}

      {/* Tab Navigation */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      {activeTab === 'queue' && (
        <ReviewQueueTab
          queue={queue}
          filters={filters}
          onFiltersChange={setFilters}
          projects={projects}
        />
      )}
      {activeTab === 'projects' && <ByProjectTab projects={projects} />}
      {activeTab === 'activity' && <ActivityFeedTab activity={activity} />}
    </DashboardLayout>
  );
}
