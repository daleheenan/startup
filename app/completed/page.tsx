'use client';

import { useState, useEffect, useMemo } from 'react';
import { getToken, logout } from '../lib/auth';
import { colors, typography, spacing, borderRadius } from '../lib/design-tokens';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import MetricCard from '@/app/components/dashboard/MetricCard';
import { CompletedNovelsTable } from '../components/projects';
import type { SortColumn, SortConfig } from '../components/projects';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ==================== TYPES ====================

interface ProjectMetrics {
  tokens: {
    input: string;
    output: string;
    display: string;
  };
  cost: {
    usd: string;
    gbp: string;
    display: string;
  };
  content: {
    chapters: number;
    words: number;
    display: string;
  };
  reading: {
    minutes: number;
    display: string;
  };
}

interface ProjectProgress {
  characters: number;
  worldElements: number;
  plotLayers: number;
  hasOutline: boolean;
  outlineChapters: number;
  chaptersWritten: number;
  generationStatus?: 'idle' | 'generating' | 'completed' | 'failed';
  generationQueuePosition?: number;
}

interface Project {
  id: string;
  title: string;
  type: string;
  genre: string;
  status: string;
  created_at: string;
  updated_at: string;
  metrics?: ProjectMetrics | null;
  progress?: ProjectProgress | null;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Derives aggregate metrics for completed novels.
 */
function computeCompletedMetrics(projects: Project[]) {
  const totalWords = projects.reduce(
    (sum, p) => sum + (p.metrics?.content?.words ?? 0),
    0
  );

  const totalChapters = projects.reduce(
    (sum, p) => sum + (p.progress?.chaptersWritten ?? 0),
    0
  );

  const totalReadingMinutes = projects.reduce(
    (sum, p) => sum + (p.metrics?.reading?.minutes ?? 0),
    0
  );

  return { totalWords, totalChapters, totalNovels: projects.length, totalReadingMinutes };
}

// ==================== PAGE COMPONENT ====================

export default function CompletedNovelsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: 'updated_at',
    direction: 'desc',
  });

  useEffect(() => {
    fetchCompletedProjects();
  }, []);

  const fetchCompletedProjects = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        if (response.status === 401) {
          logout();
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      // Filter for completed/published projects where all chapters are written
      const allProjects: Project[] = data.projects || [];
      const completedProjects = allProjects.filter((p: Project) => {
        // A project is considered "completed" if:
        // 1. It has status 'completed' or 'published', OR
        // 2. All outline chapters have been written (chaptersWritten >= outlineChapters and outlineChapters > 0)
        const isStatusCompleted = p.status === 'completed' || p.status === 'published';
        const allChaptersWritten = p.progress &&
          p.progress.outlineChapters > 0 &&
          p.progress.chaptersWritten >= p.progress.outlineChapters;
        return isStatusCompleted || allChaptersWritten;
      });
      setProjects(completedProjects);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load projects';
      console.error('Error fetching projects:', err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (column: SortColumn) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleDelete = async (projectId: string) => {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete project');
    }

    setProjects(prev => prev.filter(p => p.id !== projectId));
  };

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      let aValue: string | number = 0;
      let bValue: string | number = 0;

      switch (sortConfig.column) {
        case 'name':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'updated_at':
          aValue = new Date(a.updated_at).getTime();
          bValue = new Date(b.updated_at).getTime();
          break;
        case 'totalCost':
          aValue = parseFloat(String(a.metrics?.cost?.usd ?? '0').replace(/[^0-9.-]/g, ''));
          bValue = parseFloat(String(b.metrics?.cost?.usd ?? '0').replace(/[^0-9.-]/g, ''));
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'words':
          aValue = a.metrics?.content?.words ?? 0;
          bValue = b.metrics?.content?.words ?? 0;
          break;
        case 'chapters':
          aValue = a.progress?.chaptersWritten ?? 0;
          bValue = b.progress?.chaptersWritten ?? 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [projects, sortConfig]);

  // Derive metrics from completed projects
  const metrics = useMemo(() => computeCompletedMetrics(projects), [projects]);

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.background.primary,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            width: '48px',
            height: '48px',
            border: `3px solid ${colors.border.default}`,
            borderTopColor: colors.brand.primary,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ marginTop: spacing[4], color: colors.text.tertiary }}>Loading...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // ---- Main render wrapped in DashboardLayout ----
  return (
    <DashboardLayout
      header={{
        title: 'Completed Novels',
        subtitle: 'Novels with all chapters written and ready for publication.',
        showDatePicker: false,
      }}
    >
      {/* Error banner */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            background: colors.semantic.errorLight,
            border: `1px solid ${colors.semantic.errorBorder}`,
            borderRadius: borderRadius.lg,
            padding: `${spacing[4]} ${spacing[6]}`,
            marginBottom: spacing[6],
            color: colors.semantic.error,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[3],
          }}
        >
          <span aria-hidden="true">⚠️</span>
          {error}
        </div>
      )}

      {/* Metric cards row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: spacing[4],
        marginBottom: spacing[8],
      }}>
        <MetricCard
          title="Completed Novels"
          value={metrics.totalNovels}
          variant="green"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.metrics.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />

        <MetricCard
          title="Total Words"
          value={metrics.totalWords.toLocaleString()}
          variant="blue"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.metrics.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <line x1="8" y1="7" x2="16" y2="7" />
              <line x1="8" y1="11" x2="16" y2="11" />
              <line x1="8" y1="15" x2="12" y2="15" />
            </svg>
          }
          items={[
            { label: 'Chapters written', count: metrics.totalChapters },
          ]}
        />

        <MetricCard
          title="Total Reading Time"
          value={`${Math.round(metrics.totalReadingMinutes / 60)}h`}
          variant="orange"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.metrics.orange} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
          items={[
            { label: 'minutes', count: metrics.totalReadingMinutes },
          ]}
        />
      </div>

      {/* Completed novels table */}
      <section aria-labelledby="completed-heading">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing[4],
        }}>
          <h2
            id="completed-heading"
            style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              margin: 0,
            }}
          >
            Completed Novels ({projects.length})
          </h2>
        </div>
        <CompletedNovelsTable
          projects={sortedProjects}
          sortConfig={sortConfig}
          onSort={handleSort}
          onDelete={handleDelete}
        />
      </section>
    </DashboardLayout>
  );
}
