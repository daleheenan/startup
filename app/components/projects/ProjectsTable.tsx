'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getToken } from '@/app/lib/auth';
import { colors, typography, spacing, borderRadius, shadows, transitions } from '@/app/lib/design-tokens';
import SortableTableHeader, { SortColumn, SortConfig } from './SortableTableHeader';

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

interface ProjectsTableProps {
  projects: Project[];
  sortConfig: SortConfig;
  onSort: (column: SortColumn) => void;
  onDelete: (projectId: string) => Promise<void>;
}

export default function ProjectsTable({
  projects,
  sortConfig,
  onSort,
  onDelete,
}: ProjectsTableProps) {
  const [exportingState, setExportingState] = useState<Record<string, boolean>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExportPdf = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const key = `pdf-${projectId}`;
    setExportingState(prev => ({ ...prev, [key]: true }));

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/export/pdf/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manuscript-${projectId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF');
    } finally {
      setExportingState(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleExportDocx = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const key = `docx-${projectId}`;
    setExportingState(prev => ({ ...prev, [key]: true }));

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/export/docx/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manuscript-${projectId}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting DOCX:', error);
      alert('Failed to export DOCX');
    } finally {
      setExportingState(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleDeleteClick = (project: Project, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirm({ id: project.id, title: project.title });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    setIsDeleting(true);
    try {
      await onDelete(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-GB');
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'standalone': return 'Standalone';
      case 'trilogy': return 'Trilogy';
      case 'series': return 'Series';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'standalone': return { bg: colors.semantic.infoLight, text: colors.semantic.info };
      case 'trilogy': return { bg: colors.semantic.warningLight, text: colors.semantic.warningDark };
      case 'series': return { bg: colors.semantic.successLight, text: colors.semantic.successDark };
      default: return { bg: colors.background.secondary, text: colors.text.secondary };
    }
  };

  const actionButtonStyle: React.CSSProperties = {
    padding: `${spacing[1]} ${spacing[2]}`,
    background: colors.background.secondary,
    border: `1px solid ${colors.border.default}`,
    borderRadius: borderRadius.sm,
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    cursor: 'pointer',
    transition: transitions.all,
    whiteSpace: 'nowrap',
  };

  const actionButtonHoverStyle = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.currentTarget.style.background = colors.brand.primaryLight;
    e.currentTarget.style.borderColor = colors.brand.primary;
    e.currentTarget.style.color = colors.brand.primary;
  };

  const actionButtonLeaveStyle = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.currentTarget.style.background = colors.background.secondary;
    e.currentTarget.style.borderColor = colors.border.default;
    e.currentTarget.style.color = colors.text.secondary;
  };

  const deleteButtonStyle: React.CSSProperties = {
    padding: `${spacing[1]} ${spacing[2]}`,
    background: colors.semantic.errorLight,
    border: `1px solid ${colors.semantic.errorBorder}`,
    borderRadius: borderRadius.sm,
    fontSize: typography.fontSize.xs,
    color: colors.semantic.error,
    cursor: 'pointer',
    transition: transitions.all,
    whiteSpace: 'nowrap',
  };

  const deleteButtonHoverStyle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = colors.semantic.error;
    e.currentTarget.style.borderColor = colors.semantic.error;
    e.currentTarget.style.color = colors.white;
  };

  const deleteButtonLeaveStyle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = colors.semantic.errorLight;
    e.currentTarget.style.borderColor = colors.semantic.errorBorder;
    e.currentTarget.style.color = colors.semantic.error;
  };

  if (projects.length === 0) {
    return (
      <div
        role="status"
        aria-label="No projects found"
        style={{
          textAlign: 'center',
          padding: `${spacing[12]} ${spacing[8]}`,
          background: colors.background.surface,
          borderRadius: borderRadius.lg,
          border: `2px dashed ${colors.border.default}`,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: '64px',
            height: '64px',
            margin: '0 auto',
            marginBottom: spacing[4],
            background: colors.background.secondary,
            borderRadius: borderRadius.lg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
          }}
        >
          📖
        </div>
        <h3
          style={{
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            marginBottom: spacing[2],
          }}
        >
          No Projects Yet
        </h3>
        <p
          style={{
            fontSize: typography.fontSize.sm,
            color: colors.text.secondary,
            maxWidth: '300px',
            margin: '0 auto',
          }}
        >
          Start by creating your first novel using one of the options above.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: colors.background.surface,
        border: `1px solid ${colors.border.default}`,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <table
          role="grid"
          aria-label="Your novel projects"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: '1000px',
          }}
        >
          <thead>
            <tr>
              <SortableTableHeader
                label="Name"
                column="name"
                currentSort={sortConfig}
                onSort={onSort}
              />
              <SortableTableHeader
                label="Last Modified"
                column="updated_at"
                currentSort={sortConfig}
                onSort={onSort}
              />
              <SortableTableHeader
                label="Cost"
                column="cost"
                currentSort={sortConfig}
                onSort={onSort}
              />
              <SortableTableHeader
                label="Type"
                column="type"
                currentSort={sortConfig}
                onSort={onSort}
              />
              <SortableTableHeader
                label="Words"
                column="words"
                currentSort={sortConfig}
                onSort={onSort}
              />
              <SortableTableHeader
                label="Chapters"
                column="chapters"
                currentSort={sortConfig}
                onSort={onSort}
              />
              <SortableTableHeader
                label="Versions"
                column="versions"
                currentSort={sortConfig}
                onSort={onSort}
              />
              <th
                scope="col"
                style={{
                  padding: `${spacing[3]} ${spacing[4]}`,
                  textAlign: 'center',
                  fontWeight: typography.fontWeight.semibold,
                  fontSize: typography.fontSize.sm,
                  color: colors.text.secondary,
                  background: colors.background.secondary,
                  borderBottom: `2px solid ${colors.border.default}`,
                  whiteSpace: 'nowrap',
                }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const typeColors = getTypeColor(project.type);
              const isPdfExporting = exportingState[`pdf-${project.id}`];
              const isDocxExporting = exportingState[`docx-${project.id}`];

              return (
                <tr
                  key={project.id}
                  style={{
                    borderBottom: `1px solid ${colors.border.default}`,
                    transition: transitions.colors,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.background.surfaceHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {/* Name */}
                  <td
                    style={{
                      padding: `${spacing[4]}`,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.text.primary,
                    }}
                  >
                    <Link
                      href={`/projects/${project.id}`}
                      style={{
                        color: 'inherit',
                        textDecoration: 'none',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = colors.brand.primary;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = colors.text.primary;
                      }}
                    >
                      {project.title}
                    </Link>
                  </td>

                  {/* Last Modified */}
                  <td
                    style={{
                      padding: `${spacing[4]}`,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                    }}
                  >
                    {formatDate(project.updated_at)}
                  </td>

                  {/* Cost */}
                  <td
                    style={{
                      padding: `${spacing[4]}`,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                    }}
                  >
                    {project.metrics?.cost?.display || '—'}
                  </td>

                  {/* Type */}
                  <td style={{ padding: `${spacing[4]}` }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: `${spacing[1]} ${spacing[2]}`,
                        background: typeColors.bg,
                        color: typeColors.text,
                        borderRadius: borderRadius.sm,
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.medium,
                      }}
                    >
                      {getTypeLabel(project.type)}
                    </span>
                  </td>

                  {/* Words */}
                  <td
                    style={{
                      padding: `${spacing[4]}`,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                      textAlign: 'right',
                    }}
                  >
                    {project.metrics?.content?.words
                      ? formatNumber(project.metrics.content.words)
                      : '—'}
                  </td>

                  {/* Chapters */}
                  <td
                    style={{
                      padding: `${spacing[4]}`,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                      textAlign: 'right',
                    }}
                  >
                    {project.progress?.chaptersWritten ?? '—'}
                  </td>

                  {/* Versions */}
                  <td
                    style={{
                      padding: `${spacing[4]}`,
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                      textAlign: 'right',
                    }}
                  >
                    —
                  </td>

                  {/* Actions */}
                  <td
                    style={{
                      padding: `${spacing[4]}`,
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        gap: spacing[2],
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      {/* Read */}
                      <Link
                        href={`/projects/${project.id}/read`}
                        aria-label={`Read ${project.title}`}
                        style={actionButtonStyle as React.CSSProperties}
                        onMouseEnter={actionButtonHoverStyle}
                        onMouseLeave={actionButtonLeaveStyle}
                      >
                        📖 Read
                      </Link>

                      {/* Export PDF */}
                      <button
                        onClick={(e) => handleExportPdf(project.id, e)}
                        disabled={isPdfExporting}
                        aria-label={isPdfExporting ? 'Exporting PDF...' : `Export ${project.title} as PDF`}
                        style={{
                          ...actionButtonStyle,
                          opacity: isPdfExporting ? 0.6 : 1,
                          cursor: isPdfExporting ? 'not-allowed' : 'pointer',
                        }}
                        onMouseEnter={!isPdfExporting ? actionButtonHoverStyle : undefined}
                        onMouseLeave={!isPdfExporting ? actionButtonLeaveStyle : undefined}
                      >
                        {isPdfExporting ? '...' : '📄 PDF'}
                      </button>

                      {/* Export DOCX */}
                      <button
                        onClick={(e) => handleExportDocx(project.id, e)}
                        disabled={isDocxExporting}
                        aria-label={isDocxExporting ? 'Exporting DOCX...' : `Export ${project.title} as DOCX`}
                        style={{
                          ...actionButtonStyle,
                          opacity: isDocxExporting ? 0.6 : 1,
                          cursor: isDocxExporting ? 'not-allowed' : 'pointer',
                        }}
                        onMouseEnter={!isDocxExporting ? actionButtonHoverStyle : undefined}
                        onMouseLeave={!isDocxExporting ? actionButtonLeaveStyle : undefined}
                      >
                        {isDocxExporting ? '...' : '📝 DOCX'}
                      </button>

                      {/* Edit */}
                      <Link
                        href={`/projects/${project.id}`}
                        aria-label={`Edit ${project.title}`}
                        style={actionButtonStyle as React.CSSProperties}
                        onMouseEnter={actionButtonHoverStyle}
                        onMouseLeave={actionButtonLeaveStyle}
                      >
                        ✏️ Edit
                      </Link>

                      {/* Delete */}
                      <button
                        onClick={(e) => handleDeleteClick(project, e)}
                        aria-label={`Delete ${project.title}`}
                        style={deleteButtonStyle}
                        onMouseEnter={deleteButtonHoverStyle}
                        onMouseLeave={deleteButtonLeaveStyle}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: colors.background.overlay,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={handleDeleteCancel}
        >
          <div
            style={{
              background: colors.background.surface,
              borderRadius: borderRadius.lg,
              padding: spacing[8],
              maxWidth: '400px',
              width: '90%',
              boxShadow: shadows.xl,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="delete-dialog-title"
              style={{
                fontSize: typography.fontSize.lg,
                fontWeight: typography.fontWeight.semibold,
                color: colors.text.primary,
                margin: 0,
                marginBottom: spacing[4],
              }}
            >
              Delete Project?
            </h3>
            <p
              style={{
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
                margin: 0,
                marginBottom: spacing[6],
                lineHeight: typography.lineHeight.relaxed,
              }}
            >
              Are you sure you want to delete <strong>{deleteConfirm.title}</strong>? This action cannot be undone and all associated data will be permanently removed.
            </p>
            <div
              style={{
                display: 'flex',
                gap: spacing[3],
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                style={{
                  padding: `${spacing[3]} ${spacing[5]}`,
                  background: colors.background.secondary,
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: borderRadius.md,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  color: colors.text.secondary,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  transition: transitions.all,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                style={{
                  padding: `${spacing[3]} ${spacing[5]}`,
                  background: isDeleting ? colors.semantic.errorLight : colors.semantic.error,
                  border: 'none',
                  borderRadius: borderRadius.md,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  color: colors.white,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.7 : 1,
                  transition: transitions.all,
                }}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
