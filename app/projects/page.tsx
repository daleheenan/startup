'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getToken, logout } from '../lib/auth';
import { colors, typography, spacing, borderRadius } from '../lib/design-tokens';
import PrimaryNavigationBar from '../components/shared/PrimaryNavigationBar';
import { ActionButtonsPanel, ConceptsSummaryPanel, ProjectsTable } from '../components/projects';
import type { SortColumn, SortConfig } from '../components/projects';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

interface QueueStats {
  queue: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
  session: {
    isActive: boolean;
    requestsThisSession: number;
    timeRemaining: string;
    resetTime: string | null;
  };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: 'updated_at',
    direction: 'desc',
  });

  useEffect(() => {
    fetchProjects();
    fetchQueueStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchQueueStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchProjects = async () => {
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
      setProjects(data.projects || []);
    } catch (err: any) {
      console.error('Error fetching projects:', err);
      setError(err.message || 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQueueStats = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/queue/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setQueueStats(data);
      }
    } catch (err) {
      console.error('Error fetching queue stats:', err);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
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

    // Remove the project from the local state
    setProjects(prev => prev.filter(p => p.id !== projectId));
  };

  const sortedProjects = useMemo(() => {
    const sorted = [...projects].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.column) {
        case 'name':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'updated_at':
          aValue = new Date(a.updated_at).getTime();
          bValue = new Date(b.updated_at).getTime();
          break;
        case 'cost':
          aValue = parseFloat(a.metrics?.cost?.usd?.replace(/[^0-9.-]/g, '') || '0');
          bValue = parseFloat(b.metrics?.cost?.usd?.replace(/[^0-9.-]/g, '') || '0');
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'words':
          aValue = a.metrics?.content?.words || 0;
          bValue = b.metrics?.content?.words || 0;
          break;
        case 'chapters':
          aValue = a.progress?.chaptersWritten || 0;
          bValue = b.progress?.chaptersWritten || 0;
          break;
        case 'versions':
          // Versions not yet available from API
          aValue = 0;
          bValue = 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [projects, sortConfig]);

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
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.background.primary,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Primary Navigation Bar */}
      <PrimaryNavigationBar activeSection="projects" />

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Bar */}
        <header
          role="banner"
          style={{
            padding: `${spacing[4]} ${spacing[8]}`,
            background: colors.background.surface,
            borderBottom: `1px solid ${colors.border.default}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <div>
            <h1 style={{
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.text.primary,
              margin: 0,
            }}>
              Story Architect
            </h1>
            <p style={{
              fontSize: typography.fontSize.sm,
              color: colors.text.secondary,
              margin: 0,
            }}>
              Create and manage your novel projects
            </p>
          </div>

          {/* Claude Max Status */}
          {queueStats && (
            <div
              role="complementary"
              aria-label="System status"
              style={{
                display: 'flex',
                gap: spacing[4],
                alignItems: 'center',
              }}>
              <div style={{
                padding: `${spacing[3]} ${spacing[4]}`,
                background: colors.background.secondary,
                borderRadius: borderRadius.md,
                display: 'flex',
                alignItems: 'center',
                gap: spacing[3],
              }}>
                <div
                  role="progressbar"
                  aria-label="Claude Max usage"
                  aria-valuenow={queueStats.session.requestsThisSession}
                  aria-valuemin={0}
                  aria-valuemax={45}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: `conic-gradient(${colors.brand.primary} ${(queueStats.session.requestsThisSession / 45) * 100}%, ${colors.border.default} 0%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: colors.background.secondary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.625rem',
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.brand.primary,
                  }}>
                    {queueStats.session.requestsThisSession}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>Claude Max</div>
                  <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                    Reset in {queueStats.session.timeRemaining || '5h 0m'}
                  </div>
                </div>
              </div>

              <Link
                href="/admin/queue"
                style={{
                  padding: `${spacing[3]} ${spacing[4]}`,
                  background: colors.background.secondary,
                  borderRadius: borderRadius.md,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>Job Queue</div>
                <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary }}>
                  PENDING: {queueStats.queue.pending}
                </div>
              </Link>

              <button
                onClick={handleLogout}
                aria-label="Logout from NovelForge"
                style={{
                  padding: `${spacing[3]} ${spacing[4]}`,
                  background: colors.background.secondary,
                  borderRadius: borderRadius.md,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[2],
                  fontSize: typography.fontSize.sm,
                  color: colors.text.tertiary,
                  transition: 'all 0.2s',
                }}
              >
                <span aria-hidden="true">🚪</span>
                Logout
              </button>
            </div>
          )}
        </header>

        {/* Content Area */}
        <div
          role="main"
          style={{ flex: 1, padding: spacing[8], overflow: 'auto' }}>
          {/* Error Message */}
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
              }}>
              <span aria-hidden="true">⚠️</span>
              {error}
            </div>
          )}

          {/* Top Row - Two Columns */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: spacing[6],
              marginBottom: spacing[8],
            }}
          >
            <ActionButtonsPanel />
            <ConceptsSummaryPanel />
          </div>

          {/* Bottom Row - Projects Table */}
          <section aria-labelledby="projects-heading">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing[4],
              }}
            >
              <h2
                id="projects-heading"
                style={{
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                  margin: 0,
                }}
              >
                Your Projects ({projects.length})
              </h2>
            </div>
            <ProjectsTable
              projects={sortedProjects}
              sortConfig={sortConfig}
              onSort={handleSort}
              onDelete={handleDelete}
            />
          </section>
        </div>
      </main>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
