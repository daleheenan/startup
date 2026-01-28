'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/app/components/dashboard/DashboardLayout';
import ProjectNavigation from '@/app/components/shared/ProjectNavigation';
import BookVersionSelector from '@/app/components/BookVersionSelector';
import { fetchWithAuth } from '../../../lib/fetch-utils';
import { colors, borderRadius, spacing, typography, transitions } from '../../../lib/design-tokens';
import { useProjectNavigation } from '@/app/hooks';
import CollapsibleSection from '../../../components/CollapsibleSection';
import AgentWorkflowVisualization from '../../../components/AgentWorkflowVisualization';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Chapter {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string | null;
  status: 'draft' | 'in_progress' | 'completed' | 'locked';
  word_count: number;
  is_locked?: boolean;
  created_at: string;
  updated_at: string;
}

interface Book {
  id: string;
  project_id: string;
  book_number: number;
  title: string;
  chapter_count: number;
}

/**
 * Chapters Management Page
 *
 * Provides overview and management for all chapters in a project:
 * - Chapter list with status indicators
 * - Search and filter functionality
 * - Quick navigation to chapter editor
 * - Chapter reordering (future)
 * - Bulk actions (future)
 *
 * Resolves Issue #26 from UX Review Report
 */
export default function ChaptersPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedBook, setSelectedBook] = useState<string>('all');
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [project, setProject] = useState<any>(null);
  const [hasQueuedJobs, setHasQueuedJobs] = useState(false);

  const navigation = useProjectNavigation(projectId, project);

  // Fetch chapters for a specific book with optional version filter
  const fetchChaptersForBook = useCallback(async (bookId: string, versionId?: string | null) => {
    let url = `/api/books/${bookId}/chapters`;
    if (versionId) {
      url += `?versionId=${versionId}`;
    }
    const chaptersRes = await fetchWithAuth(url);
    if (chaptersRes.ok) {
      return await chaptersRes.json() as Chapter[];
    }
    return [];
  }, []);

  // Initial data load
  useEffect(() => {
    fetchChaptersData();
  }, [projectId]);

  // Refetch chapters when book or version selection changes
  useEffect(() => {
    if (books.length === 0) return;

    const refetchChapters = async () => {
      try {
        if (selectedBook === 'all') {
          // Fetch chapters from all books (active versions)
          const allChapters: Chapter[] = [];
          for (const book of books) {
            const bookChapters = await fetchChaptersForBook(book.id);
            allChapters.push(...bookChapters);
          }
          setChapters(allChapters);
        } else {
          // Fetch chapters for selected book with optional version
          const bookChapters = await fetchChaptersForBook(selectedBook, selectedVersionId);
          setChapters(bookChapters);
        }
      } catch (err: any) {
        console.error('Error refetching chapters:', err);
      }
    };

    refetchChapters();
  }, [selectedBook, selectedVersionId, books, fetchChaptersForBook]);

  const fetchChaptersData = async () => {
    try {
      setLoading(true);

      // Fetch project for navigation
      const projectRes = await fetchWithAuth(`/api/projects/${projectId}`);
      if (projectRes.ok) {
        setProject(await projectRes.json());
      }

      // Fetch books
      const booksRes = await fetchWithAuth(`/api/projects/${projectId}/books`);
      if (!booksRes.ok) throw new Error('Failed to fetch books');
      const booksData: Book[] = await booksRes.json();
      setBooks(booksData);

      // Fetch all chapters for all books (active versions by default)
      const allChapters: Chapter[] = [];
      for (const book of booksData) {
        const bookChapters = await fetchChaptersForBook(book.id);
        allChapters.push(...bookChapters);
      }

      setChapters(allChapters);

      // Check if there are queued jobs for this project
      try {
        const progressRes = await fetchWithAuth(`/api/projects/${projectId}/progress`);
        if (progressRes.ok) {
          const progressData = await progressRes.json();
          const hasJobs = (progressData.queue?.pending || 0) + (progressData.queue?.running || 0) > 0;
          setHasQueuedJobs(hasJobs);
        }
      } catch {
        // No progress data
      }
    } catch (err: any) {
      console.error('Error fetching chapters:', err);
      setError(err.message || 'Failed to load chapters');
    } finally {
      setLoading(false);
    }
  };

  // Filter chapters based on search and filters
  const filteredChapters = chapters.filter((chapter) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = chapter.title?.toLowerCase().includes(query);
      const matchesNumber = chapter.chapter_number.toString().includes(query);
      if (!matchesTitle && !matchesNumber) return false;
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (chapter.is_locked && statusFilter !== 'locked') return false;
      if (!chapter.is_locked && chapter.status !== statusFilter) return false;
    }

    // Book filter
    if (selectedBook !== 'all' && chapter.book_id !== selectedBook) {
      return false;
    }

    return true;
  });

  // Get status colour and label
  const getStatusInfo = (chapter: Chapter) => {
    if (chapter.is_locked) {
      return {
        colour: colors.text.disabled,
        label: 'Locked',
        icon: '🔒',
        bg: colors.background.surfaceHover,
      };
    }
    switch (chapter.status) {
      case 'completed':
        return {
          colour: colors.semantic.successDark,
          label: 'Completed',
          icon: '✓',
          bg: colors.semantic.successLight,
        };
      case 'in_progress':
        return {
          colour: colors.semantic.info,
          label: 'In Progress',
          icon: '►',
          bg: colors.semantic.infoLight,
        };
      case 'draft':
        return {
          colour: colors.semantic.warning,
          label: 'Draft',
          icon: '○',
          bg: colors.semantic.warningLight,
        };
      default:
        return {
          colour: colors.text.tertiary,
          label: 'Unknown',
          icon: '?',
          bg: colors.background.surfaceHover,
        };
    }
  };

  // Get book title for a chapter
  const getBookTitle = (bookId: string) => {
    const book = books.find((b) => b.id === bookId);
    return book ? `${book.title} (Book ${book.book_number})` : 'Unknown Book';
  };

  if (loading) {
    return (
      <DashboardLayout
        header={{ title: project?.title || 'Loading...', subtitle: 'Chapters' }}
      >
        <div style={{ padding: spacing[8], textAlign: 'center' }}>
          <p style={{ color: colors.text.secondary }}>Loading chapters...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout
        header={{ title: project?.title || 'Loading...', subtitle: 'Error loading chapters' }}
      >
        <div style={{ padding: spacing[8], textAlign: 'center' }}>
          <p style={{ color: colors.semantic.error, marginBottom: spacing[4] }}>{error}</p>
          <button
            onClick={fetchChaptersData}
            style={{
              padding: `${spacing[3]} ${spacing[6]}`,
              background: colors.brand.gradient,
              color: colors.text.inverse,
              border: 'none',
              borderRadius: borderRadius.md,
              cursor: 'pointer',
              fontWeight: typography.fontWeight.semibold,
            }}
          >
            Retry
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      header={{ title: project?.title || 'Loading...', subtitle: `Manage and edit ${chapters.length} chapter${chapters.length !== 1 ? 's' : ''}` }}
    >
      <ProjectNavigation
        projectId={projectId}
        project={navigation.project}
        outline={navigation.outline}
        chapters={navigation.chapters}
      />
      {/* Agent Workflow Visualization */}
      {(hasQueuedJobs || chapters.length > 0) && (
        <CollapsibleSection
          sectionId={`chapters-workflow-${projectId}`}
          title="Generation Pipeline"
          description="Track chapter generation through 15 specialist agents"
          defaultOpen={hasQueuedJobs}
        >
          <AgentWorkflowVisualization
            projectId={projectId}
            bookId={books[0]?.id}
            showMultipleChapters={true}
          />
        </CollapsibleSection>
      )}

      {/* Filters and Search */}
      <div
        style={{
          background: colors.background.surface,
          border: `1px solid ${colors.border.default}`,
          borderRadius: borderRadius.lg,
          padding: spacing[6],
          marginBottom: spacing[6],
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: spacing[4],
          }}
        >
          {/* Search */}
          <div>
            <label
              htmlFor="chapter-search"
              style={{
                display: 'block',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: colors.text.secondary,
                marginBottom: spacing[2],
              }}
            >
              Search Chapters
            </label>
            <input
              id="chapter-search"
              type="text"
              placeholder="Search by title or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: spacing[3],
                border: `1px solid ${colors.border.default}`,
                borderRadius: borderRadius.md,
                fontSize: typography.fontSize.base,
                color: colors.text.primary,
              }}
            />
          </div>

          {/* Status Filter */}
          <div>
            <label
              htmlFor="status-filter"
              style={{
                display: 'block',
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: colors.text.secondary,
                marginBottom: spacing[2],
              }}
            >
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                padding: spacing[3],
                border: `1px solid ${colors.border.default}`,
                borderRadius: borderRadius.md,
                fontSize: typography.fontSize.base,
                color: colors.text.primary,
              }}
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="draft">Draft</option>
              <option value="locked">Locked</option>
            </select>
          </div>

          {/* Book Filter */}
          {books.length > 1 && (
            <div>
              <label
                htmlFor="book-filter"
                style={{
                  display: 'block',
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  color: colors.text.secondary,
                  marginBottom: spacing[2],
                }}
              >
                Book
              </label>
              <select
                id="book-filter"
                value={selectedBook}
                onChange={(e) => {
                  setSelectedBook(e.target.value);
                  setSelectedVersionId(null); // Reset version when changing book
                }}
                style={{
                  width: '100%',
                  padding: spacing[3],
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: borderRadius.md,
                  fontSize: typography.fontSize.base,
                  color: colors.text.primary,
                }}
              >
                <option value="all">All Books</option>
                {books.map((book) => (
                  <option key={book.id} value={book.id}>
                    Book {book.book_number}: {book.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Version Selector - only show when a specific book is selected */}
          {selectedBook !== 'all' && (
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  color: colors.text.secondary,
                  marginBottom: spacing[2],
                }}
              >
                Version
              </label>
              <BookVersionSelector
                bookId={selectedBook}
                compact={true}
                onVersionChange={(version) => setSelectedVersionId(version.id)}
              />
            </div>
          )}

          {/* Clear Filters */}
          {(searchQuery || statusFilter !== 'all' || selectedBook !== 'all') && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setSelectedBook('all');
                  setSelectedVersionId(null);
                }}
                style={{
                  padding: `${spacing[3]} ${spacing[5]}`,
                  background: colors.background.surfaceHover,
                  color: colors.text.secondary,
                  border: `1px solid ${colors.border.default}`,
                  borderRadius: borderRadius.md,
                  cursor: 'pointer',
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  transition: transitions.colors,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.border.hover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.background.surfaceHover;
                }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Results count */}
        <div
          style={{
            marginTop: spacing[4],
            fontSize: typography.fontSize.sm,
            color: colors.text.tertiary,
          }}
        >
          Showing {filteredChapters.length} of {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Chapters List */}
      {filteredChapters.length === 0 ? (
        <div
          style={{
            background: colors.background.surface,
            border: `1px solid ${colors.border.default}`,
            borderRadius: borderRadius.lg,
            padding: spacing[8],
            textAlign: 'center',
          }}
        >
          <p style={{ color: colors.text.secondary, marginBottom: spacing[4] }}>
            {searchQuery || statusFilter !== 'all' || selectedBook !== 'all'
              ? 'No chapters match your filters'
              : 'No chapters found'}
          </p>
          {(searchQuery || statusFilter !== 'all' || selectedBook !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setSelectedBook('all');
              }}
              style={{
                padding: `${spacing[3]} ${spacing[6]}`,
                background: colors.brand.gradient,
                color: colors.text.inverse,
                border: 'none',
                borderRadius: borderRadius.md,
                cursor: 'pointer',
                fontWeight: typography.fontWeight.semibold,
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          {filteredChapters.map((chapter) => {
            const statusInfo = getStatusInfo(chapter);
            return (
              <Link
                key={chapter.id}
                href={`/projects/${projectId}/chapters/${chapter.id}`}
                style={{
                  display: 'block',
                  background: colors.background.surface,
                  border: `1px solid ${colors.border.default}`,
                  borderLeft: `4px solid ${statusInfo.colour}`,
                  borderRadius: borderRadius.lg,
                  padding: spacing[5],
                  textDecoration: 'none',
                  transition: transitions.all,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.background.surfaceHover;
                  e.currentTarget.style.borderColor = colors.border.hover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.background.surface;
                  e.currentTarget.style.borderColor = colors.border.default;
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[4] }}>
                  {/* Chapter Number */}
                  <div
                    style={{
                      minWidth: '60px',
                      height: '60px',
                      background: statusInfo.bg,
                      borderRadius: borderRadius.md,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.text.tertiary,
                        fontWeight: typography.fontWeight.medium,
                      }}
                    >
                      Ch.
                    </span>
                    <span
                      style={{
                        fontSize: typography.fontSize.xl,
                        color: statusInfo.colour,
                        fontWeight: typography.fontWeight.bold,
                      }}
                    >
                      {chapter.chapter_number}
                    </span>
                  </div>

                  {/* Chapter Info */}
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        fontSize: typography.fontSize.lg,
                        fontWeight: typography.fontWeight.semibold,
                        color: colors.text.primary,
                        marginBottom: spacing[2],
                      }}
                    >
                      {chapter.title || `Chapter ${chapter.chapter_number}`}
                    </h3>

                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: spacing[3],
                        alignItems: 'center',
                        fontSize: typography.fontSize.sm,
                      }}
                    >
                      {/* Status Badge */}
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: spacing[1],
                          padding: `${spacing[1]} ${spacing[3]}`,
                          background: statusInfo.bg,
                          color: statusInfo.colour,
                          borderRadius: borderRadius.sm,
                          fontWeight: typography.fontWeight.medium,
                        }}
                      >
                        <span aria-hidden="true">{statusInfo.icon}</span>
                        {statusInfo.label}
                      </span>

                      {/* Word Count */}
                      <span style={{ color: colors.text.tertiary }}>
                        {chapter.word_count.toLocaleString()} words
                      </span>

                      {/* Book (if multiple books) */}
                      {books.length > 1 && (
                        <span style={{ color: colors.text.tertiary }}>
                          {getBookTitle(chapter.book_id)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Edit Arrow */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      color: colors.brand.primary,
                      fontSize: typography.fontSize.xl,
                    }}
                    aria-hidden="true"
                  >
                    →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
