'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import type { CSSProperties } from 'react';

import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  transitions,
  gradients,
} from '@/app/lib/design-tokens';
import { getToken } from '@/app/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface SeriesProject {
  id: string;
  title: string;
  genre: string;
  status: string;
  series_book_number: number | null;
  word_count: number;
}

interface Series {
  id: string;
  title: string;
  description: string | null;
  status: 'active' | 'completed' | 'on_hold';
  created_at: string;
  updated_at: string;
  projects: SeriesProject[];
  stats: {
    totalProjects: number;
    totalWordCount: number;
    completedProjects: number;
  };
}

interface StandaloneProject {
  id: string;
  title: string;
  genre: string;
  status: string;
}

// Icons
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12,19 5,12 12,5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3,6 5,6 21,6" />
      <path d="M19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export default function SeriesDetailPage() {
  const router = useRouter();
  const params = useParams();
  const seriesId = params.id as string;

  const [series, setSeries] = useState<Series | null>(null);
  const [standaloneProjects, setStandaloneProjects] = useState<StandaloneProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'completed' | 'on_hold'>('active');
  const [saving, setSaving] = useState(false);

  // Fetch series data
  const fetchSeries = useCallback(async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/series/${seriesId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Series not found');
        }
        throw new Error('Failed to fetch series');
      }

      const data = await res.json();
      setSeries(data.series);
    } catch (err: any) {
      console.error('Error fetching series:', err);
      setError(err.message);
    }
  }, [seriesId]);

  // Fetch standalone projects (available to add to series)
  const fetchStandaloneProjects = useCallback(async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await res.json();
      // Filter to only standalone projects that aren't in any series
      const standalone = (data.projects || []).filter(
        (p: any) => p.type === 'standalone' && !p.series_id
      );
      setStandaloneProjects(standalone);
    } catch (err: any) {
      console.error('Error fetching projects:', err);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSeries(), fetchStandaloneProjects()]);
      setLoading(false);
    };
    loadData();
  }, [fetchSeries, fetchStandaloneProjects]);

  // Add book to series
  const handleAddBook = async () => {
    if (!selectedProjectId) {
      setError('Please select a book to add');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/series/${seriesId}/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: selectedProjectId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to add book');
      }

      await Promise.all([fetchSeries(), fetchStandaloneProjects()]);
      setShowAddBookModal(false);
      setSelectedProjectId('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Remove book from series
  const handleRemoveBook = async (projectId: string) => {
    if (!confirm('Remove this book from the series? The book will not be deleted.')) {
      return;
    }

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/series/${seriesId}/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to remove book');
      }

      await Promise.all([fetchSeries(), fetchStandaloneProjects()]);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Open edit modal
  const openEditModal = () => {
    if (series) {
      setEditTitle(series.title);
      setEditDescription(series.description || '');
      setEditStatus(series.status);
      setShowEditModal(true);
    }
  };

  // Save series edits
  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      setError('Series title is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/series/${seriesId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          status: editStatus,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to update series');
      }

      await fetchSeries();
      setShowEditModal(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete series
  const handleDeleteSeries = async () => {
    if (!confirm('Delete this series? Books will be unlinked but not deleted.')) {
      return;
    }

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/series/${seriesId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to delete series');
      }

      router.push('/series');
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Styles
  const cardStyle: CSSProperties = {
    background: colors.background.surface,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.lg,
    padding: spacing[6],
    marginBottom: spacing[4],
  };

  const bookCardStyle: CSSProperties = {
    ...cardStyle,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
    cursor: 'pointer',
    transition: transitions.all,
  };

  const badgeStyle = (variant: 'success' | 'warning' | 'error' | 'info'): CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: `${spacing[1]} ${spacing[3]}`,
    borderRadius: borderRadius.full,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    background: colors.semantic[`${variant}Light`],
    color: colors.semantic[variant],
  });

  const primaryButtonStyle: CSSProperties = {
    padding: `${spacing[3]} ${spacing[6]}`,
    background: gradients.brand,
    color: colors.text.inverse,
    border: 'none',
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
  };

  const secondaryButtonStyle: CSSProperties = {
    ...primaryButtonStyle,
    background: colors.background.surface,
    color: colors.text.secondary,
    border: `1px solid ${colors.border.default}`,
  };

  const dangerButtonStyle: CSSProperties = {
    ...secondaryButtonStyle,
    color: colors.semantic.error,
    borderColor: colors.semantic.errorBorder,
  };

  const modalOverlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: colors.background.overlay,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const modalStyle: CSSProperties = {
    background: colors.background.surface,
    borderRadius: borderRadius.xl,
    padding: spacing[8],
    maxWidth: '480px',
    width: '90%',
    boxShadow: shadows.xl,
  };

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: spacing[3],
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.md,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.base,
    marginBottom: spacing[4],
  };

  const selectStyle: CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
  };

  if (loading) {
    return (
      <DashboardLayout
        header={{
          title: 'Loading...',
          subtitle: 'Fetching series data',
        }}
      >
        <div style={{ textAlign: 'center', padding: spacing[12] }}>
          <div style={{ fontSize: typography.fontSize.lg, color: colors.text.secondary }}>
            Loading series...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!series) {
    return (
      <DashboardLayout
        header={{
          title: 'Series Not Found',
          subtitle: 'The requested series could not be found',
        }}
      >
        <div style={{ ...cardStyle, textAlign: 'center', padding: spacing[12] }}>
          <p style={{ color: colors.text.secondary, marginBottom: spacing[4] }}>
            {error || 'This series does not exist or has been deleted.'}
          </p>
          <Link href="/series" style={{ textDecoration: 'none' }}>
            <button style={primaryButtonStyle}>
              <ArrowLeftIcon />
              Back to Series
            </button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      header={{
        title: series.title,
        subtitle: series.description || 'Manage your book series',
      }}
    >
      {error && (
        <div style={{
          ...cardStyle,
          background: colors.semantic.errorLight,
          borderColor: colors.semantic.errorBorder,
          color: colors.semantic.error,
          marginBottom: spacing[4],
        }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: spacing[4],
              background: 'transparent',
              border: 'none',
              color: colors.semantic.error,
              cursor: 'pointer',
              fontWeight: typography.fontWeight.semibold,
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Back link and actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing[6],
      }}>
        <Link href="/series" style={{ textDecoration: 'none', color: colors.text.secondary }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <ArrowLeftIcon />
            Back to Series
          </div>
        </Link>
        <div style={{ display: 'flex', gap: spacing[3] }}>
          <button onClick={openEditModal} style={secondaryButtonStyle}>
            <EditIcon />
            Edit Series
          </button>
          <button onClick={handleDeleteSeries} style={dangerButtonStyle}>
            <TrashIcon />
            Delete Series
          </button>
        </div>
      </div>

      {/* Series stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: spacing[4],
        marginBottom: spacing[6],
      }}>
        <div style={cardStyle}>
          <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.brand.primary }}>
            {series.projects?.length || 0}
          </div>
          <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>Books</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.metrics.green }}>
            {series.stats?.totalWordCount?.toLocaleString() || 0}
          </div>
          <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>Total Words</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.metrics.blue }}>
            {series.stats?.completedProjects || 0}
          </div>
          <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>Completed</div>
        </div>
        <div style={cardStyle}>
          <span style={badgeStyle(
            series.status === 'completed' ? 'success' :
            series.status === 'on_hold' ? 'warning' : 'info'
          )}>
            {series.status === 'on_hold' ? 'On Hold' : series.status.charAt(0).toUpperCase() + series.status.slice(1)}
          </span>
          <div style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: spacing[2] }}>Status</div>
        </div>
      </div>

      {/* Books in series */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing[4],
      }}>
        <h2 style={{
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.semibold,
          color: colors.text.primary,
          margin: 0,
        }}>
          Books in Series
        </h2>
        <button
          onClick={() => setShowAddBookModal(true)}
          style={primaryButtonStyle}
        >
          <PlusIcon />
          Add Book
        </button>
      </div>

      {series.projects && series.projects.length > 0 ? (
        <div>
          {series.projects.map((project) => (
            <div
              key={project.id}
              style={bookCardStyle}
              onClick={() => router.push(`/projects/${project.id}`)}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = shadows.md;
                e.currentTarget.style.borderColor = colors.brand.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = colors.border.default;
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], marginBottom: spacing[1] }}>
                  <span style={{
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.bold,
                    color: colors.brand.primary,
                  }}>
                    Book {project.series_book_number || '?'}
                  </span>
                  <h3 style={{
                    fontSize: typography.fontSize.base,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.text.primary,
                    margin: 0,
                  }}>
                    {project.title}
                  </h3>
                  <span style={badgeStyle(
                    project.status === 'completed' ? 'success' :
                    project.status === 'generating' ? 'warning' : 'info'
                  )}>
                    {project.status}
                  </span>
                </div>
                <p style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                  margin: 0,
                }}>
                  {project.genre} | {project.word_count?.toLocaleString() || 0} words
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveBook(project.id);
                }}
                style={{
                  ...dangerButtonStyle,
                  padding: `${spacing[2]} ${spacing[3]}`,
                  fontSize: typography.fontSize.sm,
                }}
              >
                <TrashIcon />
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ ...cardStyle, textAlign: 'center', padding: spacing[12] }}>
          <p style={{ color: colors.text.secondary, marginBottom: spacing[4] }}>
            No books in this series yet. Add existing books or create new ones.
          </p>
          <button
            onClick={() => setShowAddBookModal(true)}
            style={primaryButtonStyle}
          >
            <PlusIcon />
            Add First Book
          </button>
        </div>
      )}

      {/* Add Book Modal */}
      {showAddBookModal && (
        <div style={modalOverlayStyle} onClick={() => setShowAddBookModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              marginBottom: spacing[6],
            }}>
              Add Book to Series
            </h2>

            {standaloneProjects.length > 0 ? (
              <>
                <label style={{
                  display: 'block',
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  color: colors.text.primary,
                  marginBottom: spacing[2],
                }}>
                  Select a Book
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  style={selectStyle}
                  disabled={saving}
                >
                  <option value="">-- Select a book --</option>
                  {standaloneProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title} ({project.genre})
                    </option>
                  ))}
                </select>

                <p style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.text.tertiary,
                  marginBottom: spacing[4],
                }}>
                  The book will be added as the next book in the series.
                </p>
              </>
            ) : (
              <p style={{
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
                marginBottom: spacing[4],
              }}>
                No standalone books available. Create a new book first, then add it to the series.
              </p>
            )}

            <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowAddBookModal(false);
                  setSelectedProjectId('');
                }}
                style={secondaryButtonStyle}
                disabled={saving}
              >
                Cancel
              </button>
              {standaloneProjects.length > 0 && (
                <button
                  onClick={handleAddBook}
                  style={{
                    ...primaryButtonStyle,
                    opacity: saving || !selectedProjectId ? 0.7 : 1,
                    cursor: saving || !selectedProjectId ? 'not-allowed' : 'pointer',
                  }}
                  disabled={saving || !selectedProjectId}
                >
                  {saving ? 'Adding...' : 'Add Book'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Series Modal */}
      {showEditModal && (
        <div style={modalOverlayStyle} onClick={() => setShowEditModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              color: colors.text.primary,
              marginBottom: spacing[6],
            }}>
              Edit Series
            </h2>

            <label style={{
              display: 'block',
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: colors.text.primary,
              marginBottom: spacing[2],
            }}>
              Series Title
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Enter series title..."
              style={inputStyle}
              disabled={saving}
            />

            <label style={{
              display: 'block',
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: colors.text.primary,
              marginBottom: spacing[2],
            }}>
              Description (optional)
            </label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Brief description of the series..."
              style={{
                ...inputStyle,
                minHeight: '80px',
                resize: 'vertical',
              }}
              disabled={saving}
            />

            <label style={{
              display: 'block',
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: colors.text.primary,
              marginBottom: spacing[2],
            }}>
              Status
            </label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as any)}
              style={selectStyle}
              disabled={saving}
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>

            <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowEditModal(false)}
                style={secondaryButtonStyle}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                style={{
                  ...primaryButtonStyle,
                  opacity: saving || !editTitle.trim() ? 0.7 : 1,
                  cursor: saving || !editTitle.trim() ? 'not-allowed' : 'pointer',
                }}
                disabled={saving || !editTitle.trim()}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
